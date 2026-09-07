"use client";

import { useState } from "react";
import type { Profile } from "@/types/database";
import type { ShiftWithDriver } from "@/lib/data/shifts";
import { deleteShift } from "@/lib/actions/shifts";
import { formatDayHeading } from "@/lib/shift/week";
import { ShiftForm } from "@/components/admin/rota/shift-form";
import { clsx } from "@/lib/clsx";

interface DayCardProps {
  date: string;
  shifts: ShiftWithDriver[];
  drivers: Profile[];
}

export function DayCard({ date, shifts, drivers }: DayCardProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <div className={clsx("rounded-xl border bg-white p-4", isToday ? "border-blue-300" : "border-slate-200")}>
      <h3 className="font-semibold text-slate-900">{formatDayHeading(date)}</h3>

      {shifts.length === 0 && !adding && <p className="mt-2 text-sm text-slate-400">No shifts scheduled.</p>}

      <ul className="mt-2 flex flex-col gap-2">
        {shifts.map((shift) =>
          editingId === shift.id ? (
            <ShiftForm key={shift.id} dayDate={date} drivers={drivers} shift={shift} onDone={() => setEditingId(null)} />
          ) : (
            <li key={shift.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <div>
                <span className={clsx("font-medium", shift.driverName ? "text-slate-900" : "text-amber-700")}>
                  {shift.driverName ?? "Unassigned"}
                </span>
                <span className="ml-2 text-slate-500">
                  {shift.start_time.slice(0, 5)}
                  {shift.end_time ? ` – ${shift.end_time.slice(0, 5)}` : ""}
                </span>
              </div>
              <div className="flex shrink-0 gap-3">
                <button type="button" onClick={() => setEditingId(shift.id)} className="text-blue-600">
                  Edit
                </button>
                <form
                  action={deleteShift}
                  onSubmit={(e) => {
                    if (!confirm("Delete this shift?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={shift.id} />
                  <button type="submit" className="text-red-600">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <ShiftForm dayDate={date} drivers={drivers} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-3 text-sm font-medium text-blue-600">
          + Add shift
        </button>
      )}
    </div>
  );
}
