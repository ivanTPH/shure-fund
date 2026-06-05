import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Shure.Fund.
 *
 * Run against a locally running dev server:
 *   npx playwright test
 *
 * Run a specific journey:
 *   npx playwright test journey1
 *
 * Run only @critical tagged tests (CI / PR gate):
 *   npx playwright test --grep @critical
 */

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // journeys share DB state — run sequentially by default
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Keep cookies between steps so sign-in persists within a test
    storageState: undefined,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
