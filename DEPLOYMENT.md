# Deployment Readiness

This app is ready for private MVP testing on Vercel once the Supabase
environment variables, Supabase Realtime settings, and optional Daily audio
settings are configured.

## Required Environment Variables

Local development uses `.env.local` in the project root.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
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
5. Optional in-app audio: add `DAILY_API_KEY`.
6. Optional: add `NEXT_PUBLIC_DAILY_DOMAIN`.
7. Redeploy after saving environment variables.

Do not add a Supabase service role key to the browser app.
Do not expose the Daily API key in browser code; it should only be read by
server-side routes.

## Supabase Checks

Before a family or friends live test, confirm:

- `supabase/schema.sql` has been run in the Supabase SQL Editor.
- Tables exist: `events`, `event_sides`, `songs`, `rounds`, `participants`,
  `votes`, `chat_messages`, and `moderation_actions`.
- Realtime is enabled for `events`, `rounds`, `votes`, and `chat_messages`.
- Temporary MVP RLS policies are present.

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
but host authorization is still temporary until Supabase Auth or server-side
host verification is added.

## Vercel Smoke Test

After deploying:

1. Open `/debug/deployment` and confirm public env variables are present.
2. Confirm the expected Supabase tables are reachable.
3. Open `/host/setup` and save a small test event to Supabase.
4. Open `/host/[eventSlug]`, `/event/[eventSlug]`, and `/results/[eventSlug]`.
5. Test passcode entry, guest join, realtime voting, realtime chat, moderation,
   winner reveal, and results.
6. Optional: test Daily in-app audio from a desktop Chrome or Edge host browser.

## Current MVP Limitations

- Supabase Auth is not added yet.
- Passcode verification is browser-side and temporary.
- RLS policies are development-friendly and need tightening before public use.
- Host timer state is client-side only.
- External audio is still the safest fallback even when Daily in-app audio is
  configured.
- Daily host token creation needs real server-side host authorization before a
  public launch.
