"use client";

import { useMemo, useState } from "react";
import type { GeneratedMatchup, ImportedSong } from "@/lib/csv-import";
import {
  clearLocalBattleSetup,
  getLocalSideConfig,
  type LocalBattleSetup,
  type LocalSideDisplayConfig,
} from "@/lib/local-demo-store";
import type { Accent, ScoreboardEntry } from "@/lib/mock-battle";
import { mockBattleEvent } from "@/lib/mock-battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { ChatPanel } from "./chat-panel";
import { DemoHeader } from "./demo-header";
import { HostRoleControls } from "./host-role-controls";
import { ModerationPanel } from "./moderation-panel";
import { Scoreboard } from "./scoreboard";
import { ThemeSelector } from "./theme-selector";
import { TimerDisplay } from "./timer-display";
import { MockButton, Panel, Pill } from "./ui";

type HostStatus =
  | "Ready"
  | "Round started"
  | "Voting open"
  | "Voting closed"
  | "Winner revealed"
  | "Battle complete";

type GeneratedVoteSide = "sideOne" | "sideTwo";

type GeneratedVoteTotals = Record<GeneratedVoteSide, number>;

const accentBySide: Record<GeneratedVoteSide, Accent> = {
  sideOne: "gold",
  sideTwo: "cyan",
};

const selectedClass: Record<GeneratedVoteSide, string> = {
  sideOne: "ring-2 ring-[#f7c948]",
  sideTwo: "ring-2 ring-[#43d9cf]",
};

const accentClass = {
  gold: {
    shell: "border-[#f7c948]/40 bg-[#f7c948]/10",
    marker: "bg-[#f7c948]",
    text: "text-[#ffe7a3]",
    button: "primary" as const,
  },
  cyan: {
    shell: "border-[#43d9cf]/40 bg-[#43d9cf]/10",
    marker: "bg-[#43d9cf]",
    text: "text-[#cbfffb]",
    button: "secondary" as const,
  },
};

