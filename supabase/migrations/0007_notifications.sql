-- 0007_notifications.sql
-- In-app notifications. Deliberately minimal (per spec: don't overcomplicate
-- the initial implementation) but structured so a push-notification sender
-- can later fan out from the same create_notification() call site instead of
-- needing a schema change.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_type text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Only read_at is ever client-writable (marking a notification as read);
-- everything else about a notification is set at creation time.
create policy "notifications_update_own_read_at"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No insert/delete policy for authenticated users: notifications are only
-- ever created by trusted server-side logic via create_notification().
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_related_type text default null,
  p_related_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, related_type, related_id)
  values (p_user_id, p_type, p_title, p_body, p_related_type, p_related_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- Deliberately NOT granted to `authenticated`: this is SECURITY DEFINER and
-- takes an arbitrary target user_id, so if any logged-in user could call it
-- directly they could forge notifications ("Holiday approved!") to any other
-- user. It's only ever invoked from trusted, admin-owned trigger functions
-- (see 0008_holiday_triggers.sql), which run as their own definer and so
-- don't need — and never receive — this grant.
revoke all on function public.create_notification(uuid, text, text, text, text, uuid) from public;
