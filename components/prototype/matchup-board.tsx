import type { ArtistSide, BattleRound } from "@/lib/mock-battle";
import { SongBattleCard } from "./song-battle-card";

type MatchupBoardProps = {
  round: BattleRound;
  selectedSide?: ArtistSide | null;
  onVote?: (side: ArtistSide) => void;
  voteLabel?: string;
};

const selectedClass = {
  usher: "ring-2 ring-[#f7c948]",
  chrisBrown: "ring-2 ring-[#43d9cf]",
};

export function MatchupBoard({
  round,
  selectedSide,
  onVote,
  voteLabel = "Vote",
}: MatchupBoardProps) {
  const isInteractive = Boolean(onVote);

  return (
    <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_auto_1fr]">
      <SongBattleCard
        actionLabel={`${voteLabel} Usher`}
        className={selectedSide === "usher" ? selectedClass.usher : ""}
        onAction={isInteractive ? () => onVote?.("usher") : undefined}
        song={{
          ...round.matchup.usher,
          votes: round.voteTotals.usher,
        }}
      />
      <div className="flex items-center justify-center">
        <span className="rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-black uppercase text-zinc-300">
          Versus
        </span>
      </div>
      <SongBattleCard
        actionLabel={`${voteLabel} Chris Brown`}
        className={selectedSide === "chrisBrown" ? selectedClass.chrisBrown : ""}
        onAction={isInteractive ? () => onVote?.("chrisBrown") : undefined}
        song={{
          ...round.matchup.chrisBrown,
          votes: round.voteTotals.chrisBrown,
        }}
      />
    </div>
  );
}
