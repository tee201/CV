"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-profile";

export interface ActionState {
  error: string | null;
}

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200),
  message: z.string().trim().min(1, "Enter a message.").max(4000),
  is_important: z.boolean(),
  publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function parseForm(formData: FormData) {
  return announcementSchema.safeParse({
    title: formData.get("title"),
    message: formData.get("message"),
    is_important: formData.get("is_important") === "on",
    publish_date: formData.get("publish_date") || new Date().toISOString().slice(0, 10),
  });
}

export async function createAnnouncement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid announcement." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, created_by: admin.id });

  if (error) {
    return { error: "Could not create the announcement. Please try again." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  return { error: null };
}

export async function updateAnnouncement(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = parseForm(formData);
  if (!id || !parsed.success) {
    return { error: parsed.success ? "Missing announcement id." : parsed.error.issues[0]?.message ?? "Invalid announcement." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update(parsed.data).eq("id", id);

  if (error) {
    return { error: "Could not update the announcement. Please try again." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  return { error: null };
}

export async function deleteAnnouncement(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
}

export async function acknowledgeAnnouncement(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const announcementId = String(formData.get("announcement_id") ?? "");
  if (!announcementId) return;

  await supabase.from("announcement_acknowledgements").insert({ announcement_id: announcementId, driver_id: user.id });

  revalidatePath("/announcements");
}
