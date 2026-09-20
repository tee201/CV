"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error: string | null;
}

const workLogSchema = z.object({
  driver_id: z.string().uuid(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  route_number: z.string().trim().min(1, "Enter a route number.").max(50),
  drops: z.coerce.number().int("Drops must be a whole number.").min(0, "Drops can't be negative.").max(999),
  is_training: z.coerce.boolean(),
});

export async function saveWorkLog(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = workLogSchema.safeParse({
    driver_id: formData.get("driver_id"),
    work_date: formData.get("work_date"),
    route_number: formData.get("route_number"),
    drops: formData.get("drops") || "0",
    is_training: formData.get("is_training") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("work_logs")
    .upsert({ ...parsed.data, created_by: admin.id }, { onConflict: "driver_id,work_date" });

  if (error) {
    return { error: "Could not save that day. Please try again." };
  }

  revalidatePath(`/admin/payslips/${parsed.data.driver_id}`);
  return { error: null };
}

export async function deleteWorkLog(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const driverId = String(formData.get("driver_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("work_logs").delete().eq("id", id);

  revalidatePath(`/admin/payslips/${driverId}`);
}
