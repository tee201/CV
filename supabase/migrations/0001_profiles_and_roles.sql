-- 0001_profiles_and_roles.sql
-- Foundation: user roles, profiles table, auto-provisioning trigger, RLS baseline.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('driver', 'admin');
create type public.employment_status as enum ('active', 'inactive');

-- One row per auth.users row. Never store credentials here; Supabase Auth owns those.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role public.user_role not null default 'driver',
  employment_status public.employment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per employee, 1:1 with auth.users. Data minimised: only fields with an operational purpose.';

create index profiles_role_idx on public.profiles (role);
create index profiles_employment_status_idx on public.profiles (employment_status);

-- Generic updated_at maintenance, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role check used by every RLS policy below. security definer + fixed search_path
-- so it can read profiles regardless of the caller's own RLS visibility of that row,
-- without being hijackable via a hostile search_path.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- New auth.users row -> automatically provision a profile.
-- Role/name come from signup metadata so an admin invite flow can set role='admin';
-- self-serve signup (if ever enabled) always lands as 'driver' because the app,
-- not the client, controls what metadata is sent.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'driver')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Drivers may update their own contact details, but not role or employment_status.
-- Enforced by only exposing full_name/phone through the app's update path plus this
-- WITH CHECK, which still allows admins to change any field on any row.
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (id = auth.uid() and role = (select role from public.profiles where id = auth.uid())
        and employment_status = (select employment_status from public.profiles where id = auth.uid()))
  );

-- No insert/delete policies for authenticated users: profiles are created only by the
-- handle_new_user trigger (security definer, runs as postgres) and never deleted directly
-- (auth.users delete cascades). Admin-driven "deactivation" sets employment_status='inactive'.
