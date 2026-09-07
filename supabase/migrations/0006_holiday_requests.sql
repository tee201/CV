-- 0006_holiday_requests.sql
-- Holiday requests: a driver requests one or more dates off with an optional
-- note; an admin approves or rejects with an optional response. Dates are
-- normalised into their own table (one row per requested day) rather than
-- an array column, so each date can be indexed/queried individually (e.g.
-- for a future "who's off on date X" rota check).

create type public.holiday_request_status as enum ('pending', 'approved', 'rejected');

create table public.holiday_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  status public.holiday_request_status not null default 'pending',
  admin_id uuid references public.profiles (id),
  admin_response text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint decided_fields_consistent check (
    (status = 'pending' and admin_id is null and decided_at is null)
    or (status != 'pending' and admin_id is not null and decided_at is not null)
  )
);

create index holiday_requests_driver_idx on public.holiday_requests (driver_id);
create index holiday_requests_status_idx on public.holiday_requests (status);

create trigger holiday_requests_set_updated_at
  before update on public.holiday_requests
  for each row execute function public.set_updated_at();

create table public.holiday_request_dates (
  id uuid primary key default gen_random_uuid(),
  holiday_request_id uuid not null references public.holiday_requests (id) on delete cascade,
  date date not null,
  unique (holiday_request_id, date)
);

create index holiday_request_dates_date_idx on public.holiday_request_dates (date);

-- ---------------------------------------------------------------------------
-- Creation is atomic (request + all its dates in one statement) so a client
-- can never end up with a holiday request that has zero dates. SECURITY
-- INVOKER (default): runs as the calling driver, so the RLS policies below
-- still gate it.
-- ---------------------------------------------------------------------------
create or replace function public.create_holiday_request(p_dates date[], p_note text default null)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_distinct_dates date[];
begin
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

alter table public.holiday_requests enable row level security;
alter table public.holiday_request_dates enable row level security;

create policy "holiday_requests_select_own_or_admin"
  on public.holiday_requests for select
  to authenticated
  using (driver_id = auth.uid() or public.is_admin());

-- Inserts happen only through create_holiday_request() above (SECURITY
-- INVOKER), so this just needs to permit that function's own insert.
create policy "holiday_requests_insert_own"
  on public.holiday_requests for insert
  to authenticated
  with check (driver_id = auth.uid());

-- Admins decide (status/admin_response/admin_id/decided_at). A driver may
-- only touch their own request, and only while it's still pending — e.g. to
-- withdraw it later; there is no client path that updates a decided request.
create policy "holiday_requests_update_admin_or_own_pending"
  on public.holiday_requests for update
  to authenticated
  using (public.is_admin() or (driver_id = auth.uid() and status = 'pending'))
  with check (public.is_admin() or (driver_id = auth.uid() and status = 'pending'));

create policy "holiday_request_dates_select_own_or_admin"
  on public.holiday_request_dates for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.holiday_requests hr
      where hr.id = holiday_request_id and hr.driver_id = auth.uid()
    )
  );

create policy "holiday_request_dates_insert_own"
  on public.holiday_request_dates for insert
  to authenticated
  with check (
    exists (
      select 1 from public.holiday_requests hr
      where hr.id = holiday_request_id and hr.driver_id = auth.uid() and hr.status = 'pending'
    )
  );
