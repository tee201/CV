import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

// A plain GET form: submitting it navigates the browser straight to the PDF
// route handler, which serves the file with a Content-Disposition that
// triggers a download — no client JS needed to drive that.
export function GeneratePayslipForm({ driverId }: { driverId: string }) {
  return (
    <form method="GET" action={`/admin/payslips/${driverId}/pdf`} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="From" name="from" type="date" required defaultValue={monthAgoStr()} />
        <TextField label="To" name="to" type="date" required defaultValue={todayStr()} />
      </div>
      <Button type="submit" variant="secondary">
        Download PDF payslip
      </Button>
    </form>
  );
}
