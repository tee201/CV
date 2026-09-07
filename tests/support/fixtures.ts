import { test as base, expect, type Page } from "@playwright/test";
import { MOCK_SUPABASE_URL } from "./env";

export { expect };

/**
 * Logs in through the real login form — this is itself the "driver login"
 * critical-path test when called from one, and just setup when called from
 * others. Waits for the resulting navigation churn to fully settle before
 * returning, however many redirects that takes: a successful login redirects
 * once (to "/"); a deactivated account's session bounces through a second,
 * server-side redirect after that (see middleware.ts) before landing back on
 * /login?deactivated=1; a wrong password never navigates at all (the form
 * just re-renders with an error). Calling page.goto() again immediately
 * after clicking Sign in (several specs do, right after logging in as admin)
 * can otherwise race whichever of those is still in flight — observed in
 * practice as a test navigating to an admin page and silently landing back
 * on /login because the session cookie hadn't been applied yet.
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
}

/** Resets the mock backend to its seeded fixture state. Call at the start of each spec file's first test (or in beforeAll) so one file's writes never leak into another's assertions. */
export async function resetMockServer(): Promise<void> {
  const res = await fetch(`${MOCK_SUPABASE_URL}/__test__/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to reset mock Supabase server: ${res.status}`);
}

export const test = base;
