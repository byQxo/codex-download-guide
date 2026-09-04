import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node server/index.mjs",
    port: 4173,
    reuseExistingServer: true,
    env: { PORT: "4173", STATIC_DIR: "dist" },
  },
});

