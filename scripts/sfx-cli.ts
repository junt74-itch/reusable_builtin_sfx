import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { mutatePatch, validatePatch } from "../src/index.ts";

const DEFAULT_AMOUNT = 0.45;

type ParsedArgs = {
  positional: string[];
  flags: Map<string, string | true>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags.set(arg.slice(2, eq), arg.slice(eq + 1));
        continue;
      }
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags.set(name, next);
        i++;
      } else {
        flags.set(name, true);
      }
      continue;
    }
    positional.push(arg);
  }

  return { positional, flags };
}

function requireFlag(flags: Map<string, string | true>, name: string): string {
  const value = flags.get(name);
  if (value === undefined || value === true) {
    throw new Error(`missing required flag: --${name}`);
  }
  return value;
}

function optionalFlag(flags: Map<string, string | true>, name: string): string | undefined {
  const value = flags.get(name);
  if (value === undefined || value === true) {
    return undefined;
  }
  return value;
}

function parsePositiveInt(raw: string, label: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`invalid ${label}: must be a positive integer`);
  }
  return value;
}

function parseAmount(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_AMOUNT;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error("invalid --amount: must be a finite number");
  }
  return value;
}

function parseSeedBase(raw: string | undefined): number {
  if (raw === undefined) {
    return 0;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error("invalid --seed: must be a finite number");
  }
  return value >>> 0;
}

function loadPatch(path: string): ReturnType<typeof validatePatch> {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new Error(`failed to read input: ${path}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`invalid JSON: ${path}`);
  }

  return validatePatch(parsed);
}

function outputStem(inputPath: string): string {
  const base = basename(inputPath);
  return base.endsWith(".json") ? base.slice(0, -5) : base;
}

function outputFilename(stem: string, index: number, count: number): string {
  const width = Math.max(4, String(count).length);
  return `${stem}-${String(index + 1).padStart(width, "0")}.json`;
}

function runMutate(argv: string[]): void {
  const { positional, flags } = parseArgs(argv);
  const inputPath = positional[0];
  if (!inputPath) {
    throw new Error("missing preset JSON path");
  }

  const count = parsePositiveInt(requireFlag(flags, "count"), "--count");
  const amount = parseAmount(optionalFlag(flags, "amount"));
  const seedBase = parseSeedBase(optionalFlag(flags, "seed"));
  const outDir = optionalFlag(flags, "out");

  const base = loadPatch(resolve(inputPath));
  const variants = Array.from({ length: count }, (_, index) =>
    mutatePatch(base, { amount, seed: (seedBase + index) >>> 0 }),
  );

  if (outDir) {
    const dir = resolve(outDir);
    mkdirSync(dir, { recursive: true });
    const stem = outputStem(inputPath);
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (!variant) {
        continue;
      }
      const filename = outputFilename(stem, i, count);
      writeFileSync(join(dir, filename), `${JSON.stringify(variant, null, 2)}\n`, "utf8");
    }
    return;
  }

  process.stdout.write(`${JSON.stringify(variants, null, 2)}\n`);
}

function printUsage(): void {
  process.stderr.write(`Usage:
  bun run sfx mutate <preset.json> --count N [--amount 0.45] [--seed N] [--out dir]

Examples:
  bun run sfx mutate presets/ui.select.json --count 3
  bun run sfx mutate presets/enemy.hit.json --count 20 --out tmp/enemy-hit
`);
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== "mutate") {
    printUsage();
    process.exit(command ? 1 : 1);
  }

  try {
    runMutate(rest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`sfx mutate: ${message}\n`);
    process.exit(1);
  }
}

main();
