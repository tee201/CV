import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getActiveAttendance, getNextShift } from "@/lib/data/attendance";
import { getActiveVehicles } from "@/lib/data/vehicles";
import { StartShiftFlow } from "@/components/shift/start-shift-flow";

export default async function StartShiftPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [activeAttendance, nextShift, vehicles] = await Promise.all([
    getActiveAttendance(supabase, profile.id),
    getNextShift(supabase, profile.id),
    getActiveVehicles(supabase),
  ]);

  if (activeAttendance) {
    redirect("/");
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayShiftId = nextShift && nextShift.shift_date === today ? nextShift.id : null;

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Start Shift</h1>
      <StartShiftFlow driverId={profile.id} shiftId={todayShiftId} vehicles={vehicles} />
    </div>
  );
}
