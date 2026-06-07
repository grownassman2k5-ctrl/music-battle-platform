import {
  buildScoreboard,
  getWinnerSong,
  mockBattleEvent,
  mockRounds,
} from "@/lib/mock-battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { DemoHeader } from "./demo-header";
import { Scoreboard } from "./scoreboard";
import { Panel, Pill } from "./ui";

export function ResultsDemoPage() {
  const scoreboard = buildScoreboard(mockRounds, mockRounds.length);
  const finalWinner = scoreboard.reduce((leader, entry) =>
    entry.score > leader.score ? entry : leader,
  );
  const runnerUp = scoreboard.find((entry) => entry.artist !== finalWinner.artist);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <DemoHeader
          activeHref="/results/demo"
          eyebrow="Results demo"
          themeLabel="Arena Finale"
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
                Usher closes the demo battle with the final crowd call and a
                one-round edge.
              </p>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Round winners
              </p>
              <div className="mt-5 grid gap-3">
                {mockRounds.map((round) => {
                  const winner = getWinnerSong(round);

                  return (
                    <article
                      className="rounded-lg border border-white/10 bg-black/20 p-4"
                      key={round.roundNumber}
                    >
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div>
                          <p className="text-sm font-semibold uppercase text-[#43d9cf]">
                            Round {round.roundNumber}: {round.title}
                          </p>
                          <h3 className="mt-2 text-2xl font-black text-white">
                            {winner.artist} / {winner.title}
                          </h3>
                          <p className="mt-2 text-sm text-zinc-400">
                            {round.winnerNote}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-right">
                          <p className="text-sm text-zinc-400">Votes</p>
                          <p className="mt-1 text-2xl font-black text-white">
                            {round.voteTotals.usher}-
                            {round.voteTotals.chrisBrown}
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
              totalRounds={mockBattleEvent.totalRounds}
            />
            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Apple Music
              </p>
              <div className="mt-4 space-y-3">
                {mockBattleEvent.playlistLinks.map((link) => (
                  <a
                    className="block rounded-lg border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white transition hover:border-[#f7c948]/50 hover:bg-[#f7c948]/10"
                    href={link.href}
                    key={link.href}
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
