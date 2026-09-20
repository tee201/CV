import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDriverById } from "@/lib/data/drivers";
import { getWorkLogsForDriver } from "@/lib/data/work-logs";
import { deleteWorkLog } from "@/lib/actions/work-logs";
import { calculateDayPay, formatGBP } from "@/lib/payslip/calculate";
import { AddWorkLogForm } from "@/components/admin/payslips/add-work-log-form";
import { GeneratePayslipForm } from "@/components/admin/payslips/generate-payslip-form";
import { Button } from "@/components/ui/button";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminDriverPayslipPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const supabase = await createClient();

  const driver = await getDriverById(supabase, driverId);
  if (!driver) notFound();

  const workLogs = await getWorkLogsForDriver(supabase, driverId);
  const recentLogs = [...workLogs].reverse();

  return (
    <div className="flex flex-col gap-6 p-4 md:max-w-2xl md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{driver.full_name}</h1>
        <p className="text-sm text-slate-500">{driver.email}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Log a worked day</h2>
        <AddWorkLogForm driverId={driverId} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Generate payslip</h2>
        <GeneratePayslipForm driverId={driverId} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="p-4 pb-0 font-semibold text-slate-900">Logged days</h2>
        {recentLogs.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No days logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{formatDate(log.work_date)}</p>
                  <p className="text-sm text-slate-500">
                    Route {log.route_number} · {log.is_training ? "Training day" : `${log.drops} drops`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{formatGBP(calculateDayPay(log.drops, log.is_training))}</span>
                  <form action={deleteWorkLog}>
                    <input type="hidden" name="id" value={log.id} />
                    <input type="hidden" name="driver_id" value={driverId} />
                    <Button type="submit" variant="secondary" className="min-h-9 px-3 text-sm">
                      Remove
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
