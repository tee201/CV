"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveWorkLog, type ActionState } from "@/lib/actions/work-logs";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: ActionState = { error: null };
const todayStr = () => new Date().toISOString().slice(0, 10);

export function AddWorkLogForm({ driverId }: { driverId: string }) {
  const [state, formAction, isPending] = useActionState(saveWorkLog, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="driver_id" value={driverId} />

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" name="work_date" type="date" required max={todayStr()} disabled={isPending} />
        <TextField label="Route number" name="route_number" required maxLength={50} placeholder="e.g. 12" disabled={isPending} />
      </div>

      <TextField
        label="Drops"
        name="drops"
        type="number"
        inputMode="numeric"
        min={0}
        max={999}
        disabled={isPending}
        placeholder="0"
      />

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="is_training" disabled={isPending} className="h-5 w-5 rounded border-slate-300" />
        Training day (flat £50, drops are ignored)
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save day"}
      </Button>
      <p className="text-xs text-slate-400">Saving a date that&apos;s already logged updates that day instead of duplicating it.</p>
    </form>
  );
}
