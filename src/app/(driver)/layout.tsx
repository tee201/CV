import type { ReactNode } from "react";
import { requireDriver } from "@/lib/auth/current-profile";
import { BottomNav } from "@/components/driver/bottom-nav";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  await requireDriver();

  return (
    <div className="min-h-dvh bg-slate-50">
      <main className="mx-auto min-h-dvh w-full max-w-md pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
