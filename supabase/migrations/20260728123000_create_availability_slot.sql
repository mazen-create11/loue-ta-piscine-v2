create or replace function public.create_availability_slot(
  target_listing uuid,
  slot_format text,
  slot_start timestamptz,
  slot_end timestamptz,
  slot_price numeric,
  slot_price_unit text,
  slot_capacity smallint
)
returns public.availability_slots
language plpgsql
security definer
set search_path = public
as $$
declare created public.availability_slots;
begin
  if not exists(select 1 from public.listings where id = target_listing and host_id = auth.uid()) then
    raise exception 'listing_not_owned';
  end if;
  if slot_start <= now() or slot_end <= slot_start or slot_end - slot_start > interval '14 hours' then
    raise exception 'invalid_slot_window';
  end if;
  if slot_format not in ('open','private','blue_hour','night') or slot_price_unit not in ('person','slot') then
    raise exception 'invalid_slot_format';
  end if;
  if slot_price < 0 or slot_price > 5000 or slot_capacity < 1 or slot_capacity > 100 then
    raise exception 'invalid_slot_values';
  end if;
  if exists(
    select 1 from public.availability_slots
    where listing_id = target_listing
      and status in ('draft','open','full')
      and start_at < slot_end
      and end_at > slot_start
  ) then
    raise exception 'slot_overlap';
  end if;

  insert into public.availability_slots(listing_id,format,start_at,end_at,price_amount,price_unit,capacity,status)
  values(target_listing,slot_format,slot_start,slot_end,slot_price,slot_price_unit,slot_capacity,'open')
  returning * into created;
  return created;
end;
$$;

grant execute on function public.create_availability_slot(uuid,text,timestamptz,timestamptz,numeric,text,smallint) to authenticated;
