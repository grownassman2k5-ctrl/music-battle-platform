"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type {
  AddChatMessageInput,
  BattleEvent,
  ChatMessage,
  ChatMessageStatus,
  CreateEventInput,
  CreateEventSideInput,
  EventSide,
  EventStatus,
  ISODateTimeString,
  JoinParticipantInput,
  JsonValue,
  MatchupMode,
  ModerationAction,
  ModerationActionType,
  Participant,
  ParticipantRole,
  ParticipantStatus,
  Round,
  RoundStatus,
  SaveGeneratedRoundInput,
  SaveImportedSongInput,
  Song,
  SubmitVoteInput,
  UUID,
  Vote,
} from "@/lib/types/battle";

export type RepositoryResult<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: string;
    };

export const battleTableNames = [
  "events",
  "event_sides",
  "songs",
  "rounds",
  "participants",
  "votes",
  "chat_messages",
  "moderation_actions",
] as const;

export type SupabaseBattleTableName = (typeof battleTableNames)[number];

export type SupabaseTableStatus =
  | "available"
  | "missing"
  | "permission_error"
  | "unknown_error";

export type SupabaseTableCheck = {
  tableName: SupabaseBattleTableName;
  status: SupabaseTableStatus;
  message: string;
};

export type PersistedBattle = {
  event: BattleEvent;
  sides: EventSide[];
  songs: Song[];
  rounds: Round[];
};

