import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { hasAcknowledgedCurrentPolicy } from "@/lib/data/policy";
import { PrivacyNoticeGate } from "@/components/policy/privacy-notice-gate";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  if (!(await hasAcknowledgedCurrentPolicy(supabase, profile.id))) {
    return <PrivacyNoticeGate />;
  }

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <AdminSidebar />
      <main className="w-full flex-1 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
