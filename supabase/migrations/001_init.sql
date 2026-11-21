-- Our Little Place: private two-person space. Run in the Supabase SQL editor.

create table spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our little place',
  together_since date,
  created_at timestamptz not null default now()
);

create table members (
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  timezone text not null default 'UTC',
  primary key (space_id, user_id)
);

-- Invite-only: a single-use code ties a new account to an existing space.
create table invites (
  code text primary key,
  space_id uuid not null references spaces(id) on delete cascade,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function is_member(sid uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from members where space_id = sid and user_id = auth.uid());
$$;

-- Hard cap of two members per space.
create or replace function redeem_invite(invite_code text, name text, tz text) returns uuid
language plpgsql security definer as $$
declare inv invites; cnt int;
begin
  select * into inv from invites where code = invite_code and used_by is null for update;
  if not found then raise exception 'Invalid or used invite'; end if;
  select count(*) into cnt from members where space_id = inv.space_id;
  if cnt >= 2 then raise exception 'Space is full'; end if;
  insert into members(space_id, user_id, display_name, timezone) values (inv.space_id, auth.uid(), name, tz);
  update invites set used_by = auth.uid() where code = invite_code;
  return inv.space_id;
end $$;

create table messages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  sender uuid not null references auth.users(id),
  body text,
  image_path text,
  voice_path text,
  reply_to uuid references messages(id) on delete set null,
  pinned boolean not null default false,
  reactions jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table tracks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  title text not null,
  artist text,
  audio_path text not null,
  cover_path text,
  lyrics text,
  playlist text not null default 'Our Songs',
  favourite boolean not null default false,
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Authoritative state for one game session (state lives in jsonb; moves validated client-side by shared engine).
create table game_rooms (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  game_id text not null,
  state jsonb not null,
  version int not null default 0,
  players uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table date_nights (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  theme text,
  activities jsonb not null default '[]',
  favourite_activity text,
  best_part jsonb not null default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table activity_log (
  id bigint generated always as identity primary key,
  space_id uuid not null references spaces(id) on delete cascade,
  kind text not null,       -- 'game' | 'activity'
  ref text not null,
  played_at timestamptz not null default now()
);

-- RLS: every table is readable/writable only by members of its space.
alter table spaces enable row level security;
alter table members enable row level security;
alter table invites enable row level security;
alter table messages enable row level security;
alter table tracks enable row level security;
alter table game_rooms enable row level security;
alter table date_nights enable row level security;
alter table activity_log enable row level security;

create policy "space members read" on spaces for select using (is_member(id));
create policy "space members update" on spaces for update using (is_member(id));
create policy "members see members" on members for select using (is_member(space_id));
create policy "members own row" on members for update using (user_id = auth.uid());
create policy "members see invites" on invites for select using (is_member(space_id));
create policy "members make invites" on invites for insert with check (is_member(space_id));

do $$ declare t text; begin
  foreach t in array array['messages','tracks','game_rooms','date_nights','activity_log'] loop
    execute format('create policy "%1$s member all" on %1$s for all using (is_member(space_id)) with check (is_member(space_id))', t);
  end loop;
end $$;

-- Realtime
alter publication supabase_realtime add table messages, game_rooms, tracks, date_nights;

-- Private storage: path convention  <space_id>/<kind>/<file>
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict do nothing;
create policy "media member read" on storage.objects for select
  using (bucket_id = 'media' and is_member(((storage.foldername(name))[1])::uuid));
create policy "media member write" on storage.objects for insert
  with check (bucket_id = 'media' and is_member(((storage.foldername(name))[1])::uuid));
create policy "media member delete" on storage.objects for delete
  using (bucket_id = 'media' and is_member(((storage.foldername(name))[1])::uuid));

-- Bootstrap (run once by Keith after signing up, in SQL editor):
--   insert into spaces(together_since) values ('2025-01-01') returning id;
--   insert into members(space_id,user_id,display_name,timezone) values ('<space>','<keith uid>','Keith','Europe/Berlin');
--   insert into invites(code,space_id) values ('molly-<random>','<space>');
-- Also disable open sign-ups in Supabase Auth settings and sign Molly up via the invite flow.