export function GeneratedHostDemoPage({
  setup,
}: {
  setup: LocalBattleSetup;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [status, setStatus] = useState<HostStatus>("Ready");
  const [completedThroughRound, setCompletedThroughRound] = useState(0);
  const [activeTheme, setActiveTheme] = useState(
    setup.visualThemes[0] ?? "Custom Battle Stage",
  );
  const round = getRoundAtIndex(setup, roundIndex);
  const winnerRevealed = status === "Winner revealed";
  const scoreboard = useMemo(
    () => buildGeneratedScoreboard(setup, completedThroughRound),
    [completedThroughRound, setup],
  );

  function startRound() {
    setStatus("Round started");
  }

  function openVoting() {
    setStatus("Voting open");
  }

  function closeVoting() {
    setStatus("Voting closed");
  }

  function revealWinner() {
    setStatus("Winner revealed");
    setCompletedThroughRound((current) =>
      Math.max(current, roundIndex + 1),
    );
  }

  function nextRound() {
    if (roundIndex >= setup.generatedMatchups.length - 1) {
      setStatus("Battle complete");
      return;
    }

    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setStatus("Ready");
    setActiveTheme(getRoundTheme(setup, setup.generatedMatchups[nextIndex]));
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <DemoHeader
          activeHref="/host/demo"
          eyebrow="Host demo"
          themeLabel={activeTheme}
          title={setup.eventName}
        />

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <GeneratedRoundOverview
              matchup={round}
              setup={setup}
              status={status}
              timerSeconds={setup.defaultSongDuration}
            />

            {winnerRevealed ? (
              <GeneratedRevealCard matchup={round} roundIndex={roundIndex} setup={setup} />
            ) : null}

            <GeneratedMatchupBoard
              matchup={round}
              roundIndex={roundIndex}
              setup={setup}
              voteLabel="Preview"
            />

            <Panel className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Host controls
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Round actions
                  </h2>
                </div>
                <Pill tone={status === "Voting open" ? "cyan" : "neutral"}>
                  {status}
                </Pill>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <MockButton onClick={startRound} tone="ghost">
                  Start Round
                </MockButton>
                <MockButton onClick={openVoting} tone="primary">
                  Open Voting
                </MockButton>
                <MockButton onClick={closeVoting} tone="ghost">
                  Close Voting
                </MockButton>
                <MockButton onClick={revealWinner} tone="danger">
                  Reveal Winner
                </MockButton>
                <MockButton
                  disabled={roundIndex >= setup.generatedMatchups.length - 1}
                  onClick={nextRound}
                  tone="secondary"
                >
                  Next Round
                </MockButton>
                <MockButton onClick={clearLocalBattleSetup} tone="ghost">
                  Reset Demo Data
                </MockButton>
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <GeneratedSetupSummary setup={setup} />
            <Scoreboard
              scoreboard={scoreboard}
              title="Host tally"
              totalRounds={setup.generatedMatchups.length}
            />
            <ThemeSelector
              activeTheme={activeTheme}
              onThemeChange={setActiveTheme}
              themes={setup.visualThemes}
            />
            <HostRoleControls />
            <ModerationPanel messages={mockBattleEvent.chatMessages} />
          </aside>
        </section>
      </div>
    </main>
  );
}

export function GeneratedEventDemoPage({
  setup,
}: {
  setup: LocalBattleSetup;
}) {
  const [selectedSide, setSelectedSide] = useState<GeneratedVoteSide | null>(
    null,
  );
  const currentRound = getRoundAtIndex(setup, 0);
  const selectedArtist = selectedSide
    ? getSideDisplay(setup, currentRound[selectedSide].side).artistDisplayName
    : "No vote selected";
  const scoreboard = useMemo(() => buildGeneratedScoreboard(setup, 0), [setup]);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <DemoHeader
          activeHref="/event/demo"
          eyebrow="Guest demo"
          themeLabel={getRoundTheme(setup, currentRound)}
          title={setup.eventName}
        />

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <GeneratedRoundOverview
              matchup={currentRound}
              setup={setup}
              status="Voting open"
              timerSeconds={setup.defaultSongDuration}
            />

            <Panel className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Voting status
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    {selectedArtist}
                  </h2>
                </div>
                <Pill tone="cyan">Open</Pill>
              </div>
            </Panel>

            <GeneratedMatchupBoard
              matchup={currentRound}
              onVote={setSelectedSide}
              roundIndex={0}
              selectedSide={selectedSide}
              setup={setup}
            />
          </div>

          <aside className="space-y-5">
            <Scoreboard
              scoreboard={scoreboard}
              totalRounds={setup.generatedMatchups.length}
            />
            <ChatPanel event={mockBattleEvent} />
            <GeneratedPastResultsPreview setup={setup} />
          </aside>
        </section>
      </div>
    </main>
  );
}

