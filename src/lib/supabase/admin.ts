import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client: bypasses RLS entirely. Only ever import this from
// "use server" files that have already called requireAdmin() themselves —
// never expose it to a client component, and never call it without an
// explicit admin check immediately before, since every query through it is
// unrestricted. Its only real job today is auth.admin.* (creating an
// employee's login), which has no RLS-respecting equivalent.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