type EventRow = {
  id: UUID;
  event_name: string;
  event_slug: string;
  passcode_hash: string;
  passcode_hint: string | null;
  host_display_name: string | null;
  status: EventStatus;
  matchup_mode: MatchupMode;
  default_song_duration_seconds: number;
  current_round_number: number | null;
  started_at: ISODateTimeString | null;
  completed_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

type EventSideRow = {
  id: UUID;
  event_id: UUID;
  internal_side_value: string;
  public_display_name: string;
  artist_display_name: string;
  display_order: number;
  score: number;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

type SongRow = {
  id: UUID;
  event_id: UUID;
  side_id: UUID;
  csv_row_number: number | null;
  artist: string;
  song_title: string;
  album: string | null;
  genre: string | null;
  duration_seconds: number | null;
  release_year: number | null;
  mood: string | null;
  fixed_order: number | null;
  apple_music_link: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

type RoundRow = {
  id: UUID;
  event_id: UUID;
  round_number: number;
  status: RoundStatus;
  theme_label: string | null;
  side_one_id: UUID;
  side_two_id: UUID;
  side_one_song_id: UUID;
  side_two_song_id: UUID;
  winner_side_id: UUID | null;
  winner_song_id: UUID | null;
  side_one_vote_count: number;
  side_two_vote_count: number;
  started_at: ISODateTimeString | null;
  voting_opened_at: ISODateTimeString | null;
  voting_closed_at: ISODateTimeString | null;
  revealed_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

type ParticipantRow = {
  id: UUID;
  event_id: UUID;
  display_name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  client_token_hash: string | null;
  joined_at: ISODateTimeString;
  last_seen_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

type VoteRow = {
  id: UUID;
  event_id: UUID;
  round_id: UUID;
  participant_id: UUID;
  side_id: UUID;
  song_id: UUID;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

type ChatMessageRow = {
  id: UUID;
  event_id: UUID;
  participant_id: UUID | null;
  display_name_snapshot: string;
  message_body: string;
  status: ChatMessageStatus;
  moderation_reason: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

type ModerationActionRow = {
  id: UUID;
  event_id: UUID;
  moderator_participant_id: UUID | null;
  target_participant_id: UUID | null;
  chat_message_id: UUID | null;
  action_type: ModerationActionType;
  reason: string | null;
  metadata: JsonValue;
  created_at: ISODateTimeString;
};

export async function createEvent(
  input: CreateEventInput,
): Promise<RepositoryResult<BattleEvent>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("events")
      .insert({
        event_name: input.eventName,
        event_slug: input.eventSlug,
        passcode_hash: input.passcodeHash,
        passcode_hint: input.passcodeHint ?? null,
        host_display_name: input.hostDisplayName ?? null,
        matchup_mode: input.matchupMode,
        default_song_duration_seconds:
          input.defaultSongDurationSeconds ?? 120,
      })
      .select("*")
      .single();

    if (error) {
      return failure("Create event failed", error);
    }

    return success(mapBattleEvent(data as EventRow));
  } catch (error) {
    return failure("Create event failed", error);
  }
}

export async function checkSupabaseTables(
  tableNames: readonly SupabaseBattleTableName[] = battleTableNames,
): Promise<RepositoryResult<SupabaseTableCheck[]>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const checks = await Promise.all(
      tableNames.map(async (tableName) => {
        const { error } = await withTableCheckTimeout(
          supabase.from(tableName).select("id").limit(1),
          tableName,
        );

        if (!error) {
          return {
            tableName,
            status: "available" as const,
            message: "Table is reachable.",
          };
        }

        return {
          tableName,
          ...classifyTableReachabilityError(error),
        };
      }),
    );

    return success(checks);
  } catch (error) {
    return failure("Schema check failed", error);
  }
}

export async function loadPersistedBattleBySlug(
  eventSlug: string,
): Promise<RepositoryResult<PersistedBattle>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("event_slug", eventSlug)
      .maybeSingle();

    if (eventError) {
      return failure("Load event failed", eventError);
    }

    if (!eventData) {
      return {
        data: null,
        error: `Load event failed: No event was found for "${eventSlug}".`,
      };
    }

    const event = mapBattleEvent(eventData as EventRow);

    const [sidesResult, songsResult, roundsResult] = await Promise.all([
      supabase
        .from("event_sides")
        .select("*")
        .eq("event_id", event.id)
        .order("display_order", { ascending: true }),
      supabase
        .from("songs")
        .select("*")
        .eq("event_id", event.id)
        .order("fixed_order", { ascending: true, nullsFirst: false })
        .order("csv_row_number", { ascending: true, nullsFirst: false }),
      supabase
        .from("rounds")
        .select("*")
        .eq("event_id", event.id)
        .order("round_number", { ascending: true }),
    ]);

    if (sidesResult.error) {
      return failure("Load event sides failed", sidesResult.error);
    }

    if (songsResult.error) {
      return failure("Load songs failed", songsResult.error);
    }

    if (roundsResult.error) {
      return failure("Load rounds failed", roundsResult.error);
    }

    return success({
      event,
      sides: (sidesResult.data as EventSideRow[]).map(mapEventSide),
      songs: (songsResult.data as SongRow[]).map(mapSong),
      rounds: (roundsResult.data as RoundRow[]).map(mapRound),
    });
  } catch (error) {
    return failure("Load persisted battle failed", error);
  }
}

export async function createEventSides(
  eventId: UUID,
  sides: CreateEventSideInput[],
): Promise<RepositoryResult<EventSide[]>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("event_sides")
      .insert(
        sides.map((side) => ({
          event_id: eventId,
          internal_side_value: side.internalSideValue,
          public_display_name: side.publicDisplayName,
          artist_display_name: side.artistDisplayName,
          display_order: side.displayOrder,
        })),
      )
      .select("*");

    if (error) {
      return failure("Create event sides failed", error);
    }

    return success((data as EventSideRow[]).map(mapEventSide));
  } catch (error) {
    return failure("Create event sides failed", error);
  }
}

export async function saveImportedSongs(
  eventId: UUID,
  songs: SaveImportedSongInput[],
): Promise<RepositoryResult<Song[]>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("songs")
      .insert(
        songs.map((song) => ({
          event_id: eventId,
          side_id: song.sideId,
          csv_row_number: song.csvRowNumber ?? null,
          artist: song.artist,
          song_title: song.songTitle,
          album: song.album ?? null,
          genre: song.genre ?? null,
          duration_seconds: song.durationSeconds ?? null,
          release_year: song.releaseYear ?? null,
          mood: song.mood ?? null,
          fixed_order: song.fixedOrder ?? null,
          apple_music_link: song.appleMusicLink ?? null,
        })),
      )
      .select("*");

    if (error) {
      return failure("Save imported songs failed", error);
    }

    return success((data as SongRow[]).map(mapSong));
  } catch (error) {
    return failure("Save imported songs failed", error);
  }
}

