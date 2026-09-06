"use client";

import { useActionState } from "react";
import { updatePassword, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: ActionState = { error: null };

export default function ConfirmResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>

        <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
          <TextField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isPending}
          />
          <TextField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isPending}
          />

          {state.error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <Button type="submit" fullWidth disabled={isPending}>
            {isPending ? "Saving…" : "Save new password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
