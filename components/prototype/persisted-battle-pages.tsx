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
import {
  clearPersistedEventAccess,
  readPersistedEventAccess,
  savePersistedEventAccess,
  verifyEventPasscode,
  type PersistedAccessRole,
} from "@/lib/persisted-event-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  getParticipantById,
  getParticipantVote,
  getRoundVoteTotals,
  joinEventAsParticipant,
  loadPersistedBattleBySlug,
  submitOrUpdateVote,
  updateEventState,
  updateRoundState,
  type PersistedBattle,
  type RoundVoteTotals,
} from "@/lib/supabase/battle-repository";
import type {
  BattleEvent,
  EventSide,
  EventStatus,
  Participant,
  Round,
  RoundStatus,
  Song,
  Vote,
} from "@/lib/types/battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { HostRoleControls } from "./host-role-controls";
import { PersistedChatPanel } from "./persisted-chat-panel";
import { Scoreboard } from "./scoreboard";
import { ThemeSelector } from "./theme-selector";
import { TimerDisplay } from "./timer-display";
import { MockButton, Panel, Pill, PreviewLink } from "./ui";

type PersistedRouteMode = "host" | "event" | "results";
type PersistedVoteSide = "sideOne" | "sideTwo";
type LiveSyncStatus = "connecting" | "connected" | "unavailable";
type LocalAccessStatus = "checking" | "locked" | "verified";

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

