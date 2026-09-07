import { getCurrentProfile } from "@/lib/auth/current-profile";
import { ReportIncidentForm } from "@/components/incident/report-incident-form";

export default async function NewIncidentPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Report Incident</h1>
      <ReportIncidentForm driverId={profile.id} />
    </div>
  );
}
