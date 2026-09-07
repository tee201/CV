"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-profile";

export interface ActionState {
  error: string | null;
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "under_review", "resolved"]),
});

export async function updateIncidentStatus(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) {
    return { error: "Invalid status update." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("incidents").update({ status: parsed.data.status }).eq("id", parsed.data.id);

  if (error) {
    return { error: "Could not update the status. Please try again." };
  }

  revalidatePath(`/admin/incidents/${parsed.data.id}`);
  revalidatePath("/admin/incidents");
  return { error: null };
}

const noteSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().min(1, "Enter a note.").max(2000),
});

export async function addIncidentNote(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = noteSchema.safeParse({ id: formData.get("id"), note: formData.get("note") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("incident_notes")
    .insert({ incident_id: parsed.data.id, admin_id: admin.id, note: parsed.data.note });

  if (error) {
    return { error: "Could not save the note. Please try again." };
  }

  revalidatePath(`/admin/incidents/${parsed.data.id}`);
  return { error: null };
}
