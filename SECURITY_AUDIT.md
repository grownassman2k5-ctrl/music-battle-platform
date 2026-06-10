# Security Audit

Last updated: 2026-06-09

## Current Top Risks

- Supabase Auth now protects organizer/admin entry points, with
  `ADMIN_ACCESS_CODE` kept as a second private-beta layer for `/admin/events`.
  This is still not a complete role/permissions model.
- Supabase RLS policies are still development-friendly until
  `supabase/security_phase_2.sql` is applied and older broad MVP policies are
  reviewed. Guest voting and chat still depend on temporary policies.
- Host and guest event access now uses server-side passcode verification, but
  the resulting local browser marker is still temporary and should be replaced
  by Supabase Auth/server-side sessions.
- Daily room/token creation is server-side and requires verified event access;
  host identity is still based on temporary passcode access, not a durable host
  role.
- Test event deletion is protected by Supabase Auth, an admin access marker, and
  strong typed slug confirmation, but the admin dashboard must remain private
  until RLS is fully reviewed.
- Client-side profanity filtering improves UX but is not security. Malicious
  clients can bypass it until chat writes are protected server-side/RLS-side.

## Fixes Completed In Security Hardening Phase 1

- Confirmed `.env.local` is ignored and documented server-only secrets.
- Added `ADMIN_ACCESS_CODE` as a server-only admin gate for `/admin/events`.
- Moved admin event listing and delete actions through protected server routes.
- Moved host/guest event passcode verification through a server route.
- Stopped returning event passcode hashes in normal browser event payloads.
- Required signed event-access markers before issuing Daily meeting tokens.
- Added focused validation for admin codes, passcodes, display names, event
  slugs, event names, chat messages, and CSV text fields.
- Added conservative security headers that should not block Daily WebRTC/tab
  sharing.
- Added `/debug/deployment` checks for `ADMIN_ACCESS_CODE` and Daily config
  without displaying secret values.

## Later Supabase Auth/RLS Phase

- Add durable host/co-host/moderator roles on top of Supabase Auth.
- Replace temporary event-access tokens with authenticated sessions or
  server-verified RPCs where appropriate.
- Tighten RLS by table and role: event reads by passcode/access, host writes by
  event ownership, guest voting by participant identity, and moderator actions
  by moderator role.
- Move host round controls, chat moderation, guest vote writes, and event setup
  into server actions/routes or SECURITY DEFINER RPCs.
- Add rate limiting for passcode attempts, admin access attempts, chat sends,
  voting, and Daily token creation.
- Consider stronger password hashing for event/admin passcodes if events become
  public or high-value.

## Security Hardening Phase 2 Plan

### Fix Now

- Added Supabase Auth organizer/admin pages using email magic links:
  `/admin/login`, `/admin/callback`, and `/admin/logout`.
- Required an authenticated Supabase user before `/admin/events` shows saved
  events.
- Kept `ADMIN_ACCESS_CODE` as a second private-beta layer for event listing and
  deletion.
- Required authenticated organizer access before `/host/setup` can save new
  Supabase events.
- Moved Supabase event creation from browser writes to a protected server route.
- Kept event deletion server-side and added Supabase Auth verification there.
- Moved host round/event state changes through a protected server route using
  the existing signed host access marker.
- Created `supabase/security_phase_2.sql` for owner fields and staged RLS
  tightening. The app keeps working if this SQL has not been applied yet, but
  owner-based RLS will not be active until it is run.
- Added lightweight in-memory rate limiting for admin code checks, event
  passcode checks, host-state updates, and Daily token creation. This is not
  durable in serverless runtime.

### Leave For Phase 3

- Full Supabase Auth role model for host/co-host/moderator assignments.
- Durable rate limiting with Redis/Upstash or Supabase-backed attempt logs.
- Fully server-side guest vote/chat writes or SECURITY DEFINER RPCs.
- Replacing localStorage event access markers with httpOnly server sessions.
- Full RLS policy replacement after event ownership and participant identity are
  represented in the schema.

### What Could Break If RLS Is Tightened Too Aggressively

- Guest voting and chat could stop working because guests do not have Supabase
  Auth accounts yet.
- Realtime subscriptions for public guest pages could stop receiving event,
  round, vote, or chat updates.
- CSV event setup could fail if authenticated owners are required before the app
  is fully writing `owner_user_id`.
- Existing events without `owner_user_id` could disappear from admin views or
  become undeletable.
