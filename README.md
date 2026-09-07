# Driver Ops

A mobile-first PWA for managing a parcel delivery company's drivers and
day-to-day operations: attendance/shift tracking with vehicle handover
photo inspections, rota, and (in progress) holidays, incidents and
announcements.

## Stack

Next.js (App Router) + TypeScript, Supabase (Postgres, Auth, Storage) with
Row Level Security as the primary authorization boundary, Tailwind CSS, a
hand-written service worker for PWA installability.

## Setup

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` in order against it (via the
   Supabase CLI: `supabase link` then `supabase db push`, or paste each file
   into the SQL editor in order).
3. Copy `.env.example` to `.env.local` and fill in your project URL/anon key.
4. `npm install`
5. `npm run dev`

The first real employee accounts should be created via Supabase Auth (e.g.
inviting users from the dashboard, or a signup flow you control) with
`role: 'admin'` or `role: 'driver'` in `raw_user_meta_data`; the
`handle_new_user` trigger provisions their `profiles` row automatically.
Give at least one account `role: 'admin'` metadata so there's someone who can
manage vehicles.

## What's implemented

**Foundation** — auth (login, logout, password reset), roles (`driver` /
`admin`) enforced by RLS at the database level (not just in the UI),
driver and admin app shells, PWA manifest/icons/service worker.

**Driver shift workflow** — start/end shift, personal vs. company vehicle,
the required 3-photo internal handover inspection (cab / rear / cargo) for
company vehicles, enforced by database constraints so a shift cannot start
or end with missing photos and a driver cannot hold two active shifts at
once. Photos are re-encoded client-side before upload (strips EXIF/GPS,
downsizes for mobile data) and stored in a private bucket.

**Admin** — operations dashboard (who's checked in, who hasn't started a
scheduled shift), company vehicle management, a week-view rota builder
(create/edit/delete shifts, assign or unassign a driver, prev/next week
navigation), holiday request approvals (approve/reject with an optional
response to the driver).

**Rota** — driver read-only upcoming-shifts view; admin full CRUD week view.

**Holiday requests** — driver picks one or more dates plus an optional note
and submits; status (pending/approved/rejected) and any admin response are
visible on the same page. Admin sees pending requests grouped separately
from recent decisions. Every request creation and decision is written to
the audit log, and a decision creates an in-app notification for the driver
(surfaced as a dismissible card at the top of their dashboard, since the
bottom nav has no spare slot for a dedicated notifications tab).

**Profile** and a static **Emergency Help** page are also built.

## What's deferred

Incident reporting, announcements, the full notification system (push,
shift-change alerts), driver account management, an audit log viewer UI,
and the Playwright suite are designed into the schema/RLS plan but not yet
built — they show as "coming soon" in the driver nav rather than fake data.
Building all of the above to a real standard needed more than one pass; see
git history / follow-up work for progress.

## Security notes

- Every table has RLS enabled; role checks use a `SECURITY DEFINER`
  `is_admin()` function, never a client-supplied claim.
- Shift start/end and inspection completion go through Postgres functions
  (`start_shift`, `end_shift`, `create_vehicle_inspection`,
  `complete_vehicle_inspection`) so the "3 photos before shift starts/ends"
  rule is enforced atomically in the database, not just in the UI.
- Vehicle inspection photos live in a private storage bucket; objects are
  only readable by the uploading driver or an admin.
- The service worker never caches or queues Supabase requests — only the
  static app shell. Actions like Start Shift/End Shift and photo upload
  always hit the network live and show a clear error rather than a false
  "success" when offline.

This app supports the company's ability to meet its UK GDPR obligations
(access control, audit trail, data minimisation in what's collected) but
does not itself constitute legal compliance — the company still needs its
own privacy notice, retention policy, and DPIA where applicable.
