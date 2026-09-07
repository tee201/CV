import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { APP_BASE_URL, APP_PORT, MOCK_SUPABASE_PORT, MOCK_SUPABASE_URL } from "./tests/support/env";

// Some sandboxes provide a pre-installed Chromium at a fixed path instead of
// one matching Playwright's own version registry (where `npx playwright
// install` would normally put it). Use it only if present; otherwise fall
// back to Playwright's default resolution, which is what a normal dev
// machine or CI runner (after `npx playwright install`) will have.
const SANDBOX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const executablePath = existsSync(SANDBOX_CHROMIUM_PATH) ? SANDBOX_CHROMIUM_PATH : undefined;

// The mock Supabase server keeps all state in memory for the lifetime of the
// process and has no Row Level Security (see the header comment in
// tests/support/mock-supabase-server.mjs), so this suite runs single-worker
// and in file order: tests share one backend instance and must not race each
// other for it. Each spec file resets the backend to its seeded fixture
// state at the start of its first test.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,
  use: {
    baseURL: APP_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: [
    {
      command: `node tests/support/mock-supabase-server.mjs`,
      port: MOCK_SUPABASE_PORT,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_SUPABASE_PORT: String(MOCK_SUPABASE_PORT) },
    },
    {
      command: `npm run dev -- -p ${APP_PORT}`,
      port: APP_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        // Points the app at the mock backend instead of a real Supabase
        // project — see tests/support/mock-supabase-server.mjs for what
        // that does and doesn't prove.
        NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "mock-service-role-key",
        NEXT_PUBLIC_SITE_URL: APP_BASE_URL,
        NEXT_PUBLIC_COMPANY_EMERGENCY_PHONE: "+447700900000",
        // Push notifications deliberately left unconfigured: Chromium
        // refuses the Push API in the incognito-style contexts Playwright
        // always uses (crbug.com/401439), so there is nothing this suite
        // could verify there — see README's push notifications section.
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "",
        VAPID_PRIVATE_KEY: "",
        VAPID_SUBJECT: "mailto:test@example.com",
      },
    },
  ],
});
