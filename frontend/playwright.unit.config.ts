import { defineConfig } from "@playwright/test";

/**
 * Logic tests that need no browser, backend or dev server. They run in seconds, so they
 * belong in every push; the browser journeys in ./e2e cover what only a real page can.
 */
export default defineConfig({
  testDir: "./unit",
  testMatch: "**/*.test.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "line" : "list",
});
