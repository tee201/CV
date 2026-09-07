import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getMyHolidayRequests } from "@/lib/data/holidays";
import { NewRequestToggle } from "@/components/holiday/requests-page-client";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function RequestsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const requests = await getMyHolidayRequests(supabase, profile.id);

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Holiday requests</h1>

      <NewRequestToggle />

      {requests.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          You haven&apos;t requested any holiday yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((request) => (
            <li key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">{request.dates.map(formatDate).join(", ")}</p>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                  {request.status}
                </span>
              </div>
              {request.note && <p className="mt-1 text-sm text-slate-600">{request.note}</p>}
              {request.admin_response && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">Response: </span>
                  {request.admin_response}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
