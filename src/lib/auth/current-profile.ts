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

  // A deactivated account keeps a valid Supabase Auth session (Auth doesn't
  // know about our employment_status column), so this check is what actually
  // stops a former/suspended employee from using the app once their profile
  // is flagged inactive. Sign the session out rather than just redirecting,
  // so the stale cookie can't just be reused to bypass this on the next load.
  if (profile.employment_status !== "active") {
    await supabase.auth.signOut();
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
