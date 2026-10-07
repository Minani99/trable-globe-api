import { defineConfig, devices } from "@playwright/test";

const isWindows = process.platform === "win32";
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim().replace(/\/+$/, "");
const backendCommand = isWindows
  ? "mvn.cmd -B spring-boot:run"
  : "chmod +x ./mvnw && ./mvnw -B spring-boot:run";

export default defineConfig({
  testDir: "./e2e",
  // The profile journeys generate share images while a WebGL globe is mounted.
  // GitHub's software-rendered browser can legitimately take longer than a local
  // GPU-backed run, so leave enough room for the complete user journey.
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // CI has no GPU. Respecting the reduced-motion path prevents the ambient
    // globe rotation from competing with clicks and assertions on a loaded worker.
    contextOptions: {
      reducedMotion: process.env.CI ? "reduce" : "no-preference",
    },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: externalBaseUrl ? undefined : [
    {
      command: backendCommand,
      cwd: "..",
      url: "http://127.0.0.1:8080/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1",
      cwd: ".",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_BASE_URL: "http://127.0.0.1:8080",
        // The suite creates many independent accounts from one loopback address.
        // This only affects the local test server; production retains its limit.
        AUTH_RATE_LIMIT: "1000",
      },
    },
  ],
});
