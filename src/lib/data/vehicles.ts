import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyVehicle, Database } from "@/types/database";

export async function getActiveVehicles(supabase: SupabaseClient<Database>): Promise<CompanyVehicle[]> {
  const { data, error } = await supabase
    .from("company_vehicles")
    .select("*")
    .eq("is_active", true)
    .order("internal_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
