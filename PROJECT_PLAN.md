# Project Plan

## Current Project Snapshot

- Next.js 16.2.7, React 19.2.4, TypeScript strict mode, Tailwind CSS 4.
- The app is still the generated starter surface: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, default public SVG assets, and standard config files.
- There are no feature routes, shared components, data models, mock fixtures, API route handlers, auth, or Supabase files yet.
- `@/*` is already mapped to the repository root in `tsconfig.json`, so future imports can use paths like `@/lib/types`.
- Per `AGENTS.md`, the relevant bundled Next docs were checked before planning: project structure, layouts/pages, server/client components, and route handlers. Important Next 16 notes for this app: pages/layouts are Server Components by default, interactive UI should be isolated behind `"use client"` boundaries, dynamic route params are async, and `app/**/route.ts` handlers cannot live at the same route segment level as `page.tsx`.

## Recommended File And Folder Structure

```text
app/
  layout.tsx
  globals.css
  page.tsx
  (public)/
    join/[eventCode]/page.tsx
    results/[eventCode]/page.tsx
  (event)/
    event/[eventCode]/page.tsx
  (host)/
    host/[eventCode]/page.tsx
  api/
    events/route.ts
    events/[eventId]/join/route.ts
    events/[eventId]/songs/route.ts
    events/[eventId]/rounds/route.ts
    events/[eventId]/votes/route.ts
    events/[eventId]/chat/route.ts

components/
  shell/
  event/
  host/
  voting/
  chat/
  scoreboard/
  effects/

lib/
  constants.ts
  types.ts
  mock-data.ts
  battle/
    csv.ts
    matchups.ts
    scoring.ts
    timers.ts
  state/
    mock-event-store.ts
  supabase/
    client.ts
    server.ts
    schema-notes.md

public/
  backgrounds/
```

Route groups keep URLs clean while separating public, event, and host surfaces. The early implementation should keep pages mostly server-rendered and move browser-heavy behavior into focused Client Components, especially host controls, voting, chat, timers, animation controls, and CSV upload.

## First 5 Implementation Milestones

1. **Domain model and local mock shell**
   Define TypeScript types for events, participants, roles, songs, rounds, matchups, votes, chat messages, themes, and results. Add local mock data and build the first navigable route surfaces without persistence.

2. **Host setup and song import**
   Build the host setup flow with event name, passcode, timer duration defaulting to 120 seconds, fixed/random matchup mode, and CSV import validation for exactly 40 songs. Keep the first version local-only.

3. **Guest join and event room**
   Add private event link handling, passcode gate, guest display-name join, and a shared event room that shows current round, current matchup, timer, scoreboard, and visual theme.

4. **Host-controlled rounds and voting**
   Add host/moderator controls for starting rounds, opening voting, closing voting, advancing matchups, and revealing winners. Guests should be able to change votes until voting closes.

5. **Chat, reveal, results, and persistence bridge**
   Add moderated live chat, dramatic winner reveal, final scoreboard, results page, vote totals, round winners, and Apple Music playlist links. Once the local interaction model feels right, replace the mock store with Supabase-backed reads/writes and realtime subscriptions.

## Local-Only Mock Data First

- Sample private event code and passcode.
- Fake host, moderator, and guest identities.
- A 40-song fixture with artist, title, album/artwork URL placeholder, Apple Music URL placeholder, seed/order, and optional theme tags.
- Matchup generation for fixed and randomized brackets.
- Current round state, timer state, open/closed voting state, votes, scoreboard, and winner reveal state.
- Local chat messages plus basic moderation actions like hide, delete, and timeout.
- Background/theme library metadata using local placeholder assets.

## Supabase Later

- Events table with private code, passcode hash, timer config, matchup mode, status, and host ownership.
- Participants table with display name, role, session identity, and event membership.
- Songs table and CSV import records.
- Rounds and matchups tables with ordering, active state, winners, and score snapshots.
- Votes table with one vote per participant per matchup and updates allowed only while voting is open.
- Chat messages, moderation actions, and moderator audit history.
- Realtime channels for event state, timer changes, votes, scoreboard, and chat.
- Storage or metadata tables for AI-generated backgrounds and theme assets.
- Results records with round winners, vote totals, final scores, and Apple Music playlist links.

## Build Bias

Start with a complete local event loop before adding Supabase. The riskiest product behavior is not database access; it is whether host control, voting windows, guest updates, timers, and reveal pacing feel good under a live event flow.
