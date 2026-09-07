import { acknowledgePrivacyNotice } from "@/lib/actions/policy";
import { logout } from "@/lib/actions/auth";
import { PrivacyNoticeContent } from "@/components/policy/privacy-notice-content";
import { Button } from "@/components/ui/button";

export function PrivacyNoticeGate() {
  return (
    <main className="flex min-h-dvh flex-col bg-slate-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <h1 className="text-xl font-bold text-slate-900">Before you continue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Please read how we handle your data. You need to acknowledge this to keep using the app.
        </p>

        <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <PrivacyNoticeContent />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <form action={acknowledgePrivacyNotice}>
            <Button type="submit" fullWidth>
              I acknowledge
            </Button>
          </form>
          <form action={logout}>
            <button type="submit" className="w-full text-center text-sm text-slate-500 underline underline-offset-2">
              Sign out instead
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
