import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      // Forward API calls to the Node server during dev so the browser talks
      // same-origin (required for the httpOnly session cookie to be sent).
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});