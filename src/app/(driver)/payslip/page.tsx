import { PayslipCalculator } from "@/components/payslip/payslip-calculator";

// Purely client-side calculator — no DB read/write, so no server data fetch
// here. Nothing entered on this page is saved.
export default function PayslipPage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Payslip Calculator</h1>
      <p className="text-sm text-slate-500">
        Add each day you worked to estimate your pay for the period. Nothing here is saved or sent anywhere.
      </p>
      <PayslipCalculator />
    </div>
  );
}
