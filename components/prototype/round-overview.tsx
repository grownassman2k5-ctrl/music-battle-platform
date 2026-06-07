import type { BattleRound } from "@/lib/mock-battle";
import { Panel, Pill } from "./ui";
import { TimerDisplay } from "./timer-display";

type RoundOverviewProps = {
  round: BattleRound;
  totalRounds: number;
  timerSeconds: number;
  status?: string;
};

export function RoundOverview({
  round,
  totalRounds,
  timerSeconds,
  status,
}: RoundOverviewProps) {
  return (
    <Panel className="p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="cyan">
              Round {round.roundNumber} of {totalRounds}
            </Pill>
            {status ? <Pill tone="neutral">{status}</Pill> : null}
          </div>
          <h2 className="mt-4 text-4xl font-black text-white">
            {round.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
            {round.matchup.usher.artist} brings {round.matchup.usher.title}.{" "}
            {round.matchup.chrisBrown.artist} answers with{" "}
            {round.matchup.chrisBrown.title}.
          </p>
        </div>
        <TimerDisplay seconds={timerSeconds} />
      </div>
    </Panel>
  );
}
