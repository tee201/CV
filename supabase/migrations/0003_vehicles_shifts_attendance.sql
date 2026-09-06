-- 0003_vehicles_shifts_attendance.sql
-- Company vehicles, rota (shifts), attendance, and the internal vehicle
-- handover inspection (start/end photos). Business rules enforced as DB
-- constraints, not just application code:
--   * a driver can never have two simultaneously-active attendance records
--   * a company vehicle can never be "in use" on two active attendance records
--   * an inspection can never have two photos for the same required angle

create type public.vehicle_type as enum ('personal', 'company');
create type public.inspection_type as enum ('start', 'end');
create type public.inspection_status as enum ('pending', 'complete');
create type public.photo_category as enum ('cab', 'rear', 'cargo');
create type public.shift_status as enum ('scheduled', 'completed', 'cancelled');
create type public.attendance_status as enum ('active', 'completed');

create table public.company_vehicles (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null,
  registration text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger company_vehicles_set_updated_at
  before update on public.company_vehicles
  for each row execute function public.set_updated_at();

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles (id) on delete set null,
  shift_date date not null,
  start_time time not null,
  end_time time,
  status public.shift_status not null default 'scheduled',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shifts_driver_date_idx on public.shifts (driver_id, shift_date);
create index shifts_date_idx on public.shifts (shift_date);

create trigger shifts_set_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

-- The handover inspection itself. Created in 'pending' state, flipped to
-- 'complete' only once all three required photos exist (see
-- complete_vehicle_inspection below) — an inspection is never referenced by
-- an attendance record until it is complete.
create table public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  company_vehicle_id uuid not null references public.company_vehicles (id),
  inspection_type public.inspection_type not null,
  status public.inspection_status not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index vehicle_inspections_driver_idx on public.vehicle_inspections (driver_id);

create table public.vehicle_inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vehicle_inspections (id) on delete cascade,
  category public.photo_category not null,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  uploaded_at timestamptz not null default now(),
  unique (inspection_id, category)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  shift_id uuid references public.shifts (id) on delete set null,
  vehicle_type public.vehicle_type not null,
  company_vehicle_id uuid references public.company_vehicles (id),
  status public.attendance_status not null default 'active',
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  start_inspection_id uuid references public.vehicle_inspections (id),
  end_inspection_id uuid references public.vehicle_inspections (id),
  created_at timestamptz not null default now(),

  constraint company_vehicle_requires_id check (
    (vehicle_type = 'company' and company_vehicle_id is not null)
    or (vehicle_type = 'personal' and company_vehicle_id is null)
  ),
  constraint company_vehicle_requires_start_inspection check (
    vehicle_type = 'personal' or start_inspection_id is not null
  ),
  constraint completed_requires_checkout check (
    (status = 'completed' and check_out_at is not null)
    or (status = 'active' and check_out_at is null)
  ),
  constraint company_vehicle_completed_requires_end_inspection check (
    status = 'active' or vehicle_type = 'personal' or end_inspection_id is not null
  )
);

-- Core integrity rule #1: a driver cannot have two active attendance records.
create unique index attendance_one_active_per_driver
  on public.attendance_records (driver_id)
  where status = 'active';

-- Core integrity rule #2: a company vehicle cannot be checked out on two
-- active attendance records at once.
create unique index attendance_one_active_per_vehicle
  on public.attendance_records (company_vehicle_id)
  where status = 'active' and company_vehicle_id is not null;

create index attendance_driver_idx on public.attendance_records (driver_id);

-- ---------------------------------------------------------------------------
-- Business-logic functions. All SECURITY INVOKER (the default): they run as
-- the calling user so every RLS policy below still applies, they just give
-- us one atomic statement instead of several round trips that could leave
-- a half-finished inspection or shift if the connection drops midway.
-- ---------------------------------------------------------------------------

-- Step 1 of the company-vehicle workflow: open a pending inspection.
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
  insert into public.vehicle_inspections (driver_id, company_vehicle_id, inspection_type)
  values (auth.uid(), p_company_vehicle_id, p_inspection_type)
  returning id into v_id;
  return v_id;
