-- 0016_shift_change_notifications.sql
-- In-app notification for "Upcoming shift changes where applicable" (the
-- last of the four notification types the spec calls for). Fires on actual
-- changes only — not a no-op save — and separately tells a driver who's
-- been unassigned from a driver who's newly assigned, since those are
-- different pieces of news for different people.

create or replace function public.notify_shift_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.driver_id is not null and old.driver_id is distinct from new.driver_id then
      perform public.create_notification(
        old.driver_id, 'shift_change', 'Shift removed from your rota',
        'Your shift on ' || to_char(old.shift_date, 'DD Mon YYYY') || ' is no longer assigned to you.',
        'shift', old.id
      );
    end if;

    if new.driver_id is not null and (
      old.driver_id is distinct from new.driver_id
      or old.shift_date is distinct from new.shift_date
      or old.start_time is distinct from new.start_time
      or old.end_time is distinct from new.end_time
    ) then
      perform public.create_notification(
        new.driver_id, 'shift_change', 'Your shift was updated',
        to_char(new.shift_date, 'DD Mon YYYY') || ' ' || to_char(new.start_time, 'HH24:MI')
          || coalesce(' - ' || to_char(new.end_time, 'HH24:MI'), ''),
        'shift', new.id
      );
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.driver_id is not null then
      perform public.create_notification(
        old.driver_id, 'shift_change', 'Shift cancelled',
        'Your shift on ' || to_char(old.shift_date, 'DD Mon YYYY') || ' has been removed from the rota.',
        'shift', old.id
      );
    end if;
    return old;
  end if;

  return null;
end;
$$;

create trigger shifts_notify_change
  after update or delete on public.shifts
  for each row execute function public.notify_shift_change();
