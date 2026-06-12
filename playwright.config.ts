import { defineConfig } from "@playwright/test";

// The suite needs the full stack: Postgres (docker compose up db / CI
// service container), the API, and the Vite dev server. The webServer
// entries below start the API + Vite automatically — locally they reuse
// servers that are already running. When E2E_BASE_URL points at a remote
// environment, nothing is started.
const useLocalStack = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // Tripping on a stray test.only / flaky retry budget only matters in CI.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8080",
    headless: true,
    // Capture a screenshot at the end of EVERY test (not just failures) so
    // each run leaves visual evidence in test-results/ that the UI actually
    // rendered what the assertions claim.
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  ...(useLocalStack && {
    webServer: [
      {
        command: "pnpm run server",
        url: "http://localhost:3001/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
      {
        command: "pnpm run dev",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
    ],
  }),
});
