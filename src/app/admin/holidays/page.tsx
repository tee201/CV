import { createClient } from "@/lib/supabase/server";
import { getHolidayRequests } from "@/lib/data/holidays";
import { HolidayDecisionForm } from "@/components/admin/holiday-decision-form";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function AdminHolidaysPage() {
  const supabase = await createClient();
  const [pending, decided] = await Promise.all([
    getHolidayRequests(supabase, "pending"),
    getHolidayRequests(supabase, ["approved", "rejected"], 20),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Holiday requests</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No pending requests.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {pending.map((request) => (
              <li key={request.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{request.driverName}</p>
                    <p className="text-sm text-slate-600">{request.dates.map(formatDate).join(", ")}</p>
                    {request.note && <p className="mt-1 text-sm italic text-slate-500">&ldquo;{request.note}&rdquo;</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    pending
                  </span>
                </div>
                <HolidayDecisionForm requestId={request.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Recent decisions</h2>
        {decided.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No decisions made yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-slate-100">
            {decided.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{request.driverName}</span>
                  <span className="text-slate-500"> · {request.dates.map(formatDate).join(", ")}</span>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                  {request.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
