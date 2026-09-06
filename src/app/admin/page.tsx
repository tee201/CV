import { createClient } from "@/lib/supabase/server";
import { getAdminDashboardData } from "@/lib/data/admin-dashboard";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const data = await getAdminDashboardData(supabase);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Operations dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Checked in now" value={data.checkedInCount} />
        <StatCard label="Active drivers" value={data.activeDriverCount} />
        <StatCard label="Scheduled today" value={data.scheduledTodayCount} />
        <StatCard label="Not started yet" value={data.unstartedShifts.length} warn={data.unstartedShifts.length > 0} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Currently checked in</h2>
        {data.checkedInDrivers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No drivers are currently on shift.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-slate-100">
            {data.checkedInDrivers.map((row) => (
              <li key={row.attendanceId} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-900">{row.driverName}</span>
                <span className="text-slate-500">
                  {row.vehicleType === "company" ? "Company vehicle" : "Personal vehicle"} · since{" "}
                  {new Date(row.checkInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Scheduled but not started today</h2>
        {data.unstartedShifts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Every scheduled driver has checked in.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-slate-100">
            {data.unstartedShifts.map((row) => (
              <li key={row.shiftId} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-900">{row.driverName}</span>
                <span className="text-amber-700">Due {row.startTime.slice(0, 5)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
