import { defineConfig, devices } from "@playwright/test";

const isWindows = process.platform === "win32";
const backendCommand = isWindows
  ? "mvn.cmd -B spring-boot:run"
  : "chmod +x ./mvnw && ./mvnw -B spring-boot:run";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
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
      },
    },
  ],
});
