import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Shift } from "@/types/database";

export type ShiftWithDriver = Shift & { driverName: string | null };

export async function getShiftsForWeek(
  supabase: SupabaseClient<Database>,
  weekDates: string[],
): Promise<ShiftWithDriver[]> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*, driver:profiles!shifts_driver_id_fkey(full_name)")
    .gte("shift_date", weekDates[0])
    .lte("shift_date", weekDates[weekDates.length - 1])
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { driver, ...rest } = row as typeof row & { driver: { full_name: string } | { full_name: string }[] | null };
    const driverName = (Array.isArray(driver) ? driver[0]?.full_name : driver?.full_name) ?? null;
    return { ...rest, driverName };
  });
}
