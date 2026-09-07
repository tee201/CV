import { createClient } from "@/lib/supabase/server";
import { getAllAnnouncementsWithAckCounts } from "@/lib/data/announcements";
import { getActiveDrivers } from "@/lib/data/drivers";
import { NewAnnouncementToggle } from "@/components/admin/new-announcement-toggle";
import { AnnouncementList } from "@/components/admin/announcement-list";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const [announcements, drivers] = await Promise.all([
    getAllAnnouncementsWithAckCounts(supabase),
    getActiveDrivers(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        <NewAnnouncementToggle />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        <AnnouncementList announcements={announcements} activeDriverCount={drivers.length} />
      </section>
    </div>
  );
}
