-- 0012_incidents.sql
-- Incident reporting: a driver reports an incident (accident, breakdown,
-- safety issue, etc.), optionally with photos; an admin triages it (status,
-- internal notes). Internal notes are admin-only — a driver never sees them,
-- since they're for operational/HR handling, not for the reporting driver.

create type public.incident_type as enum ('vehicle_accident', 'vehicle_issue', 'breakdown', 'safety_issue', 'route_issue', 'other');
create type public.incident_urgency as enum ('low', 'medium', 'high');
create type public.incident_status as enum ('new', 'under_review', 'resolved');

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  incident_type public.incident_type not null,
  occurred_at timestamptz not null,
  location text not null,
  description text not null,
  urgency public.incident_urgency not null default 'medium',
  status public.incident_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_driver_idx on public.incidents (driver_id);
create index incidents_status_idx on public.incidents (status);

create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

create table public.incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

create table public.incident_notes (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  admin_id uuid not null references public.profiles (id),
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.incidents enable row level security;
alter table public.incident_photos enable row level security;
alter table public.incident_notes enable row level security;

create policy "incidents_select_own_or_admin"
  on public.incidents for select
  to authenticated
  using (driver_id = auth.uid() or public.is_admin());

create policy "incidents_insert_own"
  on public.incidents for insert
  to authenticated
  with check (driver_id = auth.uid());

-- Admins change status; a driver's report is theirs to create but not to
-- edit afterwards (matches "incident reports must be linked to the
-- reporting driver" — editable history would undermine that as a record).
create policy "incidents_update_admin_only"
  on public.incidents for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "incident_photos_select_own_or_admin"
  on public.incident_photos for select
  to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.incidents i where i.id = incident_id and i.driver_id = auth.uid())
  );

create policy "incident_photos_insert_own"
  on public.incident_photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.incidents i where i.id = incident_id and i.driver_id = auth.uid())
  );

-- Admin-only in both directions: internal notes are never visible to the
-- reporting driver.
create policy "incident_notes_admin_only"
  on public.incident_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.audit_incident_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status then
    perform public.log_audit_event(
      'incident.status_changed', 'incident', new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger incidents_audit_status
  after update of status on public.incidents
  for each row execute function public.audit_incident_status_change();

insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', false)
on conflict (id) do nothing;

create policy "incident_photos_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'incident-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "incident_photos_storage_select_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'incident-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