type GuestParticipantState =
  | {
      status: "checking";
      message: string;
    }
  | {
      status: "needs_join";
      message: string;
    }
  | {
      status: "joining";
      message: string;
    }
  | {
      status: "joined";
      participant: Participant;
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

type GuestVoteState =
  | {
      status: "idle";
      message: string;
    }
  | {
      status: "loading";
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

type VoteTotalsState =
  | {
      status: "idle";
      message: string;
      totals: RoundVoteTotals | null;
    }
  | {
      status: "loading";
      message: string;
      totals: RoundVoteTotals | null;
    }
  | {
      status: "ready";
      message: string;
      totals: RoundVoteTotals;
    }
  | {
      status: "error";
      message: string;
      totals: RoundVoteTotals | null;
    };

type LocalAccessState = {
  status: LocalAccessStatus;
  message: string;
};

type AccessAttemptState =
  | {
      status: "idle";
      message: string;
    }
  | {
      status: "checking";
      message: string;
    }
  | {
      status: "verified";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

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
  const { reloadBattle, state } = usePersistedBattleState(eventSlug);

  if (state.status !== "ready") {
    return (
      <PersistedRouteShell eventSlug={eventSlug} mode="event" state={state} />
    );
  }

  return (
    <PersistedGuestExperience
      battle={state.battle}
      eventSlug={eventSlug}
      onReload={reloadBattle}
      setup={state.setup}
    />
  );
}

export function PersistedResultsBattlePage({
  eventSlug,
}: {
  eventSlug: string;
}) {
  const { reloadBattle, state } = usePersistedBattleState(eventSlug);

  if (state.status !== "ready") {
    return (
      <PersistedRouteShell eventSlug={eventSlug} mode="results" state={state} />
    );
  }

  return (
    <PersistedResultsExperience
      battle={state.battle}
      eventSlug={eventSlug}
      onReload={reloadBattle}
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

function usePersistedRealtime({
  battle,
  currentRoundId,
  onBattleChange,
  onVotesChange,
}: {
  battle: PersistedBattle;
  currentRoundId?: string | null;
  onBattleChange: () => Promise<PersistedBattleState>;
  onVotesChange?: () => Promise<void>;
}) {
  const [syncStatus, setSyncStatus] =
    useState<LiveSyncStatus>("connecting");

  useEffect(() => {
    let isActive = true;
    let battleReloadTimer: number | null = null;
    let voteReloadTimer: number | null = null;
    const supabase = getSupabaseBrowserClient();
    const scheduleBattleReload = () => {
      if (battleReloadTimer) {
        window.clearTimeout(battleReloadTimer);
      }

      battleReloadTimer = window.setTimeout(() => {
        if (isActive) {
          void onBattleChange();
        }
      }, 150);
    };
    const scheduleVoteReload = () => {
      if (!onVotesChange) {
        return;
      }

      if (voteReloadTimer) {
        window.clearTimeout(voteReloadTimer);
      }

      voteReloadTimer = window.setTimeout(() => {
        if (isActive) {
          void onVotesChange();
        }
      }, 150);
    };
    let channel = supabase
      .channel(
        `persisted-battle:${battle.event.id}:${currentRoundId ?? "no-round"}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `id=eq.${battle.event.id}`,
          schema: "public",
          table: "events",
        },
        scheduleBattleReload,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `event_id=eq.${battle.event.id}`,
          schema: "public",
          table: "rounds",
        },
        scheduleBattleReload,
      );

    if (currentRoundId) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          filter: `round_id=eq.${currentRoundId}`,
          schema: "public",
          table: "votes",
        },
        () => {
          scheduleVoteReload();
          scheduleBattleReload();
        },
      );
    }

    channel.subscribe((status) => {
      if (!isActive) {
        return;
      }

      if (status === "SUBSCRIBED") {
        setSyncStatus("connected");
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        setSyncStatus("unavailable");
      }
    });

    return () => {
      isActive = false;

      if (battleReloadTimer) {
        window.clearTimeout(battleReloadTimer);
      }

      if (voteReloadTimer) {
        window.clearTimeout(voteReloadTimer);
      }

      void supabase.removeChannel(channel);
    };
  }, [
    battle.event.id,
    currentRoundId,
    onBattleChange,
    onVotesChange,
  ]);

  return syncStatus;
}

function useLocalEventAccess(eventId: string, role: PersistedAccessRole) {
  const [accessState, setAccessState] = useState<LocalAccessState>({
    status: "checking",
    message: "Checking saved access...",
  });

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      const storedAccess = readPersistedEventAccess(eventId, role);

      if (!isActive) {
        return;
      }

      if (!storedAccess) {
        setAccessState({
          status: "locked",
          message:
            role === "host"
              ? "Enter the event passcode to unlock host controls."
              : "Enter the event passcode and display name to join.",
        });
        return;
      }

      setAccessState({
        status: "verified",
        message:
          role === "host"
            ? "Host access is verified on this browser."
            : "Event access is verified on this browser.",
      });
    });

    return () => {
      isActive = false;
    };
  }, [eventId, role]);

  function markVerified({
    displayName,
    participantId,
  }: {
    displayName?: string;
    participantId?: string;
  } = {}) {
    savePersistedEventAccess({
      displayName,
      eventId,
      participantId,
      role,
    });
    setAccessState({
      status: "verified",
      message:
        role === "host"
          ? "Host access verified for this browser."
          : "Event access verified for this browser.",
    });
  }

  function clearAccess() {
    clearPersistedEventAccess(eventId, role);
    setAccessState({
      status: "locked",
      message:
        role === "host"
          ? "Host access cleared. Enter the passcode again."
          : "Event access cleared. Enter the passcode again.",
    });
  }

  return {
    accessState,
    clearAccess,
    markVerified,
  };
}

function useGuestParticipant(eventId: string) {
  const [participantState, setParticipantState] =
    useState<GuestParticipantState>({
      status: "checking",
      message: "Checking your guest session...",
    });

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(async () => {
      const storedParticipantId = readStoredParticipantId(eventId);

      if (!storedParticipantId) {
        if (isActive) {
          setParticipantState({
            status: "needs_join",
            message: "Join this event to vote in the current round.",
          });
        }
        return;
      }

      const result = await getParticipantById(eventId, storedParticipantId);

      if (!isActive) {
        return;
      }

      if (result.error) {
        setParticipantState({
          status: "error",
          message: getFriendlyActionError(result.error),
        });
        return;
      }

      if (!result.data) {
        clearStoredParticipantId(eventId);
        setParticipantState({
          status: "needs_join",
          message:
            "Your saved guest session was not found. Join again to continue.",
        });
        return;
      }

      setParticipantState({
        status: "joined",
        participant: result.data,
        message: `Joined as ${result.data.displayName}.`,
      });
    });

    return () => {
      isActive = false;
    };
  }, [eventId]);

  async function join(displayName: string) {
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setParticipantState({
        status: "needs_join",
        message: "Enter a display name to join.",
      });
      return null;
    }

    setParticipantState({
      status: "joining",
      message: "Joining event...",
    });

    const result = await joinEventAsParticipant(eventId, {
      displayName: trimmedDisplayName,
      role: "guest",
    });

    if (result.error || !result.data) {
      setParticipantState({
        status: "error",
        message: getFriendlyActionError(
          result.error ?? "Supabase did not return a participant.",
        ),
      });
      return null;
    }

    saveStoredParticipantId(eventId, result.data.id);
    setParticipantState({
      status: "joined",
      participant: result.data,
      message: `Joined as ${result.data.displayName}.`,
    });

    return result.data;
  }

  function leave() {
    clearStoredParticipantId(eventId);
    setParticipantState({
      status: "needs_join",
      message: "Guest session cleared. Join again to vote.",
    });
  }

  return {
    join,
    leave,
    participantState,
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
  const {
    accessState: hostAccessState,
    clearAccess: clearHostAccess,
    markVerified: markHostVerified,
  } = useLocalEventAccess(battle.event.id, "host");
  const [hostAccessAttempt, setHostAccessAttempt] =
    useState<AccessAttemptState>({
      status: "idle",
      message: "",
    });
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
  const [voteTotalsState, setVoteTotalsState] = useState<VoteTotalsState>({
    status: "idle",
    message: "Vote totals have not been loaded yet.",
    totals: null,
  });
  const [manualWinnerChoice, setManualWinnerChoice] = useState<{
    roundId: string;
    side: PersistedVoteSide;
  } | null>(null);
  const scoreboard = useMemo(
    () => buildPersistedScoreboard(battle, roundViews),
    [battle, roundViews],
  );
  const isSaving = actionState.status === "saving";
  const activeTheme = selectedTheme ?? currentTheme;
  const currentRoundId = currentRound?.round.id ?? null;
  const currentRoundVoteTotals =
    voteTotalsState.totals?.roundId === currentRoundId
      ? voteTotalsState.totals
      : null;
  const activeVoteTotals =
    currentRoundVoteTotals ??
    (currentRound ? getPersistedVoteTotals(currentRound.round) : null);
  const selectedManualWinner =
    manualWinnerChoice?.roundId === currentRoundId
      ? manualWinnerChoice.side
      : null;

  const refreshVoteTotalsQuietly = useCallback(async () => {
    if (!currentRound) {
      return;
    }

    const result = await getRoundVoteTotals(currentRound.round);

    if (result.error || !result.data) {
      setVoteTotalsState({
        status: "error",
        message: getFriendlyActionError(
          result.error ?? "Supabase did not return vote totals.",
        ),
        totals: null,
      });
      return;
    }

    setVoteTotalsState({
      status: "ready",
      message: "Vote totals loaded from Supabase.",
      totals: result.data,
    });
  }, [currentRound, setVoteTotalsState]);

  const syncStatus = usePersistedRealtime({
    battle,
    currentRoundId,
    onBattleChange: onReload,
    onVotesChange: refreshVoteTotalsQuietly,
  });

  useEffect(() => {
    let isActive = true;

    if (!currentRound) {
      return;
    }

    getRoundVoteTotals(currentRound.round).then((result) => {
      if (!isActive) {
        return;
      }

      if (result.error || !result.data) {
        setVoteTotalsState({
          status: "error",
          message: getFriendlyActionError(
            result.error ?? "Supabase did not return vote totals.",
          ),
          totals: null,
        });
        return;
      }

      setVoteTotalsState({
        status: "ready",
        message: "Vote totals loaded from Supabase.",
        totals: result.data,
      });
    });

    return () => {
      isActive = false;
    };
  }, [currentRound]);

  async function refreshVoteTotals() {
    if (!currentRound) {
      return;
    }

    setVoteTotalsState((currentState) => ({
      status: "loading",
      message: "Refreshing vote totals...",
      totals: currentState.totals,
    }));

    await refreshVoteTotalsQuietly();
  }

  async function readVoteTotalsForAction() {
    if (!currentRound) {
      return {
        error: "No current round is available.",
        totals: null,
      };
    }

    const result = await getRoundVoteTotals(currentRound.round);

    if (result.error || !result.data) {
      return {
        error: result.error ?? "Supabase did not return vote totals.",
        totals: null,
      };
    }

    setVoteTotalsState({
      status: "ready",
      message: "Vote totals loaded from Supabase.",
      totals: result.data,
    });

    return {
      error: null,
      totals: result.data,
    };
  }

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

    const voteTotalsResult = await readVoteTotalsForAction();

    if (voteTotalsResult.error || !voteTotalsResult.totals) {
      return voteTotalsResult.error;
    }

    const roundResult = await updateRoundState({
      eventId: battle.event.id,
      roundId: currentRound.round.id,
      status: "voting_closed",
      sideOneVoteCount: voteTotalsResult.totals.sideOne,
      sideTwoVoteCount: voteTotalsResult.totals.sideTwo,
      votingClosedAt: new Date().toISOString(),
    });

    return roundResult.error;
  }

  async function revealWinner() {
    if (!currentRound) {
      return "No current round is available to reveal.";
    }

    const voteTotalsResult = await readVoteTotalsForAction();

    if (voteTotalsResult.error || !voteTotalsResult.totals) {
      return voteTotalsResult.error;
    }

    const winner = getWinnerFromVoteTotals(
      currentRound,
      voteTotalsResult.totals,
      selectedManualWinner,
    );

    if (!winner) {
      return "Vote totals are tied. Choose a winner before revealing.";
    }

    const roundResult = await updateRoundState({
      eventId: battle.event.id,
      roundId: currentRound.round.id,
      status: "revealed",
      winnerSideId: winner.side.id,
      winnerSongId: winner.song.id,
      sideOneVoteCount: voteTotalsResult.totals.sideOne,
      sideTwoVoteCount: voteTotalsResult.totals.sideTwo,
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

  async function verifyHostAccess(passcode: string) {
    setHostAccessAttempt({
      status: "checking",
      message: "Checking host passcode...",
    });

    try {
      const result = await verifyEventPasscode(
        passcode,
        battle.event.passcodeHash,
      );

      if (!result.verified) {
        setHostAccessAttempt({
          status: "error",
          message: result.error,
        });
        return;
      }

      markHostVerified();
      setHostAccessAttempt({
        status: "verified",
        message: "Host access verified.",
      });
    } catch (error) {
      setHostAccessAttempt({
        status: "error",
        message: getFriendlyActionError(
          error instanceof Error ? error.message : "Host access failed.",
        ),
      });
    }
  }

  if (hostAccessState.status !== "verified") {
    return (
      <HostAccessGate
        accessState={hostAccessState}
        attemptState={hostAccessAttempt}
        battle={battle}
        eventSlug={eventSlug}
        onSubmit={(passcode) => void verifyHostAccess(passcode)}
        setup={setup}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <PersistedHeader
          event={battle.event}
          eventSlug={eventSlug}
          mode="host"
          syncStatus={syncStatus}
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
                  voteTotalsOverride={activeVoteTotals}
                  voteLabel="Preview"
                />

                <HostVoteTotalsPanel
                  currentRound={currentRound}
                  manualWinnerSide={selectedManualWinner}
                  onManualWinnerChange={(side) =>
                    setManualWinnerChoice({
                      roundId: currentRound.round.id,
                      side,
                    })
                  }
                  onRefresh={() => void refreshVoteTotals()}
                  state={voteTotalsState}
                  totals={activeVoteTotals}
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
            <HostAccessStatusPanel
              accessState={hostAccessState}
              onClearAccess={clearHostAccess}
            />
            <PersistedChatPanel eventId={battle.event.id} mode="host" />
          </aside>
        </section>
      </div>
    </main>
  );
}

function PersistedGuestExperience({
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
  const {
    accessState: guestAccessState,
    clearAccess: clearGuestAccess,
    markVerified: markGuestVerified,
  } = useLocalEventAccess(battle.event.id, "guest");
  const [guestAccessAttempt, setGuestAccessAttempt] =
    useState<AccessAttemptState>({
      status: "idle",
      message: "",
    });
  const { join, leave, participantState } = useGuestParticipant(battle.event.id);
  const [selectedVote, setSelectedVote] = useState<{
    roundId: string;
    side: PersistedVoteSide;
  } | null>(null);
  const [voteState, setVoteState] = useState<GuestVoteState>({
    status: "idle",
    message: "Join the event to vote.",
  });
  const roundViews = useMemo(() => buildRoundViews(battle), [battle]);
  const currentRound = getCurrentRoundView(battle, roundViews);
  const currentRoundId = currentRound?.round.id ?? null;
  const scoreboard = useMemo(
    () => buildPersistedScoreboard(battle, roundViews),
    [battle, roundViews],
  );
  const votingIsOpen = currentRound?.round.status === "voting_open";
  const selectedSide =
    selectedVote?.roundId === currentRoundId ? selectedVote.side : null;
  const syncStatus = usePersistedRealtime({
    battle,
    currentRoundId,
    onBattleChange: onReload,
  });
  const selectedArtist =
    currentRound && selectedSide
      ? currentRound[selectedSide].side.artistDisplayName
      : votingIsOpen
      ? "No vote selected"
      : getGuestStatusHeadline(currentRound?.round.status);
  const participant =
    participantState.status === "joined" ? participantState.participant : null;

  useEffect(() => {
    let isActive = true;

    if (!participant || !currentRound) {
      return;
    }

    getParticipantVote(currentRound.round.id, participant.id).then((result) => {
      if (!isActive) {
        return;
      }

      if (result.error) {
        setVoteState({
          status: "error",
          message: getFriendlyActionError(result.error),
        });
        return;
      }

      const vote = result.data;
      const voteSide = vote ? getVoteSide(currentRound, vote) : null;
      setSelectedVote(
        voteSide
          ? {
              roundId: currentRound.round.id,
              side: voteSide,
            }
          : null,
      );
      setVoteState({
        status: "idle",
        message: voteSide
          ? `Your saved vote is ${currentRound[voteSide].side.artistDisplayName}.`
          : getGuestVotingMessage(currentRound.round.status),
      });
    });

    return () => {
      isActive = false;
    };
  }, [currentRound, participant]);

  async function submitGuestVote(voteSide: PersistedVoteSide) {
    if (!participant) {
      setVoteState({
        status: "error",
        message: "Join this event before voting.",
      });
      return;
    }

    if (!currentRound) {
      setVoteState({
        status: "error",
        message: "No current round is available for voting.",
      });
      return;
    }

    if (currentRound.round.status !== "voting_open") {
      setVoteState({
        status: "error",
        message: getGuestVotingMessage(currentRound.round.status),
      });
      return;
    }

    const voteTarget = currentRound[voteSide];
    setVoteState({
      status: "saving",
      message: `Saving vote for ${voteTarget.side.artistDisplayName}...`,
    });

    const result = await submitOrUpdateVote({
      eventId: battle.event.id,
      participantId: participant.id,
      roundId: currentRound.round.id,
      sideId: voteTarget.side.id,
      songId: voteTarget.song.id,
    });

    if (result.error || !result.data) {
      setVoteState({
        status: "error",
        message: getFriendlyVoteError(result.error ?? "Vote was not saved."),
      });
      return;
    }

    setSelectedVote({
      roundId: currentRound.round.id,
      side: voteSide,
    });
    setVoteState({
      status: "saved",
      message: `Vote saved for ${voteTarget.side.artistDisplayName}. You can change it until voting closes.`,
    });
  }

  async function verifyGuestAccess({
    displayName,
    passcode,
  }: {
    displayName: string;
    passcode: string;
  }) {
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName && !participant) {
      setGuestAccessAttempt({
        status: "error",
        message: "Enter a display name to join this event.",
      });
      return;
    }

    setGuestAccessAttempt({
      status: "checking",
      message: "Checking event passcode...",
    });

    try {
      const result = await verifyEventPasscode(
        passcode,
        battle.event.passcodeHash,
      );

      if (!result.verified) {
        setGuestAccessAttempt({
          status: "error",
          message: result.error,
        });
        return;
      }

      const joinedParticipant =
        participant ?? (await join(trimmedDisplayName));

      if (!joinedParticipant) {
        setGuestAccessAttempt({
          status: "error",
          message: "Passcode matched, but the guest session could not be saved.",
        });
        return;
      }

      markGuestVerified({
        displayName: joinedParticipant.displayName,
        participantId: joinedParticipant.id,
      });
      setGuestAccessAttempt({
        status: "verified",
        message: `Joined as ${joinedParticipant.displayName}.`,
      });
    } catch (error) {
      setGuestAccessAttempt({
        status: "error",
        message: getFriendlyActionError(
          error instanceof Error ? error.message : "Guest access failed.",
        ),
      });
    }
  }

  function clearGuestSessionAndAccess() {
    leave();
    clearGuestAccess();
    setGuestAccessAttempt({
      status: "idle",
      message: "",
    });
  }

  if (guestAccessState.status !== "verified") {
    return (
      <GuestEventAccessGate
        accessState={guestAccessState}
        attemptState={guestAccessAttempt}
        battle={battle}
        eventSlug={eventSlug}
        onSubmit={(input) => void verifyGuestAccess(input)}
        participant={participant}
        participantState={participantState}
        setup={setup}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <PersistedHeader
          event={battle.event}
          eventSlug={eventSlug}
          mode="event"
          syncStatus={syncStatus}
          themeLabel={
            currentRound
              ? getRoundTheme(setup, currentRound)
              : setup.visualThemes[0] ?? "Custom Battle Stage"
          }
        />

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            {!participant ? (
              <GuestJoinCard
                onJoin={(displayName) => void join(displayName)}
                state={participantState}
              />
            ) : currentRound ? (
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
                      <p className="mt-2 text-sm text-zinc-400">
                        {participantState.message}
                      </p>
                    </div>
                    <Pill tone={getRoundStatusTone(currentRound.round.status)}>
                      {getRoundStatusLabel(currentRound.round.status)}
                    </Pill>
                  </div>
                  <GuestVoteFeedback state={voteState} />
                </Panel>

                {currentRound.round.status === "revealed" ? (
                  <PersistedRevealCard roundView={currentRound} setup={setup} />
                ) : null}

                <PersistedMatchupBoard
                  disabled={!votingIsOpen}
                  onVote={votingIsOpen ? submitGuestVote : undefined}
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
            <GuestSessionPanel
              onLeave={clearGuestSessionAndAccess}
              participant={participant}
              state={participantState}
            />
            <Scoreboard
              scoreboard={scoreboard}
              title="Persisted tally"
              totalRounds={roundViews.length}
            />
            <PersistedChatPanel
              eventId={battle.event.id}
              mode="guest"
              participant={participant}
            />
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
  const syncStatus = usePersistedRealtime({
    battle,
    currentRoundId: currentRound?.round.id ?? null,
    onBattleChange: onReload,
  });
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
          syncStatus={syncStatus}
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
            <ResultsPrivacyNote />
            <PersistedPlaylistLinks setup={setup} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function ResultsPrivacyNote() {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Results access
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">
        Public for this phase
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Results stay viewable without a passcode in this MVP. Add a future
        public/private event setting before launch if results should be gated.
      </p>
    </Panel>
  );
}

function PersistedHeader({
  event,
  eventSlug,
  mode,
  syncStatus,
  themeLabel,
}: {
  event: BattleEvent;
  eventSlug: string;
  mode: PersistedRouteMode;
  syncStatus?: LiveSyncStatus;
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
          {syncStatus ? <LiveSyncPill status={syncStatus} /> : null}
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

function LiveSyncPill({ status }: { status: LiveSyncStatus }) {
  const label = {
    connecting: "Live sync connecting",
    connected: "Live sync connected",
    unavailable: "Live sync unavailable",
  }[status];
  const tone = {
    connecting: "gold",
    connected: "cyan",
    unavailable: "rose",
  }[status] as "gold" | "cyan" | "rose";

  return <Pill tone={tone}>{label}</Pill>;
}

function HostAccessGate({
  accessState,
  attemptState,
  battle,
  eventSlug,
  onSubmit,
  setup,
}: {
  accessState: LocalAccessState;
  attemptState: AccessAttemptState;
  battle: PersistedBattle;
  eventSlug: string;
  onSubmit: (passcode: string) => void;
  setup: LocalBattleSetup;
}) {
  const [passcode, setPasscode] = useState("");
  const isChecking =
    accessState.status === "checking" || attemptState.status === "checking";

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <PersistedHeader
          event={battle.event}
          eventSlug={eventSlug}
          mode="host"
          themeLabel={setup.visualThemes[0] ?? "Private Host Room"}
        />

        <section className="grid flex-1 items-center gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="text-sm font-semibold uppercase text-[#43d9cf]">
              Host access
            </p>
            <h2 className="mt-3 max-w-3xl text-5xl font-black leading-tight text-white sm:text-6xl">
              Unlock the control room
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              This temporary MVP uses the event passcode to protect host
              controls on this browser. Real host authorization should move to
              Supabase Auth or server-side passcode verification before launch.
            </p>
          </div>

          <Panel className="p-5">
            <Pill tone="gold">Temporary host check</Pill>
            <h3 className="mt-4 text-2xl font-black text-white">
              {battle.event.eventName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {getBattleMatchupName(battle)} / {accessState.message}
            </p>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-zinc-300">
                Host passcode
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f7c948]/70"
                disabled={isChecking}
                onChange={(event) => setPasscode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSubmit(passcode);
                  }
                }}
                placeholder="Enter event passcode"
                type="password"
                value={passcode}
              />
            </label>

            <MockButton
              className="mt-4 w-full"
              disabled={isChecking}
              onClick={() => onSubmit(passcode)}
              tone="primary"
            >
              {isChecking ? "Checking..." : "Unlock Host Controls"}
            </MockButton>
            <AccessFeedback state={attemptState} />
          </Panel>
        </section>
      </div>
    </main>
  );
}

function GuestEventAccessGate({
  accessState,
  attemptState,
  battle,
  eventSlug,
  onSubmit,
  participant,
  participantState,
  setup,
}: {
  accessState: LocalAccessState;
  attemptState: AccessAttemptState;
  battle: PersistedBattle;
  eventSlug: string;
  onSubmit: (input: { displayName: string; passcode: string }) => void;
  participant: Participant | null;
  participantState: GuestParticipantState;
  setup: LocalBattleSetup;
}) {
  const [displayName, setDisplayName] = useState(participant?.displayName ?? "");
  const [passcode, setPasscode] = useState("");
  const isChecking =
    accessState.status === "checking" ||
    attemptState.status === "checking" ||
    participantState.status === "checking" ||
    participantState.status === "joining";

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <PersistedHeader
          event={battle.event}
          eventSlug={eventSlug}
          mode="event"
          themeLabel={setup.visualThemes[0] ?? "Private Event"}
        />

        <section className="grid flex-1 items-center gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <p className="text-sm font-semibold uppercase text-[#43d9cf]">
              Private event
            </p>
            <h2 className="mt-3 max-w-3xl text-5xl font-black leading-tight text-white sm:text-6xl">
              {battle.event.eventName}
            </h2>
            <p className="mt-4 text-2xl font-bold text-zinc-200">
              {getBattleMatchupName(battle)}
            </p>
            <div className="mt-6 grid max-w-3xl gap-3 text-sm leading-6 text-zinc-400">
              <p>
                Enter the event passcode and a display name to join the voting
                room. Your display name is used for votes and live chat.
              </p>
              <p>
                Audio is shared by the host outside this app. Listen along in
                the room or stream, then vote here when the host opens voting.
              </p>
              <p>
                This browser will remember access for this event until you clear
                it.
              </p>
            </div>
          </div>

          <Panel className="p-5">
            <Pill tone="gold">Guest entry</Pill>
            <h3 className="mt-4 text-2xl font-black text-white">
              Join the battle room
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {accessState.message}
              {participant ? ` Existing session: ${participant.displayName}.` : ""}
            </p>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-zinc-300">
                Display name
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#43d9cf]/70"
                disabled={isChecking}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your stage name"
                type="text"
                value={displayName}
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-300">
                Event passcode
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f7c948]/70"
                disabled={isChecking}
                onChange={(event) => setPasscode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSubmit({ displayName, passcode });
                  }
                }}
                placeholder="Enter passcode"
                type="password"
                value={passcode}
              />
            </label>

            <MockButton
              className="mt-4 w-full"
              disabled={isChecking}
              onClick={() => onSubmit({ displayName, passcode })}
              tone="primary"
            >
              {isChecking ? "Joining..." : "Join Event"}
            </MockButton>
            <AccessFeedback state={attemptState} />
          </Panel>
        </section>
      </div>
    </main>
  );
}

function AccessFeedback({ state }: { state: AccessAttemptState }) {
  if (!state.message) {
    return null;
  }

  const className =
    state.status === "error"
      ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
      : state.status === "checking"
        ? "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]"
        : "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]";

  return (
    <p className={`mt-4 rounded-lg border p-3 text-sm font-semibold ${className}`}>
      {state.message}
    </p>
  );
}

function HostVoteTotalsPanel({
  currentRound,
  manualWinnerSide,
  onManualWinnerChange,
  onRefresh,
  state,
  totals,
}: {
  currentRound: PersistedRoundView;
  manualWinnerSide: PersistedVoteSide | null;
  onManualWinnerChange: (side: PersistedVoteSide) => void;
  onRefresh: () => void;
  state: VoteTotalsState;
  totals: PersistedVoteTotals | RoundVoteTotals | null;
}) {
  const sideOneTotal = totals?.sideOne ?? 0;
  const sideTwoTotal = totals?.sideTwo ?? 0;
  const totalVotes = sideOneTotal + sideTwoTotal;
  const isTie = sideOneTotal === sideTwoTotal;
  const shouldShowTie =
    isTie &&
    (totalVotes > 0 ||
      currentRound.round.status === "voting_closed" ||
      currentRound.round.status === "revealed");
  const canManuallyChoose = shouldShowTie;

  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Live vote totals
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {totalVotes} votes counted
          </h2>
        </div>
        <MockButton
          disabled={state.status === "loading"}
          onClick={onRefresh}
          tone="ghost"
        >
          {state.status === "loading" ? "Refreshing..." : "Refresh Vote Totals"}
        </MockButton>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <VoteTotalTile
          label={currentRound.sideOne.side.publicDisplayName}
          tone="gold"
          value={sideOneTotal}
        />
        <VoteTotalTile
          label={currentRound.sideTwo.side.publicDisplayName}
          tone="cyan"
          value={sideTwoTotal}
        />
      </div>

      {state.message ? (
        <p className="mt-4 text-sm leading-6 text-zinc-400">{state.message}</p>
      ) : null}

      {shouldShowTie ? (
        <div className="mt-4 rounded-lg border border-[#f7c948]/30 bg-[#f7c948]/10 p-4">
          <p className="text-sm font-bold uppercase text-[#ffe7a3]">
            Tie detected
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Supabase needs one saved winner for the reveal. Choose a winner
            before clicking Reveal Winner.
          </p>
          {canManuallyChoose ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <MockButton
                onClick={() => onManualWinnerChange("sideOne")}
                tone={manualWinnerSide === "sideOne" ? "primary" : "ghost"}
              >
                Choose {currentRound.sideOne.side.artistDisplayName}
              </MockButton>
              <MockButton
                onClick={() => onManualWinnerChange("sideTwo")}
                tone={manualWinnerSide === "sideTwo" ? "secondary" : "ghost"}
              >
                Choose {currentRound.sideTwo.side.artistDisplayName}
              </MockButton>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

function VoteTotalTile({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "gold" | "cyan";
  value: number;
}) {
  const className =
    tone === "gold"
      ? "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]"
      : "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]";

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <p className="text-sm font-semibold uppercase">{label}</p>
      <p className="mt-2 text-4xl font-black text-white">{value}</p>
    </div>
  );
}

function GuestJoinCard({
  onJoin,
  state,
}: {
  onJoin: (displayName: string) => void;
  state: GuestParticipantState;
}) {
  const [displayName, setDisplayName] = useState("");
  const isJoining = state.status === "joining";

  return (
    <Panel className="p-5">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Guest join
      </p>
      <h2 className="mt-2 text-3xl font-black text-white">
        Join this battle to vote
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{state.message}</p>
      <label className="mt-5 block">
        <span className="text-sm font-medium text-zinc-300">Display name</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#43d9cf]/70"
          disabled={isJoining}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Your stage name"
          type="text"
          value={displayName}
        />
      </label>
      <MockButton
        className="mt-4 w-full"
        disabled={isJoining}
        onClick={() => onJoin(displayName)}
        tone="primary"
      >
        {isJoining ? "Joining..." : "Join Event"}
      </MockButton>
    </Panel>
  );
}

function GuestSessionPanel({
  onLeave,
  participant,
  state,
}: {
  onLeave: () => void;
  participant: Participant | null;
  state: GuestParticipantState;
}) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Guest session
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">
        {participant?.displayName ?? "Not joined"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{state.message}</p>
      {participant ? (
        <MockButton className="mt-4 w-full" onClick={onLeave} tone="ghost">
          Leave Event / Clear Access
        </MockButton>
      ) : null}
    </Panel>
  );
}

function HostAccessStatusPanel({
  accessState,
  onClearAccess,
}: {
  accessState: LocalAccessState;
  onClearAccess: () => void;
}) {
  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Host access
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">Verified locally</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {accessState.message} This is a temporary browser-only access flag for
        MVP testing.
      </p>
      <MockButton className="mt-4 w-full" onClick={onClearAccess} tone="ghost">
        Clear Host Access
      </MockButton>
    </Panel>
  );
}

function GuestVoteFeedback({ state }: { state: GuestVoteState }) {
  if (!state.message) {
    return null;
  }

  const className =
    state.status === "error"
      ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
      : state.status === "saved"
        ? "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]"
        : state.status === "saving" || state.status === "loading"
          ? "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]"
          : "border-white/10 bg-white/10 text-zinc-300";

  return (
    <div className={`mt-4 rounded-lg border p-3 text-sm font-semibold ${className}`}>
      {state.message}
    </div>
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
  voteTotalsOverride,
  voteLabel = "Vote",
}: {
  disabled?: boolean;
  onVote?: (side: PersistedVoteSide) => void;
  roundView: PersistedRoundView;
  selectedSide?: PersistedVoteSide | null;
  setup: LocalBattleSetup;
  voteTotalsOverride?: PersistedVoteTotals | RoundVoteTotals | null;
  voteLabel?: string;
}) {
  const voteTotals = voteTotalsOverride ?? getDisplayVoteTotals(roundView);

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

function getBattleMatchupName(battle: PersistedBattle) {
  const sides = [...battle.sides]
    .sort((sideOne, sideTwo) => sideOne.displayOrder - sideTwo.displayOrder)
    .slice(0, 2);

  if (sides.length < 2) {
    return "Private music battle";
  }

  return sides
    .map((side) => side.artistDisplayName || side.publicDisplayName)
    .join(" vs ");
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

function getWinnerFromVoteTotals(
  roundView: PersistedRoundView,
  totals: Pick<RoundVoteTotals, "sideOne" | "sideTwo">,
  manualWinnerSide: PersistedVoteSide | null,
) {
  if (totals.sideOne > totals.sideTwo) {
    return roundView.sideOne;
  }

  if (totals.sideTwo > totals.sideOne) {
    return roundView.sideTwo;
  }

  return manualWinnerSide ? roundView[manualWinnerSide] : null;
}

function getVoteSide(roundView: PersistedRoundView, vote: Vote) {
  if (vote.sideId === roundView.sideOne.side.id) {
    return "sideOne" as const;
  }

  if (vote.sideId === roundView.sideTwo.side.id) {
    return "sideTwo" as const;
  }

  return null;
}

function getDisplayVoteTotals(roundView: PersistedRoundView) {
  return getPersistedVoteTotals(roundView.round);
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

function getGuestVotingMessage(status?: RoundStatus) {
  if (status === "voting_open") {
    return "Voting is open. You can change your vote until the host closes voting.";
  }

  if (status === "voting_closed") {
    return "Voting is closed for this round.";
  }

  if (status === "revealed") {
    return "The winner has been revealed for this round.";
  }

  if (status === "playing") {
    return "The round has started. Wait for the host to open voting.";
  }

  if (status === "active" || status === "queued") {
    return "The host has not opened voting yet.";
  }

  return "Voting is not available for this round.";
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

function getFriendlyVoteError(error: string) {
  if (error.toLowerCase().includes("votes can only")) {
    return "Voting is not open for this round.";
  }

  if (error.toLowerCase().includes("duplicate")) {
    return "Your previous vote could not be updated. Try again.";
  }

  return getFriendlyActionError(error);
}

function getParticipantStorageKey(eventId: string) {
  return `music-battle-platform.participant.${eventId}.v1`;
}

function readStoredParticipantId(eventId: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getParticipantStorageKey(eventId)) ?? "";
}

function saveStoredParticipantId(eventId: string, participantId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getParticipantStorageKey(eventId), participantId);
}

function clearStoredParticipantId(eventId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getParticipantStorageKey(eventId));
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
