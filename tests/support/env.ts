// Shared constants for pointing the app at the mock Supabase server during
// the e2e run. Imported by playwright.config.ts (to build the webServer env)
// and by test files (to know the port/base URL without hardcoding twice).
export const MOCK_SUPABASE_PORT = 5555;
export const MOCK_SUPABASE_URL = `http://localhost:${MOCK_SUPABASE_PORT}`;
export const APP_PORT = 3100;
export const APP_BASE_URL = `http://localhost:${APP_PORT}`;
