-- 0010_active_employee_checks.sql
-- Defense in depth for account deactivation: a deactivated employee's
-- Supabase Auth session stays valid (Auth doesn't know about our
-- employment_status column), and RLS alone doesn't check it either — a
-- deactivated driver's own rows are still "their own" as far as RLS is
-- concerned. The app layer already blocks them (see getCurrentProfile), but
-- these mutation entry points get the same check directly, so a deactivated
-- account can't act even via a direct API call.

create or replace function public.assert_active_employee()
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and employment_status = 'active'
  ) then
    raise exception 'Account is not active';
  end if;
end;
$$;

create or replace function public.create_vehicle_inspection(
  p_company_vehicle_id uuid,
  p_inspection_type public.inspection_type
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  perform public.assert_active_employee();

  insert into public.vehicle_inspections (driver_id, company_vehicle_id, inspection_type)
  values (auth.uid(), p_company_vehicle_id, p_inspection_type)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.start_shift(
  p_shift_id uuid,
  p_vehicle_type public.vehicle_type,
  p_start_inspection_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_attendance_id uuid;
  v_vehicle_id uuid;
begin
  perform public.assert_active_employee();

  if p_vehicle_type = 'company' then
    if p_start_inspection_id is null then
      raise exception 'A completed start inspection is required for a company vehicle';
    end if;

    select company_vehicle_id into v_vehicle_id
    from public.vehicle_inspections
    where id = p_start_inspection_id
      and driver_id = auth.uid()
      and inspection_type = 'start'
      and status = 'complete';

    if v_vehicle_id is null then
      raise exception 'Start inspection % is not complete or not owned by caller', p_start_inspection_id;
    end if;
  end if;

  insert into public.attendance_records (driver_id, shift_id, vehicle_type, company_vehicle_id, start_inspection_id)
  values (auth.uid(), p_shift_id, p_vehicle_type, v_vehicle_id, p_start_inspection_id)
  returning id into v_attendance_id;

  return v_attendance_id;
end;
$$;

create or replace function public.end_shift(
  p_attendance_id uuid,
  p_end_inspection_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_record public.attendance_records;
begin
  perform public.assert_active_employee();

  select * into v_record
  from public.attendance_records
  where id = p_attendance_id and driver_id = auth.uid() and status = 'active'
  for update;

  if not found then
    raise exception 'No active attendance record % for caller', p_attendance_id;
  end if;

  if v_record.vehicle_type = 'company' then
    if p_end_inspection_id is null then
      raise exception 'A completed end inspection is required for a company vehicle';
    end if;

    perform 1
    from public.vehicle_inspections
    where id = p_end_inspection_id
      and driver_id = auth.uid()
      and inspection_type = 'end'
      and status = 'complete'
      and company_vehicle_id = v_record.company_vehicle_id;

    if not found then
      raise exception 'End inspection % is not complete or does not match the checked-out vehicle', p_end_inspection_id;
    end if;
  end if;

  update public.attendance_records
    set status = 'completed', check_out_at = now(), end_inspection_id = p_end_inspection_id
    where id = p_attendance_id;
end;
$$;

create or replace function public.create_holiday_request(p_dates date[], p_note text default null)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_distinct_dates date[];
begin
  perform public.assert_active_employee();

  select array_agg(distinct d) into v_distinct_dates from unnest(p_dates) as d;

  if v_distinct_dates is null or array_length(v_distinct_dates, 1) is null then
    raise exception 'A holiday request must include at least one date';
  end if;

  insert into public.holiday_requests (driver_id, note)
  values (auth.uid(), nullif(trim(p_note), ''))
  returning id into v_id;

  insert into public.holiday_request_dates (holiday_request_id, date)
  select v_id, d from unnest(v_distinct_dates) as d;

  return v_id;
end;
$$;
