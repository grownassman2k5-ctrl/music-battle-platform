"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GeneratedMatchup, ImportedSong } from "@/lib/csv-import";
import { createLocalBattleSetup } from "@/lib/local-demo-store";
import {
  loadPersistedBattleBySlug,
  type PersistedBattle,
} from "@/lib/supabase/battle-repository";
import type { EventSide, Round, Song } from "@/lib/types/battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import {
  GeneratedEventDemoPage,
  GeneratedHostDemoPage,
  GeneratedResultsDemoPage,
} from "./generated-demo-pages";
import { Panel, PreviewLink } from "./ui";

type PersistedRouteMode = "host" | "event" | "results";

type PersistedBattleState =
  | {
      status: "loading";
    }
  | {
      status: "error";
      error: string;
    }
  | {
      status: "ready";
      setup: ReturnType<typeof createLocalBattleSetup>;
    };

export function PersistedHostBattlePage({
  eventSlug,
}: {
  eventSlug: string;
}) {
  const state = usePersistedBattleSetup(eventSlug);

  if (state.status !== "ready") {
    return <PersistedRouteShell eventSlug={eventSlug} mode="host" state={state} />;
  }

  return (
    <GeneratedHostDemoPage
      eyebrow="Persisted host"
      setup={state.setup}
      showResetDemoData={false}
    />
  );
}

export function PersistedEventBattlePage({
  eventSlug,
}: {
  eventSlug: string;
}) {
  const state = usePersistedBattleSetup(eventSlug);

  if (state.status !== "ready") {
    return (
      <PersistedRouteShell eventSlug={eventSlug} mode="event" state={state} />
    );
  }

  return <GeneratedEventDemoPage eyebrow="Persisted guest" setup={state.setup} />;
}

export function PersistedResultsBattlePage({
  eventSlug,
}: {
  eventSlug: string;
}) {
  const state = usePersistedBattleSetup(eventSlug);

  if (state.status !== "ready") {
    return (
      <PersistedRouteShell eventSlug={eventSlug} mode="results" state={state} />
    );
  }

  return (
    <GeneratedResultsDemoPage eyebrow="Persisted results" setup={state.setup} />
  );
}

function usePersistedBattleSetup(eventSlug: string): PersistedBattleState {
  const [state, setState] = useState<PersistedBattleState>({
    status: "loading",
  });

  useEffect(() => {
    let isActive = true;

    async function loadBattle() {
      setState({ status: "loading" });

      const result = await loadPersistedBattleBySlug(eventSlug);

      if (!isActive) {
        return;
      }

      if (result.error || !result.data) {
        setState({
          status: "error",
          error: result.error ?? "Supabase did not return battle data.",
        });
        return;
      }

      setState({
        status: "ready",
        setup: persistedBattleToLocalSetup(result.data),
      });
    }

    loadBattle().catch((error: unknown) => {
      if (!isActive) {
        return;
      }

      setState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "The persisted battle could not be loaded.",
      });
    });

    return () => {
      isActive = false;
    };
  }, [eventSlug]);

  return state;
}

function PersistedRouteShell({
  eventSlug,
  mode,
  state,
}: {
  eventSlug: string;
  mode: PersistedRouteMode;
  state: Exclude<PersistedBattleState, { status: "ready" }>;
}) {
  const title =
    state.status === "loading"
      ? "Loading persisted battle"
      : "Persisted battle unavailable";
  const message =
    state.status === "loading"
      ? "Reading event, sides, songs, and rounds from Supabase."
      : state.error;

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-5 py-10 sm:px-8">
        <Panel className="w-full p-6">
          <Link
            className="text-sm font-semibold text-zinc-400 transition hover:text-white"
            href="/host/setup"
          >
            Back to setup
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase text-[#43d9cf]">
            Supabase route
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
          <p className="mt-4 text-base leading-7 text-zinc-400">{message}</p>
          <p className="mt-4 rounded-lg border border-white/10 bg-white/10 p-3 text-sm text-zinc-300">
            Route: /{mode}/{eventSlug}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PreviewLink href="/debug/supabase-schema" tone="ghost">
              Check Tables
            </PreviewLink>
            <PreviewLink href="/host/setup">Host Setup</PreviewLink>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function persistedBattleToLocalSetup(battle: PersistedBattle) {
  const sides = [...battle.sides].sort(
    (sideOne, sideTwo) => sideOne.displayOrder - sideTwo.displayOrder,
  );
  const importedSongs = battle.songs.map((song, index) =>
    persistedSongToImportedSong(song, sides, index),
  );
  const songById = new Map(importedSongs.map((song) => [song.id, song]));
  const generatedMatchups = battle.rounds
    .map((round) => persistedRoundToGeneratedMatchup(round, songById))
    .filter((matchup): matchup is GeneratedMatchup => matchup !== null);

  return createLocalBattleSetup({
    eventName: battle.event.eventName,
    eventPasscode: "",
    defaultSongDuration: battle.event.defaultSongDurationSeconds,
    matchupMode: battle.event.matchupMode,
    detectedSideValues: sides.map((side) => side.internalSideValue),
    sideDisplayConfigs: sides.map((side) => ({
      sourceCsvValue: side.internalSideValue,
      csvValue: side.internalSideValue,
      publicDisplayName: side.publicDisplayName,
      artistDisplayName: side.artistDisplayName,
    })),
    importedSongs,
    generatedMatchups,
  });
}

function persistedSongToImportedSong(
  song: Song,
  sides: EventSide[],
  index: number,
): ImportedSong {
  const side = sides.find((candidate) => candidate.id === song.sideId);

  return {
    id: song.id,
    rowNumber: song.csvRowNumber ?? index + 1,
    side: side?.internalSideValue ?? song.sideId,
    artist: song.artist,
    songTitle: song.songTitle,
    album: song.album ?? "",
    genre: song.genre ?? "",
    durationSeconds: song.durationSeconds,
    year: song.year ?? "",
    mood: song.mood ?? "",
    fixedOrder: song.fixedOrder,
    appleMusicLink: song.appleMusicLink ?? "",
  };
}

function persistedRoundToGeneratedMatchup(
  round: Round,
  songById: Map<string, ImportedSong>,
): GeneratedMatchup | null {
  const sideOne = songById.get(round.sideOneSongId);
  const sideTwo = songById.get(round.sideTwoSongId);

  if (!sideOne || !sideTwo) {
    return null;
  }

  return {
    roundNumber: round.roundNumber,
    fixedOrder:
      sideOne.fixedOrder === sideTwo.fixedOrder ? sideOne.fixedOrder : null,
    sideOne,
    sideTwo,
  };
}
