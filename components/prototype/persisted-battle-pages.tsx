"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GeneratedMatchup, ImportedSong } from "@/lib/csv-import";
import {
  createLocalBattleSetup,
  getLocalSideConfig,
  type LocalBattleSetup,
} from "@/lib/local-demo-store";
import type { Accent, ScoreboardEntry } from "@/lib/mock-battle";
import { mockBattleEvent } from "@/lib/mock-battle";
import {
  loadPersistedBattleBySlug,
  updateEventState,
  updateRoundState,
  type PersistedBattle,
} from "@/lib/supabase/battle-repository";
import type {
  BattleEvent,
  EventSide,
  EventStatus,
  Round,
  RoundStatus,
  Song,
} from "@/lib/types/battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { ChatPanel } from "./chat-panel";
import { HostRoleControls } from "./host-role-controls";
import { ModerationPanel } from "./moderation-panel";
import { Scoreboard } from "./scoreboard";
import { ThemeSelector } from "./theme-selector";
import { TimerDisplay } from "./timer-display";
import { MockButton, Panel, Pill, PreviewLink } from "./ui";

type PersistedRouteMode = "host" | "event" | "results";
type PersistedVoteSide = "sideOne" | "sideTwo";

type PersistedBattleState =
  | {
      status: "loading";
    }
  | {
      status: "error";
      error: string;
    }
  | {
      status: "ready";
      battle: PersistedBattle;
      setup: LocalBattleSetup;
    };

