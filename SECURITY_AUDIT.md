# Security Audit

Last updated: 2026-06-09

## Current Top Risks

- The admin dashboard is not yet protected by Supabase Auth. A temporary
  `ADMIN_ACCESS_CODE` gate reduces exposure for private beta, but it is not
  a replacement for real user auth.
- Supabase RLS policies are still development-friendly. Browser writes for
  guest voting, chat, moderation, host round state, and event setup still depend
  on MVP policies.
- Host and guest event access now uses server-side passcode verification, but
  the resulting local browser marker is still temporary and should be replaced
  by Supabase Auth/server-side sessions.
- Daily room/token creation is server-side and requires an event access marker,
  but host identity is still based on temporary passcode access.
- Test event deletion is protected by an admin access marker and strong typed
  slug confirmation, but should move to authenticated organizer permissions.
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

- Add Supabase Auth for organizer/host/moderator identity.
- Replace temporary admin and event-access tokens with authenticated sessions or
  server-verified RPCs.
- Tighten RLS by table and role: event reads by passcode/access, host writes by
  event ownership, guest voting by participant identity, and moderator actions
  by moderator role.
- Move host round controls, chat moderation, guest vote writes, and event setup
  into server actions/routes or SECURITY DEFINER RPCs.
- Add rate limiting for passcode attempts, admin access attempts, chat sends,
  voting, and Daily token creation.
- Consider stronger password hashing for event/admin passcodes if events become
  public or high-value.
