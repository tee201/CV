"use client";

import { useActionState, useRef, useEffect } from "react";
import { createVehicle, type ActionState } from "@/lib/actions/vehicles";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: ActionState = { error: null };

export function AddVehicleForm() {
  const [state, formAction, isPending] = useActionState(createVehicle, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <TextField label="Internal name" name="internal_name" placeholder="Van 3" required disabled={isPending} />
      </div>
      <div className="flex-1">
        <TextField label="Registration" name="registration" placeholder="AB12 CDE" required disabled={isPending} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add vehicle"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700 sm:basis-full">
          {state.error}
        </p>
      )}
    </form>
  );
}
