import { defineConfig } from "@playwright/test";

const testPort = Number(process.env.PLAYWRIGHT_PORT || 3000);

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${testPort}`,
    browserName: "chromium",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node server/index.mjs",
    port: testPort,
    reuseExistingServer: true,
    env: { PORT: String(testPort), STATIC_DIR: "dist" },
  },
});
