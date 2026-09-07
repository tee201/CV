import { getCurrentProfile } from "@/lib/auth/current-profile";
import { createClient } from "@/lib/supabase/server";
import { getPublishedAnnouncements, getAcknowledgedAnnouncementIds } from "@/lib/data/announcements";
import { acknowledgeAnnouncement } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/button";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AnnouncementsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [announcements, acknowledgedIds] = await Promise.all([
    getPublishedAnnouncements(supabase),
    getAcknowledgedAnnouncementIds(supabase, profile.id),
  ]);

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">Announcements</h1>

      {announcements.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No announcements yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((a) => {
            const needsAck = a.is_important && !acknowledgedIds.has(a.id);
            return (
              <li
                key={a.id}
                className={
                  a.is_important
                    ? "rounded-xl border-2 border-red-200 bg-red-50 p-4"
                    : "rounded-xl border border-slate-200 bg-white p-4"
                }
              >
                <div className="flex items-center gap-2">
                  {a.is_important && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Important</span>
                  )}
                  <p className="font-semibold text-slate-900">{a.title}</p>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{a.message}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(a.publish_date)}</p>

                {a.is_important &&
                  (needsAck ? (
                    <form action={acknowledgeAnnouncement} className="mt-3">
                      <input type="hidden" name="announcement_id" value={a.id} />
                      <Button type="submit" className="min-h-10 px-4 text-sm">
                        I acknowledge
                      </Button>
                    </form>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-green-700">Acknowledged</p>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
