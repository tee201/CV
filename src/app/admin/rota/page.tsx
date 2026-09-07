import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getShiftsForWeek } from "@/lib/data/shifts";
import { getActiveDrivers } from "@/lib/data/drivers";
import { getMonday, getWeekDates, formatWeekRange, addDays, toDateOnly } from "@/lib/shift/week";
import { DayCard } from "@/components/admin/rota/day-card";

export default async function AdminRotaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const monday = getMonday(week);
  const mondayStr = toDateOnly(monday);
  const weekDates = getWeekDates(mondayStr);
  const prevWeek = toDateOnly(addDays(monday, -7));
  const nextWeek = toDateOnly(addDays(monday, 7));

  const supabase = await createClient();
  const [shifts, drivers] = await Promise.all([getShiftsForWeek(supabase, weekDates), getActiveDrivers(supabase)]);

  const shiftsByDate = new Map<string, typeof shifts>();
  for (const date of weekDates) shiftsByDate.set(date, []);
  for (const shift of shifts) shiftsByDate.get(shift.shift_date)?.push(shift);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Rota</h1>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href={`/admin/rota?week=${prevWeek}`} className="text-blue-600">
            ← Prev
          </Link>
          <span className="text-slate-700">{formatWeekRange(mondayStr)}</span>
          <Link href={`/admin/rota?week=${nextWeek}`} className="text-blue-600">
            Next →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {weekDates.map((date) => (
          <DayCard key={date} date={date} shifts={shiftsByDate.get(date) ?? []} drivers={drivers} />
        ))}
      </div>
    </div>
  );
}
