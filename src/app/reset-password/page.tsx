"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: ActionState = { error: null };

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
        <p className="mt-1 text-slate-600">We&apos;ll email you a link to choose a new password.</p>

        {state !== initialState && !state.error ? (
          <p className="mt-8 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            If that email is registered, a reset link is on its way.
          </p>
        ) : (
          <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
            <TextField label="Email" name="email" type="email" autoComplete="username" required disabled={isPending} />
            {state.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </p>
            )}
            <Button type="submit" fullWidth disabled={isPending}>
              {isPending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
