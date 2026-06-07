import type { BattleEvent } from "@/lib/mock-battle";
import { MockButton, Panel, Pill } from "./ui";

export function ControlPanel({ event }: { event: BattleEvent }) {
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Host controls
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Round actions</h2>
        </div>
        <Pill tone="rose">{event.votingStatus}</Pill>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MockButton tone="primary">Open Voting</MockButton>
        <MockButton tone="ghost">Close Voting</MockButton>
        <MockButton tone="danger">Reveal Winner</MockButton>
      </div>
    </Panel>
  );
}
