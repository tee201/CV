import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// Server-side helper: who is logged in and what's their role. Used by route
// group layouts to gate driver-only / admin-only areas. This is a UX
// convenience, not the security boundary — RLS policies are what actually
// stop a driver from reading another driver's data, even if this check were
// somehow bypassed.
export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error || !profile) {
    redirect("/login");
  }

  // Defense in depth: middleware (src/lib/supabase/middleware.ts) is what
  // actually terminates a deactivated employee's session, because it's the
  // only place that can clear the auth cookie (a Server Component render
  // has no response to attach that mutation to — calling signOut() here is
  // a no-op that silently does nothing, which used to cause an infinite
  // redirect loop). This check should be unreachable in practice since
  // middleware runs first on every request, but it stays as a second layer
  // in case this function is ever called from a context middleware doesn't
  // cover.
  if (profile.employment_status !== "active") {
    redirect("/login?deactivated=1");
  }

  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    redirect("/");
  }
  return profile;
}

export async function requireDriver(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "driver") {
    redirect("/admin");
  }
  return profile;
}
