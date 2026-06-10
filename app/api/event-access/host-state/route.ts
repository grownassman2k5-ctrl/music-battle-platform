import { NextResponse, type NextRequest } from "next/server";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/security/rate-limit";
import {
  extractBearerToken,
  verifyEventAccessToken,
} from "@/lib/security/server-tokens";
import { validateEventSlug } from "@/lib/security/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type {
  EventStatus,
  ISODateTimeString,
  RoundStatus,
  UUID,
} from "@/lib/types/battle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HostStateRequest = {
  eventId?: UUID;
  eventSlug?: string;
  eventPatch?: {
    completedAt?: ISODateTimeString | null;
    currentRoundNumber?: number | null;
    startedAt?: ISODateTimeString | null;
    status?: EventStatus;
  };
  roundPatch?: {
    revealedAt?: ISODateTimeString | null;
    roundId?: UUID;
    sideOneVoteCount?: number;
    sideTwoVoteCount?: number;
    startedAt?: ISODateTimeString | null;
    status?: RoundStatus;
    votingClosedAt?: ISODateTimeString | null;
    votingOpenedAt?: ISODateTimeString | null;
    winnerSideId?: UUID | null;
    winnerSongId?: UUID | null;
  };
  target?: "event" | "round";
};

type EventAccessRow = {
  event_slug: string;
  id: string;
  passcode_hash: string | null;
};

const validEventStatuses = new Set<EventStatus>([
  "setup",
  "lobby",
  "live",
  "paused",
  "completed",
  "archived",
]);

