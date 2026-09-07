import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllIncidents } from "@/lib/data/incidents";
import { INCIDENT_TYPE_LABELS, INCIDENT_URGENCY_LABELS } from "@/lib/incident/types";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
};

const URGENCY_STYLES: Record<string, string> = {
  high: "text-red-700",
  medium: "text-amber-700",
  low: "text-slate-500",
};

export default async function AdminIncidentsPage() {
  const supabase = await createClient();
  const incidents = await getAllIncidents(supabase);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>

      <section className="rounded-xl border border-slate-200 bg-white">
        {incidents.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No incidents reported.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <Link href={`/admin/incidents/${incident.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {INCIDENT_TYPE_LABELS[incident.incident_type]} · {incident.driverName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(incident.occurred_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {incident.location} ·{" "}
                      <span className={URGENCY_STYLES[incident.urgency]}>{INCIDENT_URGENCY_LABELS[incident.urgency]} urgency</span>
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[incident.status]}`}>
                    {incident.status.replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
