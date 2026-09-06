-- 0002_audit_logs.sql
-- Append-only audit trail for accountability-relevant admin actions.
-- Never written to directly by client code with the anon/authenticated role;
-- only via SECURITY DEFINER helper log_audit_event(), which stamps the real actor.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- Admins can read the trail; nobody can write directly (see function below).
create policy "audit_logs_select_admin_only"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after);
end;
$$;

revoke all on function public.log_audit_event(text, text, uuid, jsonb, jsonb) from public;
grant execute on function public.log_audit_event(text, text, uuid, jsonb, jsonb) to authenticated;
