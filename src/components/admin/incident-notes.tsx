"use client";

import { useActionState, useRef, useEffect } from "react";
import { addIncidentNote, type ActionState } from "@/lib/actions/incidents";
import type { IncidentNote } from "@/types/database";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { error: null };

export function IncidentNotes({ incidentId, notes }: { incidentId: string; notes: IncidentNote[] }) {
  const [state, formAction, isPending] = useActionState(addIncidentNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold text-slate-900">Internal notes</h2>
      <p className="text-xs text-slate-400">Only visible to admins — never shown to the reporting driver.</p>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>{note.note}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(note.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={incidentId} />
        <textarea
          name="note"
          rows={2}
          placeholder="Add an internal note"
          disabled={isPending}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {state.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={isPending} className="min-h-10 self-start px-4 text-sm">
          {isPending ? "Adding…" : "Add note"}
        </Button>
      </form>
    </div>
  );
}
