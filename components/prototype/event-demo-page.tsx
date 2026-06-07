"use client";

import { useMemo, useState } from "react";
import type { ArtistSide } from "@/lib/mock-battle";
import {
  buildScoreboard,
  mockBattleEvent,
  mockRounds,
} from "@/lib/mock-battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { ChatPanel } from "./chat-panel";
import { DemoHeader } from "./demo-header";
import { GeneratedEventDemoPage } from "./generated-demo-pages";
import { MatchupBoard } from "./matchup-board";
import { PastResultsPreview } from "./past-results-preview";
import { RoundOverview } from "./round-overview";
import { Scoreboard } from "./scoreboard";
import { Panel, Pill } from "./ui";
import { useLocalBattleSetup } from "./use-local-battle-setup";

export function EventDemoPage() {
  const localSetup = useLocalBattleSetup();

  if (localSetup) {
    return (
      <GeneratedEventDemoPage key={localSetup.generatedAt} setup={localSetup} />
    );
  }

  return <MockEventDemoPage />;
}

function MockEventDemoPage() {
  const currentRound = mockRounds[Math.max(0, mockBattleEvent.currentRound - 1)];
  const [selectedSide, setSelectedSide] = useState<ArtistSide | null>(null);
  const scoreboard = useMemo(
    () => buildScoreboard(mockRounds, currentRound.roundNumber - 1),
    [currentRound.roundNumber],
  );
  const selectedArtist = selectedSide
    ? currentRound.matchup[selectedSide].artist
    : "No vote selected";

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <DemoHeader
          activeHref="/event/demo"
          eyebrow="Guest demo"
          themeLabel={currentRound.themeLabel}
        />

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <RoundOverview
              round={currentRound}
              status="Voting open"
              timerSeconds={mockBattleEvent.timerSeconds}
              totalRounds={mockBattleEvent.totalRounds}
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

            <MatchupBoard
              onVote={setSelectedSide}
              round={currentRound}
              selectedSide={selectedSide}
            />
          </div>

          <aside className="space-y-5">
            <Scoreboard
              scoreboard={scoreboard}
              totalRounds={mockBattleEvent.totalRounds}
            />
            <ChatPanel event={mockBattleEvent} />
            <PastResultsPreview
              rounds={mockRounds.slice(0, currentRound.roundNumber - 1)}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}
