import { defineConfig, devices } from "@playwright/test";

// Never point write-enabled browser tests at a personal or production database.
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "Set E2E_DATABASE_URL to an isolated local budget_tracker_test PostgreSQL database.",
  );
const database = new URL(databaseUrl);
if (
  !["postgresql:", "postgres:"].includes(database.protocol) ||
  !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
  database.pathname !== "/budget_tracker_test"
) {
  throw new Error(
    "E2E_DATABASE_URL must use local PostgreSQL and the budget_tracker_test database.",
  );
}
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
    launchOptions: executablePath
      ? { executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] }
      : {},
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_URL: databaseUrl },
  },
});
