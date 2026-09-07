"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-profile";
import { sendPushToUser } from "@/lib/push/send";

export interface ActionState {
  error: string | null;
}

const requestSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1, "Select at least one date."),
  note: z.string().trim().max(500).optional(),
});

export async function submitHolidayRequest(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const dates = formData.getAll("dates").map(String).filter(Boolean);
  const note = String(formData.get("note") ?? "");

  const parsed = requestSchema.safeParse({ dates, note });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_holiday_request", {
    p_dates: parsed.data.dates,
    p_note: parsed.data.note || null,
  });

  if (error) {
    return { error: "Could not submit your request. Please try again." };
  }

  revalidatePath("/requests");
  return { error: null };
}

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  response: z.string().trim().max(500).optional(),
});

export async function decideHolidayRequest(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = decisionSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    response: formData.get("response") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid decision." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holiday_requests")
    .update({
      status: parsed.data.decision,
      admin_id: admin.id,
      admin_response: parsed.data.response || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("status", "pending")
    .select("driver_id")
    .single();

  if (error) {
    return { error: "Could not save the decision. Please try again." };
  }

  await sendPushToUser(supabase, data.driver_id, {
    title: parsed.data.decision === "approved" ? "Holiday request approved" : "Holiday request rejected",
    body: parsed.data.response || undefined,
    url: "/requests",
  });

  revalidatePath("/admin/holidays");
  return { error: null };
}
