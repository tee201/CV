"use client";

import { useActionState } from "react";
import { decideHolidayRequest, type ActionState } from "@/lib/actions/holidays";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { error: null };

export function HolidayDecisionForm({ requestId }: { requestId: string }) {
  const [state, formAction, isPending] = useActionState(decideHolidayRequest, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
      <input type="hidden" name="id" value={requestId} />
      <textarea
        name="response"
        placeholder="Optional response to the driver"
        rows={2}
        maxLength={500}
        disabled={isPending}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="approved" disabled={isPending} className="flex-1">
          Approve
        </Button>
        <Button type="submit" name="decision" value="rejected" variant="danger" disabled={isPending} className="flex-1">
          Reject
        </Button>
      </div>
    </form>
  );
}
