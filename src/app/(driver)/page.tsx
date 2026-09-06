import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getActiveAttendance, getNextShift } from "@/lib/data/attendance";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

function formatDuration(sinceIso: string): string {
  const ms = Date.now() - new Date(sinceIso).getTime();
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatShiftDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function DriverDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [activeAttendance, nextShift] = await Promise.all([
    getActiveAttendance(supabase, profile.id),
    getNextShift(supabase, profile.id),
  ]);

  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Welcome back,</p>
          <h1 className="text-xl font-bold text-slate-900">{firstName}</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm font-medium text-slate-500 underline underline-offset-2">
            Sign out
          </button>
        </form>
      </header>

      <section
        aria-live="polite"
        className={
          activeAttendance
            ? "rounded-2xl bg-green-600 p-5 text-white shadow-sm"
            : "rounded-2xl bg-slate-800 p-5 text-white shadow-sm"
        }
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
          {activeAttendance ? "Currently checked in" : "Currently checked out"}
        </p>
        {activeAttendance ? (
          <>
            <p className="mt-1 text-2xl font-bold">{formatDuration(activeAttendance.check_in_at)}</p>
            <p className="mt-0.5 text-sm text-white/80">
              {activeAttendance.vehicle_type === "company" ? "Company vehicle" : "Personal vehicle"} · started{" "}
              {new Date(activeAttendance.check_in_at).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </>
        ) : (
          <p className="mt-1 text-lg font-semibold">Not on shift</p>
        )}

        <Link href={activeAttendance ? "/shift/end" : "/shift/start"} className="mt-4 block">
          <Button
            fullWidth
            variant={activeAttendance ? "danger" : "primary"}
            className={activeAttendance ? "" : "bg-white text-slate-900 hover:bg-slate-100"}
          >
            {activeAttendance ? "End Shift" : "Start Shift"}
          </Button>
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-500">Next shift</h2>
        {nextShift ? (
          <div className="mt-1">
            <p className="font-semibold text-slate-900">{formatShiftDate(nextShift.shift_date)}</p>
            <p className="text-sm text-slate-600">
              {nextShift.start_time.slice(0, 5)}
              {nextShift.end_time ? ` – ${nextShift.end_time.slice(0, 5)}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">No upcoming shifts scheduled.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/rota" label="View Rota" />
          <QuickAction href="/requests" label="Request Holiday" />
          <QuickAction href="/incidents" label="Report Incident" />
          <QuickAction href="/emergency" label="Emergency Help" emphasis="danger" />
        </div>
      </section>
    </div>
  );
}

function QuickAction({ href, label, emphasis }: { href: string; label: string; emphasis?: "danger" }) {
  return (
    <Link
      href={href}
      className={
        emphasis === "danger"
          ? "flex min-h-16 items-center justify-center rounded-xl border-2 border-red-200 bg-red-50 px-3 text-center text-sm font-semibold text-red-700"
          : "flex min-h-16 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-800"
      }
    >
      {label}
    </Link>
  );
}