end;
$$;

-- Step 2: after the 3 required photos are uploaded to storage and their rows
-- inserted, mark the inspection complete. Fails loudly (exception) if any of
-- the 3 required categories is missing, so the client can never proceed on a
-- half-submitted inspection.
create or replace function public.complete_vehicle_inspection(p_inspection_id uuid)
returns void
language plpgsql
as $$
declare
  v_count int;
begin
  select count(distinct category) into v_count
  from public.vehicle_inspection_photos
  where inspection_id = p_inspection_id;

  if v_count < 3 then
    raise exception 'Inspection % is missing required photographs (found %, need 3: cab, rear, cargo)', p_inspection_id, v_count;
  end if;

  update public.vehicle_inspections
    set status = 'complete', completed_at = now()
    where id = p_inspection_id and driver_id = auth.uid()
    returning id into p_inspection_id;

  if not found then
    raise exception 'Inspection % not found or not owned by caller', p_inspection_id;
  end if;
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.company_vehicles enable row level security;
alter table public.shifts enable row level security;
alter table public.vehicle_inspections enable row level security;
alter table public.vehicle_inspection_photos enable row level security;
alter table public.attendance_records enable row level security;

-- Company vehicles: every authenticated user needs to read the active list
-- (to populate the "select vehicle" dropdown); only admins manage it.
create policy "company_vehicles_select_all"
  on public.company_vehicles for select
  to authenticated
  using (true);

create policy "company_vehicles_admin_write"
  on public.company_vehicles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "shifts_select_own_or_admin"
  on public.shifts for select
  to authenticated
  using (driver_id = auth.uid() or public.is_admin());

create policy "shifts_admin_write"
  on public.shifts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "inspections_select_own_or_admin"
  on public.vehicle_inspections for select
  to authenticated
  using (driver_id = auth.uid() or public.is_admin());

create policy "inspections_insert_own"
  on public.vehicle_inspections for insert
  to authenticated
  with check (driver_id = auth.uid());

create policy "inspections_update_own_pending"
  on public.vehicle_inspections for update
  to authenticated
  using (driver_id = auth.uid() and status = 'pending')
  with check (driver_id = auth.uid());

create policy "inspection_photos_select_own_or_admin"
  on public.vehicle_inspection_photos for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vehicle_inspections vi
      where vi.id = inspection_id and vi.driver_id = auth.uid()
    )
  );

-- A photo may only be attached to the caller's own inspection while it is
-- still pending (i.e. before complete_vehicle_inspection locks it).
create policy "inspection_photos_insert_own_pending"
  on public.vehicle_inspection_photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.vehicle_inspections vi
      where vi.id = inspection_id and vi.driver_id = auth.uid() and vi.status = 'pending'
    )
  );

-- A retake before submission replaces the row for that category (upsert on
-- the (inspection_id, category) unique constraint) rather than erroring.
create policy "inspection_photos_update_own_pending"
  on public.vehicle_inspection_photos for update
  to authenticated
  using (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.vehicle_inspections vi
      where vi.id = inspection_id and vi.driver_id = auth.uid() and vi.status = 'pending'
    )
  )
  with check (uploaded_by = auth.uid());

create policy "attendance_select_own_or_admin"
  on public.attendance_records for select
  to authenticated
  using (driver_id = auth.uid() or public.is_admin());

-- Direct inserts/updates to attendance_records are not exposed: all writes
-- go through start_shift()/end_shift() above, which enforce the inspection
-- rules. These policies exist only so those SECURITY INVOKER functions
-- (running as the caller) are permitted to perform the underlying insert.
create policy "attendance_insert_own"
  on public.attendance_records for insert
  to authenticated
  with check (driver_id = auth.uid());

create policy "attendance_update_own_active"
  on public.attendance_records for update
  to authenticated
  using (driver_id = auth.uid() and status = 'active')
  with check (driver_id = auth.uid());

create policy "attendance_admin_select_write"
  on public.attendance_records for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
