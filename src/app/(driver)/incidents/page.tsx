import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getMyIncidents } from "@/lib/data/incidents";
import { INCIDENT_TYPE_LABELS } from "@/lib/incident/types";
import { Button } from "@/components/ui/button";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
};

export default async function IncidentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const incidents = await getMyIncidents(supabase, profile.id);

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Incidents</h1>

      <Link href="/incidents/new">
        <Button fullWidth variant="danger">
          Report Incident
        </Button>
      </Link>

      {incidents.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          You haven&apos;t reported any incidents.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {incidents.map((incident) => (
            <li key={incident.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{INCIDENT_TYPE_LABELS[incident.incident_type]}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(incident.occurred_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {incident.location}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[incident.status]}`}>
                  {incident.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{incident.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
