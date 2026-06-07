import type { BattleRound } from "@/lib/mock-battle";
import { getWinnerSong } from "@/lib/mock-battle";
import { Panel, Pill } from "./ui";

export function RevealCard({ round }: { round: BattleRound }) {
  const winner = getWinnerSong(round);

  return (
    <Panel className="reveal-card overflow-hidden p-5">
      <div className="relative">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#f7c948]/20 blur-2xl" />
        <Pill tone={winner.accent === "gold" ? "gold" : "cyan"}>
          Winner reveal
        </Pill>
        <h2 className="mt-4 text-4xl font-black text-white">
          {winner.artist}
        </h2>
        <p className="mt-2 text-2xl font-bold text-zinc-200">
          {winner.title}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
          {round.winnerNote}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#f7c948]/30 bg-[#f7c948]/10 p-4">
            <p className="text-sm text-zinc-400">Usher votes</p>
            <p className="mt-1 text-3xl font-black text-white">
              {round.voteTotals.usher}
            </p>
          </div>
          <div className="rounded-lg border border-[#43d9cf]/30 bg-[#43d9cf]/10 p-4">
            <p className="text-sm text-zinc-400">Chris Brown votes</p>
            <p className="mt-1 text-3xl font-black text-white">
              {round.voteTotals.chrisBrown}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
