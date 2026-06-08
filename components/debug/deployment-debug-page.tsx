"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { MockButton, Panel, Pill, PreviewLink } from "@/components/prototype/ui";
import {
  battleTableNames,
  checkSupabaseTables,
  type SupabaseTableCheck,
} from "@/lib/supabase/battle-repository";
import { getSupabaseConnectionCheck } from "@/lib/supabase/browser-client";

const realtimeTables = ["events", "rounds", "votes", "chat_messages"];

const demoRoutes = ["/", "/host/setup", "/host/demo", "/event/demo", "/results/demo"];

const persistedRoutes = [
  "/host/[eventSlug]",
  "/event/[eventSlug]",
  "/results/[eventSlug]",
];

export function DeploymentDebugPage() {
  const connectionCheck = getSupabaseConnectionCheck();
  const [checks, setChecks] = useState<SupabaseTableCheck[]>([]);
  const [schemaError, setSchemaError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const availableTableCount = checks.filter(
    (check) => check.status === "available",
  ).length;
  const expectedTablesReady =
    checks.length === battleTableNames.length &&
    availableTableCount === battleTableNames.length;
  const checklist = useMemo(
    () => [
      {
        detail: "The Supabase project URL is configured in this build.",
        isReady: connectionCheck.hasUrl,
        label: "Supabase URL present",
      },
      {
        detail: "The public browser key is configured in this build.",
        isReady: connectionCheck.hasPublishableKey,
        label: "Supabase publishable key present",
      },
      {
        detail: connectionCheck.message,
        isReady: connectionCheck.canCreateClient,
        label: "Supabase client can be created",
      },
      {
        detail: isChecking
          ? "Checking expected table reachability..."
          : `${availableTableCount} of ${battleTableNames.length} expected tables reachable.`,
        isReady: expectedTablesReady,
        label: "Expected tables available",
      },
      {
        detail:
          "Manual Supabase dashboard check: enable Realtime for events, rounds, votes, and chat_messages.",
        isReady: false,
        label: "Realtime enabled for live tables",
        manual: true,
      },
      {
        detail: "Static demo and setup routes are still available for fallback testing.",
        isReady: true,
        label: "Demo routes available",
      },
      {
        detail:
          "Dynamic persisted route patterns are present. Test with a real saved event slug.",
        isReady: true,
        label: "Persisted routes available",
      },
    ],
    [availableTableCount, connectionCheck, expectedTablesReady, isChecking],
  );

  const runChecks = useCallback(async () => {
    setIsChecking(true);
    setSchemaError("");

    const result = await checkSupabaseTables();

    if (result.error || !result.data) {
      setChecks([]);
      setSchemaError(result.error ?? "Schema check returned no table results.");
      setIsChecking(false);
      return;
    }

    setChecks(result.data);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    let isActive = true;

    checkSupabaseTables().then((result) => {
      if (!isActive) {
        return;
      }

      if (result.error || !result.data) {
        setChecks([]);
        setSchemaError(
          result.error ?? "Schema check returned no table results.",
        );
        setIsChecking(false);
        return;
      }

      setChecks(result.data);
      setIsChecking(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
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
                Deployment readiness
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <PreviewLink href="/debug/supabase" tone="ghost">
                Client Check
              </PreviewLink>
              <PreviewLink href="/debug/supabase-schema" tone="ghost">
                Schema Check
              </PreviewLink>
              <PreviewLink href="/host/setup" tone="ghost">
                Host Setup
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
                    Preflight checklist
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Vercel and real-device readiness
                  </h2>
                </div>
                <MockButton
                  disabled={isChecking}
                  onClick={runChecks}
                  tone="ghost"
                >
                  {isChecking ? "Checking..." : "Recheck"}
                </MockButton>
              </div>

              <div className="mt-5 grid gap-3">
                {checklist.map((item) => (
                  <DeploymentChecklistRow item={item} key={item.label} />
                ))}
              </div>

              {schemaError ? (
                <p className="mt-5 rounded-lg border border-[#ff6b8a]/30 bg-[#ff6b8a]/10 p-4 text-sm font-semibold text-[#ffe2e8]">
                  {schemaError}
                </p>
              ) : null}
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Realtime reminder
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Enable live table broadcasts in Supabase
              </h2>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Realtime is what keeps host controls, guest phase updates,
                vote totals, and live chat moving without refresh. In the
                Supabase dashboard, confirm Realtime is enabled for these
                tables:
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {realtimeTables.map((tableName) => (
                  <div
                    className="rounded-lg border border-[#f7c948]/30 bg-[#f7c948]/10 px-3 py-2 font-mono text-sm font-semibold text-[#ffe7a3]"
                    key={tableName}
                  >
                    {tableName}
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Expected tables
              </p>
              <div className="mt-4 grid gap-2">
                {battleTableNames.map((tableName) => {
                  const check = checks.find(
                    (item) => item.tableName === tableName,
                  );

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2"
                      key={tableName}
                    >
                      <span className="min-w-0 break-words font-mono text-sm text-zinc-200">
                        {tableName}
                      </span>
                      <Pill
                        tone={
                          check?.status === "available"
                            ? "cyan"
                            : isChecking
                              ? "gold"
                              : "rose"
                        }
                      >
                        {check?.status === "available"
                          ? "Ready"
                          : isChecking
                            ? "Checking"
                            : "Check"}
                      </Pill>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <RouteListPanel routes={demoRoutes} title="Demo routes" />
            <RouteListPanel routes={persistedRoutes} title="Persisted routes" />
          </aside>
        </section>
      </div>
    </main>
  );
}

function DeploymentChecklistRow({
  item,
}: {
  item: {
    detail: string;
    isReady: boolean;
    label: string;
    manual?: boolean;
  };
}) {
  const tone = item.manual ? "gold" : item.isReady ? "cyan" : "rose";
  const label = item.manual ? "Manual" : item.isReady ? "Ready" : "Needs check";

  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{item.label}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{item.detail}</p>
        </div>
        <Pill tone={tone}>{label}</Pill>
      </div>
    </div>
  );
}

function RouteListPanel({ routes, title }: { routes: string[]; title: string }) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">{title}</p>
      <div className="mt-4 grid gap-2">
        {routes.map((route) => (
          <div
            className="break-words rounded-lg border border-white/10 bg-white/10 px-3 py-2 font-mono text-sm text-zinc-200"
            key={route}
          >
            {route}
          </div>
        ))}
      </div>
    </Panel>
  );
}
