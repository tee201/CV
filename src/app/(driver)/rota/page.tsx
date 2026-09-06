import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingShifts } from "@/lib/data/attendance";

function formatShiftDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function RotaPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const shifts = await getUpcomingShifts(supabase, profile.id);

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Your rota</h1>

      {shifts.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No upcoming shifts have been scheduled yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shifts.map((shift) => (
            <li key={shift.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-slate-900">{formatShiftDate(shift.shift_date)}</p>
                <p className="text-sm text-slate-600">
                  {shift.start_time.slice(0, 5)}
                  {shift.end_time ? ` – ${shift.end_time.slice(0, 5)}` : ""}
                </p>
              </div>
              <span
                className={
                  shift.status === "cancelled"
                    ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                    : "rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                }
              >
                {shift.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
