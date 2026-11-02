import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure", ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHROME_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } } : {}) },
  webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
