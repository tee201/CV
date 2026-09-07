import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogRow, Database } from "@/types/database";

export type AuditLogEntry = AuditLogRow & { actorName: string | null };

// Every entity_type any trigger currently writes (supabase/migrations/0002,
// 0004, 0009, 0012, 0013) — kept as a single source of truth for the filter
// dropdown so a new audited table doesn't silently fall through the UI.
export const AUDIT_ENTITY_TYPES = ["shift", "profile", "holiday_request", "incident", "announcement"] as const;

const PAGE_SIZE = 50;

export interface AuditLogPage {
  entries: AuditLogEntry[];
  // Cursor for "load older" — the created_at of the last row on this page,
  // used as a `lt` filter rather than an offset so a new row written between
  // page loads can't shift already-seen rows onto the next page.
  nextCursor: string | null;
}

export async function getAuditLogs(
  supabase: SupabaseClient<Database>,
  options: { entityType?: string; before?: string } = {},
): Promise<AuditLogPage> {
  let query = supabase
    .from("audit_logs")
    .select("*, actor:profiles!audit_logs_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (options.entityType) query = query.eq("entity_type", options.entityType);
  if (options.before) query = query.lt("created_at", options.before);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const entries = rows.map((row) => {
    const { actor, ...rest } = row as typeof row & { actor: { full_name: string } | { full_name: string }[] | null };
    const actorName = (Array.isArray(actor) ? actor[0]?.full_name : actor?.full_name) ?? null;
    return { ...rest, actorName };
  });

  return {
    entries,
    nextCursor: rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  };
}
