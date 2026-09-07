"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitHolidayRequest, type ActionState } from "@/lib/actions/holidays";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { error: null };
const todayStr = () => new Date().toISOString().slice(0, 10);

export function NewHolidayRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [state, formAction, isPending] = useActionState(submitHolidayRequest, initialState);
  const [rowIds, setRowIds] = useState<string[]>(() => [crypto.randomUUID()]);
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();

  useEffect(() => {
    // No local state reset needed here: the parent unmounts this form on a
    // successful submit (see NewRequestToggle), which discards `rowIds`
    // naturally. This effect only touches the DOM directly and calls out.
    if (state !== initialState && !state.error) {
      formRef.current?.reset();
      onSubmitted?.();
    }
    // onSubmitted is intentionally excluded: it's a fresh closure each render
    // and only `state` marks a new submission worth reacting to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Dates</span>
        {rowIds.map((rowId, index) => (
          <div key={rowId} className="flex items-center gap-2">
            <input
              type="date"
              name="dates"
              required
              min={todayStr()}
              aria-label={`Date ${index + 1}`}
              disabled={isPending}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-base"
            />
            {rowIds.length > 1 && (
              <button
                type="button"
                aria-label="Remove date"
                disabled={isPending}
                onClick={() => setRowIds((prev) => prev.filter((id) => id !== rowId))}
                className="min-h-12 min-w-12 rounded-xl border border-slate-200 text-lg text-slate-500"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={isPending}
          onClick={() => setRowIds((prev) => [...prev, crypto.randomUUID()])}
          className="self-start text-sm font-medium text-blue-600 disabled:text-slate-300"
        >
          + Add another date
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${baseId}-note`} className="text-sm font-medium text-slate-700">
          Note (optional)
        </label>
        <textarea
          id={`${baseId}-note`}
          name="note"
          rows={3}
          maxLength={500}
          disabled={isPending}
          className="rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
