import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuditLogs, AUDIT_ENTITY_TYPES } from "@/lib/data/audit-logs";
import { auditActionLabel, auditEntityTypeLabel } from "@/lib/audit/labels";
import { diffFields, formatFieldValue } from "@/lib/audit/diff";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity_type?: string; before?: string }>;
}) {
  const { entity_type: entityType, before } = await searchParams;
  const supabase = await createClient();
  const { entries, nextCursor } = await getAuditLogs(supabase, { entityType, before });

  const filterHref = (nextEntityType: string | undefined) =>
    nextEntityType ? `/admin/audit-log?entity_type=${nextEntityType}` : "/admin/audit-log";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every accountability-relevant action, written by the database itself — this list can&apos;t be edited or
          deleted from the app.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <Link
          href={filterHref(undefined)}
          className={!entityType ? "rounded-full bg-blue-600 px-3 py-1.5 text-white" : "rounded-full bg-slate-100 px-3 py-1.5 text-slate-700"}
        >
          All
        </Link>
        {AUDIT_ENTITY_TYPES.map((type) => (
          <Link
            key={type}
            href={filterHref(type)}
            className={
              entityType === type
                ? "rounded-full bg-blue-600 px-3 py-1.5 text-white"
                : "rounded-full bg-slate-100 px-3 py-1.5 text-slate-700"
            }
          >
            {auditEntityTypeLabel(type)}
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No audit entries{entityType ? " for this filter" : ""} yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const changes = diffFields(entry.before, entry.after);
              return (
                <li key={entry.id} className="p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-semibold text-slate-900">{auditActionLabel(entry.action)}</p>
                    <p className="text-xs text-slate-400">{formatTimestamp(entry.created_at)}</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {auditEntityTypeLabel(entry.entity_type)}
                    {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""} · by{" "}
                    {entry.actorName ?? (entry.actor_id ? "Unknown user" : "System")}
                  </p>

                  {changes.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600">
                        {entry.before === null
                          ? `${changes.length} field${changes.length > 1 ? "s" : ""} recorded`
                          : entry.after === null
                            ? `${changes.length} field${changes.length > 1 ? "s" : ""} at deletion`
                            : `${changes.length} field${changes.length > 1 ? "s" : ""} changed`}
                      </summary>
                      <dl className="mt-2 flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-xs">
                        {changes.map(({ key, before: beforeValue, after: afterValue }) => (
                          <div key={key} className="flex flex-wrap gap-1">
                            <dt className="font-mono font-semibold text-slate-600">{key}:</dt>
                            <dd className="font-mono text-slate-500">
                              {entry.before === null ? (
                                formatFieldValue(afterValue)
                              ) : entry.after === null ? (
                                formatFieldValue(beforeValue)
                              ) : (
                                <>
                                  {formatFieldValue(beforeValue)} <span aria-hidden>→</span> {formatFieldValue(afterValue)}
                                </>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {nextCursor && (
        <Link
          href={`/admin/audit-log?${entityType ? `entity_type=${entityType}&` : ""}before=${encodeURIComponent(nextCursor)}`}
          className="self-center text-sm font-medium text-blue-600"
        >
          Load older entries →
        </Link>
      )}
    </div>
  );
}
