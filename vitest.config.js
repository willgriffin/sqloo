import { defineConfig, mergeConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    exclude: [],
    include: ["src/**/*.test.js"],
    // globalSetup: "vitest.setup.js",
  },
});
