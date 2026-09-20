"use client";

import { useId, useMemo, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { calculateDayPay, calculatePeriodTotal, formatGBP, type PayslipEntry } from "@/lib/payslip/calculate";

type Row = Omit<PayslipEntry, "drops"> & { drops: string };

const todayStr = () => new Date().toISOString().slice(0, 10);

function emptyRow(): Row {
  return { id: crypto.randomUUID(), date: todayStr(), route: "", drops: "", isTraining: false };
}

function toEntry(row: Row): PayslipEntry {
  return { ...row, drops: Number(row.drops) || 0 };
}

export function PayslipCalculator() {
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const baseId = useId();

  const entries = useMemo(() => rows.map(toEntry), [rows]);
  const total = useMemo(() => calculatePeriodTotal(entries), [entries]);
  const totalDrops = entries.reduce((sum, e) => sum + e.drops, 0);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const drops = Number(row.drops) || 0;
          const dayPay = calculateDayPay(drops, row.isTraining);
          return (
            <div key={row.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Day {index + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove day"
                    onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                    className="min-h-8 min-w-8 rounded-lg text-lg text-slate-500"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Date"
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.id, { date: e.target.value })}
                />
                <TextField
                  label="Route number"
                  value={row.route}
                  onChange={(e) => updateRow(row.id, { route: e.target.value })}
                  placeholder="e.g. 12"
                />
              </div>

              <TextField
                label="Drops"
                type="number"
                inputMode="numeric"
                min={0}
                value={row.drops}
                disabled={row.isTraining}
                onChange={(e) => updateRow(row.id, { drops: e.target.value })}
                placeholder="0"
              />

              <label htmlFor={`${baseId}-training-${row.id}`} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  id={`${baseId}-training-${row.id}`}
                  type="checkbox"
                  checked={row.isTraining}
                  onChange={(e) => updateRow(row.id, { isTraining: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300"
                />
                Training day (flat £50)
              </label>

              <p className="text-right text-sm font-semibold text-slate-900">{formatGBP(dayPay)}</p>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="self-start text-sm font-medium text-blue-600"
        >
          + Add another day
        </button>
      </div>

      <section className="rounded-2xl bg-slate-800 p-5 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
          {rows.length} day{rows.length === 1 ? "" : "s"} · {totalDrops} drop{totalDrops === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-2xl font-bold">{formatGBP(total)}</p>
      </section>

      <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600">Pay rates</p>
        <p className="mt-1">£120/day for up to 120 drops.</p>
        <p>
          Above 120 drops: +£1.00/stop for drops 121-130, +£1.25/stop for 131-140, rising by £0.25 for every further
          10 drops.
        </p>
        <p>Training days pay a flat £50, whatever the drop count.</p>
      </div>
    </div>
  );
}
