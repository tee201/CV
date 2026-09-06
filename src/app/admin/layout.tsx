import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/current-profile";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <AdminSidebar />
      <main className="w-full flex-1 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
