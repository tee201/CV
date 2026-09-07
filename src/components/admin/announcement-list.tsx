"use client";

import { useState } from "react";
import type { AdminAnnouncement } from "@/lib/data/announcements";
import { deleteAnnouncement } from "@/lib/actions/announcements";
import { AnnouncementForm } from "@/components/admin/announcement-form";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AnnouncementList({ announcements, activeDriverCount }: { announcements: AdminAnnouncement[]; activeDriverCount: number }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (announcements.length === 0) {
    return <p className="p-4 text-sm text-slate-500">No announcements yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {announcements.map((a) =>
        editingId === a.id ? (
          <li key={a.id} className="p-4">
            <AnnouncementForm announcement={a} onDone={() => setEditingId(null)} />
          </li>
        ) : (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{a.title}</p>
                {a.is_important && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Important</span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{a.message}</p>
              <p className="mt-1 text-xs text-slate-400">
                Publishes {formatDate(a.publish_date)}
                {a.is_important && ` · ${a.ackCount}/${activeDriverCount} drivers acknowledged`}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button type="button" onClick={() => setEditingId(a.id)} className="text-blue-600">
                Edit
              </button>
              <form
                action={deleteAnnouncement}
                onSubmit={(e) => {
                  if (!confirm("Delete this announcement?")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-red-600">
                  Delete
                </button>
              </form>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
