"use client";

import { useActionState } from "react";
import { updateIncidentStatus, type ActionState } from "@/lib/actions/incidents";
import type { IncidentStatus } from "@/types/database";

const initialState: ActionState = { error: null };
const OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
];

export function IncidentStatusForm({ incidentId, currentStatus }: { incidentId: string; currentStatus: IncidentStatus }) {
  const [state, formAction, isPending] = useActionState(updateIncidentStatus, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={incidentId} />
      <select
        key={currentStatus}
        name="status"
        defaultValue={currentStatus}
        disabled={isPending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-slate-400">Saving…</span>}
      {state.error && (
        <span role="alert" className="text-xs text-red-700">
          {state.error}
        </span>
      )}
    </form>
  );
}
