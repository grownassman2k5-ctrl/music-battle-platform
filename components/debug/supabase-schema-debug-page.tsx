import Link from "next/link";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { Panel, Pill, PreviewLink } from "@/components/prototype/ui";

const expectedTables = [
  "events",
  "event_sides",
  "songs",
  "rounds",
  "participants",
  "votes",
  "chat_messages",
  "moderation_actions",
];

const manualSteps = [
  "Open your Supabase project dashboard.",
  "Go to SQL Editor.",
  "Open supabase/schema.sql from this project.",
  "Paste the SQL into the editor and run it manually.",
  "Confirm the expected tables exist in Table Editor.",
];

export function SupabaseSchemaDebugPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="border-b border-white/10 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                className="text-sm font-semibold text-zinc-400 transition hover:text-white"
                href="/"
              >
                Back to landing
              </Link>
              <p className="mt-4 text-sm font-semibold uppercase text-[#43d9cf]">
                Debug
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                Supabase schema setup
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <PreviewLink href="/debug/supabase" tone="ghost">
                Client Check
              </PreviewLink>
              <PreviewLink href="/host/setup" tone="ghost">
                Host Setup
              </PreviewLink>
            </div>
          </div>
        </header>

        <section className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Manual setup
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Run the SQL when you are ready
                  </h2>
                </div>
                <Pill tone="gold">Not automated</Pill>
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
                <p className="text-sm font-semibold text-white">
                  SQL file to run
                </p>
                <p className="mt-2 font-mono text-sm text-[#cbfffb]">
                  supabase/schema.sql
                </p>
              </div>

              <ol className="mt-5 grid gap-3">
                {manualSteps.map((step, index) => (
                  <li
                    className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/10 p-4"
                    key={step}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#f7c948]/40 bg-[#f7c948]/10 text-sm font-black text-[#ffe7a3]">
                      {index + 1}
                    </span>
                    <span className="self-center text-sm leading-6 text-zinc-300">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Safety note
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                This page does not query Supabase
              </h2>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                It is a checklist for applying the schema manually. It does not
                expose secrets, run migrations, query tables, change app data,
                add authentication, or enable realtime.
              </p>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Expected tables
              </p>
              <div className="mt-4 grid gap-2">
                {expectedTables.map((tableName) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2"
                    key={tableName}
                  >
                    <span className="font-mono text-sm text-zinc-200">
                      {tableName}
                    </span>
                    <Pill tone="neutral">Expected</Pill>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                RLS status
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">
                Enabled with temporary policies
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                The schema includes development-friendly RLS policies for the
                passcode MVP. Tighten them before any public launch.
              </p>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}
