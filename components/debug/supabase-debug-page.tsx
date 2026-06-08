"use client";

import Link from "next/link";
import { getSupabaseConnectionCheck } from "@/lib/supabase/browser-client";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { Panel, Pill, PreviewLink } from "@/components/prototype/ui";

export function SupabaseDebugPage() {
  const connectionCheck = getSupabaseConnectionCheck();

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="border-b border-white/10 pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
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
                Supabase connection prep
              </h1>
            </div>
            <PreviewLink href="/host/setup" tone="ghost">
              Host Setup
            </PreviewLink>
            <PreviewLink href="/debug/supabase-schema" tone="ghost">
              Schema Checklist
            </PreviewLink>
          </div>
        </header>

        <section className="py-6">
          <Panel className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-zinc-500">
                  Browser client status
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {connectionCheck.canCreateClient
                    ? "Ready for client-side Supabase work"
                    : "Supabase client is not ready yet"}
                </h2>
              </div>
              <Pill tone={connectionCheck.canCreateClient ? "cyan" : "rose"}>
                {connectionCheck.canCreateClient ? "Ready" : "Needs config"}
              </Pill>
            </div>

            <div className="mt-6 grid gap-3">
              <StatusRow
                isReady={connectionCheck.hasUrl}
                label="NEXT_PUBLIC_SUPABASE_URL"
              />
              <StatusRow
                isReady={connectionCheck.hasPublishableKey}
                label="NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
              />
              <StatusRow
                isReady={connectionCheck.canCreateClient}
                label="Supabase browser client"
              />
            </div>

            <div className="mt-6 rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">
                {connectionCheck.message}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                This page only checks whether the public environment variables
                are present and whether the SDK can create a browser client.
                It does not display the key, query Supabase, create tables,
                authenticate users, or enable realtime.
              </p>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function StatusRow({ isReady, label }: { isReady: boolean; label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/10 px-4 py-3">
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
      <Pill tone={isReady ? "cyan" : "rose"}>
        {isReady ? "Present" : "Missing"}
      </Pill>
    </div>
  );
}
