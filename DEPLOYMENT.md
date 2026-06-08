# Deployment Readiness

This app is ready for private MVP testing on Vercel once the public Supabase
environment variables and Supabase Realtime settings are configured.

## Required Environment Variables

Local development uses `.env.local` in the project root.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Add the same variables in Vercel:

1. Open the Vercel project.
2. Go to Settings > Environment Variables.
3. Add `NEXT_PUBLIC_SUPABASE_URL`.
4. Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Redeploy after saving environment variables.

Do not add a Supabase service role key to the browser app.

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

## Vercel Smoke Test

After deploying:

1. Open `/debug/deployment` and confirm public env variables are present.
2. Confirm the expected Supabase tables are reachable.
3. Open `/host/setup` and save a small test event to Supabase.
4. Open `/host/[eventSlug]`, `/event/[eventSlug]`, and `/results/[eventSlug]`.
5. Test passcode entry, guest join, realtime voting, realtime chat, moderation,
   winner reveal, and results.

## Current MVP Limitations

- Supabase Auth is not added yet.
- Passcode verification is browser-side and temporary.
- RLS policies are development-friendly and need tightening before public use.
- Host timer state is client-side only.
- The host still plays or shares audio outside the app.
