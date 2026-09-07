// Mirrors the fixed test accounts seeded by tests/support/mock-supabase-server.mjs.
// Kept as a plain duplicate (rather than importing the .mjs from a .ts test
// file) since the mock server runs as a standalone Node process and this
// file is consumed by Playwright's TypeScript test files — the ids/emails
// must simply stay in sync, which is easy given how rarely they change.
export const TEST_USERS = {
  driver1: { email: "jamie.rivera@example.com", password: "password123", fullName: "Jamie Rivera" },
  driver2: { email: "alex.chen@example.com", password: "password123", fullName: "Alex Chen" },
  admin: { email: "sam.okafor@example.com", password: "password123", fullName: "Sam Okafor" },
  deactivatedDriver: { email: "priya.nair@example.com", password: "password123", fullName: "Priya Nair" },
} as const;
