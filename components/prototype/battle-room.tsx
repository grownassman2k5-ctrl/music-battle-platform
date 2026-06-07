import Link from "next/link";
import { mockBattleEvent } from "@/lib/mock-battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { ChatPanel } from "./chat-panel";
import { ControlPanel } from "./control-panel";
import { Scoreboard } from "./scoreboard";
import { SongBattleCard } from "./song-battle-card";
import { TimerDisplay } from "./timer-display";
import { Panel, Pill } from "./ui";

export function BattleRoom() {
  const event = mockBattleEvent;

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              className="text-sm font-semibold text-zinc-400 transition hover:text-white"
              href="/"
            >
              Back to landing
            </Link>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              {event.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="gold">{event.themeLabel}</Pill>
            <Pill tone="cyan">Host preview</Pill>
          </div>
        </header>

        <section className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            <Panel className="p-5">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase text-[#43d9cf]">
                    Round {event.currentRound} of {event.totalRounds}
                  </p>
                  <h2 className="mt-2 text-4xl font-black text-white">
                    {event.roundTitle}
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
                    The host has the room staged. Voting opens only when the
                    host says so, and guests can change votes until the close.
                  </p>
                </div>
                <TimerDisplay seconds={event.timerSeconds} />
              </div>
            </Panel>

            <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_auto_1fr]">
              <SongBattleCard song={event.matchup.usher} />
              <div className="flex items-center justify-center">
                <span className="rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-black uppercase text-zinc-300">
                  Versus
                </span>
              </div>
              <SongBattleCard song={event.matchup.chrisBrown} />
            </div>

            <ControlPanel event={event} />
          </div>

          <aside className="space-y-5">
            <Scoreboard event={event} />
            <ChatPanel event={event} />
          </aside>
        </section>
      </div>
    </main>
  );
}
