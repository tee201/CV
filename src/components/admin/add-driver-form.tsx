"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createDriverAccount, type ActionState } from "@/lib/actions/drivers";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: ActionState = { error: null };

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 10);
}

export function AddDriverForm() {
  const [state, formAction, isPending] = useActionState(createDriverAccount, initialState);
  // React resets a form's uncontrolled fields automatically once its action
  // succeeds — by the time this component re-renders with the new `state`,
  // the email field is already cleared. Capture it at submit time instead,
  // before that reset happens.
  const submittedRef = useRef<{ email: string; password: string } | null>(null);
  const [password, setPassword] = useState("");
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (state !== initialState && !state.error && submittedRef.current) {
      setLastCreated(submittedRef.current);
      setPassword("");
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      <form
        action={formAction}
        onSubmit={(e) => {
          const formData = new FormData(e.currentTarget);
          submittedRef.current = { email: String(formData.get("email") ?? ""), password };
        }}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex-1 basis-48">
          <TextField label="Full name" name="full_name" placeholder="Jamie Rivera" required disabled={isPending} />
        </div>
        <div className="flex-1 basis-48">
          <TextField label="Email" name="email" type="email" placeholder="jamie@example.com" required disabled={isPending} />
        </div>
        <div className="flex-1 basis-40">
          <TextField label="Phone (optional)" name="phone" placeholder="+44…" disabled={isPending} />
        </div>
        <div className="flex-1 basis-48">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Initial password</span>
            <div className="flex gap-2">
              <input
                name="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isPending}
                className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-base"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                disabled={isPending}
                className="whitespace-nowrap rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Add driver"}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-red-700 sm:basis-full">
            {state.error}
          </p>
        )}
      </form>

      {lastCreated && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Account created for <strong>{lastCreated.email}</strong> with password{" "}
          <code className="rounded bg-white px-1.5 py-0.5">{lastCreated.password}</code>. Give this to the driver now
          — it won&apos;t be shown again. They can change it any time from the login page&apos;s &ldquo;Forgot your
          password?&rdquo; link.
        </p>
      )}
    </div>
  );
}
