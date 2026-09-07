import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIncidentById, getIncidentPhotos, getIncidentNotes } from "@/lib/data/incidents";
import { getSignedUrls } from "@/lib/storage/signed-urls";
import { INCIDENT_TYPE_LABELS, INCIDENT_URGENCY_LABELS } from "@/lib/incident/types";
import { IncidentStatusForm } from "@/components/admin/incident-status-form";
import { IncidentNotes } from "@/components/admin/incident-notes";

export default async function AdminIncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const incident = await getIncidentById(supabase, id);
  if (!incident) notFound();

  const [photos, notes] = await Promise.all([getIncidentPhotos(supabase, id), getIncidentNotes(supabase, id)]);
  const signedUrls = await getSignedUrls(supabase, "incident-photos", photos.map((p) => p.storage_path));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 md:max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{INCIDENT_TYPE_LABELS[incident.incident_type]}</h1>
        <p className="text-sm text-slate-500">Reported by {incident.driverName}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">When</dt>
            <dd className="text-slate-900">
              {new Date(incident.occurred_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Location</dt>
            <dd className="text-slate-900">{incident.location}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Urgency</dt>
            <dd className="text-slate-900">{INCIDENT_URGENCY_LABELS[incident.urgency]}</dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-700">{incident.description}</p>
      </section>

      {photos.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-slate-900">Photos</h2>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) =>
              signedUrls[photo.storage_path] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.id}
                  src={signedUrls[photo.storage_path]}
                  alt=""
                  className="h-28 w-28 rounded-lg object-cover"
                />
              ) : null,
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-slate-900">Status</h2>
        <IncidentStatusForm incidentId={incident.id} currentStatus={incident.status} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <IncidentNotes incidentId={incident.id} notes={notes} />
      </section>
    </div>
  );
}
