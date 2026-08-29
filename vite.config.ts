import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  if (command === "build") {
    return {
      publicDir: false,
      build: {
        lib: {
          entry: "src/index.ts",
          formats: ["es"],
          fileName: "index",
        },
      },
    };
  }

  return {
    root: ".",
    publicDir: false,
    server: {
      port: 5173,
    },
  };
});
