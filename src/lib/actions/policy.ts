"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POLICY_VERSION } from "@/lib/policy/privacy-notice";

export async function acknowledgePrivacyNotice(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("policy_acknowledgements").insert({ user_id: user.id, policy_version: POLICY_VERSION });

  revalidatePath("/");
  revalidatePath("/admin");
}
