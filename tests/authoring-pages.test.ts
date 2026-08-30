import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

describe("authoring GitHub Pages", () => {
  test("authoring HTML uses relative asset paths", async () => {
    const html = await Bun.file(join(repoRoot, "examples/authoring/index.html")).text();
    expect(html.includes('href="./style.css"')).toBe(true);
    expect(html.includes('src="./main.ts"')).toBe(true);
    expect(html.includes('href="/examples/authoring/')).toBe(false);
    expect(html.includes('src="/examples/authoring/')).toBe(false);
  });

  test("package.json exposes authoring build and preview", async () => {
    const pkg = JSON.parse(await Bun.file(join(repoRoot, "package.json")).text()) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["build:authoring"]?.includes("vite build")).toBe(true);
    expect(pkg.scripts["preview:authoring"]?.includes("vite preview")).toBe(true);
    expect(pkg.scripts["dev:authoring"]?.includes("vite.authoring.config.ts")).toBe(true);
  });

  test("Vite authoring config reads GITHUB_PAGES_BASE", () => {
    const source = readFileSync(join(repoRoot, "vite.authoring.config.ts"), "utf8");
    expect(source.includes("GITHUB_PAGES_BASE")).toBe(true);
    expect(source.includes("dist-authoring")).toBe(true);
    expect(source.includes(".nojekyll")).toBe(true);
  });

  test("Pages workflow builds with Bun and Emscripten", async () => {
    const workflow = await Bun.file(join(repoRoot, ".github/workflows/pages.yml")).text();
    expect(workflow.includes("oven-sh/setup-bun@v2")).toBe(true);
    expect(workflow.includes("bun run setup:emsdk")).toBe(true);
    expect(workflow.includes("bun run build:authoring")).toBe(true);
    expect(workflow.includes("actions/deploy-pages@v4")).toBe(true);
    expect(workflow.toLowerCase().includes("npm install")).toBe(false);
    expect(workflow.toLowerCase().includes("yarn")).toBe(false);
    expect(workflow.toLowerCase().includes("pnpm")).toBe(false);
  });
});
