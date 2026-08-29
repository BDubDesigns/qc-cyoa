import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node builtins — especially the experimental `node:sqlite` — must be
    // loaded natively, not transformed by Vite's module pipeline.
    server: {
      deps: {
        external: [/^node:/],
      },
    },
  },
});