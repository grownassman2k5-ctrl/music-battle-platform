-- Music Battle Platform MVP schema
-- ------------------------------------------------------------
-- This file is intentionally not a migration. Review it, adjust it, and apply
-- it manually in Supabase only when you are ready.
--
-- Security note for the current MVP:
-- The app is still using guest display names and event passcodes, not Supabase
-- Auth. Row Level Security is enabled below, but the placeholder policies are
-- intentionally permissive so early browser-only demos can be wired later.
-- These policies do NOT securely enforce event passcodes. Before production,
-- replace them with stricter policies backed by Supabase Auth, secure server
-- actions, Edge Functions, or SECURITY DEFINER RPCs that verify passcodes
-- without exposing passcode hashes to the browser.

create extension if not exists "pgcrypto";

-- Keeps updated_at fresh on mutable tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Top-level private battle event. Store passcode_hash only; never store the
-- plaintext passcode in the database.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_slug text not null unique,
  passcode_hash text not null,
  passcode_hint text,
  host_display_name text,
  status text not null default 'setup'
    check (status in ('setup', 'lobby', 'live', 'paused', 'completed', 'archived')),
  matchup_mode text not null default 'fixed'
    check (matchup_mode in ('fixed', 'randomized')),
  default_song_duration_seconds integer not null default 120
    check (default_song_duration_seconds between 15 and 600),
  current_round_number integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.events is
  'Private host-controlled music battle event metadata, passcode hash, and high-level event state.';
comment on column public.events.passcode_hash is
  'Hash of the event passcode. Do not store or expose the plaintext passcode.';

-- The two battle sides detected from CSV side values. The internal_side_value
-- is the raw CSV value, while display fields are public labels shown to users.
create table if not exists public.event_sides (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  internal_side_value text not null,
  public_display_name text not null,
  artist_display_name text not null,
  display_order integer not null check (display_order in (1, 2)),
  score integer not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, internal_side_value),
  unique (event_id, display_order)
);

comment on table public.event_sides is
  'Competing sides for an event, including raw CSV side values and public display names.';

-- Songs imported from CSV. Songs belong to one event side and can later be
-- paired into rounds by fixed_order or randomized generation.
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  side_id uuid not null references public.event_sides(id) on delete cascade,
  csv_row_number integer,
  artist text not null,
  song_title text not null,
  album text,
  genre text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  release_year integer check (release_year is null or release_year between 1900 and 2200),
  mood text,
  fixed_order integer check (fixed_order is null or fixed_order > 0),
  apple_music_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.songs is
  'CSV-imported songs used to generate battle matchups.';

-- Prevent duplicate fixed-order entries per side when fixed_order is provided.
create unique index if not exists songs_event_side_fixed_order_unique
  on public.songs (event_id, side_id, fixed_order)
  where fixed_order is not null;

-- Round matchups and round-level state. Vote totals and winners are snapshots
-- for dramatic reveal/results pages; votes remain the source for auditing.
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  status text not null default 'queued'
    check (status in ('queued', 'active', 'playing', 'voting_open', 'voting_closed', 'revealed', 'complete')),
  theme_label text,
  side_one_id uuid not null references public.event_sides(id) on delete restrict,
  side_two_id uuid not null references public.event_sides(id) on delete restrict,
  side_one_song_id uuid not null references public.songs(id) on delete restrict,
  side_two_song_id uuid not null references public.songs(id) on delete restrict,
  winner_side_id uuid references public.event_sides(id) on delete restrict,
  winner_song_id uuid references public.songs(id) on delete restrict,
  side_one_vote_count integer not null default 0 check (side_one_vote_count >= 0),
  side_two_vote_count integer not null default 0 check (side_two_vote_count >= 0),
  started_at timestamptz,
  voting_opened_at timestamptz,
  voting_closed_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, round_number),
  check (side_one_id <> side_two_id),
  check (side_one_song_id <> side_two_song_id)
);

comment on table public.rounds is
  'Host-controlled rounds, matchups, voting state, winner reveal state, and result snapshots.';

-- Guest participants join with display names and no account for now. The
-- client_token_hash can represent a browser-generated participant token later.
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  display_name text not null,
  role text not null default 'guest'
    check (role in ('host', 'moderator', 'guest')),
  status text not null default 'active'
    check (status in ('active', 'muted', 'kicked', 'left')),
  client_token_hash text,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.participants is
  'Event participants using display names only. Roles are placeholders until real host/moderator auth is added.';
comment on column public.participants.client_token_hash is
  'Optional hash of a browser-held participant token. This is not a replacement for Supabase Auth.';

