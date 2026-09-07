-- 0013_announcements.sql
-- Company announcements. Drivers see published ones (publish_date <= now);
-- important ones ask for an explicit acknowledgement, which admins can see
-- per-driver — mirrors the holiday/policy acknowledgement patterns already
-- in this schema.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  is_important boolean not null default false,
  publish_date date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_publish_date_idx on public.announcements (publish_date);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create table public.announcement_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (announcement_id, driver_id)
);

create index announcement_ack_announcement_idx on public.announcement_acknowledgements (announcement_id);

alter table public.announcements enable row level security;
alter table public.announcement_acknowledgements enable row level security;

-- Everyone (driver or admin) can read published announcements; admins can
-- also see ones scheduled for the future (so they can review drafts).
create policy "announcements_select_published_or_admin"
  on public.announcements for select
  to authenticated
  using (publish_date <= current_date or public.is_admin());

create policy "announcements_admin_write"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "announcement_ack_select_own_or_admin"
  on public.announcement_acknowledgements for select
  to authenticated
  using (driver_id = auth.uid() or public.is_admin());

create policy "announcement_ack_insert_own"
  on public.announcement_acknowledgements for insert
  to authenticated
  with check (driver_id = auth.uid());

create or replace function public.audit_announcement_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_important then
    perform public.log_audit_event('announcement.created_important', 'announcement', new.id, null, to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger announcements_audit_created
  after insert on public.announcements
  for each row execute function public.audit_announcement_created();
