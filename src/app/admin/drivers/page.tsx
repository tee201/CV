import { createClient } from "@/lib/supabase/server";
import { getAllDrivers } from "@/lib/data/drivers";
import { getAcknowledgedUserIds } from "@/lib/data/policy";
import { AddDriverForm } from "@/components/admin/add-driver-form";
import { setDriverEmploymentStatus } from "@/lib/actions/drivers";
import { Button } from "@/components/ui/button";

export default async function AdminDriversPage() {
  const supabase = await createClient();
  const [drivers, acknowledgedIds] = await Promise.all([getAllDrivers(supabase), getAcknowledgedUserIds(supabase)]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Add a driver</h2>
        <AddDriverForm />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        {drivers.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No drivers added yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {drivers.map((driver) => (
              <li key={driver.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{driver.full_name}</p>
                  <p className="text-sm text-slate-500">
                    {driver.email}
                    {driver.phone ? ` · ${driver.phone}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {acknowledgedIds.has(driver.id) ? "Privacy notice acknowledged" : "Privacy notice not yet seen"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      driver.employment_status === "active"
                        ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    }
                  >
                    {driver.employment_status === "active" ? "Active" : "Inactive"}
                  </span>
                  <form action={setDriverEmploymentStatus}>
                    <input type="hidden" name="id" value={driver.id} />
                    <input
                      type="hidden"
                      name="nextStatus"
                      value={driver.employment_status === "active" ? "inactive" : "active"}
                    />
                    <Button type="submit" variant="secondary" className="min-h-9 px-3 text-sm">
                      {driver.employment_status === "active" ? "Deactivate" : "Reactivate"}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
