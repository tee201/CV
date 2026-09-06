-- 0005_storage_buckets.sql
-- Private bucket for vehicle handover inspection photos. Objects are stored
-- at `${driver_id}/${inspection_id}/${category}.jpg` — RLS below trusts that
-- path shape, so all uploads must go through the app's upload helper, never
-- a hand-built path.

insert into storage.buckets (id, name, public)
values ('vehicle-inspection-photos', 'vehicle-inspection-photos', false)
on conflict (id) do nothing;

create policy "inspection_photos_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-inspection-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "inspection_photos_storage_select_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vehicle-inspection-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- No update/delete policy: inspection photos are immutable evidence once
-- uploaded. Retention/deletion is an admin-tooling concern for a later phase,
-- not something drivers or the client app should ever be able to do.
