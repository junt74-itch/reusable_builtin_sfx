import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const repoRoot = resolve(import.meta.dirname);
const pagesBase = process.env["GITHUB_PAGES_BASE"] ?? "/";

export default defineConfig({
  root: resolve(repoRoot, "examples/authoring"),
  publicDir: false,
  base: pagesBase,
  server: {
    port: 5175,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    port: 4175,
  },
  build: {
    outDir: resolve(repoRoot, "dist-authoring"),
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "nojekyll",
      apply: "build",
      closeBundle() {
        writeFileSync(resolve(repoRoot, "dist-authoring", ".nojekyll"), "");
      },
    },
  ],
});
