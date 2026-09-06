-- 0004_audit_triggers.sql
-- Wire up audit logging for the admin actions available so far: shift
-- create/edit/delete and driver deactivation. More triggers are added as
-- later phases introduce holidays/incidents/announcements.

create or replace function public.audit_shift_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit_event('shift.created', 'shift', new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.log_audit_event('shift.updated', 'shift', new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_audit_event('shift.deleted', 'shift', old.id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

create trigger shifts_audit
  after insert or update or delete on public.shifts
  for each row execute function public.audit_shift_change();

create or replace function public.audit_profile_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.employment_status = 'active' and new.employment_status = 'inactive' then
    perform public.log_audit_event(
      'driver.deactivated', 'profile', new.id,
      jsonb_build_object('employment_status', old.employment_status),
      jsonb_build_object('employment_status', new.employment_status)
    );
  elsif old.employment_status = 'inactive' and new.employment_status = 'active' then
    perform public.log_audit_event(
      'driver.reactivated', 'profile', new.id,
      jsonb_build_object('employment_status', old.employment_status),
      jsonb_build_object('employment_status', new.employment_status)
    );
  end if;
  return new;
end;
$$;

create trigger profiles_audit_deactivation
  after update of employment_status on public.profiles
  for each row execute function public.audit_profile_deactivation();
