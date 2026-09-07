-- 0014_push_subscriptions.sql
-- Web Push subscriptions. One browser/device registration per row; a user
-- can have several (phone + desktop). Endpoint/keys are opaque to us — they
-- only mean anything to the browser vendor's push service — but they're
-- still capability tokens (anyone holding one can be sent notifications
-- addressed to that device), so treat them as sensitive: no public read.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own_or_admin"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- Needed for the resubscribe path: the client upserts on (endpoint) so a
-- browser that keeps the same push endpoint across sessions updates its
-- existing row (e.g. rotated keys) instead of erroring on the unique
-- constraint.
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