type HostActionState =
  | {
      status: "idle";
      message: string;
    }
  | {
      status: "saving";
      message: string;
    }
  | {
      status: "saved";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

type PersistedSideSongView = {
  side: EventSide;
  song: Song;
  voteSide: PersistedVoteSide;
};

type PersistedRoundView = {
  round: Round;
  roundIndex: number;
  sideOne: PersistedSideSongView;
  sideTwo: PersistedSideSongView;
};

type PersistedVoteTotals = Record<PersistedVoteSide, number>;

const accentBySide: Record<PersistedVoteSide, Accent> = {
  sideOne: "gold",
  sideTwo: "cyan",
};

const selectedClass: Record<PersistedVoteSide, string> = {
  sideOne: "ring-2 ring-[#f7c948]",
  sideTwo: "ring-2 ring-[#43d9cf]",
};

const accentClass = {
  gold: {
    shell: "border-[#f7c948]/40 bg-[#f7c948]/10",
    marker: "bg-[#f7c948]",
    text: "text-[#ffe7a3]",
    button: "primary" as const,
  },
  cyan: {
    shell: "border-[#43d9cf]/40 bg-[#43d9cf]/10",
    marker: "bg-[#43d9cf]",
    text: "text-[#cbfffb]",
    button: "secondary" as const,
  },
};

export function PersistedHostBattlePage({
  eventSlug,
}: {
  eventSlug: string;
}) {
  const { reloadBattle, state } = usePersistedBattleState(eventSlug);

  if (state.status !== "ready") {
    return <PersistedRouteShell eventSlug={eventSlug} mode="host" state={state} />;
  }

  return (
    <PersistedHostExperience
      battle={state.battle}
      eventSlug={eventSlug}
      onReload={reloadBattle}
      setup={state.setup}
    />
  );
}

export function PersistedEventBattlePage({
  eventSlug,
}: {
  eventSlug: string;
}) {
  const { state } = usePersistedBattleState(eventSlug);

  if (state.status !== "ready") {
    return (
      <PersistedRouteShell eventSlug={eventSlug} mode="event" state={state} />
    );
  }

  return (
    <PersistedGuestExperience
      battle={state.battle}
      eventSlug={eventSlug}
      setup={state.setup}
    />
  );
}

export function PersistedResultsBattlePage({
  eventSlug,
}: {
  eventSlug: string;
}) {
  const { state } = usePersistedBattleState(eventSlug);

  if (state.status !== "ready") {
    return (
      <PersistedRouteShell eventSlug={eventSlug} mode="results" state={state} />
    );
  }

  return (
    <PersistedResultsExperience
      battle={state.battle}
      eventSlug={eventSlug}
      setup={state.setup}
    />
  );
}

function usePersistedBattleState(eventSlug: string) {
  const [state, setState] = useState<PersistedBattleState>({
    status: "loading",
  });

  const reloadBattle = useCallback(async () => {
    const nextState = await readPersistedBattleState(eventSlug);
    setState(nextState);
    return nextState;
  }, [eventSlug]);

  useEffect(() => {
    let isActive = true;

    async function loadBattle() {
      const nextState = await readPersistedBattleState(eventSlug);

      if (isActive) {
        setState(nextState);
      }
    }

    loadBattle().catch((error: unknown) => {
      if (!isActive) {
        return;
      }

      setState({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "The persisted battle could not be loaded.",
      });
    });

    return () => {
      isActive = false;
    };
  }, [eventSlug]);

  return { reloadBattle, state };
}

async function readPersistedBattleState(
  eventSlug: string,
): Promise<PersistedBattleState> {
  const result = await loadPersistedBattleBySlug(eventSlug);

  if (result.error || !result.data) {
    return {
      status: "error",
      error: result.error ?? "Supabase did not return battle data.",
    };
  }

  return {
    status: "ready",
    battle: result.data,
    setup: persistedBattleToLocalSetup(result.data),
  };
}

function PersistedHostExperience({
  battle,
  eventSlug,
  onReload,
  setup,
}: {
  battle: PersistedBattle;
  eventSlug: string;
  onReload: () => Promise<PersistedBattleState>;
  setup: LocalBattleSetup;
}) {
  const roundViews = useMemo(() => buildRoundViews(battle), [battle]);
  const currentRound = getCurrentRoundView(battle, roundViews);
  const currentTheme = currentRound
    ? getRoundTheme(setup, currentRound)
    : setup.visualThemes[0] ?? "Custom Battle Stage";
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [actionState, setActionState] = useState<HostActionState>({
    status: "idle",
    message: "",
  });
  const scoreboard = useMemo(
    () => buildPersistedScoreboard(battle, roundViews),
    [battle, roundViews],
  );
  const isSaving = actionState.status === "saving";
  const activeTheme = selectedTheme ?? currentTheme;

  async function runHostAction(
    label: string,
    action: () => Promise<string | null>,
  ) {
    setActionState({
      status: "saving",
      message: `Saving ${label}...`,
    });

    const error = await action();

    if (error) {
      setActionState({
        status: "error",
        message: getFriendlyActionError(error),
      });
      return;
    }

    const nextState = await onReload();

    if (nextState.status === "error") {
      setActionState({
        status: "error",
        message: nextState.error,
      });
      return;
    }

    setActionState({
      status: "saved",
      message: `${label} saved to Supabase.`,
    });
  }

  async function startRound() {
    if (!currentRound) {
      return "No round is available to start.";
    }

    const now = new Date().toISOString();
    const eventResult = await updateEventState({
      eventId: battle.event.id,
      status: "live",
      currentRoundNumber: currentRound.round.roundNumber,
      startedAt: battle.event.startedAt ?? now,
    });

    if (eventResult.error) {
      return eventResult.error;
    }

    const roundResult = await updateRoundState({
      eventId: battle.event.id,
      roundId: currentRound.round.id,
      status: "playing",
      startedAt: currentRound.round.startedAt ?? now,
    });

    return roundResult.error;
  }

  async function openVoting() {
    if (!currentRound) {
      return "No current round is available for voting.";
    }

    const roundResult = await updateRoundState({
      eventId: battle.event.id,
      roundId: currentRound.round.id,
      status: "voting_open",
      votingOpenedAt: new Date().toISOString(),
    });

    return roundResult.error;
  }

  async function closeVoting() {
    if (!currentRound) {
      return "No current round is available to close voting.";
    }

    const roundResult = await updateRoundState({
      eventId: battle.event.id,
      roundId: currentRound.round.id,
      status: "voting_closed",
      votingClosedAt: new Date().toISOString(),
    });

    return roundResult.error;
  }

  async function revealWinner() {
    if (!currentRound) {
      return "No current round is available to reveal.";
    }

    const winner = getMockWinnerChoice(currentRound);
    const voteTotals = getMockVoteTotals(currentRound.roundIndex);
    const roundResult = await updateRoundState({
      eventId: battle.event.id,
      roundId: currentRound.round.id,
      status: "revealed",
      winnerSideId: winner.side.id,
      winnerSongId: winner.song.id,
      sideOneVoteCount: voteTotals.sideOne,
      sideTwoVoteCount: voteTotals.sideTwo,
      revealedAt: new Date().toISOString(),
    });

    return roundResult.error;
  }

  async function moveToNextRound() {
    if (!currentRound) {
      return "No current round is available.";
    }

    const nextRound = getNextRoundView(roundViews, currentRound);
    const now = new Date().toISOString();

    if (!nextRound) {
      const eventResult = await updateEventState({
        eventId: battle.event.id,
        status: "completed",
        currentRoundNumber: currentRound.round.roundNumber,
        completedAt: battle.event.completedAt ?? now,
      });

      return eventResult.error;
    }

    const eventResult = await updateEventState({
      eventId: battle.event.id,
      status: "live",
      currentRoundNumber: nextRound.round.roundNumber,
    });

    if (eventResult.error) {
      return eventResult.error;
    }

    const roundResult = await updateRoundState({
      eventId: battle.event.id,
      roundId: nextRound.round.id,
      status: "active",
    });

    return roundResult.error;
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <PersistedHeader
          event={battle.event}
          eventSlug={eventSlug}
          mode="host"
          themeLabel={activeTheme}
        />

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            {currentRound ? (
              <>
                <PersistedRoundOverview
                  roundView={currentRound}
                  statusLabel={getRoundStatusLabel(currentRound.round.status)}
                  timerSeconds={setup.defaultSongDuration}
                  totalRounds={roundViews.length}
                />

                {currentRound.round.status === "revealed" ? (
                  <PersistedRevealCard roundView={currentRound} setup={setup} />
                ) : null}

                <PersistedMatchupBoard
                  roundView={currentRound}
                  setup={setup}
                  voteLabel="Preview"
                />

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
                    <Pill tone={getRoundStatusTone(currentRound.round.status)}>
                      {getRoundStatusLabel(currentRound.round.status)}
                    </Pill>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <MockButton
                      disabled={isSaving}
                      onClick={() => void runHostAction("Start Round", startRound)}
                      tone="ghost"
                    >
                      Start Round
                    </MockButton>
                    <MockButton
                      disabled={isSaving}
                      onClick={() => void runHostAction("Open Voting", openVoting)}
                      tone="primary"
                    >
                      Open Voting
                    </MockButton>
                    <MockButton
                      disabled={isSaving}
                      onClick={() =>
                        void runHostAction("Close Voting", closeVoting)
                      }
                      tone="ghost"
                    >
                      Close Voting
                    </MockButton>
                    <MockButton
                      disabled={isSaving}
                      onClick={() =>
                        void runHostAction("Reveal Winner", revealWinner)
                      }
                      tone="danger"
                    >
                      Reveal Winner
                    </MockButton>
                    <MockButton
                      disabled={isSaving}
                      onClick={() =>
                        void runHostAction(
                          getNextRoundView(roundViews, currentRound)
                            ? "Next Round"
                            : "Complete Battle",
                          moveToNextRound,
                        )
                      }
                      tone="secondary"
                    >
                      {getNextRoundView(roundViews, currentRound)
                        ? "Next Round"
                        : "Complete Battle"}
                    </MockButton>
                  </div>
                  {actionState.status !== "idle" ? (
                    <ActionFeedback state={actionState} />
                  ) : null}
                </Panel>
              </>
            ) : (
              <EmptyPersistedBattlePanel />
            )}
          </div>

          <aside className="space-y-5">
            <PersistedSetupSummary battle={battle} setup={setup} />
            <Scoreboard
              scoreboard={scoreboard}
              title="Persisted tally"
              totalRounds={roundViews.length}
            />
            <ThemeSelector
              activeTheme={activeTheme}
              onThemeChange={setSelectedTheme}
              themes={setup.visualThemes}
            />
            <HostRoleControls />
            <ModerationPanel messages={mockBattleEvent.chatMessages} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function PersistedGuestExperience({
  battle,
  eventSlug,
  setup,
}: {
  battle: PersistedBattle;
  eventSlug: string;
  setup: LocalBattleSetup;
}) {
  const [selectedSide, setSelectedSide] = useState<PersistedVoteSide | null>(
    null,
  );
  const roundViews = useMemo(() => buildRoundViews(battle), [battle]);
  const currentRound = getCurrentRoundView(battle, roundViews);
  const scoreboard = useMemo(
    () => buildPersistedScoreboard(battle, roundViews),
    [battle, roundViews],
  );
  const votingIsOpen = currentRound?.round.status === "voting_open";
  const selectedArtist =
    currentRound && selectedSide
      ? currentRound[selectedSide].side.artistDisplayName
      : votingIsOpen
        ? "No vote selected"
        : getGuestStatusHeadline(currentRound?.round.status);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <PersistedHeader
          event={battle.event}
          eventSlug={eventSlug}
          mode="event"
          themeLabel={
            currentRound
              ? getRoundTheme(setup, currentRound)
              : setup.visualThemes[0] ?? "Custom Battle Stage"
          }
        />

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            {currentRound ? (
              <>
                <PersistedRoundOverview
                  roundView={currentRound}
                  statusLabel={getRoundStatusLabel(currentRound.round.status)}
                  timerSeconds={setup.defaultSongDuration}
                  totalRounds={roundViews.length}
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
                    <Pill tone={getRoundStatusTone(currentRound.round.status)}>
                      {getRoundStatusLabel(currentRound.round.status)}
                    </Pill>
                  </div>
                </Panel>

                {currentRound.round.status === "revealed" ? (
                  <PersistedRevealCard roundView={currentRound} setup={setup} />
                ) : null}

                <PersistedMatchupBoard
                  disabled={!votingIsOpen}
                  onVote={votingIsOpen ? setSelectedSide : undefined}
                  roundView={currentRound}
                  selectedSide={selectedSide}
                  setup={setup}
                  voteLabel={votingIsOpen ? "Vote" : "Waiting"}
                />
              </>
            ) : (
              <EmptyPersistedBattlePanel />
            )}
          </div>

          <aside className="space-y-5">
            <Scoreboard
              scoreboard={scoreboard}
              title="Persisted tally"
              totalRounds={roundViews.length}
            />
            <ChatPanel event={mockBattleEvent} />
            <PersistedPastResultsPreview roundViews={roundViews} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function PersistedResultsExperience({
  battle,
  eventSlug,
  setup,
}: {
  battle: PersistedBattle;
  eventSlug: string;
  setup: LocalBattleSetup;
}) {
  const roundViews = useMemo(() => buildRoundViews(battle), [battle]);
  const scoreboard = useMemo(
    () => buildPersistedScoreboard(battle, roundViews),
    [battle, roundViews],
  );
  const finalWinner = getFinalWinner(scoreboard, battle.event.status);
  const runnerUp = finalWinner
    ? scoreboard.find((entry) => entry.artist !== finalWinner.artist)
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <PersistedHeader
          event={battle.event}
          eventSlug={eventSlug}
          mode="results"
          themeLabel="Persisted Finale"
        />

        <section className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            <Panel className="reveal-card overflow-hidden p-6">
              <Pill tone={finalWinner ? "cyan" : "gold"}>
                {finalWinner ? "Final winner" : "Awaiting final winner"}
              </Pill>
              <h2 className="mt-5 text-5xl font-black text-white sm:text-6xl">
                {finalWinner?.artist ?? "Results pending"}
              </h2>
              <p className="mt-4 text-2xl font-bold text-zinc-200">
                Final score:{" "}
                {finalWinner
                  ? `${finalWinner.score}-${runnerUp?.score ?? 0}`
                  : "Not decided"}
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                Persisted results use saved round winner fields when available.
                Undecided rounds stay visible as pending.
              </p>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Round-by-round results
              </p>
              <div className="mt-5 grid gap-3">
                {roundViews.map((roundView) => (
                  <PersistedRoundResultCard
                    key={roundView.round.id}
                    roundView={roundView}
                    setup={setup}
                  />
                ))}
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Scoreboard
              scoreboard={scoreboard}
              title="Persisted final tally"
              totalRounds={roundViews.length}
            />
            <PersistedPlaylistLinks setup={setup} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function PersistedHeader({
  event,
  eventSlug,
  mode,
  themeLabel,
}: {
  event: BattleEvent;
  eventSlug: string;
  mode: PersistedRouteMode;
  themeLabel: string;
}) {
  return (
    <header className="border-b border-white/10 pb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            className="text-sm font-semibold text-zinc-400 transition hover:text-white"
            href="/host/setup"
          >
            Back to setup
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase text-[#43d9cf]">
            Persisted {mode}
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            {event.eventName}
          </h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Pill tone="gold">{themeLabel}</Pill>
          <Pill tone={getEventStatusTone(event.status)}>
            {getEventStatusLabel(event.status)}
          </Pill>
          <nav className="flex flex-wrap gap-2">
            <PreviewLink
              className={mode === "host" ? "bg-white/15 text-white" : ""}
              href={`/host/${eventSlug}`}
              tone="ghost"
            >
              Host
            </PreviewLink>
            <PreviewLink
              className={mode === "event" ? "bg-white/15 text-white" : ""}
              href={`/event/${eventSlug}`}
              tone="ghost"
            >
              Guest
            </PreviewLink>
            <PreviewLink
              className={mode === "results" ? "bg-white/15 text-white" : ""}
              href={`/results/${eventSlug}`}
              tone="ghost"
            >
              Results
            </PreviewLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

function PersistedRouteShell({
  eventSlug,
  mode,
  state,
}: {
  eventSlug: string;
  mode: PersistedRouteMode;
  state: Exclude<PersistedBattleState, { status: "ready" }>;
}) {
  const title =
    state.status === "loading"
      ? "Loading persisted battle"
      : "Persisted battle unavailable";
  const message =
    state.status === "loading"
      ? "Reading event, sides, songs, and rounds from Supabase."
      : state.error;

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-5 py-10 sm:px-8">
        <Panel className="w-full p-6">
          <Link
            className="text-sm font-semibold text-zinc-400 transition hover:text-white"
            href="/host/setup"
          >
            Back to setup
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase text-[#43d9cf]">
            Supabase route
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
          <p className="mt-4 text-base leading-7 text-zinc-400">{message}</p>
          <p className="mt-4 rounded-lg border border-white/10 bg-white/10 p-3 text-sm text-zinc-300">
            Route: /{mode}/{eventSlug}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PreviewLink href="/debug/supabase-schema" tone="ghost">
              Check Tables
            </PreviewLink>
            <PreviewLink href="/host/setup">Host Setup</PreviewLink>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function PersistedRoundOverview({
  roundView,
  statusLabel,
  timerSeconds,
  totalRounds,
}: {
  roundView: PersistedRoundView;
  statusLabel: string;
  timerSeconds: number;
  totalRounds: number;
}) {
  return (
    <Panel className="p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="cyan">
              Round {roundView.round.roundNumber} of {totalRounds}
            </Pill>
            <Pill tone={getRoundStatusTone(roundView.round.status)}>
              {statusLabel}
            </Pill>
          </div>
          <h2 className="mt-4 text-4xl font-black text-white">
            {getRoundTitle(roundView)}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
            {roundView.sideOne.side.artistDisplayName} brings{" "}
            {roundView.sideOne.song.songTitle}.{" "}
            {roundView.sideTwo.side.artistDisplayName} answers with{" "}
            {roundView.sideTwo.song.songTitle}.
          </p>
        </div>
        <TimerDisplay seconds={timerSeconds} />
      </div>
    </Panel>
  );
}

function PersistedMatchupBoard({
  disabled = false,
  onVote,
  roundView,
  selectedSide,
  setup,
  voteLabel = "Vote",
}: {
  disabled?: boolean;
  onVote?: (side: PersistedVoteSide) => void;
  roundView: PersistedRoundView;
  selectedSide?: PersistedVoteSide | null;
  setup: LocalBattleSetup;
  voteLabel?: string;
}) {
  const voteTotals = getDisplayVoteTotals(roundView);

  return (
    <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_auto_1fr]">
      <PersistedSongCard
        actionLabel={`${voteLabel} ${roundView.sideOne.side.artistDisplayName}`}
        className={selectedSide === "sideOne" ? selectedClass.sideOne : ""}
        disabled={disabled}
        onAction={onVote ? () => onVote("sideOne") : undefined}
        setup={setup}
        sideSong={roundView.sideOne}
        totals={voteTotals.sideOne}
      />
      <div className="flex items-center justify-center">
        <span className="rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-black uppercase text-zinc-300">
          Versus
        </span>
      </div>
      <PersistedSongCard
        actionLabel={`${voteLabel} ${roundView.sideTwo.side.artistDisplayName}`}
        className={selectedSide === "sideTwo" ? selectedClass.sideTwo : ""}
        disabled={disabled}
        onAction={onVote ? () => onVote("sideTwo") : undefined}
        setup={setup}
        sideSong={roundView.sideTwo}
        totals={voteTotals.sideTwo}
      />
    </div>
  );
}

function PersistedSongCard({
  actionLabel,
  className = "",
  disabled,
  onAction,
  setup,
  sideSong,
  totals,
}: {
  actionLabel: string;
  className?: string;
  disabled?: boolean;
  onAction?: () => void;
  setup: LocalBattleSetup;
  sideSong: PersistedSideSongView;
  totals: number;
}) {
  const accent = accentClass[accentBySide[sideSong.voteSide]];
  const sideConfig = getSideDisplay(setup, sideSong.side.internalSideValue);

  return (
    <article
      className={`relative min-h-[22rem] overflow-hidden rounded-lg border p-5 transition ${accent.shell} ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold uppercase ${accent.text}`}>
            {sideSong.side.publicDisplayName || sideConfig.publicDisplayName}
          </p>
          <h2 className="mt-3 text-4xl font-black leading-none text-white">
            {sideSong.side.artistDisplayName || sideConfig.artistDisplayName}
          </h2>
        </div>
        <span className={`h-12 w-12 rounded-md ${accent.marker}`} />
      </div>

      <div className="mt-10">
        <p className="text-sm font-semibold uppercase text-zinc-400">
          Now playing
        </p>
        <h3 className="mt-3 text-4xl font-black leading-tight text-white">
          {sideSong.song.songTitle}
        </h3>
        <p className="mt-3 text-base text-zinc-300">
          {sideSong.song.album || "Single"} /{" "}
          {sideSong.song.year || "Year TBD"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-4">
        <div>
          <p className="text-sm text-zinc-500">Visible vote total</p>
          <p className="mt-1 text-4xl font-black text-white">{totals}</p>
        </div>
        <MockButton disabled={disabled} onClick={onAction} tone={accent.button}>
          {actionLabel}
        </MockButton>
      </div>
    </article>
  );
}

function PersistedRevealCard({
  roundView,
  setup,
}: {
  roundView: PersistedRoundView;
  setup: LocalBattleSetup;
}) {
  const winner = getPersistedWinner(roundView) ?? getMockWinnerChoice(roundView);
  const sideConfig = getSideDisplay(setup, winner.side.internalSideValue);

  return (
    <Panel className="reveal-card overflow-hidden p-6">
      <Pill tone={winner.voteSide === "sideOne" ? "gold" : "cyan"}>
        Winner revealed
      </Pill>
      <h2 className="mt-5 text-5xl font-black text-white sm:text-6xl">
        {winner.side.artistDisplayName || sideConfig.artistDisplayName}
      </h2>
      <p className="mt-4 text-2xl font-bold text-zinc-200">
        {winner.song.songTitle}
      </p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
        {winner.side.publicDisplayName || sideConfig.publicDisplayName} is saved
        as the persisted winner for this round.
      </p>
    </Panel>
  );
}

function PersistedSetupSummary({
  battle,
  setup,
}: {
  battle: PersistedBattle;
  setup: LocalBattleSetup;
}) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Supabase setup
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">{setup.eventName}</h2>
      <div className="mt-4 grid gap-2 text-sm text-zinc-400">
        <SummaryRow
          label="Mode"
          value={setup.matchupMode === "fixed" ? "Fixed Order" : "Randomized"}
        />
        <SummaryRow label="Timer" value={`${setup.defaultSongDuration}s`} />
        <SummaryRow
          label="Current"
          value={
            battle.event.currentRoundNumber
              ? `Round ${battle.event.currentRoundNumber}`
              : "Not started"
          }
        />
        <SummaryRow
          label="Event"
          value={getEventStatusLabel(battle.event.status)}
        />
      </div>
    </Panel>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/10 px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function PersistedPastResultsPreview({
  roundViews,
}: {
  roundViews: PersistedRoundView[];
}) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Past round results
      </p>
      <div className="mt-4 space-y-3">
        {roundViews.slice(0, 3).map((roundView) => {
          const winner = getPersistedWinner(roundView);
          const totals = getPersistedVoteTotals(roundView.round);

          return (
            <article
              className="rounded-lg border border-white/10 bg-black/20 p-3"
              key={roundView.round.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    Round {roundView.round.roundNumber}:{" "}
                    {getRoundTitle(roundView)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {winner
                      ? `${winner.side.artistDisplayName} / ${winner.song.songTitle}`
                      : getRoundStatusLabel(roundView.round.status)}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-zinc-300">
                  {totals.sideOne}-{totals.sideTwo}
                </span>
              </div>
            </article>
          );
        })}
        {roundViews.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-zinc-500">
            No persisted rounds are available yet.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function PersistedRoundResultCard({
  roundView,
  setup,
}: {
  roundView: PersistedRoundView;
  setup: LocalBattleSetup;
}) {
  const winner = getPersistedWinner(roundView);
  const totals = getPersistedVoteTotals(roundView.round);
  const sideConfig = winner
    ? getSideDisplay(setup, winner.side.internalSideValue)
    : null;

  return (
    <article className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-[#43d9cf]">
            Round {roundView.round.roundNumber}: {getRoundTitle(roundView)}
          </p>
          <h3 className="mt-2 text-2xl font-black text-white">
            {winner
              ? `${winner.side.artistDisplayName || sideConfig?.artistDisplayName} / ${winner.song.songTitle}`
              : "Winner pending"}
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            {winner
              ? `${winner.side.publicDisplayName || sideConfig?.publicDisplayName} is saved as the persisted round winner.`
              : `Round status: ${getRoundStatusLabel(roundView.round.status)}.`}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-right">
          <p className="text-sm text-zinc-400">Votes</p>
          <p className="mt-1 text-2xl font-black text-white">
            {totals.sideOne}-{totals.sideTwo}
          </p>
        </div>
      </div>
    </article>
  );
}

function PersistedPlaylistLinks({ setup }: { setup: LocalBattleSetup }) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Apple Music
      </p>
      <div className="mt-4 space-y-3">
        {getPlaylistLinks(setup).map((link) => (
          <a
            className="block rounded-lg border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white transition hover:border-[#f7c948]/50 hover:bg-[#f7c948]/10"
            href={link.href}
            key={`${link.label}-${link.href}`}
            rel="noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </div>
    </Panel>
  );
}

function EmptyPersistedBattlePanel() {
  return (
    <Panel className="p-5">
      <Pill tone="rose">No rounds</Pill>
      <h2 className="mt-4 text-3xl font-black text-white">
        No persisted rounds were found
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        This event exists in Supabase, but its matchup rounds are not available.
      </p>
    </Panel>
  );
}

function ActionFeedback({ state }: { state: HostActionState }) {
  const className =
    state.status === "error"
      ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
      : state.status === "saving"
        ? "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]"
        : "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]";

  return (
    <div className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${className}`}>
      {state.message}
    </div>
  );
}

function persistedBattleToLocalSetup(battle: PersistedBattle) {
  const sides = [...battle.sides].sort(
    (sideOne, sideTwo) => sideOne.displayOrder - sideTwo.displayOrder,
  );
  const importedSongs = battle.songs.map((song, index) =>
    persistedSongToImportedSong(song, sides, index),
  );
  const songById = new Map(importedSongs.map((song) => [song.id, song]));
  const generatedMatchups = battle.rounds
    .map((round) => persistedRoundToGeneratedMatchup(round, songById))
    .filter((matchup): matchup is GeneratedMatchup => matchup !== null);

  return createLocalBattleSetup({
    eventName: battle.event.eventName,
    eventPasscode: "",
    defaultSongDuration: battle.event.defaultSongDurationSeconds,
    matchupMode: battle.event.matchupMode,
    detectedSideValues: sides.map((side) => side.internalSideValue),
    sideDisplayConfigs: sides.map((side) => ({
      sourceCsvValue: side.internalSideValue,
      csvValue: side.internalSideValue,
      publicDisplayName: side.publicDisplayName,
      artistDisplayName: side.artistDisplayName,
    })),
    importedSongs,
    generatedMatchups,
  });
}

function persistedSongToImportedSong(
  song: Song,
  sides: EventSide[],
  index: number,
): ImportedSong {
  const side = sides.find((candidate) => candidate.id === song.sideId);

  return {
    id: song.id,
    rowNumber: song.csvRowNumber ?? index + 1,
    side: side?.internalSideValue ?? song.sideId,
    artist: song.artist,
    songTitle: song.songTitle,
    album: song.album ?? "",
    genre: song.genre ?? "",
    durationSeconds: song.durationSeconds,
    year: song.year ?? "",
    mood: song.mood ?? "",
    fixedOrder: song.fixedOrder,
    appleMusicLink: song.appleMusicLink ?? "",
  };
}

function persistedRoundToGeneratedMatchup(
  round: Round,
  songById: Map<string, ImportedSong>,
): GeneratedMatchup | null {
  const sideOne = songById.get(round.sideOneSongId);
  const sideTwo = songById.get(round.sideTwoSongId);

  if (!sideOne || !sideTwo) {
    return null;
  }

  return {
    roundNumber: round.roundNumber,
    fixedOrder:
      sideOne.fixedOrder === sideTwo.fixedOrder ? sideOne.fixedOrder : null,
    sideOne,
    sideTwo,
  };
}

function buildRoundViews(battle: PersistedBattle): PersistedRoundView[] {
  const sideById = new Map(battle.sides.map((side) => [side.id, side]));
  const songById = new Map(battle.songs.map((song) => [song.id, song]));

  return [...battle.rounds]
    .sort((roundOne, roundTwo) => roundOne.roundNumber - roundTwo.roundNumber)
    .flatMap((round, index) => {
      const sideOne = sideById.get(round.sideOneId);
      const sideTwo = sideById.get(round.sideTwoId);
      const sideOneSong = songById.get(round.sideOneSongId);
      const sideTwoSong = songById.get(round.sideTwoSongId);

      if (!sideOne || !sideTwo || !sideOneSong || !sideTwoSong) {
        return [];
      }

      return [
        {
          round,
          roundIndex: index,
          sideOne: {
            side: sideOne,
            song: sideOneSong,
            voteSide: "sideOne" as const,
          },
          sideTwo: {
            side: sideTwo,
            song: sideTwoSong,
            voteSide: "sideTwo" as const,
          },
        },
      ];
    });
}

function getCurrentRoundView(
  battle: PersistedBattle,
  roundViews: PersistedRoundView[],
) {
  const currentRoundNumber =
    battle.event.currentRoundNumber ?? roundViews[0]?.round.roundNumber;

  return (
    roundViews.find((roundView) => roundView.round.roundNumber === currentRoundNumber) ??
    roundViews[0]
  );
}

function getNextRoundView(
  roundViews: PersistedRoundView[],
  currentRound: PersistedRoundView,
) {
  return roundViews[currentRound.roundIndex + 1] ?? null;
}

function buildPersistedScoreboard(
  battle: PersistedBattle,
  roundViews: PersistedRoundView[],
): ScoreboardEntry[] {
  return [...battle.sides]
    .sort((sideOne, sideTwo) => sideOne.displayOrder - sideTwo.displayOrder)
    .slice(0, 2)
    .map((side, index) => {
      const wins = roundViews.filter(
        (roundView) => roundView.round.winnerSideId === side.id,
      );
      const lastWinner =
        wins
          .map((roundView) => getPersistedWinner(roundView)?.song.songTitle)
          .filter((songTitle): songTitle is string => Boolean(songTitle))
          .at(-1) ?? "Waiting for first win";

      return {
        artist: side.publicDisplayName || side.artistDisplayName,
        score: wins.length,
        lastWinner,
        accent: index === 0 ? "gold" : "cyan",
      };
    });
}

function getPersistedWinner(roundView: PersistedRoundView) {
  if (
    roundView.round.winnerSideId === roundView.sideOne.side.id ||
    roundView.round.winnerSongId === roundView.sideOne.song.id
  ) {
    return roundView.sideOne;
  }

  if (
    roundView.round.winnerSideId === roundView.sideTwo.side.id ||
    roundView.round.winnerSongId === roundView.sideTwo.song.id
  ) {
    return roundView.sideTwo;
  }

  return null;
}

function getMockWinnerChoice(roundView: PersistedRoundView) {
  const totals = getMockVoteTotals(roundView.roundIndex);

  return totals.sideOne >= totals.sideTwo ? roundView.sideOne : roundView.sideTwo;
}

function getDisplayVoteTotals(roundView: PersistedRoundView) {
  const persistedTotals = getPersistedVoteTotals(roundView.round);

  if (persistedTotals.sideOne > 0 || persistedTotals.sideTwo > 0) {
    return persistedTotals;
  }

  return getMockVoteTotals(roundView.roundIndex);
}

function getPersistedVoteTotals(round: Round): PersistedVoteTotals {
  return {
    sideOne: round.sideOneVoteCount,
    sideTwo: round.sideTwoVoteCount,
  };
}

function getMockVoteTotals(roundIndex: number): PersistedVoteTotals {
  const winner = roundIndex % 2 === 0 ? "sideOne" : "sideTwo";
  const winnerTotal = 66 + ((roundIndex * 7) % 18);
  const runnerUpTotal = 54 + ((roundIndex * 5) % 16);

  return winner === "sideOne"
    ? { sideOne: winnerTotal, sideTwo: runnerUpTotal }
    : { sideOne: runnerUpTotal, sideTwo: winnerTotal };
}

function getFinalWinner(
  scoreboard: ScoreboardEntry[],
  eventStatus: EventStatus,
) {
  if (eventStatus !== "completed" || scoreboard.every((entry) => entry.score === 0)) {
    return null;
  }

  return scoreboard.reduce((leader, entry) =>
    entry.score > leader.score ? entry : leader,
  );
}

function getSideDisplay(setup: LocalBattleSetup, sideValue: string) {
  return getLocalSideConfig(setup, sideValue);
}

function getRoundTitle(roundView: PersistedRoundView) {
  const mood = roundView.sideOne.song.mood || roundView.sideTwo.song.mood;
  return mood ? `${mood} Round` : `Round ${roundView.round.roundNumber}`;
}

function getRoundTheme(setup: LocalBattleSetup, roundView: PersistedRoundView) {
  const mood = roundView.sideOne.song.mood || roundView.sideTwo.song.mood;
  return mood ? `${mood} Stage` : setup.visualThemes[0] ?? "Custom Battle Stage";
}

function getRoundStatusLabel(status?: RoundStatus) {
  if (!status) {
    return "Waiting";
  }

  return {
    queued: "Queued",
    active: "Ready",
    playing: "Round started",
    voting_open: "Voting open",
    voting_closed: "Voting closed",
    revealed: "Winner revealed",
    complete: "Complete",
  }[status];
}

function getRoundStatusTone(status?: RoundStatus) {
  if (!status) {
    return "neutral";
  }

  return {
    queued: "neutral",
    active: "gold",
    playing: "cyan",
    voting_open: "cyan",
    voting_closed: "gold",
    revealed: "cyan",
    complete: "neutral",
  }[status] as "gold" | "cyan" | "neutral";
}

function getEventStatusLabel(status: EventStatus) {
  return {
    setup: "Setup",
    lobby: "Lobby",
    live: "Live",
    paused: "Paused",
    completed: "Completed",
    archived: "Archived",
  }[status];
}

function getEventStatusTone(status: EventStatus) {
  return {
    setup: "gold",
    lobby: "gold",
    live: "cyan",
    paused: "rose",
    completed: "cyan",
    archived: "neutral",
  }[status] as "gold" | "cyan" | "rose" | "neutral";
}

function getGuestStatusHeadline(status?: RoundStatus) {
  if (status === "voting_closed") {
    return "Voting closed";
  }

  if (status === "revealed") {
    return "Winner revealed";
  }

  if (status === "playing") {
    return "Round in progress";
  }

  return "Waiting for host";
}

function getFriendlyActionError(error: string) {
  if (error.toLowerCase().includes("row-level")) {
    return "Supabase blocked this update with a row-level security rule.";
  }

  if (error.toLowerCase().includes("violates check constraint")) {
    return "Supabase rejected this update because the event state was invalid.";
  }

  return error;
}

function getPlaylistLinks(setup: LocalBattleSetup) {
  const links = setup.sideDisplayConfigs.slice(0, 2).map((sideConfig) => {
    const link =
      setup.importedSongs.find(
        (song) =>
          song.side === sideConfig.sourceCsvValue && song.appleMusicLink,
      )?.appleMusicLink || "https://music.apple.com/";

    return {
      label: `${sideConfig.artistDisplayName} Playlist Placeholder`,
      href: link,
    };
  });

  return [
    {
      label: "Full Battle Playlist Placeholder",
      href: "https://music.apple.com/",
    },
    ...links,
  ];
}
