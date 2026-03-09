import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@quiz/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  },
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
