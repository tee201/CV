-- 0015_announcement_notifications.sql
-- Closes a gap from 0013: the spec calls for a notification when an
-- important announcement is published, distinct from the acknowledgement
-- mechanism. When an important announcement is inserted already-published
-- (publish_date <= today), fan out an in-app notification to every active
-- driver. A future-dated important announcement doesn't notify yet — there's
-- nothing for the driver to look at until its publish date arrives, and this
-- app doesn't have a scheduler to fire the notification later.

create or replace function public.notify_important_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver record;
begin
  if new.is_important and new.publish_date <= current_date then
    for v_driver in
      select id from public.profiles where role = 'driver' and employment_status = 'active'
    loop
      perform public.create_notification(
        v_driver.id,
        'important_announcement',
        new.title,
        new.message,
        'announcement',
        new.id
      );
    end loop;
  end if;
  return new;
end;
$$;

create trigger announcements_notify_important
  after insert on public.announcements
  for each row execute function public.notify_important_announcement();
