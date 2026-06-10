# Deployment Readiness

This app is ready for private MVP testing on Vercel once the Supabase
environment variables, Supabase Auth redirects, Supabase Realtime settings, and
optional Daily audio settings are configured.

## Required Environment Variables

Local development uses `.env.local` in the project root.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
ADMIN_ACCESS_CODE=choose-a-private-admin-code
```

Optional in-app audio uses Daily. Keep the API key server-side only.

```bash
DAILY_API_KEY=your-daily-api-key
# Optional fallback/diagnostic value. Daily room creation returns the room URL.
NEXT_PUBLIC_DAILY_DOMAIN=your-team.daily.co
```

Add the same variables in Vercel:

1. Open the Vercel project.
2. Go to Settings > Environment Variables.
3. Add `NEXT_PUBLIC_SUPABASE_URL`.
4. Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Add `ADMIN_ACCESS_CODE`.
6. Optional in-app audio: add `DAILY_API_KEY`.
7. Optional: add `NEXT_PUBLIC_DAILY_DOMAIN`.
8. Redeploy after saving environment variables.

Do not add a Supabase service role key to the browser app.
Do not expose `ADMIN_ACCESS_CODE`, `DAILY_API_KEY`, service role keys, or any
other private secret in browser code. Only safe public values should use
`NEXT_PUBLIC_`.

## Supabase Auth Setup

Organizer/admin pages now use Supabase Auth magic links.

In the Supabase dashboard:

1. Go to Authentication > Providers.
2. Enable Email auth and confirm magic links/OTP are allowed.
3. Go to Authentication > URL Configuration.
4. Set the local Site URL while developing:
   `http://localhost:3000`.
5. Add redirect URLs:
   - `http://localhost:3000/admin/callback`
   - `https://your-vercel-domain.vercel.app/admin/callback`
   - Any custom production domain callback, such as
     `https://your-domain.com/admin/callback`
6. Invite or create the organizer email you plan to use, depending on your
   Supabase Auth settings.

No new environment variable is required for Supabase Auth. It uses the existing
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Private Beta Security Checklist

- `.env.local` is ignored by Git and should stay local.
- Supabase Auth is required before organizer pages can manage saved events.
- `ADMIN_ACCESS_CODE` is also required before `/admin/events` can list or delete
  saved events.
- Event passcodes are verified by a server route; normal browser event loads do
  not receive `passcode_hash`.
- Daily audio token creation requires the browser to have verified host or
  guest event access first.
- The app still uses temporary MVP Supabase RLS policies until the Phase 2 SQL
  is applied and broad policies are reviewed. Do not treat this as
  production-grade access control yet.

## Supabase Checks

Before a family or friends live test, confirm:

- `supabase/schema.sql` has been run in the Supabase SQL Editor.
- `supabase/security_phase_2.sql` has been reviewed and run in the Supabase SQL
  Editor.
- Tables exist: `events`, `event_sides`, `songs`, `rounds`, `participants`,
  `votes`, `chat_messages`, and `moderation_actions`.
- New events created after Phase 2 have `events.owner_user_id` populated.
- Realtime is enabled for `events`, `rounds`, `votes`, and `chat_messages`.
- Temporary MVP guest RLS policies are present until guest voting/chat writes
  move server-side in a later phase.

Use these local/debug pages:

- `/debug/supabase`
- `/debug/supabase-schema`
- `/debug/deployment`

## Optional Daily In-App Audio

Daily powers the private in-app audio room. This does not upload, store, or
analyze music files; it only lets the host share browser-tab audio through a
WebRTC room.

Setup:

1. Create or open a Daily account.
2. Copy an API key from the Daily dashboard.
3. Add `DAILY_API_KEY` to `.env.local`.
4. Add `DAILY_API_KEY` to Vercel project environment variables.
5. Optional: add `NEXT_PUBLIC_DAILY_DOMAIN`, such as `your-team.daily.co`, for
   fallback/diagnostic display.
6. Redeploy.

How to test:

1. Open a persisted host page, such as `/host/[eventSlug]`.
2. In the In-App Audio Room panel, click Start In-App Audio.
3. In Chrome or Edge on desktop, choose the Apple Music Web tab and enable tab
   audio in the sharing dialog.
4. Open the matching guest page on another device or browser.
5. After passcode access, click Join Event Audio.
6. Confirm voting and chat still work while audio is connected.

Browser recommendations:

- Chrome or Edge on desktop are best for sharing tab audio.
- Safari and mobile browsers may let guests listen, but host tab-audio sharing
  is less reliable.
- Guests must tap Join Event Audio because browsers block autoplay.

External Zoom, Discord, Meet, phone, or speaker audio remains the recommended
fallback for a family/friends live test.

Private-use warning: this MVP creates Daily meeting tokens from an app route,
but host authorization is still temporary until Supabase Auth/server-side host
roles are added.

## Vercel Smoke Test

After deploying:

1. Open `/debug/deployment` and confirm public env variables are present.
2. Confirm `ADMIN_ACCESS_CODE` is configured.
3. Confirm the expected Supabase tables are reachable.
4. Open `/admin/login` and sign in with the organizer email.
5. Open `/admin/events`, enter the admin code, and confirm saved events load.
6. Open `/host/setup` while signed in and save a small test event to Supabase.
7. Open `/host/[eventSlug]`, `/event/[eventSlug]`, and `/results/[eventSlug]`.
8. Test passcode entry, guest join, realtime voting, realtime chat, moderation,
   winner reveal, and results.
9. Optional: test Daily in-app audio from a desktop Chrome or Edge host browser.

## Current MVP Limitations

- Supabase Auth covers organizer/admin access, but host/co-host/moderator roles
  are not fully modeled yet.
- RLS policies are still staged and need final tightening before public use.
- Host timer state is client-side only.
- Guest voting, chat, and moderation still use browser Supabase writes under MVP
  policies. Host round controls now go through a server route using the signed
  host access marker.
- External audio is still the safest fallback even when Daily in-app audio is
  configured.
- Event guest/host access uses temporary signed local browser markers. Replace
  them with server-side sessions or stronger RPC checks before public launch.
