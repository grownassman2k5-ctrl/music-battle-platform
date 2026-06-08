export type UUID = string;
export type ISODateTimeString = string;

export type MatchupMode = "fixed" | "randomized";
export type EventStatus =
  | "setup"
  | "lobby"
  | "live"
  | "paused"
  | "completed"
  | "archived";
export type RoundStatus =
  | "queued"
  | "active"
  | "playing"
  | "voting_open"
  | "voting_closed"
  | "revealed"
  | "complete";
export type ParticipantRole = "host" | "moderator" | "guest";
export type ParticipantStatus = "active" | "muted" | "kicked" | "left";
export type ChatMessageStatus = "visible" | "hidden" | "deleted" | "flagged";
export type ModerationActionType =
  | "hide_message"
  | "restore_message"
  | "delete_message"
  | "flag_message"
  | "mute_participant"
  | "unmute_participant"
  | "kick_participant"
  | "warn_participant";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type BattleEvent = {
  id: UUID;
  eventName: string;
  title: string;
  eventSlug: string;
  passcodeHash?: string;
  passcodeHint: string | null;
  hostDisplayName: string | null;
  status: EventStatus;
  matchupMode: MatchupMode;
  defaultSongDurationSeconds: number;
  timerSeconds: number;
  currentRoundNumber: number | null;
  currentRound: number | null;
  startedAt: ISODateTimeString | null;
  completedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type EventSide = {
  id: UUID;
  eventId: UUID;
  internalSideValue: string;
  publicDisplayName: string;
  artistDisplayName: string;
  displayOrder: 1 | 2;
  score: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type Song = {
  id: UUID;
  eventId: UUID;
  sideId: UUID;
  csvRowNumber: number | null;
  artist: string;
  songTitle: string;
  title: string;
  album: string | null;
  genre: string | null;
  durationSeconds: number | null;
  releaseYear: number | null;
  year: string | null;
  mood: string | null;
  fixedOrder: number | null;
  appleMusicLink: string | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type Round = {
  id: UUID;
  eventId: UUID;
  roundNumber: number;
  title: string;
  status: RoundStatus;
  themeLabel: string | null;
  sideOneId: UUID;
  sideTwoId: UUID;
  sideOneSongId: UUID;
  sideTwoSongId: UUID;
  winnerSideId: UUID | null;
  winnerSongId: UUID | null;
  sideOneVoteCount: number;
  sideTwoVoteCount: number;
  voteTotals: {
    sideOne: number;
    sideTwo: number;
  };
  startedAt: ISODateTimeString | null;
  votingOpenedAt: ISODateTimeString | null;
  votingClosedAt: ISODateTimeString | null;
  revealedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type Participant = {
  id: UUID;
  eventId: UUID;
  displayName: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  clientTokenHash: string | null;
  joinedAt: ISODateTimeString;
  lastSeenAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type Vote = {
  id: UUID;
  eventId: UUID;
  roundId: UUID;
  participantId: UUID;
  sideId: UUID;
  songId: UUID;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type ChatMessage = {
  id: UUID;
  eventId: UUID;
  participantId: UUID | null;
  displayNameSnapshot: string;
  author: string;
  messageBody: string;
  message: string;
  status: ChatMessageStatus;
  moderationReason: string | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type ModerationAction = {
  id: UUID;
  eventId: UUID;
  moderatorParticipantId: UUID | null;
  targetParticipantId: UUID | null;
  chatMessageId: UUID | null;
  actionType: ModerationActionType;
  reason: string | null;
  metadata: Record<string, JsonValue>;
  createdAt: ISODateTimeString;
};

export type CreateEventInput = {
  eventName: string;
  eventSlug: string;
  passcodeHash: string;
  passcodeHint?: string | null;
  hostDisplayName?: string | null;
  matchupMode: MatchupMode;
  defaultSongDurationSeconds?: number;
};

export type CreateEventSideInput = {
  internalSideValue: string;
  publicDisplayName: string;
  artistDisplayName: string;
  displayOrder: 1 | 2;
};

export type SaveImportedSongInput = {
  sideId: UUID;
  csvRowNumber?: number | null;
  artist: string;
  songTitle: string;
  album?: string | null;
  genre?: string | null;
  durationSeconds?: number | null;
  releaseYear?: number | null;
  mood?: string | null;
  fixedOrder?: number | null;
  appleMusicLink?: string | null;
};

export type SaveGeneratedRoundInput = {
  roundNumber: number;
  themeLabel?: string | null;
  sideOneId: UUID;
  sideTwoId: UUID;
  sideOneSongId: UUID;
  sideTwoSongId: UUID;
};

export type JoinParticipantInput = {
  displayName: string;
  role?: ParticipantRole;
  clientTokenHash?: string | null;
};

export type SubmitVoteInput = {
  eventId: UUID;
  roundId: UUID;
  participantId: UUID;
  sideId: UUID;
  songId: UUID;
};

export type AddChatMessageInput = {
  eventId: UUID;
  participantId?: UUID | null;
  displayNameSnapshot: string;
  messageBody: string;
};
