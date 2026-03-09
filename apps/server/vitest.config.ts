import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@quiz/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  },
  test: {
    environment: "node"
  }
});