create unique index if not exists participants_event_client_token_unique
  on public.participants (event_id, client_token_hash)
  where client_token_hash is not null;

-- Votes are one per participant per round. Participants can update their vote
-- while the round status is voting_open.
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  side_id uuid not null references public.event_sides(id) on delete restrict,
  song_id uuid not null references public.songs(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, participant_id)
);

comment on table public.votes is
  'Participant votes. Unique constraint enforces one vote per participant per round.';

-- Blocks vote insert/update when voting is not open. This is useful even before
-- app pages are connected because it protects the intended round lifecycle.
create or replace function public.enforce_vote_round_is_open()
returns trigger
language plpgsql
as $$
declare
  current_round_status text;
begin
  select status
  into current_round_status
  from public.rounds
  where id = new.round_id
    and event_id = new.event_id;

  if current_round_status is null then
    raise exception 'Vote round does not belong to the supplied event.';
  end if;

  if current_round_status <> 'voting_open' then
    raise exception 'Votes can only be created or updated while voting is open.';
  end if;

  return new;
end;
$$;

drop trigger if exists votes_require_open_round on public.votes;
create trigger votes_require_open_round
  before insert or update on public.votes
  for each row
  execute function public.enforce_vote_round_is_open();

-- Live chat messages. Moderation can hide/delete messages without removing the
-- audit trail.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  display_name_snapshot text not null,
  message_body text not null check (char_length(message_body) <= 1000),
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'deleted', 'flagged')),
  moderation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chat_messages is
  'Event chat messages with moderation-friendly status fields.';

-- Moderation audit log for chat and participant actions.
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  moderator_participant_id uuid references public.participants(id) on delete set null,
  target_participant_id uuid references public.participants(id) on delete set null,
  chat_message_id uuid references public.chat_messages(id) on delete set null,
  action_type text not null
    check (action_type in (
      'hide_message',
      'restore_message',
      'delete_message',
      'flag_message',
      'mute_participant',
      'unmute_participant',
      'kick_participant',
      'warn_participant'
    )),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.moderation_actions is
  'Audit log for host/moderator actions against participants and chat messages.';

-- Lookup indexes for event-scoped queries.
create index if not exists event_sides_event_id_idx on public.event_sides (event_id);
create index if not exists songs_event_id_idx on public.songs (event_id);
create index if not exists songs_side_id_idx on public.songs (side_id);
create index if not exists songs_event_fixed_order_idx on public.songs (event_id, fixed_order);
create index if not exists rounds_event_id_idx on public.rounds (event_id);
create index if not exists rounds_event_status_idx on public.rounds (event_id, status);
create index if not exists participants_event_id_idx on public.participants (event_id);
create index if not exists participants_event_role_idx on public.participants (event_id, role);
create index if not exists votes_event_id_idx on public.votes (event_id);
create index if not exists votes_round_id_idx on public.votes (round_id);
create index if not exists votes_participant_id_idx on public.votes (participant_id);
create index if not exists chat_messages_event_created_idx on public.chat_messages (event_id, created_at);
create index if not exists chat_messages_participant_id_idx on public.chat_messages (participant_id);
create index if not exists moderation_actions_event_created_idx on public.moderation_actions (event_id, created_at);
create index if not exists moderation_actions_target_participant_idx on public.moderation_actions (target_participant_id);
create index if not exists moderation_actions_chat_message_idx on public.moderation_actions (chat_message_id);

-- updated_at triggers.
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

drop trigger if exists event_sides_set_updated_at on public.event_sides;
create trigger event_sides_set_updated_at
  before update on public.event_sides
  for each row
  execute function public.set_updated_at();

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
  before update on public.songs
  for each row
  execute function public.set_updated_at();

drop trigger if exists rounds_set_updated_at on public.rounds;
create trigger rounds_set_updated_at
  before update on public.rounds
  for each row
  execute function public.set_updated_at();

drop trigger if exists participants_set_updated_at on public.participants;
create trigger participants_set_updated_at
  before update on public.participants
  for each row
  execute function public.set_updated_at();

drop trigger if exists votes_set_updated_at on public.votes;
create trigger votes_set_updated_at
  before update on public.votes
  for each row
  execute function public.set_updated_at();

drop trigger if exists chat_messages_set_updated_at on public.chat_messages;
create trigger chat_messages_set_updated_at
  before update on public.chat_messages
  for each row
  execute function public.set_updated_at();

