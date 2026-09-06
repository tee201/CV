"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error: string | null;
}

const vehicleSchema = z.object({
  internal_name: z.string().trim().min(1, "Enter an internal name.").max(100),
  registration: z.string().trim().min(1, "Enter a registration.").max(20).toUpperCase(),
});

export async function createVehicle(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = vehicleSchema.safeParse({
    internal_name: formData.get("internal_name"),
    registration: formData.get("registration"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("company_vehicles").insert(parsed.data);

  if (error) {
    return { error: error.code === "23505" ? "A vehicle with that registration already exists." : "Could not add vehicle." };
  }

  revalidatePath("/admin/vehicles");
  return { error: null };
}

export async function updateVehicle(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = vehicleSchema.safeParse({
    internal_name: formData.get("internal_name"),
    registration: formData.get("registration"),
  });

  if (!id || !parsed.success) {
    return { error: parsed.success ? "Missing vehicle id." : parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("company_vehicles").update(parsed.data).eq("id", id);

  if (error) {
    return { error: error.code === "23505" ? "A vehicle with that registration already exists." : "Could not update vehicle." };
  }

  revalidatePath("/admin/vehicles");
  return { error: null };
}

export async function toggleVehicleActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("company_vehicles").update({ is_active: nextActive }).eq("id", id);
  revalidatePath("/admin/vehicles");
}
