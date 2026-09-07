-- 0011_policy_acknowledgements.sql
-- Records that an employee has been shown, and has acknowledged, the current
-- version of the internal privacy notice. This is NOT a GDPR consent
-- mechanism (consent is generally the wrong lawful basis for ordinary
-- employee data — see the app README) — it's the more mundane and more
-- important Article 13 requirement: employees must actually be told what's
-- collected and why. Versioned so a future rewrite of the notice can require
-- re-acknowledgement without losing the history of who saw the old one.

create table public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  policy_version text not null,
  acknowledged_at timestamptz not null default now(),
  unique (user_id, policy_version)
);

create index policy_acknowledgements_user_idx on public.policy_acknowledgements (user_id);

alter table public.policy_acknowledgements enable row level security;

create policy "policy_acknowledgements_select_own_or_admin"
  on public.policy_acknowledgements for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "policy_acknowledgements_insert_own"
  on public.policy_acknowledgements for insert
  to authenticated
  with check (user_id = auth.uid());

-- No update/delete: an acknowledgement is a timestamped fact, not an
-- editable setting.