export async function saveGeneratedRounds(
  eventId: UUID,
  rounds: SaveGeneratedRoundInput[],
): Promise<RepositoryResult<Round[]>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("rounds")
      .insert(
        rounds.map((round) => ({
          event_id: eventId,
          round_number: round.roundNumber,
          theme_label: round.themeLabel ?? null,
          side_one_id: round.sideOneId,
          side_two_id: round.sideTwoId,
          side_one_song_id: round.sideOneSongId,
          side_two_song_id: round.sideTwoSongId,
        })),
      )
      .select("*");

    if (error) {
      return failure("Save generated rounds failed", error);
    }

    return success((data as RoundRow[]).map(mapRound));
  } catch (error) {
    return failure("Save generated rounds failed", error);
  }
}

export async function joinEventAsParticipant(
  eventId: UUID,
  input: JoinParticipantInput,
): Promise<RepositoryResult<Participant>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("participants")
      .insert({
        event_id: eventId,
        display_name: input.displayName,
        role: input.role ?? "guest",
        client_token_hash: input.clientTokenHash ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return failure("Join event failed", error);
    }

    return success(mapParticipant(data as ParticipantRow));
  } catch (error) {
    return failure("Join event failed", error);
  }
}

export async function submitOrUpdateVote(
  input: SubmitVoteInput,
): Promise<RepositoryResult<Vote>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("votes")
      .upsert(
        {
          event_id: input.eventId,
          round_id: input.roundId,
          participant_id: input.participantId,
          side_id: input.sideId,
          song_id: input.songId,
        },
        {
          onConflict: "round_id,participant_id",
        },
      )
      .select("*")
      .single();

    if (error) {
      return failure("Submit vote failed", error);
    }

    return success(mapVote(data as VoteRow));
  } catch (error) {
    return failure("Submit vote failed", error);
  }
}

export async function addChatMessage(
  input: AddChatMessageInput,
): Promise<RepositoryResult<ChatMessage>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("chat_messages")
      .insert({
        event_id: input.eventId,
        participant_id: input.participantId ?? null,
        display_name_snapshot: input.displayNameSnapshot,
        message_body: input.messageBody,
      })
      .select("*")
      .single();

    if (error) {
      return failure("Add chat message failed", error);
    }

    return success(mapChatMessage(data as ChatMessageRow));
  } catch (error) {
    return failure("Add chat message failed", error);
  }
}

