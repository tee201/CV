import { createClient } from "@/lib/supabase/server";
import { AddVehicleForm } from "@/components/admin/add-vehicle-form";
import { toggleVehicleActive } from "@/lib/actions/vehicles";
import { Button } from "@/components/ui/button";

export default async function AdminVehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles, error } = await supabase
    .from("company_vehicles")
    .select("*")
    .order("internal_name", { ascending: true });

  if (error) throw error;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Company vehicles</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Add a vehicle</h2>
        <AddVehicleForm />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        {vehicles.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No vehicles added yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{vehicle.internal_name}</p>
                  <p className="text-sm text-slate-500">{vehicle.registration}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      vehicle.is_active
                        ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    }
                  >
                    {vehicle.is_active ? "Active" : "Inactive"}
                  </span>
                  <form action={toggleVehicleActive}>
                    <input type="hidden" name="id" value={vehicle.id} />
                    <input type="hidden" name="nextActive" value={(!vehicle.is_active).toString()} />
                    <Button type="submit" variant="secondary" className="min-h-9 px-3 text-sm">
                      {vehicle.is_active ? "Deactivate" : "Activate"}
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
