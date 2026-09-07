import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, HolidayRequest, HolidayRequestStatus } from "@/types/database";

export type HolidayRequestWithDates = HolidayRequest & { dates: string[] };
export type AdminHolidayRequest = HolidayRequestWithDates & { driverName: string };

export async function getMyHolidayRequests(
  supabase: SupabaseClient<Database>,
  driverId: string,
): Promise<HolidayRequestWithDates[]> {
  const { data, error } = await supabase
    .from("holiday_requests")
    .select("*, holiday_request_dates(date)")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { holiday_request_dates, ...rest } = row as typeof row & {
      holiday_request_dates: { date: string }[];
    };
    return { ...rest, dates: holiday_request_dates.map((d) => d.date).sort() };
  });
}

export async function getHolidayRequests(
  supabase: SupabaseClient<Database>,
  status?: HolidayRequestStatus | HolidayRequestStatus[],
  limit?: number,
): Promise<AdminHolidayRequest[]> {
  let query = supabase
    .from("holiday_requests")
    .select("*, holiday_request_dates(date), driver:profiles!holiday_requests_driver_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (Array.isArray(status)) query = query.in("status", status);
  else if (status) query = query.eq("status", status);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { holiday_request_dates, driver, ...rest } = row as typeof row & {
      holiday_request_dates: { date: string }[];
      driver: { full_name: string } | { full_name: string }[] | null;
    };
    const driverName = (Array.isArray(driver) ? driver[0]?.full_name : driver?.full_name) ?? "Unknown driver";
    return { ...rest, dates: holiday_request_dates.map((d) => d.date).sort(), driverName };
  });
}
