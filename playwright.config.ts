import { defineConfig } from "@playwright/test";

// E2E runs must use the isolated database created by scripts/test-foundation.cjs.
// A bare `npx playwright test` would otherwise start Next.js against prisma/dev.db.
if (process.env.PORTAL_E2E !== "true" || !process.env.DATABASE_URL) {
  throw new Error(
    "Refusing to run Playwright directly: it would use the development database. " +
      "Run `npm run test:e2e` instead (it creates an isolated DATABASE_URL and sets PORTAL_E2E=true).",
  );
}

export default defineConfig({
  testDir: "./tests/e2e", workers: 1, fullyParallel: false, timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3107", viewport: { width: 390, height: 844 }, trace: "retain-on-failure", actionTimeout: 15_000 },
  outputDir: ".local/playwright-results",
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --port 3107",
    url: "http://localhost:3107/landing",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      PORTAL_E2E: "true",
      ...(process.env.AUTH_SECRET ? { AUTH_SECRET: process.env.AUTH_SECRET } : {}),
      ...(process.env.OTP_DEV_ENABLED ? { OTP_DEV_ENABLED: process.env.OTP_DEV_ENABLED } : {}),
    },
  },
});
