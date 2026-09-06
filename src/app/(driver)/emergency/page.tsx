import { Button } from "@/components/ui/button";

// Static safety content only — no dependency on network/DB, so this page
// works even if the rest of the app is degraded.
const COMPANY_EMERGENCY_NUMBER = process.env.NEXT_PUBLIC_COMPANY_EMERGENCY_PHONE ?? "";

export default function EmergencyPage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Emergency Help</h1>

      <section className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
        <h2 className="text-lg font-bold text-red-800">Life-threatening or immediate danger?</h2>
        <p className="mt-1 text-sm text-red-800">
          Call <strong>999</strong> now. Do this first — an in-app report is not monitored in real time and does
          not replace calling emergency services.
        </p>
        <a href="tel:999" className="mt-4 block">
          <Button fullWidth variant="danger" className="text-lg">
            Call 999
          </Button>
        </a>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Not an emergency, but need help now?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Contact the on-duty manager for breakdowns, non-urgent vehicle issues, or anything else that can&apos;t
          wait until you&apos;re back.
        </p>
        {COMPANY_EMERGENCY_NUMBER ? (
          <a href={`tel:${COMPANY_EMERGENCY_NUMBER}`} className="mt-4 block">
            <Button fullWidth>Call the on-duty manager</Button>
          </a>
        ) : (
          <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
            No manager contact number has been configured yet. Ask your admin to set
            NEXT_PUBLIC_COMPANY_EMERGENCY_PHONE.
          </p>
        )}
      </section>

      <p className="text-center text-xs text-slate-400">
        Only use your phone when it is safe and legal to do so. Pull over and stop the vehicle before making a call.
      </p>
    </div>
  );
}
