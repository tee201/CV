import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/types/database";

export async function getActiveDrivers(supabase: SupabaseClient<Database>): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "driver")
    .eq("employment_status", "active")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
