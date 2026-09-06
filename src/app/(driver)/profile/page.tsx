import { getCurrentProfile } from "@/lib/auth/current-profile";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Profile</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <dl className="flex flex-col gap-3">
          <Field label="Name" value={profile.full_name} />
          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phone ?? "Not provided"} />
          <Field label="Role" value={profile.role === "admin" ? "Administrator" : "Driver"} />
        </dl>
      </div>

      <form action={logout}>
        <Button type="submit" variant="secondary" fullWidth>
          Sign out
        </Button>
      </form>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
