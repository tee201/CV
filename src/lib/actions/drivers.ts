"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error: string | null;
}

const createDriverSchema = z.object({
  full_name: z.string().trim().min(1, "Enter a name.").max(200),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function createDriverAccount(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = createDriverSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
      role: "driver",
    },
  });

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already")
        ? "An account with that email already exists."
        : "Could not create the account. Please try again.",
    };
  }

  revalidatePath("/admin/drivers");
  return { error: null };
}

export async function setDriverEmploymentStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const nextStatus = formData.get("nextStatus") === "active" ? "active" : "inactive";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ employment_status: nextStatus }).eq("id", id);

  revalidatePath("/admin/drivers");
}