-- Enable Row Level Security on every table.
alter table public.events enable row level security;
alter table public.event_sides enable row level security;
alter table public.songs enable row level security;
alter table public.rounds enable row level security;
alter table public.participants enable row level security;
alter table public.votes enable row level security;
alter table public.chat_messages enable row level security;
alter table public.moderation_actions enable row level security;

-- -------------------------------------------------------------------------
-- Temporary MVP RLS policies
-- -------------------------------------------------------------------------
-- These policies are deliberately permissive placeholders for an early
-- passcode-based MVP without Supabase Auth. They allow anonymous clients with
-- the publishable key to read/write event data and are NOT secure enough for
-- real private events.
--
-- Tighten before production:
-- 1. Use Supabase Auth for hosts/moderators.
-- 2. Move host-only writes behind server actions or Edge Functions.
-- 3. Verify passcodes through secure RPCs or server code.
-- 4. Replace broad "using (true)" / "with check (true)" policies with
--    participant/event membership checks.

drop policy if exists "TEMP MVP allow anonymous event reads" on public.events;
create policy "TEMP MVP allow anonymous event reads"
  on public.events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous event creation" on public.events;
create policy "TEMP MVP allow anonymous event creation"
  on public.events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "TEMP MVP allow anonymous event updates" on public.events;
create policy "TEMP MVP allow anonymous event updates"
  on public.events
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- TEMPORARY MVP ONLY: enables /admin/events test cleanup through the
-- publishable browser client. Deleting an event cascades to event_sides, songs,
-- rounds, participants, votes, chat_messages, and moderation_actions through
-- the foreign keys above. Protect this action with Supabase Auth or a
-- server-side admin action before public launch.
drop policy if exists "TEMP MVP allow anonymous event deletion" on public.events;
create policy "TEMP MVP allow anonymous event deletion"
  on public.events
  for delete
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous event side reads" on public.event_sides;
create policy "TEMP MVP allow anonymous event side reads"
  on public.event_sides
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous event side creation" on public.event_sides;
create policy "TEMP MVP allow anonymous event side creation"
  on public.event_sides
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "TEMP MVP allow anonymous event side updates" on public.event_sides;
create policy "TEMP MVP allow anonymous event side updates"
  on public.event_sides
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "TEMP MVP allow anonymous song reads" on public.songs;
create policy "TEMP MVP allow anonymous song reads"
  on public.songs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous song creation" on public.songs;
create policy "TEMP MVP allow anonymous song creation"
  on public.songs
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "TEMP MVP allow anonymous song updates" on public.songs;
create policy "TEMP MVP allow anonymous song updates"
  on public.songs
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "TEMP MVP allow anonymous round reads" on public.rounds;
create policy "TEMP MVP allow anonymous round reads"
  on public.rounds
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous round creation" on public.rounds;
create policy "TEMP MVP allow anonymous round creation"
  on public.rounds
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "TEMP MVP allow anonymous round updates" on public.rounds;
create policy "TEMP MVP allow anonymous round updates"
  on public.rounds
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "TEMP MVP allow anonymous participant reads" on public.participants;
create policy "TEMP MVP allow anonymous participant reads"
  on public.participants
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous participant creation" on public.participants;
create policy "TEMP MVP allow anonymous participant creation"
  on public.participants
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "TEMP MVP allow anonymous participant updates" on public.participants;
create policy "TEMP MVP allow anonymous participant updates"
  on public.participants
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "TEMP MVP allow anonymous vote reads" on public.votes;
create policy "TEMP MVP allow anonymous vote reads"
  on public.votes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous vote creation" on public.votes;
create policy "TEMP MVP allow anonymous vote creation"
  on public.votes
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "TEMP MVP allow anonymous vote updates" on public.votes;
create policy "TEMP MVP allow anonymous vote updates"
  on public.votes
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "TEMP MVP allow anonymous chat reads" on public.chat_messages;
create policy "TEMP MVP allow anonymous chat reads"
  on public.chat_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous chat creation" on public.chat_messages;
create policy "TEMP MVP allow anonymous chat creation"
  on public.chat_messages
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "TEMP MVP allow anonymous chat updates" on public.chat_messages;
create policy "TEMP MVP allow anonymous chat updates"
  on public.chat_messages
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "TEMP MVP allow anonymous moderation action reads" on public.moderation_actions;
create policy "TEMP MVP allow anonymous moderation action reads"
  on public.moderation_actions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "TEMP MVP allow anonymous moderation action creation" on public.moderation_actions;
create policy "TEMP MVP allow anonymous moderation action creation"
  on public.moderation_actions
  for insert
  to anon, authenticated
  with check (true);
