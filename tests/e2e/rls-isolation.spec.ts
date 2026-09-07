import { test, expect } from "../support/fixtures";

// This is the one critical-path test that CANNOT be meaningfully run against
// tests/support/mock-supabase-server.mjs: that mock has no Row Level
// Security at all (see the header comment in that file) — it filters rows
// only by whatever query the client happens to send, so a driver's page
// never asking for another driver's data would pass this test even if the
// real database would happily hand it over to a raw query. Proving RLS
// actually stops cross-driver reads requires hitting a real Supabase
// project with the migrations in supabase/migrations/ applied.
//
// To run this for real: set E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY to a
// real (non-production, disposable-data) Supabase project, plus
// E2E_DRIVER1_EMAIL/PASSWORD and E2E_DRIVER2_EMAIL/PASSWORD for two active
// driver accounts on it that each have at least one row somewhere a driver
// can create one (e.g. a holiday request or incident). Then:
//
//   E2E_SUPABASE_URL=... E2E_SUPABASE_ANON_KEY=... \
//   E2E_DRIVER1_EMAIL=... E2E_DRIVER1_PASSWORD=... \
//   E2E_DRIVER2_EMAIL=... E2E_DRIVER2_PASSWORD=... \
//   npx playwright test tests/e2e/rls-isolation.spec.ts
//
// Without those set, this test is skipped rather than silently passing
// against the mock, which would prove nothing about RLS.
const hasRealSupabase =
  !!process.env.E2E_SUPABASE_URL &&
  !!process.env.E2E_SUPABASE_ANON_KEY &&
  !!process.env.E2E_DRIVER1_EMAIL &&
  !!process.env.E2E_DRIVER1_PASSWORD &&
  !!process.env.E2E_DRIVER2_EMAIL &&
  !!process.env.E2E_DRIVER2_PASSWORD;

test.describe("RLS isolation (real Supabase project only)", () => {
  test.skip(
    !hasRealSupabase,
    "Requires a real Supabase project — see the header comment in this file. The bundled mock backend has no RLS and would give a false pass.",
  );

  test("a driver's direct REST query for another driver's holiday requests returns nothing", async () => {
    const url = process.env.E2E_SUPABASE_URL!;
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY!;

    async function signIn(email: string, password: string): Promise<string> {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(body)}`);
      return body.access_token as string;
    }

    const driver1Email = process.env.E2E_DRIVER1_EMAIL!;
    const driver1Password = process.env.E2E_DRIVER1_PASSWORD!;
    const driver2Email = process.env.E2E_DRIVER2_EMAIL!;
    const driver2Password = process.env.E2E_DRIVER2_PASSWORD!;

    const driver1Token = await signIn(driver1Email, driver1Password);

    // Get driver1's own id via /auth/v1/user, then — as driver1 — try to
    // read ALL holiday_requests with no driver_id filter at all. If RLS is
    // working, PostgREST still only returns driver1's own rows (the policy
    // applies regardless of what the client asks for), never driver2's.
    const meRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${driver1Token}` },
    });
    const me = await meRes.json();

    const driver2Token = await signIn(driver2Email, driver2Password);
    const driver2MeRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${driver2Token}` },
    });
    const driver2Me = await driver2MeRes.json();

    const asDriver1AllRequests = await fetch(`${url}/rest/v1/holiday_requests?select=driver_id`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${driver1Token}` },
    });
    const rows: Array<{ driver_id: string }> = await asDriver1AllRequests.json();

    expect(rows.every((r) => r.driver_id === me.id)).toBe(true);
    expect(rows.some((r) => r.driver_id === driver2Me.id)).toBe(false);
  });
});
