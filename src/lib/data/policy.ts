import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { POLICY_VERSION } from "@/lib/policy/privacy-notice";

export async function hasAcknowledgedCurrentPolicy(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("policy_acknowledgements")
    .select("id")
    .eq("user_id", userId)
    .eq("policy_version", POLICY_VERSION)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function getAcknowledgedUserIds(supabase: SupabaseClient<Database>): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("policy_acknowledgements")
    .select("user_id")
    .eq("policy_version", POLICY_VERSION);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.user_id));
}
