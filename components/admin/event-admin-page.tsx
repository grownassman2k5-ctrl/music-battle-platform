"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { CopyLinkButton } from "@/components/prototype/copy-link-button";
import { MockButton, Panel, Pill, PreviewLink } from "@/components/prototype/ui";
import { listSavedEvents } from "@/lib/supabase/battle-repository";
import type { BattleEvent } from "@/lib/types/battle";

type AdminLoadState =
  | {
      error: "";
      events: BattleEvent[];
      status: "loading" | "ready";
    }
  | {
      error: string;
      events: BattleEvent[];
      status: "error";
    };

const liveTestItems = [
  "host access",
  "guest passcode",
  "voting",
  "realtime vote totals",
  "chat",
  "moderation",
  "results page",
  "mobile layout",
];

export function EventAdminPage() {
  const [loadState, setLoadState] = useState<AdminLoadState>({
    error: "",
    events: [],
    status: "loading",
  });

  const loadEvents = useCallback(async () => {
    setLoadState((currentState) => ({
      error: "",
      events: currentState.events,
      status: "loading",
    }));

    let result: Awaited<ReturnType<typeof listSavedEvents>>;

    try {
      result = await withAdminTimeout(listSavedEvents(), 9000);
    } catch {
      setLoadState({
        error: getFriendlyAdminError("Supabase request timed out."),
        events: [],
        status: "error",
      });
      return;
    }

    if (result.error || !result.data) {
      setLoadState({
        error: getFriendlyAdminError(
          result.error ?? "Supabase did not return saved events.",
        ),
        events: [],
        status: "error",
      });
      return;
    }

    setLoadState({
      error: "",
      events: result.data,
      status: "ready",
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadEvents]);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
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
                Organizer
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                Event admin dashboard
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <PreviewLink href="/host/setup" tone="primary">
                Host Setup
              </PreviewLink>
              <PreviewLink href="/debug/deployment" tone="ghost">
                Debug Deployment
              </PreviewLink>
            </div>
          </div>
        </header>

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Saved events
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {loadState.status === "loading"
                      ? "Loading Supabase events"
                      : `${loadState.events.length} events found`}
                  </h2>
                </div>
                <MockButton
                  disabled={loadState.status === "loading"}
                  onClick={() => void loadEvents()}
                  tone="ghost"
                >
                  {loadState.status === "loading" ? "Refreshing..." : "Refresh Events"}
                </MockButton>
              </div>

              {loadState.status === "error" ? (
                <p className="mt-5 rounded-lg border border-[#ff6b8a]/30 bg-[#ff6b8a]/10 p-4 text-sm font-semibold text-[#ffe2e8]">
                  {loadState.error}
                </p>
              ) : null}

              <div className="mt-5 grid gap-4">
                {loadState.events.map((event) => (
                  <AdminEventCard event={event} key={event.id} />
                ))}
              </div>

              {loadState.status !== "loading" && loadState.events.length === 0 ? (
                <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">
                    No saved events yet.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Use Host Setup to upload a CSV and save a battle to
                    Supabase. It will appear here after saving.
                  </p>
                </div>
              ) : null}
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel className="p-4">
              <Pill tone="rose">MVP warning</Pill>
              <h2 className="mt-4 text-xl font-bold text-white">
                Admin is not protected yet
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                This dashboard uses the public Supabase client and temporary MVP
                policies. Keep it private for testing. Protect this route with
                Supabase Auth before production.
              </p>
            </Panel>

            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Live test checklist
              </p>
              <div className="mt-4 grid gap-2">
                {liveTestItems.map((item, index) => (
                  <div
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/10 p-3"
                    key={item}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#f7c948]/40 bg-[#f7c948]/10 text-sm font-black text-[#ffe7a3]">
                      {index + 1}
                    </span>
                    <span className="self-center text-sm font-semibold capitalize text-zinc-300">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AdminEventCard({ event }: { event: BattleEvent }) {
  const hostPath = `/host/${event.eventSlug}`;
  const guestPath = `/event/${event.eventSlug}`;
  const resultsPath = `/results/${event.eventSlug}`;

  return (
    <article className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Pill tone={getEventStatusTone(event.status)}>{event.status}</Pill>
            <Pill tone="neutral">{event.matchupMode}</Pill>
          </div>
          <h3 className="mt-4 break-words text-2xl font-black text-white">
            {event.eventName}
          </h3>
          <p className="mt-2 break-words font-mono text-sm text-[#cbfffb]">
            {event.eventSlug}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
          <PreviewLink className="w-full" href={hostPath} tone="primary">
            Host
          </PreviewLink>
          <PreviewLink className="w-full" href={guestPath} tone="ghost">
            Guest
          </PreviewLink>
          <PreviewLink className="w-full" href={resultsPath} tone="ghost">
            Results
          </PreviewLink>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminFact label="Default duration" value={`${event.timerSeconds}s`} />
        <AdminFact
          label="Current round"
          value={event.currentRoundNumber ? String(event.currentRoundNumber) : "Not started"}
        />
        <AdminFact label="Created" value={formatEventDate(event.createdAt)} />
        <AdminFact label="Mode" value={event.matchupMode} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <CopyLinkButton label="Copy Host Link" path={hostPath} />
        <CopyLinkButton label="Copy Guest Link" path={guestPath} />
        <CopyLinkButton label="Copy Results Link" path={resultsPath} />
      </div>
    </article>
  );
}

function AdminFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getEventStatusTone(status: BattleEvent["status"]) {
  return {
    archived: "neutral",
    completed: "cyan",
    live: "gold",
    lobby: "cyan",
    paused: "gold",
    setup: "neutral",
  }[status] as "neutral" | "cyan" | "gold";
}

function getFriendlyAdminError(error: string) {
  const lowerError = error.toLowerCase();

  if (lowerError.includes("row-level") || lowerError.includes("rls")) {
    return "Supabase blocked event listing with a row-level security policy. Check MVP RLS settings.";
  }

  if (
    lowerError.includes("failed to fetch") ||
    lowerError.includes("network") ||
    lowerError.includes("timed out")
  ) {
    return "Supabase did not respond. Check your connection and /debug/deployment.";
  }

  return error;
}

function withAdminTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Supabase request timed out."));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}
