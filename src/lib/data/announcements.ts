import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement, Database } from "@/types/database";

export async function getPublishedAnnouncements(supabase: SupabaseClient<Database>): Promise<Announcement[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .lte("publish_date", today)
    .order("publish_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAcknowledgedAnnouncementIds(
  supabase: SupabaseClient<Database>,
  driverId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("announcement_acknowledgements")
    .select("announcement_id")
    .eq("driver_id", driverId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.announcement_id));
}

export async function getUnacknowledgedImportantCount(
  supabase: SupabaseClient<Database>,
  driverId: string,
): Promise<number> {
  const [published, acknowledged] = await Promise.all([
    getPublishedAnnouncements(supabase),
    getAcknowledgedAnnouncementIds(supabase, driverId),
  ]);
  return published.filter((a) => a.is_important && !acknowledged.has(a.id)).length;
}

export type AdminAnnouncement = Announcement & { ackCount: number };

export async function getAllAnnouncementsWithAckCounts(
  supabase: SupabaseClient<Database>,
): Promise<AdminAnnouncement[]> {
  const [{ data: announcements, error: announcementsError }, { data: acks, error: acksError }] = await Promise.all([
    supabase.from("announcements").select("*").order("publish_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("announcement_acknowledgements").select("announcement_id"),
  ]);

  if (announcementsError) throw announcementsError;
  if (acksError) throw acksError;

  const counts = new Map<string, number>();
  for (const row of acks ?? []) counts.set(row.announcement_id, (counts.get(row.announcement_id) ?? 0) + 1);

  return (announcements ?? []).map((a) => ({ ...a, ackCount: counts.get(a.id) ?? 0 }));
}
