import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Both photo buckets are private — nothing is readable via a plain public
// URL, only via a short-lived signed URL that RLS on storage.objects still
// gates (see the storage policies in the migrations). Call this server-side
// with a client carrying the viewer's session, right before rendering, so
// the link expires quickly rather than being cached/shared indefinitely.
export async function getSignedUrls(
  supabase: SupabaseClient<Database>,
  bucket: string,
  paths: string[],
  expiresInSeconds = 300,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;

  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
  }
  return map;
}
