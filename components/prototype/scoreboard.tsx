import type { BattleEvent } from "@/lib/mock-battle";
import { Panel } from "./ui";

const barColor = {
  gold: "bg-[#f7c948]",
  cyan: "bg-[#43d9cf]",
};

export function Scoreboard({ event }: { event: BattleEvent }) {
  const maxScore = Math.max(...event.scoreboard.map((entry) => entry.score));

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Scoreboard
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Live tally</h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-zinc-300">
          Best of {event.totalRounds}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {event.scoreboard.map((entry) => (
          <div key={entry.artist}>
            <div className="mb-2 flex items-end justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-white">{entry.artist}</p>
                <p className="text-sm text-zinc-500">
                  Last win: {entry.lastWinner}
                </p>
              </div>
              <p className="text-4xl font-black text-white">{entry.score}</p>
            </div>
            <div className="h-3 overflow-hidden rounded-sm bg-white/10">
              <div
                className={`h-full rounded-sm ${barColor[entry.accent]}`}
                style={{ width: `${(entry.score / maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
