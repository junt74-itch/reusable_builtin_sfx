import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const PINNED_EMSDK_VERSION = "6.0.8";

const WINDOWS_CANDIDATES = [
  "C:\\source\\emsdk",
  "C:\\emsdk",
  join(homedir(), "emsdk"),
];

const UNIX_CANDIDATES = [
  join(homedir(), "emsdk"),
  "/opt/emsdk",
  "/usr/lib/emsdk",
];

function looksLikeEmsdk(root: string): boolean {
  return existsSync(join(root, "emsdk.py")) && existsSync(join(root, ".emscripten"));
}

export function findEmsdkRoot(): string {
  const fromEnv = process.env["EMSDK"];
  if (fromEnv && looksLikeEmsdk(fromEnv)) {
    return fromEnv;
  }

  const candidates = process.platform === "win32" ? WINDOWS_CANDIDATES : UNIX_CANDIDATES;
  for (const candidate of candidates) {
    if (looksLikeEmsdk(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Emscripten SDK が見つかりません。EMSDK を設定するか、`bun run setup:emsdk` を実行してください。",
  );
}

export function emxxPath(root: string): string {
  const exe = process.platform === "win32" ? "em++.exe" : "em++";
  const path = join(root, "upstream", "emscripten", exe);
  if (!existsSync(path)) {
    throw new Error(`em++ が見つかりません: ${path}`);
  }
  return path;
}

function parseEmConfig(root: string): Record<string, string> {
  const raw = readFileSync(join(root, ".emscripten"), "utf8");
  const cfgDir = root.replaceAll("\\", "/");
  const values: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*'([^']+)'/);
    if (!match) {
      continue;
    }
    const key = match[1];
    const value = match[2];
    if (!key || value === undefined) {
      continue;
    }
    values[key] = value.replaceAll("$CFGDIR", cfgDir);
  }
  return values;
}

export function emccEnv(root: string): Record<string, string> {
  const cfg = parseEmConfig(root);
  const pathSep = process.platform === "win32" ? ";" : ":";
  const extraPath = [
    root,
    join(root, "upstream", "emscripten"),
    join(root, "upstream", "bin"),
  ].join(pathSep);

  return {
    ...(process.env as Record<string, string>),
    EMSDK: root.replaceAll("\\", "/"),
    EM_CONFIG: join(root, ".emscripten"),
    EMSDK_NODE: cfg["NODE_JS"] ?? "",
    EMSDK_PYTHON: cfg["PYTHON"] ?? "",
    PATH: `${extraPath}${pathSep}${process.env["PATH"] ?? ""}`,
  };
}
