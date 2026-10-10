import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const systemBrowser = process.env.MOR_BROWSER_PATH || "/usr/bin/chromium";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "artifacts/test-results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:5174/mor-v4/",
    headless: true,
    launchOptions: {
      executablePath: existsSync(systemBrowser) ? systemBrowser : undefined,
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5174/mor-v4/",
    reuseExistingServer: true,
  },
});
