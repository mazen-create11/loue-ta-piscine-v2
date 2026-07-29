create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone text,
  phone_verified boolean not null default false,
  active_role text not null default 'traveler' check (active_role in ('traveler','host')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traveler_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  adults smallint not null default 1 check (adults between 0 and 30),
  children smallint not null default 0 check (children between 0 and 30),
  babies smallint not null default 0 check (babies between 0 and 10),
  preferred_formats text[] not null default '{}',
  accessibility_needs text[] not null default '{}',
  quiet_preference boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.host_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  public_name text not null default '',
  city text not null default '',
  bio text not null default '',
  identity_verified boolean not null default false,
  premium_until timestamptz,
  payout_provider text,
  payout_account_ref text,
  calendar_feed_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  context text not null check (context in ('traveler','host')),
  email_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  push_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  primary key (user_id, context)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text unique not null,
  space_type text not null check (space_type in ('pool','jacuzzi','sauna')),
  city text not null,
  short_description text not null default '',
  capacity smallint not null default 1 check (capacity between 1 and 100),
  depth_label text,
  size_label text,
  amenities jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  publication_status text not null default 'draft' check (publication_status in ('draft','review','published','paused')),
  boosted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_private_details (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  exact_address text not null default '',
  arrival_instructions text not null default '',
  access_code text,
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  position smallint not null default 0,
  is_cover boolean not null default false,
  enhancement_status text not null default 'original' check (enhancement_status in ('original','queued','ready','rejected')),
  created_at timestamptz not null default now(),
  unique (listing_id, position)
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  format text not null check (format in ('open','private','blue_hour','night')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  price_amount numeric(10,2) not null check (price_amount >= 0),
  price_unit text not null check (price_unit in ('person','slot')),
  capacity smallint not null check (capacity between 1 and 100),
  status text not null default 'open' check (status in ('draft','open','full','blocked','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists availability_listing_start_idx on public.availability_slots(listing_id, start_at);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.availability_slots(id) on delete restrict,
  traveler_id uuid not null references public.profiles(id) on delete restrict,
  guest_count smallint not null check (guest_count between 1 and 100),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  currency char(3) not null default 'EUR',
  status text not null default 'confirmed' check (status in ('pending','confirmed','ready','completed','cancelled','refunded')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_slot_idx on public.reservations(slot_id);
create index if not exists reservations_traveler_idx on public.reservations(traveler_id, created_at desc);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null default '',
  attachment_path text,
  attachment_type text,
  created_at timestamptz not null default now(),
  check (body <> '' or attachment_path is not null)
);

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','traveler_preferences','host_profiles','listings','listing_private_details','availability_slots','reservations','conversations'] loop
    execute format('drop trigger if exists touch_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger touch_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.phone)
  on conflict (id) do nothing;
  insert into public.traveler_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id, context) values (new.id, 'traveler') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_conversation_participant(target_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.conversation_participants
    where conversation_id = target_conversation and user_id = auth.uid()
  );
$$;

create or replace function public.create_reservation(target_slot uuid, requested_guests smallint, reservation_notes text default '')
returns public.reservations language plpgsql security definer set search_path = public as $$
declare
  selected_slot public.availability_slots;
  occupied integer;
  computed_total numeric(10,2);
  created_reservation public.reservations;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if requested_guests < 1 then raise exception 'invalid_guest_count'; end if;

  select * into selected_slot from public.availability_slots where id = target_slot for update;
  if not found or selected_slot.status <> 'open' or selected_slot.start_at <= now() then raise exception 'slot_unavailable'; end if;

  select coalesce(sum(guest_count),0) into occupied from public.reservations
  where slot_id = target_slot and status in ('pending','confirmed','ready');
  if occupied + requested_guests > selected_slot.capacity then raise exception 'capacity_exceeded'; end if;

  computed_total := case when selected_slot.price_unit = 'person' then selected_slot.price_amount * requested_guests else selected_slot.price_amount end;
  insert into public.reservations(slot_id, traveler_id, guest_count, total_amount, notes)
  values(target_slot, auth.uid(), requested_guests, computed_total, coalesce(reservation_notes,''))
  returning * into created_reservation;

  if occupied + requested_guests = selected_slot.capacity then
    update public.availability_slots set status = 'full' where id = target_slot;
  end if;
  return created_reservation;
end;
$$;

create or replace function public.publish_availability_slot(target_slot uuid)
returns public.availability_slots language plpgsql security definer set search_path = public as $$
declare published public.availability_slots;
begin
  update public.availability_slots s set status = 'open'
  from public.listings l
  where s.id = target_slot and l.id = s.listing_id and l.host_id = auth.uid() and s.start_at > now()
  returning s.* into published;
  if published.id is null then raise exception 'slot_not_owned_or_invalid'; end if;
  return published;
end;
$$;

create or replace function public.mark_reservation_ready(reservation_id uuid)
returns public.reservations language plpgsql security definer set search_path = public as $$
declare updated public.reservations;
begin
  update public.reservations r set status = 'ready'
  from public.availability_slots s join public.listings l on l.id = s.listing_id
  where r.id = reservation_id and r.slot_id = s.id and l.host_id = auth.uid() and r.status = 'confirmed'
  returning r.* into updated;
  if updated.id is null then raise exception 'reservation_not_owned_or_invalid'; end if;
  return updated;
end;
$$;

alter table public.profiles enable row level security;
alter table public.traveler_preferences enable row level security;
alter table public.host_profiles enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.listings enable row level security;
alter table public.listing_private_details enable row level security;
alter table public.listing_photos enable row level security;
alter table public.availability_slots enable row level security;
alter table public.reservations enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "profiles own select" on public.profiles for select using (id = auth.uid());
create policy "profiles reservation counterpart read" on public.profiles for select using (
  exists(
    select 1 from public.reservations r
    join public.availability_slots s on s.id = r.slot_id
    join public.listings l on l.id = s.listing_id
    where (r.traveler_id = profiles.id and l.host_id = auth.uid())
       or (l.host_id = profiles.id and r.traveler_id = auth.uid())
  )
);
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "traveler preferences own all" on public.traveler_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "host profile public read" on public.host_profiles for select using (true);
create policy "host profile own insert" on public.host_profiles for insert with check (user_id = auth.uid());
create policy "host profile own update" on public.host_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notification preferences own all" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "published listings public read" on public.listings for select using (publication_status = 'published' or host_id = auth.uid());
create policy "listings host insert" on public.listings for insert with check (host_id = auth.uid());
create policy "listings host update" on public.listings for update using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "listings host delete" on public.listings for delete using (host_id = auth.uid());

create policy "private listing details authorized read" on public.listing_private_details for select using (
  exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
  or exists(
    select 1 from public.reservations r join public.availability_slots s on s.id = r.slot_id
    where s.listing_id = listing_id and r.traveler_id = auth.uid() and r.status in ('confirmed','ready','completed')
  )
);
create policy "private listing details host all" on public.listing_private_details for all using (
  exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
) with check (
  exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
);

create policy "listing photos public read" on public.listing_photos for select using (
  exists(select 1 from public.listings l where l.id = listing_id and (l.publication_status = 'published' or l.host_id = auth.uid()))
);
create policy "listing photos host all" on public.listing_photos for all using (
  exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
) with check (
  exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
);

create policy "open slots public read" on public.availability_slots for select using (
  status in ('open','full') or exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
);
create policy "slots host all" on public.availability_slots for all using (
  exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
) with check (
  exists(select 1 from public.listings l where l.id = listing_id and l.host_id = auth.uid())
);

create policy "reservations parties read" on public.reservations for select using (
  traveler_id = auth.uid() or exists(
    select 1 from public.availability_slots s join public.listings l on l.id = s.listing_id
    where s.id = slot_id and l.host_id = auth.uid()
  )
);
create policy "reservations traveler cancel" on public.reservations for update using (traveler_id = auth.uid()) with check (traveler_id = auth.uid());

create policy "conversations participants read" on public.conversations for select using (public.is_conversation_participant(id));
create policy "conversation participants read" on public.conversation_participants for select using (public.is_conversation_participant(conversation_id));
create policy "messages participants read" on public.messages for select using (public.is_conversation_participant(conversation_id));
create policy "messages participants insert" on public.messages for insert with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));

grant execute on function public.create_reservation(uuid,smallint,text) to authenticated;
grant execute on function public.publish_availability_slot(uuid) to authenticated;
grant execute on function public.mark_reservation_ready(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('listing-photos','listing-photos',true,15728640,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "avatar owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar owner update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing photo owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing photo owner update" on storage.objects for update to authenticated using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.broadcast_reservation_change()
returns trigger language plpgsql security definer set search_path = public, realtime as $$
declare target_host uuid;
begin
  select l.host_id into target_host
  from public.availability_slots s join public.listings l on l.id = s.listing_id
  where s.id = coalesce(new.slot_id, old.slot_id);
  perform realtime.broadcast_changes('host:' || target_host::text, 'reservation_changed', tg_op, tg_table_name, tg_table_schema, new, old);
  return coalesce(new, old);
end;
$$;

drop trigger if exists reservation_realtime_broadcast on public.reservations;
create trigger reservation_realtime_broadcast after insert or update or delete on public.reservations
for each row execute function public.broadcast_reservation_change();
