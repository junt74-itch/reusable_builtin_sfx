import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  server: {
    port: 5174,
  },
  optimizeDeps: {
    include: ["phaser"],
  },
  plugins: [
    {
      name: "phaser-example-index",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/" || req.url === "/index.html") {
            req.url = "/examples/phaser4/index.html";
          }
          next();
        });
      },
    },
  ],
});
