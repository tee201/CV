"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-profile";

export interface ActionState {
  error: string | null;
}

const timeRegex = /^\d{2}:\d{2}$/;

const shiftSchema = z
  .object({
    driver_id: z.string().uuid().optional().or(z.literal("")),
    shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
    start_time: z.string().regex(timeRegex, "Enter a start time."),
    end_time: z.string().regex(timeRegex, "Enter an end time.").optional().or(z.literal("")),
  })
  .refine((v) => !v.end_time || v.end_time > v.start_time, {
    message: "End time must be after start time.",
    path: ["end_time"],
  });

function parseShiftForm(formData: FormData) {
  return shiftSchema.safeParse({
    driver_id: formData.get("driver_id") ?? "",
    shift_date: formData.get("shift_date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time") ?? "",
  });
}

export async function createShift(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parseShiftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid shift details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").insert({
    driver_id: parsed.data.driver_id || null,
    shift_date: parsed.data.shift_date,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time || null,
    created_by: admin.id,
  });

  if (error) {
    return { error: "Could not create the shift. Please try again." };
  }

  revalidatePath("/admin/rota");
  return { error: null };
}

export async function updateShift(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = parseShiftForm(formData);
  if (!id || !parsed.success) {
    return { error: parsed.success ? "Missing shift id." : parsed.error.issues[0]?.message ?? "Invalid shift details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      driver_id: parsed.data.driver_id || null,
      shift_date: parsed.data.shift_date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time || null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Could not update the shift. Please try again." };
  }

  revalidatePath("/admin/rota");
  return { error: null };
}

export async function deleteShift(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("shifts").delete().eq("id", id);

  revalidatePath("/admin/rota");
}
