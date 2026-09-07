"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: ActionState = { error: null };

function DeactivatedNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("deactivated") !== "1") return null;

  return (
    <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
      This account is no longer active. Contact your manager if you think this is a mistake.
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Driver Portal</h1>
        <p className="mt-1 text-slate-600">Sign in with your work account.</p>

        <Suspense fallback={null}>
          <DeactivatedNotice />
        </Suspense>

        <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={isPending}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
          />

          {state.error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <Button type="submit" fullWidth disabled={isPending}>
            {isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <Link href="/reset-password" className="mt-4 block text-center text-sm font-medium text-blue-600">
          Forgot your password?
        </Link>
      </div>
    </main>
  );
}
