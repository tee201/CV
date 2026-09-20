-- 0017_work_logs.sql
-- Daily work records behind the payslip generator: for each day a driver
-- worked, the route they ran and how many drops they made (or that it was a
-- training day, which pays a flat rate regardless of drops). Entered by an
-- admin, not self-reported by drivers, since pay is calculated directly
-- from these numbers. One row per driver per day — an admin corrects a
-- mislogged day by re-saving it rather than creating a duplicate.

create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  route_number text not null,
  drops integer not null default 0,
  is_training boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (driver_id, work_date)
);

create index work_logs_driver_date_idx on public.work_logs (driver_id, work_date);

create trigger work_logs_set_updated_at
  before update on public.work_logs
  for each row execute function public.set_updated_at();

alter table public.work_logs enable row level security;

create policy "work_logs_select_own_or_admin"
  on public.work_logs for select
  to authenticated
  using (driver_id = auth.uid() or public.is_admin());

create policy "work_logs_insert_admin"
  on public.work_logs for insert
  to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy "work_logs_update_admin"
  on public.work_logs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "work_logs_delete_admin"
  on public.work_logs for delete
  to authenticated
  using (public.is_admin());

create or replace function public.audit_work_log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit_event('work_log.created', 'work_log', new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.log_audit_event('work_log.updated', 'work_log', new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_audit_event('work_log.deleted', 'work_log', old.id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

create trigger work_logs_audit
  after insert or update or delete on public.work_logs
  for each row execute function public.audit_work_log_change();
