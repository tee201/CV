import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface ActiveDriverRow {
  attendanceId: string;
  driverName: string;
  vehicleType: "personal" | "company";
  checkInAt: string;
}

export interface UnstartedShiftRow {
  shiftId: string;
  driverName: string;
  startTime: string;
}

export interface AdminDashboardData {
  checkedInCount: number;
  checkedInDrivers: ActiveDriverRow[];
  scheduledTodayCount: number;
  unstartedShifts: UnstartedShiftRow[];
  activeDriverCount: number;
}

export async function getAdminDashboardData(supabase: SupabaseClient<Database>): Promise<AdminDashboardData> {
  const today = new Date().toISOString().slice(0, 10);

  const [activeAttendanceRes, shiftsTodayRes, activeDriverCountRes] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id, vehicle_type, check_in_at, shift_id, driver:profiles!attendance_records_driver_id_fkey(full_name)")
      .eq("status", "active"),
    supabase
      .from("shifts")
      .select("id, start_time, driver:profiles!shifts_driver_id_fkey(full_name)")
      .eq("shift_date", today)
      .eq("status", "scheduled")
      .not("driver_id", "is", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "driver").eq("employment_status", "active"),
  ]);

  if (activeAttendanceRes.error) throw activeAttendanceRes.error;
  if (shiftsTodayRes.error) throw shiftsTodayRes.error;
  if (activeDriverCountRes.error) throw activeDriverCountRes.error;

  const startedShiftIds = new Set(
    (activeAttendanceRes.data ?? []).map((row) => row.shift_id).filter((id): id is string => Boolean(id)),
  );

  const checkedInDrivers: ActiveDriverRow[] = (activeAttendanceRes.data ?? []).map((row) => ({
    attendanceId: row.id,
    // Supabase's generated types for embedded relations vary between array/object
    // depending on FK cardinality inference; normalise defensively here.
    driverName: (Array.isArray(row.driver) ? row.driver[0]?.full_name : (row.driver as { full_name: string } | null)?.full_name) ?? "Unknown driver",
    vehicleType: row.vehicle_type,
    checkInAt: row.check_in_at,
  }));

  const unstartedShifts: UnstartedShiftRow[] = (shiftsTodayRes.data ?? [])
    .filter((shift) => !startedShiftIds.has(shift.id))
    .map((shift) => ({
      shiftId: shift.id,
      driverName: (Array.isArray(shift.driver) ? shift.driver[0]?.full_name : (shift.driver as { full_name: string } | null)?.full_name) ?? "Unknown driver",
      startTime: shift.start_time,
    }));

  return {
    checkedInCount: checkedInDrivers.length,
    checkedInDrivers,
    scheduledTodayCount: shiftsTodayRes.data?.length ?? 0,
    unstartedShifts,
    activeDriverCount: activeDriverCountRes.count ?? 0,
  };
}
