import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttendanceRecord, Database, Shift } from "@/types/database";

export async function getActiveAttendance(
  supabase: SupabaseClient<Database>,
  driverId: string,
): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("driver_id", driverId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getNextShift(supabase: SupabaseClient<Database>, driverId: string): Promise<Shift | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("driver_id", driverId)
    .eq("status", "scheduled")
    .gte("shift_date", today)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUpcomingShifts(supabase: SupabaseClient<Database>, driverId: string): Promise<Shift[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("driver_id", driverId)
    .gte("shift_date", today)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}
