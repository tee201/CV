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
3. Copy `.env.example` to `.env.local` and fill in your project URL/anon key,
   plus `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API > service_role) —
   required for the admin "create driver account" feature. Never expose this
   key to the client; it's only read from server-side code.
4. `npm install`
5. `npm run dev`

Admin accounts always need to be created directly via Supabase Auth (invite
from the dashboard, or `auth.admin.createUser`) with `role: 'admin'` in
`raw_user_meta_data`; the `handle_new_user` trigger provisions their
`profiles` row automatically. Driver accounts can then be created by an
admin from `/admin/drivers` in the app itself — that flow always creates
`role: 'driver'` by design, not admins.

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

**Incident reporting** — driver reports an incident (type, when/where,
description, urgency, 0-5 optional photos through the same EXIF-strip/
downscale pipeline as vehicle inspections) and can track its status. Admin
gets a triage view per incident: photos via short-lived signed URLs, a
status control (new/under review/resolved), and internal notes that are
never shown to the reporting driver. Status changes are audited.

**Announcements** — admin creates/edits/deletes, flags one as important,
sets a publish date. Drivers see published ones, with important ones
visually distinct and requiring an explicit "I acknowledge"; admins see how
many active drivers have acknowledged each important announcement.
Unacknowledged important announcements also surface as a banner on the
driver dashboard.

**Driver account management** — admin creates a driver's login (name,
email, phone, initial password) via the Supabase Auth admin API — see
`SUPABASE_SERVICE_ROLE_KEY` below — and can deactivate/reactivate. A
deactivated account is actually blocked (not just hidden from lists): its
session is signed out on next request, and the shift/holiday RPCs also
check `employment_status` server-side, not only the app layer.

**Privacy notice acknowledgement** — a versioned in-app notice (not a
GDPR consent mechanism — see the note below on why) that every employee
must acknowledge before using the app; admins can see who has and hasn't
per driver. Content lives in
`src/components/policy/privacy-notice-content.tsx` — it's a starting point,
not reviewed legal text.

## What's deferred

Push notifications, shift-change alerts, an audit log viewer UI, and the
Playwright suite are designed into the schema/RLS plan but not yet built.
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

**Note on the privacy notice / consent:** the in-app "I acknowledge" gate is
a transparency mechanism (UK GDPR Article 13 — employees must be told what's
collected and why), not a consent mechanism. Consent is generally not a
valid lawful basis for ordinary employee data, since an employee can't
freely refuse it — the ICO's guidance is explicit on this. Don't repurpose
the acknowledgement flow as if declining it were a real option; the
"Sign out instead" link exists so a driver isn't forced to click through
something they haven't read, not as a way to opt out of data collection
that's necessary for their employment.