export async function recordModerationAction(input: {
  eventId: UUID;
  moderatorParticipantId?: UUID | null;
  targetParticipantId?: UUID | null;
  chatMessageId?: UUID | null;
  actionType: ModerationActionType;
  reason?: string | null;
  metadata?: Record<string, JsonValue>;
}): Promise<RepositoryResult<ModerationAction>> {
  try {
    const { data, error } = await getSupabaseBrowserClient()
      .from("moderation_actions")
      .insert({
        event_id: input.eventId,
        moderator_participant_id: input.moderatorParticipantId ?? null,
        target_participant_id: input.targetParticipantId ?? null,
        chat_message_id: input.chatMessageId ?? null,
        action_type: input.actionType,
        reason: input.reason ?? null,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();

    if (error) {
      return failure("Record moderation action failed", error);
    }

    return success(mapModerationAction(data as ModerationActionRow));
  } catch (error) {
    return failure("Record moderation action failed", error);
  }
}

function mapBattleEvent(row: EventRow): BattleEvent {
  return {
    id: row.id,
    eventName: row.event_name,
    title: row.event_name,
    eventSlug: row.event_slug,
    passcodeHash: row.passcode_hash,
    passcodeHint: row.passcode_hint,
    hostDisplayName: row.host_display_name,
    status: row.status,
    matchupMode: row.matchup_mode,
    defaultSongDurationSeconds: row.default_song_duration_seconds,
    timerSeconds: row.default_song_duration_seconds,
    currentRoundNumber: row.current_round_number,
    currentRound: row.current_round_number,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventSide(row: EventSideRow): EventSide {
  return {
    id: row.id,
    eventId: row.event_id,
    internalSideValue: row.internal_side_value,
    publicDisplayName: row.public_display_name,
    artistDisplayName: row.artist_display_name,
    displayOrder: row.display_order === 2 ? 2 : 1,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSong(row: SongRow): Song {
  return {
    id: row.id,
    eventId: row.event_id,
    sideId: row.side_id,
    csvRowNumber: row.csv_row_number,
    artist: row.artist,
    songTitle: row.song_title,
    title: row.song_title,
    album: row.album,
    genre: row.genre,
    durationSeconds: row.duration_seconds,
    releaseYear: row.release_year,
    year: row.release_year === null ? null : String(row.release_year),
    mood: row.mood,
    fixedOrder: row.fixed_order,
    appleMusicLink: row.apple_music_link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRound(row: RoundRow): Round {
  return {
    id: row.id,
    eventId: row.event_id,
    roundNumber: row.round_number,
    title: row.theme_label ?? `Round ${row.round_number}`,
    status: row.status,
    themeLabel: row.theme_label,
    sideOneId: row.side_one_id,
    sideTwoId: row.side_two_id,
    sideOneSongId: row.side_one_song_id,
    sideTwoSongId: row.side_two_song_id,
    winnerSideId: row.winner_side_id,
    winnerSongId: row.winner_song_id,
    sideOneVoteCount: row.side_one_vote_count,
    sideTwoVoteCount: row.side_two_vote_count,
    voteTotals: {
      sideOne: row.side_one_vote_count,
      sideTwo: row.side_two_vote_count,
    },
    startedAt: row.started_at,
    votingOpenedAt: row.voting_opened_at,
    votingClosedAt: row.voting_closed_at,
    revealedAt: row.revealed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    eventId: row.event_id,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    clientTokenHash: row.client_token_hash,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVote(row: VoteRow): Vote {
  return {
    id: row.id,
    eventId: row.event_id,
    roundId: row.round_id,
    participantId: row.participant_id,
    sideId: row.side_id,
    songId: row.song_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    displayNameSnapshot: row.display_name_snapshot,
    author: row.display_name_snapshot,
    messageBody: row.message_body,
    message: row.message_body,
    status: row.status,
    moderationReason: row.moderation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapModerationAction(row: ModerationActionRow): ModerationAction {
  return {
    id: row.id,
    eventId: row.event_id,
    moderatorParticipantId: row.moderator_participant_id,
    targetParticipantId: row.target_participant_id,
    chatMessageId: row.chat_message_id,
    actionType: row.action_type,
    reason: row.reason,
    metadata: isJsonRecord(row.metadata) ? row.metadata : {},
    createdAt: row.created_at,
  };
}

function success<T>(data: T): RepositoryResult<T> {
  return {
    data,
    error: null,
  };
}

function failure<T>(label: string, error: unknown): RepositoryResult<T> {
  return {
    data: null,
    error: `${label}: ${getErrorMessage(error)}`,
  };
}

function classifyTableReachabilityError(error: unknown): {
  status: SupabaseTableStatus;
  message: string;
} {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (
    code === "42P01" ||
    code === "PGRST205" ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find the table") ||
    normalizedMessage.includes("schema cache")
  ) {
    return {
      status: "missing",
      message,
    };
  }

  if (
    code === "42501" ||
    code === "PGRST301" ||
    normalizedMessage.includes("permission") ||
    normalizedMessage.includes("not authorized") ||
    normalizedMessage.includes("row-level") ||
    normalizedMessage.includes("rls")
  ) {
    return {
      status: "permission_error",
      message,
    };
  }

  return {
    status: "unknown_error",
    message,
  };
}

function getErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

function withTableCheckTimeout(
  probe: PromiseLike<{ error: unknown | null }>,
  tableName: SupabaseBattleTableName,
) {
  return Promise.race([
    Promise.resolve(probe),
    new Promise<{ error: Error }>((resolve) => {
      window.setTimeout(() => {
        resolve({
          error: new Error(
            `${tableName} check timed out before Supabase responded.`,
          ),
        });
      }, 8000);
    }),
  ]);
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unexpected Supabase error.";
}

function isJsonRecord(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
