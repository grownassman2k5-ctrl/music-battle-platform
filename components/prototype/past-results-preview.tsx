import type { BattleRound } from "@/lib/mock-battle";
import { getWinnerSong } from "@/lib/mock-battle";
import { Panel } from "./ui";

export function PastResultsPreview({
  rounds,
  title = "Past round results",
}: {
  rounds: BattleRound[];
  title?: string;
}) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        {title}
      </p>
      <div className="mt-4 space-y-3">
        {rounds.map((round) => {
          const winner = getWinnerSong(round);

          return (
            <article
              className="rounded-lg border border-white/10 bg-black/20 p-3"
              key={round.roundNumber}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    Round {round.roundNumber}: {round.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {winner.artist} / {winner.title}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-zinc-300">
                  {round.voteTotals.usher}-{round.voteTotals.chrisBrown}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
