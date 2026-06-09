This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Music Battle Platform

Private host-controlled music battle MVP with local CSV setup, Supabase-backed
events, passcode access, realtime voting, realtime chat/moderation, and
persisted host/guest/results routes. The deployed MVP also supports an optional
Daily-powered in-app audio room so a host can share browser-tab audio without
uploading or storing music files.

For deployment setup, environment variables, Supabase Realtime reminders, Daily
audio setup, and Vercel smoke-test steps, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Local environment variables live in `.env.local`. Supabase is required for the
persisted MVP routes. Daily is optional:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
DAILY_API_KEY=your-daily-api-key
# Optional fallback/diagnostic value. Daily room creation returns the room URL.
NEXT_PUBLIC_DAILY_DOMAIN=your-team.daily.co
```

If `DAILY_API_KEY` is missing, the app keeps working and shows External Audio
Mode as the fallback. Never expose the Daily API key in browser code.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
