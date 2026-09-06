import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getActiveAttendance } from "@/lib/data/attendance";
import { EndShiftFlow } from "@/components/shift/end-shift-flow";

export default async function EndShiftPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const activeAttendance = await getActiveAttendance(supabase, profile.id);

  if (!activeAttendance) {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">End Shift</h1>
      <EndShiftFlow driverId={profile.id} attendance={activeAttendance} />
    </div>
  );
}
