"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { MockButton, Panel, Pill, PreviewLink } from "@/components/prototype/ui";
import {
  battleTableNames,
  checkSupabaseTables,
  type SupabaseBattleTableName,
  type SupabaseTableCheck,
  type SupabaseTableStatus,
} from "@/lib/supabase/battle-repository";

const manualSteps = [
  "Open your Supabase project dashboard.",
  "Go to SQL Editor.",
  "Open supabase/schema.sql from this project.",
  "Paste the SQL into the editor and run it manually.",
  "Confirm the expected tables exist in Table Editor.",
];

export function SupabaseSchemaDebugPage() {
  const [checks, setChecks] = useState<SupabaseTableCheck[]>([]);
  const [schemaError, setSchemaError] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  const runSchemaCheck = useCallback(async () => {
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
              <PreviewLink href="/debug/deployment" tone="ghost">
                Deployment
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
                    Table verification
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Supabase schema reachability
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={isChecking ? "gold" : "cyan"}>
                    {isChecking ? "Checking" : "Checked"}
                  </Pill>
                  <MockButton
                    disabled={isChecking}
                    onClick={runSchemaCheck}
                    tone="ghost"
                  >
                    Recheck
                  </MockButton>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {battleTableNames.map((tableName) => (
                  <TableStatusRow
                    check={checks.find((item) => item.tableName === tableName)}
                    isChecking={isChecking}
                    key={tableName}
                    tableName={tableName}
                  />
                ))}
              </div>

              {schemaError ? (
                <div className="mt-5 rounded-lg border border-[#ff6b8a]/30 bg-[#ff6b8a]/10 p-4 text-sm font-semibold text-[#ffe2e8]">
                  {schemaError}
                </div>
              ) : null}
            </Panel>

            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Manual setup
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Run the SQL in Supabase if anything is missing
                  </h2>
                </div>
                <Pill tone="gold">Manual</Pill>
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
                This page runs read-only checks
              </h2>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                It uses the publishable browser client to run lightweight
                select id limit 1 checks. It does not expose secrets, run
                migrations, change app data, add authentication, or enable
                realtime.
              </p>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Realtime reminder
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Enable live sync tables in Supabase
              </h2>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Host-to-guest updates, vote totals, and live chat require
                Supabase Realtime to be enabled for events, rounds, votes, and
                chat_messages.
              </p>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Expected tables
              </p>
              <div className="mt-4 grid gap-2">
                {battleTableNames.map((tableName) => (
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

function TableStatusRow({
  check,
  isChecking,
  tableName,
}: {
  check?: SupabaseTableCheck;
  isChecking: boolean;
  tableName: SupabaseBattleTableName;
}) {
  const statusLabel = check
    ? getTableStatusLabel(check.status)
    : isChecking
      ? "Checking"
      : "Unknown Error";

  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-white">
            {tableName}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {check?.message ??
              (isChecking
                ? "Checking table reachability..."
                : "No check result was returned for this table.")}
          </p>
        </div>
        <Pill tone={check ? getTableStatusTone(check.status) : "gold"}>
          {statusLabel}
        </Pill>
      </div>
    </div>
  );
}

function getTableStatusLabel(status: SupabaseTableStatus) {
  return {
    available: "Available",
    missing: "Missing",
    permission_error: "Permission Error",
    unknown_error: "Unknown Error",
  }[status];
}

function getTableStatusTone(status: SupabaseTableStatus) {
  return {
    available: "cyan",
    missing: "rose",
    permission_error: "gold",
    unknown_error: "rose",
  }[status] as "cyan" | "rose" | "gold";
}
