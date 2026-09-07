"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-profile";
import { sendPushToUser } from "@/lib/push/send";

function formatShiftForPush(dateStr: string, startTime: string, endTime: string | null): string {
  const date = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return endTime ? `${date} ${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}` : `${date} ${startTime.slice(0, 5)}`;
}

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
  const { data: before } = await supabase.from("shifts").select("driver_id").eq("id", id).single();

  const newDriverId = parsed.data.driver_id || null;
  const { error } = await supabase
    .from("shifts")
    .update({
      driver_id: newDriverId,
      shift_date: parsed.data.shift_date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time || null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Could not update the shift. Please try again." };
  }

  // In-app notifications for this are created by a database trigger
  // (migration 0016) so they fire regardless of how the row changes; push is
  // driven from here since Postgres can't reach an external push service.
  if (before?.driver_id && before.driver_id !== newDriverId) {
    await sendPushToUser(supabase, before.driver_id, {
      title: "Shift removed from your rota",
      url: "/rota",
    });
  }
  if (newDriverId) {
    await sendPushToUser(supabase, newDriverId, {
      title: "Your shift was updated",
      body: formatShiftForPush(parsed.data.shift_date, parsed.data.start_time, parsed.data.end_time || null),
      url: "/rota",
    });
  }

  revalidatePath("/admin/rota");
  return { error: null };
}

export async function deleteShift(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: shift } = await supabase.from("shifts").select("driver_id, shift_date").eq("id", id).single();

  await supabase.from("shifts").delete().eq("id", id);

  if (shift?.driver_id) {
    await sendPushToUser(supabase, shift.driver_id, {
      title: "Shift cancelled",
      body: `Your shift on ${new Date(`${shift.shift_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} has been removed.`,
      url: "/rota",
    });
  }

  revalidatePath("/admin/rota");
}
