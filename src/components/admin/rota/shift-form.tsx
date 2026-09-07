"use client";

import { useActionState, useEffect } from "react";
import { createShift, updateShift, type ActionState } from "@/lib/actions/shifts";
import type { Profile } from "@/types/database";
import type { ShiftWithDriver } from "@/lib/data/shifts";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { error: null };

interface ShiftFormProps {
  dayDate: string;
  drivers: Profile[];
  shift?: ShiftWithDriver;
  onDone: () => void;
}

export function ShiftForm({ dayDate, drivers, shift, onDone }: ShiftFormProps) {
  const action = shift ? updateShift : createShift;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {shift && <input type="hidden" name="id" value={shift.id} />}
      <input type="hidden" name="shift_date" value={dayDate} />

      <select
        name="driver_id"
        defaultValue={shift?.driver_id ?? ""}
        disabled={isPending}
        className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
      >
        <option value="">Unassigned</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.full_name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="time"
          name="start_time"
          required
          defaultValue={shift?.start_time.slice(0, 5)}
          disabled={isPending}
          className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <input
          type="time"
          name="end_time"
          defaultValue={shift?.end_time?.slice(0, 5) ?? ""}
          disabled={isPending}
          className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="min-h-10 flex-1 text-sm">
          {isPending ? "Saving…" : shift ? "Save changes" : "Add shift"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={onDone} className="min-h-10 flex-1 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}
