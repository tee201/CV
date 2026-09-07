"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { logout } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/rota", label: "Rota" },
  { href: "/admin/holidays", label: "Holiday requests" },
  { href: "/admin/vehicles", label: "Company vehicles" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Admin"
        className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex"
      >
        <p className="mb-6 px-2 text-lg font-bold text-slate-900">Operations</p>
        <ul className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={clsx(
                    "block rounded-lg px-3 py-2 text-sm font-medium",
                    isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={logout}>
          <button type="submit" className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100">
            Sign out
          </button>
        </form>
      </nav>

      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden"
      >
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex min-h-14 flex-1 items-center justify-center text-xs font-semibold",
                isActive ? "text-blue-600" : "text-slate-500",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
