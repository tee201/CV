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
downsizes for mobile data) and stored in a private bucket. This includes a
HEIC-to-JPEG conversion step for iPhone drivers who pick an existing photo
from their library rather than shooting fresh through the camera prompt —
see `src/lib/image/process-photo.ts`. Most non-Safari browsers (this
includes most Android phones) have no built-in HEIC decoder at all and
fail outright without it; confirmed by hand with a real HEIC file both
before the fix (fails) and after (converts and uploads correctly) — see
the photo formats note below.

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

**Push notifications** — drivers opt in from Profile ("Enable notifications").
Sent (best-effort, alongside the same in-app notification, never instead of
it) for: holiday approved/rejected, an important announcement published, and
a shift being changed or cancelled — closing out all four notification
types the spec calls for. Service worker handles `push`/`notificationclick`
to show the notification and focus/open the right page.

**Audit log viewer** (`/admin/audit-log`) — every row `log_audit_event()`
writes (shift create/edit/delete, driver deactivate/reactivate, holiday
request/decision, incident status change, an important announcement being
published) shown newest-first, filterable by entity type, paginated with a
stable cursor (`created_at`, not an offset, so a new row written between
page loads can't shift already-seen rows onto the next page). Each entry
expands to the specific fields that changed — `status: pending → approved`
— rather than dumping the full before/after JSON blob. Nothing in the app
can write to `audit_logs` directly (see the security notes below); this
page only ever reads it.

## Push notifications: what's verified vs. what isn't

Verified end-to-end in this sandbox: the opt-in UI, the service worker
registering, `push_subscriptions` being written via RLS, and — importantly
— that a failed send never breaks the action it's attached to (approving a
holiday with a deliberately-fake, unreachable subscription in the database
still completed normally; the failure was swallowed inside
`sendPushToUser`).

**Not verified, and not verifiable in this environment:** an actual
notification arriving on a device. `PushManager.subscribe()` is a browser
API that talks to the browser vendor's real push service (FCM for Chrome,
Mozilla's for Firefox, etc.) — and Chromium **refuses to support the Push
API at all in incognito-style browser contexts** (this is a deliberate,
undetectable Chrome policy, not a bug: https://crbug.com/401439). Every
automated browser context — Playwright included — is exactly that kind of
context, so no amount of testing infrastructure in this repo can drive a
real subscription through a headless/automated Chrome. The only way to
verify real delivery is by hand, in an ordinary (non-incognito) browser
window, with real VAPID keys configured: open `/profile`, tap "Enable
notifications", approve a holiday request for that account from another
session, and confirm the OS notification appears.

## Photo formats: JPEG and HEIC

Most drivers will be on iPhones, which default to shooting HEIC. Verified
by hand with a real HEIC file (`tests/fixtures/photo.heic`, generated with
`pillow-heif`), both in an ad-hoc browser check and in the Playwright suite
(`tests/e2e/shifts.spec.ts`'s company-vehicle inspection test attaches a
mix of HEIC and JPEG; `tests/e2e/incidents.spec.ts` attaches one of each):

- **Before the fix:** a HEIC file failed outright in Chromium —
  `createImageBitmap()` rejected it, surfacing as "Could not read that
  photo. Try again." with no photo attached. Chromium has no built-in HEIC
  decoder at all, and most Android phones ship Chromium-based browsers, so
  this wasn't an iPhone-only edge case.
- **The fix** (`src/lib/image/process-photo.ts`): detect a HEIC/HEIF file
  (by MIME type, falling back to filename extension, falling back to
  sniffing the file's `ftyp` box directly for the rare case a picker hands
  over neither) and convert it to JPEG with `heic2any` — a WASM HEIF
  decoder — before the existing resize/re-encode/EXIF-strip step. Confirmed
  end-to-end: the converted photo uploads, and the stored bytes are a real,
  correctly-sized JPEG (checked by fetching it back and decoding it).
  `heic2any` is loaded via a dynamic `import()`, so its ~2.5MB WASM payload
  is never downloaded for the common case of a JPEG straight from the
  camera — confirmed in the production build output, where it lands in its
  own chunk, not the shared bundle.
- **Not verified, and can't be from this sandbox:** real Safari on a real
  iPhone. WebKit has its own native HEIC decoder, so the fix above is very
  likely redundant there rather than required — but this repo only has
  Chromium available, and Chromium can't decode HEIC either way, so that
  claim isn't something this test suite can confirm one way or the other.
  Worth a manual check on an actual iPhone (Safari and any installed PWA)
  before relying on it, since browser HEIC support has changed across iOS
  versions before.

## End-to-end tests

`tests/e2e/` has a Playwright suite covering the critical paths: login
(including a wrong password and a deactivated account), starting and
ending a shift on both a personal and a company vehicle (the real 3-photo
handover, with a throwaway JPEG fixture), a driver being blocked from a
second active shift, holiday request submit/approve/reject, incident
report + admin triage, and admin publishing an important announcement
through to a driver acknowledging it. One further test — a driver's direct
API query for another driver's data returning nothing — only runs against
a real Supabase project (see below); it's skipped otherwise rather than
giving a false pass.

Run it:

```
npm run test:e2e        # headless
npm run test:e2e:ui     # Playwright's interactive UI mode
```

**Test backend.** `playwright.config.ts` boots two local processes for the
run: `tests/support/mock-supabase-server.mjs` (a small hand-written stand-in
for the Supabase Auth/PostgREST/Storage HTTP APIs) and `next dev` pointed at
it. This makes the suite fast and dependency-free — no real Supabase project
needed to run it — but the mock **has no Row Level Security**. It implements
exactly the requests this app makes, filtered by whatever query the client
sends, so a test only proves the *application* asks for the right data —
never that the *database* would refuse a client that asked for the wrong
data on purpose. That guarantee lives entirely in the RLS policies under
`supabase/migrations/`, and the one test that specifically checks it
(`tests/e2e/rls-isolation.spec.ts`) is written to require a real project:

```
E2E_SUPABASE_URL=... E2E_SUPABASE_ANON_KEY=... \
E2E_DRIVER1_EMAIL=... E2E_DRIVER1_PASSWORD=... \
E2E_DRIVER2_EMAIL=... E2E_DRIVER2_PASSWORD=... \
npx playwright test tests/e2e/rls-isolation.spec.ts
```

Use a disposable/staging project for this, never production data.

**A real bug this suite caught while being written:** the deactivated-driver
test originally sent the browser into an infinite redirect loop. The cause
was `getCurrentProfile()` calling `supabase.auth.signOut()` from a Server
Component render (a layout), where cookie mutation is silently a no-op —
so the account's session was never actually cleared, and the app kept
bouncing between `/` and `/login?deactivated=1` forever. The fix moved that
check into `src/lib/supabase/middleware.ts`, the one place in the request
lifecycle that can actually write the cleared cookie onto the response.
Left as-is, a deactivated employee's existing session would have kept
working indefinitely — worth calling out given this project's stated
priority order puts security first.

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
