-- 0009_holiday_triggers.sql
-- Audit trail for holiday request creation/decision, and the in-app
-- notification a driver sees when their request is approved or rejected.

create or replace function public.audit_holiday_request_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_audit_event('holiday.requested', 'holiday_request', new.id, null, to_jsonb(new));
  return new;
end;
$$;

create trigger holiday_requests_audit_created
  after insert on public.holiday_requests
  for each row execute function public.audit_holiday_request_created();

create or replace function public.handle_holiday_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date_list text;
  v_title text;
begin
  if old.status <> 'pending' or new.status = 'pending' then
    return new;
  end if;

  perform public.log_audit_event(
    'holiday.' || new.status::text,
    'holiday_request',
    new.id,
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status, 'admin_id', new.admin_id, 'admin_response', new.admin_response)
  );

  select string_agg(to_char(date, 'DD Mon YYYY'), ', ' order by date)
    into v_date_list
    from public.holiday_request_dates
    where holiday_request_id = new.id;

  v_title := case new.status
    when 'approved' then 'Holiday request approved'
    when 'rejected' then 'Holiday request rejected'
    else 'Holiday request updated'
  end;

  perform public.create_notification(
    new.driver_id,
    'holiday_decision',
    v_title,
    trim(both ' ' from coalesce(v_date_list, '') || coalesce(E'\n' || nullif(new.admin_response, ''), '')),
    'holiday_request',
    new.id
  );

  return new;
end;
$$;

create trigger holiday_requests_decision
  after update of status on public.holiday_requests
  for each row execute function public.handle_holiday_decision();
