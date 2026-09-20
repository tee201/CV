import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllDrivers } from "@/lib/data/drivers";

export default async function AdminPayslipsPage() {
  const supabase = await createClient();
  const drivers = await getAllDrivers(supabase);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payslips</h1>
        <p className="text-sm text-slate-500">Pick a driver to log their worked days and generate a payslip.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        {drivers.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No drivers added yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {drivers.map((driver) => (
              <li key={driver.id}>
                <Link
                  href={`/admin/payslips/${driver.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{driver.full_name}</p>
                    <p className="text-sm text-slate-500">{driver.email}</p>
                  </div>
                  <span
                    className={
                      driver.employment_status === "active"
                        ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    }
                  >
                    {driver.employment_status === "active" ? "Active" : "Inactive"}
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
