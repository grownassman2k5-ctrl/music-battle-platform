-- Security Hardening Phase 2
-- Run manually in the Supabase SQL Editor after reviewing the notes below.
--
-- Goals:
-- - Associate persisted events with the authenticated organizer who created them.
-- - Add owner-scoped RLS policies for event administration.
-- - Preserve the current guest passcode/display-name MVP while host/admin writes
--   are gradually moved behind server routes.
--
-- Important limitations:
-- - This file intentionally does not drop existing Phase 1 development-friendly
--   policies. Dropping broad policies too early can break guest voting, chat,
--   realtime subscriptions, and existing events created before owner_user_id.
-- - After verifying the app uses the server routes for admin/host writes, review
--   existing policies in Authentication > Policies and remove any broad MVP
--   policies that are no longer needed.
-- - Guest passcode access is still represented by browser localStorage markers,
--   not Supabase Auth. Durable guest authorization needs a Phase 3 server/RPC
--   design before public launch.

alter table public.events
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create index if not exists events_owner_user_id_idx
  on public.events(owner_user_id);

comment on column public.events.owner_user_id is
  'Authenticated Supabase Auth user who owns/administers this event. Added in Security Phase 2.';

comment on table public.events is
  'Private music battle events. Phase 2 adds owner_user_id for organizer/admin access; passcode-only guest access remains temporary.';

-- Owner policies for events. Existing MVP policies may still be present; review
-- and remove broad policies only after confirming guest-safe server routes.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'phase_2_event_owners_select_events'
  ) then
    create policy "phase_2_event_owners_select_events"
      on public.events
      for select
      to authenticated
      using (owner_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'phase_2_event_owners_insert_events'
  ) then
    create policy "phase_2_event_owners_insert_events"
      on public.events
      for insert
      to authenticated
      with check (owner_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'phase_2_event_owners_update_events'
  ) then
    create policy "phase_2_event_owners_update_events"
      on public.events
      for update
      to authenticated
      using (owner_user_id = auth.uid())
      with check (owner_user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'phase_2_event_owners_delete_events'
  ) then
    create policy "phase_2_event_owners_delete_events"
      on public.events
      for delete
      to authenticated
      using (owner_user_id = auth.uid());
  end if;
end $$;

-- Event owners can manage event-side, song, and round data for events they own.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_sides'
      and policyname = 'phase_2_event_owners_manage_event_sides'
  ) then
    create policy "phase_2_event_owners_manage_event_sides"
      on public.event_sides
      for all
      to authenticated
      using (
        exists (
          select 1 from public.events
          where events.id = event_sides.event_id
            and events.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events
          where events.id = event_sides.event_id
            and events.owner_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'songs'
      and policyname = 'phase_2_event_owners_manage_songs'
  ) then
    create policy "phase_2_event_owners_manage_songs"
      on public.songs
      for all
      to authenticated
      using (
        exists (
          select 1 from public.events
          where events.id = songs.event_id
            and events.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events
          where events.id = songs.event_id
            and events.owner_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rounds'
      and policyname = 'phase_2_event_owners_manage_rounds'
  ) then
    create policy "phase_2_event_owners_manage_rounds"
      on public.rounds
      for all
      to authenticated
      using (
        exists (
          select 1 from public.events
          where events.id = rounds.event_id
            and events.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events
          where events.id = rounds.event_id
            and events.owner_user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Event owners can inspect guest activity tables for events they own. The guest
-- insert/update policies remain MVP-friendly until guest writes are moved fully
-- server-side in a later phase.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'participants'
      and policyname = 'phase_2_event_owners_read_participants'
  ) then
    create policy "phase_2_event_owners_read_participants"
      on public.participants
      for select
      to authenticated
      using (
        exists (
          select 1 from public.events
          where events.id = participants.event_id
            and events.owner_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'votes'
      and policyname = 'phase_2_event_owners_read_votes'
  ) then
    create policy "phase_2_event_owners_read_votes"
      on public.votes
      for select
      to authenticated
      using (
        exists (
          select 1 from public.events
          where events.id = votes.event_id
            and events.owner_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and policyname = 'phase_2_event_owners_manage_chat_messages'
  ) then
    create policy "phase_2_event_owners_manage_chat_messages"
      on public.chat_messages
      for all
      to authenticated
      using (
        exists (
          select 1 from public.events
          where events.id = chat_messages.event_id
            and events.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events
          where events.id = chat_messages.event_id
            and events.owner_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'moderation_actions'
      and policyname = 'phase_2_event_owners_manage_moderation_actions'
  ) then
    create policy "phase_2_event_owners_manage_moderation_actions"
      on public.moderation_actions
      for all
      to authenticated
      using (
        exists (
          select 1 from public.events
          where events.id = moderation_actions.event_id
            and events.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events
          where events.id = moderation_actions.event_id
            and events.owner_user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Manual follow-up after this file is applied and tested:
-- 1. Create a new event while signed in and confirm owner_user_id is populated.
-- 2. Confirm /admin/events only lists events for the signed-in organizer once
--    broad MVP select policies are removed.
-- 3. Confirm guests can still join, vote, chat, and receive realtime updates.
-- 4. Move guest voting/chat writes server-side before removing anonymous guest
--    write policies.
