"use client";

import { useMemo, useState } from "react";
import {
  buildScoreboard,
  mockBattleEvent,
  mockRounds,
} from "@/lib/mock-battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { DemoHeader } from "./demo-header";
import { HostRoleControls } from "./host-role-controls";
import { MatchupBoard } from "./matchup-board";
import { ModerationPanel } from "./moderation-panel";
import { RevealCard } from "./reveal-card";
import { RoundOverview } from "./round-overview";
import { Scoreboard } from "./scoreboard";
import { ThemeSelector } from "./theme-selector";
import { MockButton, Panel, Pill } from "./ui";

type HostStatus = "Ready" | "Round started" | "Voting open" | "Voting closed" | "Winner revealed" | "Battle complete";

export function HostDemoPage() {
  const [roundIndex, setRoundIndex] = useState(
    Math.max(0, mockBattleEvent.currentRound - 1),
  );
  const [status, setStatus] = useState<HostStatus>("Ready");
  const [completedThroughRound, setCompletedThroughRound] = useState(
    mockBattleEvent.currentRound - 1,
  );
  const [activeTheme, setActiveTheme] = useState(mockRounds[roundIndex].themeLabel);

  const round = mockRounds[roundIndex];
  const winnerRevealed = status === "Winner revealed";
  const scoreboard = useMemo(
    () => buildScoreboard(mockRounds, completedThroughRound),
    [completedThroughRound],
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
      Math.max(current, round.roundNumber),
    );
  }

  function nextRound() {
    if (roundIndex >= mockRounds.length - 1) {
      setStatus("Battle complete");
      return;
    }

    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    setStatus("Ready");
    setActiveTheme(mockRounds[nextIndex].themeLabel);
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <DemoHeader
          activeHref="/host/demo"
          eyebrow="Host demo"
          themeLabel={activeTheme}
        />

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <RoundOverview
              round={round}
              status={status}
              timerSeconds={mockBattleEvent.timerSeconds}
              totalRounds={mockBattleEvent.totalRounds}
            />

            {winnerRevealed ? <RevealCard round={round} /> : null}

            <MatchupBoard round={round} voteLabel="Preview" />

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
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                  disabled={roundIndex >= mockRounds.length - 1}
                  onClick={nextRound}
                  tone="secondary"
                >
                  Next Round
                </MockButton>
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Scoreboard
              scoreboard={scoreboard}
              title="Host tally"
              totalRounds={mockBattleEvent.totalRounds}
            />
            <ThemeSelector
              activeTheme={activeTheme}
              onThemeChange={setActiveTheme}
              themes={mockBattleEvent.themes}
            />
            <HostRoleControls />
            <ModerationPanel messages={mockBattleEvent.chatMessages} />
          </aside>
        </section>
      </div>
    </main>
  );
}
