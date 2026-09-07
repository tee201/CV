"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // RLS scopes this to the caller's own notifications — no need to filter by
  // user_id here, an attempt to mark someone else's notification is simply
  // a no-op match.
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);

  revalidatePath("/");
}