export function GeneratedResultsDemoPage({
  setup,
}: {
  setup: LocalBattleSetup;
}) {
  const scoreboard = buildGeneratedScoreboard(
    setup,
    setup.generatedMatchups.length,
  );
  const finalWinner = scoreboard.reduce((leader, entry) =>
    entry.score > leader.score ? entry : leader,
  );
  const runnerUp = scoreboard.find(
    (entry) => entry.artist !== finalWinner.artist,
  );

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <DemoHeader
          activeHref="/results/demo"
          eyebrow="Results demo"
          themeLabel="Generated Finale"
          title={setup.eventName}
        />

        <section className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            <Panel className="reveal-card overflow-hidden p-6">
              <Pill tone={finalWinner.accent === "gold" ? "gold" : "cyan"}>
                Final winner
              </Pill>
              <h2 className="mt-5 text-5xl font-black text-white sm:text-6xl">
                {finalWinner.artist}
              </h2>
              <p className="mt-4 text-2xl font-bold text-zinc-200">
                Final score: {finalWinner.score}-{runnerUp?.score ?? 0}
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                Local demo results are generated from the imported matchup list
                so the results page can preview the final experience.
              </p>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Round winners
              </p>
              <div className="mt-5 grid gap-3">
                {setup.generatedMatchups.map((matchup, index) => {
                  const winnerKey = getWinnerSide(index);
                  const winner = matchup[winnerKey];
                  const sideConfig = getSideDisplay(setup, winner.side);
                  const totals = getVoteTotals(index);

                  return (
                    <article
                      className="rounded-lg border border-white/10 bg-black/20 p-4"
                      key={`${matchup.roundNumber}-${matchup.sideOne.id}-${matchup.sideTwo.id}`}
                    >
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div>
                          <p className="text-sm font-semibold uppercase text-[#43d9cf]">
                            Round {index + 1}: {getRoundTitle(matchup)}
                          </p>
                          <h3 className="mt-2 text-2xl font-black text-white">
                            {sideConfig.artistDisplayName} / {winner.songTitle}
                          </h3>
                          <p className="mt-2 text-sm text-zinc-400">
                            {sideConfig.publicDisplayName} wins the local demo
                            round.
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-right">
                          <p className="text-sm text-zinc-400">Votes</p>
                          <p className="mt-1 text-2xl font-black text-white">
                            {totals.sideOne}-{totals.sideTwo}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Scoreboard
              scoreboard={scoreboard}
              title="Final tally"
              totalRounds={setup.generatedMatchups.length}
            />
            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Apple Music
              </p>
              <div className="mt-4 space-y-3">
                {getPlaylistLinks(setup).map((link) => (
                  <a
                    className="block rounded-lg border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white transition hover:border-[#f7c948]/50 hover:bg-[#f7c948]/10"
                    href={link.href}
                    key={`${link.label}-${link.href}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function GeneratedRoundOverview({
  matchup,
  setup,
  status,
  timerSeconds,
}: {
  matchup: GeneratedMatchup;
  setup: LocalBattleSetup;
  status: string;
  timerSeconds: number;
}) {
  const sideOne = getSideDisplay(setup, matchup.sideOne.side);
  const sideTwo = getSideDisplay(setup, matchup.sideTwo.side);

  return (
    <Panel className="p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="cyan">
              Round {matchup.roundNumber} of {setup.generatedMatchups.length}
            </Pill>
            <Pill tone="neutral">{status}</Pill>
          </div>
          <h2 className="mt-4 text-4xl font-black text-white">
            {getRoundTitle(matchup)}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
            {sideOne.artistDisplayName} brings {matchup.sideOne.songTitle}.{" "}
            {sideTwo.artistDisplayName} answers with{" "}
            {matchup.sideTwo.songTitle}.
          </p>
        </div>
        <TimerDisplay seconds={timerSeconds} />
      </div>
    </Panel>
  );
}

function GeneratedMatchupBoard({
  matchup,
  onVote,
  roundIndex,
  selectedSide,
  setup,
  voteLabel = "Vote",
}: {
  matchup: GeneratedMatchup;
  onVote?: (side: GeneratedVoteSide) => void;
  roundIndex: number;
  selectedSide?: GeneratedVoteSide | null;
  setup: LocalBattleSetup;
  voteLabel?: string;
}) {
  const isInteractive = Boolean(onVote);
  const voteTotals = getVoteTotals(roundIndex);

  return (
    <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_auto_1fr]">
      <GeneratedSongCard
        actionLabel={`${voteLabel} ${getSideDisplay(setup, matchup.sideOne.side).artistDisplayName}`}
        className={selectedSide === "sideOne" ? selectedClass.sideOne : ""}
        onAction={isInteractive ? () => onVote?.("sideOne") : undefined}
        sideConfig={getSideDisplay(setup, matchup.sideOne.side)}
        song={matchup.sideOne}
        totals={voteTotals.sideOne}
        voteSide="sideOne"
      />
      <div className="flex items-center justify-center">
        <span className="rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-black uppercase text-zinc-300">
          Versus
        </span>
      </div>
      <GeneratedSongCard
        actionLabel={`${voteLabel} ${getSideDisplay(setup, matchup.sideTwo.side).artistDisplayName}`}
        className={selectedSide === "sideTwo" ? selectedClass.sideTwo : ""}
        onAction={isInteractive ? () => onVote?.("sideTwo") : undefined}
        sideConfig={getSideDisplay(setup, matchup.sideTwo.side)}
        song={matchup.sideTwo}
        totals={voteTotals.sideTwo}
        voteSide="sideTwo"
      />
    </div>
  );
}

function GeneratedSongCard({
  actionLabel,
  className = "",
  onAction,
  sideConfig,
  song,
  totals,
  voteSide,
}: {
  actionLabel: string;
  className?: string;
  onAction?: () => void;
  sideConfig: LocalSideDisplayConfig;
  song: ImportedSong;
  totals: number;
  voteSide: GeneratedVoteSide;
}) {
  const accent = accentClass[accentBySide[voteSide]];

  return (
    <article
      className={`relative min-h-[22rem] overflow-hidden rounded-lg border p-5 transition ${accent.shell} ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold uppercase ${accent.text}`}>
            {sideConfig.publicDisplayName}
          </p>
          <h2 className="mt-3 text-4xl font-black leading-none text-white">
            {sideConfig.artistDisplayName}
          </h2>
        </div>
        <span className={`h-12 w-12 rounded-md ${accent.marker}`} />
      </div>

      <div className="mt-10">
        <p className="text-sm font-semibold uppercase text-zinc-400">
          Now playing
        </p>
        <h3 className="mt-3 text-4xl font-black leading-tight text-white">
          {song.songTitle}
        </h3>
        <p className="mt-3 text-base text-zinc-300">
          {song.album || "Single"} / {song.year || "Year TBD"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-4">
        <div>
          <p className="text-sm text-zinc-500">Mock vote total</p>
          <p className="mt-1 text-4xl font-black text-white">{totals}</p>
        </div>
        <MockButton onClick={onAction} tone={accent.button}>
          {actionLabel}
        </MockButton>
      </div>
    </article>
  );
}

function GeneratedRevealCard({
  matchup,
  roundIndex,
  setup,
}: {
  matchup: GeneratedMatchup;
  roundIndex: number;
  setup: LocalBattleSetup;
}) {
  const winnerKey = getWinnerSide(roundIndex);
  const winner = matchup[winnerKey];
  const sideConfig = getSideDisplay(setup, winner.side);

  return (
    <Panel className="reveal-card overflow-hidden p-6">
      <Pill tone={winnerKey === "sideOne" ? "gold" : "cyan"}>
        Winner revealed
      </Pill>
      <h2 className="mt-5 text-5xl font-black text-white sm:text-6xl">
        {sideConfig.artistDisplayName}
      </h2>
      <p className="mt-4 text-2xl font-bold text-zinc-200">
        {winner.songTitle}
      </p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
        {sideConfig.publicDisplayName} takes the local demo round with a
        dramatic scoreboard update.
      </p>
    </Panel>
  );
}

function GeneratedPastResultsPreview({ setup }: { setup: LocalBattleSetup }) {
  const previewRounds = setup.generatedMatchups.slice(0, 3);

  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Past round results
      </p>
      <div className="mt-4 space-y-3">
        {previewRounds.map((matchup, index) => {
          const winner = matchup[getWinnerSide(index)];
          const sideConfig = getSideDisplay(setup, winner.side);
          const totals = getVoteTotals(index);

          return (
            <article
              className="rounded-lg border border-white/10 bg-black/20 p-3"
              key={`${matchup.roundNumber}-${matchup.sideOne.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    Round {matchup.roundNumber}: {getRoundTitle(matchup)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {sideConfig.artistDisplayName} / {winner.songTitle}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-zinc-300">
                  {totals.sideOne}-{totals.sideTwo}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function GeneratedSetupSummary({ setup }: { setup: LocalBattleSetup }) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Local setup
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">{setup.eventName}</h2>
      <div className="mt-4 grid gap-2 text-sm text-zinc-400">
        <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-2">
          <span>Mode</span>
          <span className="font-semibold text-white">
            {setup.matchupMode === "fixed" ? "Fixed Order" : "Randomized"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-2">
          <span>Timer</span>
          <span className="font-semibold text-white">
            {setup.defaultSongDuration}s
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-2">
          <span>Passcode</span>
          <span className="font-semibold text-white">
            {setup.eventPasscode || "Not set"}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function buildGeneratedScoreboard(
  setup: LocalBattleSetup,
  completedThroughRound: number,
): ScoreboardEntry[] {
  const completedRounds = setup.generatedMatchups.slice(0, completedThroughRound);

  return setup.sideDisplayConfigs.slice(0, 2).map((side, index) => {
    const voteSide = index === 0 ? "sideOne" : "sideTwo";
    const wins = completedRounds.filter(
      (_, roundIndex) => getWinnerSide(roundIndex) === voteSide,
    );
    const lastWin = wins.at(-1)?.[voteSide].songTitle ?? "Waiting for first win";

    return {
      artist: side.publicDisplayName || side.artistDisplayName,
      score: wins.length,
      lastWinner: lastWin,
      accent: index === 0 ? "gold" : "cyan",
    };
  });
}

function getRoundAtIndex(setup: LocalBattleSetup, index: number) {
  return (
    setup.generatedMatchups[index] ??
    setup.generatedMatchups[0] ?? {
      roundNumber: 1,
      fixedOrder: null,
      sideOne: createFallbackSong("side-one", setup.sideDisplayConfigs[0]),
      sideTwo: createFallbackSong("side-two", setup.sideDisplayConfigs[1]),
    }
  );
}

function getSideDisplay(setup: LocalBattleSetup, sideValue: string) {
  return getLocalSideConfig(setup, sideValue);
}

function getWinnerSide(roundIndex: number): GeneratedVoteSide {
  return roundIndex % 2 === 0 ? "sideOne" : "sideTwo";
}

function getVoteTotals(roundIndex: number): GeneratedVoteTotals {
  const winner = getWinnerSide(roundIndex);
  const winnerTotal = 66 + ((roundIndex * 7) % 18);
  const runnerUpTotal = 54 + ((roundIndex * 5) % 16);

  return winner === "sideOne"
    ? { sideOne: winnerTotal, sideTwo: runnerUpTotal }
    : { sideOne: runnerUpTotal, sideTwo: winnerTotal };
}

function getRoundTitle(matchup: GeneratedMatchup) {
  const mood = matchup.sideOne.mood || matchup.sideTwo.mood;
  return mood ? `${mood} Round` : `Round ${matchup.roundNumber}`;
}

function getRoundTheme(setup: LocalBattleSetup, matchup: GeneratedMatchup) {
  const mood = matchup.sideOne.mood || matchup.sideTwo.mood;
  return mood ? `${mood} Stage` : setup.visualThemes[0] ?? "Custom Battle Stage";
}

function getPlaylistLinks(setup: LocalBattleSetup) {
  const links = setup.sideDisplayConfigs.slice(0, 2).map((sideConfig) => {
    const link =
      setup.importedSongs.find(
        (song) =>
          song.side === sideConfig.sourceCsvValue && song.appleMusicLink,
      )?.appleMusicLink || "https://music.apple.com/";

    return {
      label: `${sideConfig.artistDisplayName} Playlist Placeholder`,
      href: link,
    };
  });

  return [
    {
      label: "Full Battle Playlist Placeholder",
      href: "https://music.apple.com/",
    },
    ...links,
  ];
}

function createFallbackSong(
  id: string,
  sideConfig?: LocalSideDisplayConfig,
): ImportedSong {
  const side = sideConfig?.sourceCsvValue ?? id;
  const artist = sideConfig?.artistDisplayName ?? "Demo Artist";

  return {
    id,
    rowNumber: 0,
    side,
    artist,
    songTitle: "Demo Song",
    album: "",
    genre: "",
    durationSeconds: null,
    year: "",
    mood: "Demo",
    fixedOrder: null,
    appleMusicLink: "",
  };
}