const validRoundStatuses = new Set<RoundStatus>([
  "queued",
  "active",
  "playing",
  "voting_open",
  "voting_closed",
  "revealed",
  "complete",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit({
    key: getRateLimitKey(request, "host-state"),
    limit: 90,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message: `Too many host control updates. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 },
    );
  }

  let body: HostStateRequest;

  try {
    body = (await request.json()) as HostStateRequest;
  } catch {
    return NextResponse.json(
      { message: "Host state request was not valid JSON." },
      { status: 400 },
    );
  }

  const eventSlugValidation = validateEventSlug(body.eventSlug ?? "");

  if (eventSlugValidation.error) {
    return NextResponse.json(
      { message: eventSlugValidation.error },
      { status: 400 },
    );
  }

  if (!body.eventId || !uuidPattern.test(body.eventId)) {
    return NextResponse.json(
      { message: "Event id was not valid." },
      { status: 400 },
    );
  }

  if (body.target !== "event" && body.target !== "round") {
    return NextResponse.json(
      { message: "Host state target must be event or round." },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("events")
      .select("id,event_slug,passcode_hash")
      .eq("id", body.eventId)
      .eq("event_slug", eventSlugValidation.value)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { message: `Host access lookup failed: ${error.message}` },
        { status: 502 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: "No event was found for this host control update." },
        { status: 404 },
      );
    }

    const event = data as EventAccessRow;

    if (!event.passcode_hash) {
      return NextResponse.json(
        {
          message:
            "This event does not have a saved passcode hash. Host controls cannot be secured for this event.",
        },
        { status: 400 },
      );
    }

    const hostAccess = verifyEventAccessToken({
      eventId: event.id,
      eventSlug: event.event_slug,
      passcodeHash: event.passcode_hash,
      requiredRole: "host",
      token: extractBearerToken(request),
    });

    if (!hostAccess.verified) {
      return NextResponse.json(
        { message: hostAccess.error },
        { status: 401 },
      );
    }

    if (body.target === "event") {
      return updateEventState(supabase, body.eventId, body.eventPatch);
    }

    return updateRoundState(supabase, body.eventId, body.roundPatch);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Host state update failed.",
      },
      { status: 502 },
    );
  }
}

async function updateEventState(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  eventId: UUID,
  eventPatch: HostStateRequest["eventPatch"],
) {
  const patch: Partial<{
    completed_at: ISODateTimeString | null;
    current_round_number: number | null;
    started_at: ISODateTimeString | null;
    status: EventStatus;
  }> = {};

  if (!eventPatch) {
    return NextResponse.json(
      { message: "No event update was provided." },
      { status: 400 },
    );
  }

  if (eventPatch.status !== undefined) {
    if (!validEventStatuses.has(eventPatch.status)) {
      return NextResponse.json(
        { message: "Event status was not valid." },
        { status: 400 },
      );
    }

    patch.status = eventPatch.status;
  }

  if (eventPatch.currentRoundNumber !== undefined) {
    if (
      eventPatch.currentRoundNumber !== null &&
      (!Number.isInteger(eventPatch.currentRoundNumber) ||
        eventPatch.currentRoundNumber < 1 ||
        eventPatch.currentRoundNumber > 500)
    ) {
      return NextResponse.json(
        { message: "Current round number was not valid." },
        { status: 400 },
      );
    }

    patch.current_round_number = eventPatch.currentRoundNumber;
  }

  if (eventPatch.startedAt !== undefined) {
    patch.started_at = eventPatch.startedAt;
  }

  if (eventPatch.completedAt !== undefined) {
    patch.completed_at = eventPatch.completedAt;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { message: "No event fields were provided." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("events").update(patch).eq("id", eventId);

  if (error) {
    return NextResponse.json(
      { message: `Update event state failed: ${error.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "Event state updated." });
}

async function updateRoundState(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  eventId: UUID,
  roundPatch: HostStateRequest["roundPatch"],
) {
  const patch: Partial<{
    revealed_at: ISODateTimeString | null;
    side_one_vote_count: number;
    side_two_vote_count: number;
    started_at: ISODateTimeString | null;
    status: RoundStatus;
    voting_closed_at: ISODateTimeString | null;
    voting_opened_at: ISODateTimeString | null;
    winner_side_id: UUID | null;
    winner_song_id: UUID | null;
  }> = {};

  if (!roundPatch) {
    return NextResponse.json(
      { message: "No round update was provided." },
      { status: 400 },
    );
  }

  if (!roundPatch.roundId || !uuidPattern.test(roundPatch.roundId)) {
    return NextResponse.json(
      { message: "Round id was not valid." },
      { status: 400 },
    );
  }

  if (roundPatch.status !== undefined) {
    if (!validRoundStatuses.has(roundPatch.status)) {
      return NextResponse.json(
        { message: "Round status was not valid." },
        { status: 400 },
      );
    }

    patch.status = roundPatch.status;
  }

  if (roundPatch.winnerSideId !== undefined) {
    if (roundPatch.winnerSideId !== null && !uuidPattern.test(roundPatch.winnerSideId)) {
      return NextResponse.json(
        { message: "Winner side id was not valid." },
        { status: 400 },
      );
    }

    patch.winner_side_id = roundPatch.winnerSideId;
  }

  if (roundPatch.winnerSongId !== undefined) {
    if (roundPatch.winnerSongId !== null && !uuidPattern.test(roundPatch.winnerSongId)) {
      return NextResponse.json(
        { message: "Winner song id was not valid." },
        { status: 400 },
      );
    }

    patch.winner_song_id = roundPatch.winnerSongId;
  }

  if (roundPatch.sideOneVoteCount !== undefined) {
    patch.side_one_vote_count = normalizeVoteCount(roundPatch.sideOneVoteCount);
  }

  if (roundPatch.sideTwoVoteCount !== undefined) {
    patch.side_two_vote_count = normalizeVoteCount(roundPatch.sideTwoVoteCount);
  }

  if (roundPatch.startedAt !== undefined) {
    patch.started_at = roundPatch.startedAt;
  }

  if (roundPatch.votingOpenedAt !== undefined) {
    patch.voting_opened_at = roundPatch.votingOpenedAt;
  }

  if (roundPatch.votingClosedAt !== undefined) {
    patch.voting_closed_at = roundPatch.votingClosedAt;
  }

  if (roundPatch.revealedAt !== undefined) {
    patch.revealed_at = roundPatch.revealedAt;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { message: "No round fields were provided." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("rounds")
    .update(patch)
    .eq("id", roundPatch.roundId)
    .eq("event_id", eventId);

  if (error) {
    return NextResponse.json(
      { message: `Update round state failed: ${error.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "Round state updated." });
}

function normalizeVoteCount(value: number) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
