import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WorkLog } from "@/types/database";

export async function getWorkLogsForDriver(
  supabase: SupabaseClient<Database>,
  driverId: string,
  range?: { from: string; to: string },
): Promise<WorkLog[]> {
  let query = supabase.from("work_logs").select("*").eq("driver_id", driverId);
  if (range) {
    query = query.gte("work_date", range.from).lte("work_date", range.to);
  }

  const { data, error } = await query.order("work_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
