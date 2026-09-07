import type { ReactNode } from "react";
import { requireDriver } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { hasAcknowledgedCurrentPolicy } from "@/lib/data/policy";
import { PrivacyNoticeGate } from "@/components/policy/privacy-notice-gate";
import { BottomNav } from "@/components/driver/bottom-nav";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const profile = await requireDriver();
  const supabase = await createClient();

  if (!(await hasAcknowledgedCurrentPolicy(supabase, profile.id))) {
    return <PrivacyNoticeGate />;
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <main className="mx-auto min-h-dvh w-full max-w-md pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
