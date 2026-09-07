import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    // Push is an enhancement layered on top of in-app notifications, not a
    // dependency of them — a site running without VAPID keys configured
    // should keep working, just without push delivery. Never throw here.
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

// Sends to every device the user has subscribed on. Best-effort: a failed
// send for one device (or push not configured at all) never blocks the
// caller — the in-app notification this normally accompanies has already
// been written by the time this runs.
export async function sendPushToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // The push service confirms this subscription is gone (browser
          // unsubscribed, or the endpoint expired) — clean it up so we stop
          // trying.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}

export async function sendPushToUsers(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  await Promise.all(userIds.map((id) => sendPushToUser(supabase, id, payload)));
}
