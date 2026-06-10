import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminAccessToken } from "@/lib/security/server-tokens";
import { verifySupabaseAdminUser } from "@/lib/security/server-auth";
import { hashPasscode } from "@/lib/security/server-tokens";
import {
  validateEventName,
  validateEventSlug,
  validatePasscode,
} from "@/lib/security/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { BattleEvent, EventStatus, MatchupMode } from "@/lib/types/battle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminEventRow = {
  id: string;
  event_name: string;
  event_slug: string;
  passcode_hint: string | null;
  host_display_name: string | null;
  status: EventStatus;
  matchup_mode: MatchupMode;
  default_song_duration_seconds: number;
  current_round_number: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreateAdminEventRequest = {
  defaultSongDurationSeconds?: number;
  eventName?: string;
  eventSlug?: string;
  hostDisplayName?: string;
  matchupMode?: MatchupMode;
  passcode?: string;
  rounds?: Array<{
    roundNumber: number;
    sideOneDisplayOrder: 1 | 2;
    sideOneSongCsvRow: number;
    sideTwoDisplayOrder: 1 | 2;
    sideTwoSongCsvRow: number;
    themeLabel?: string | null;
  }>;
  sides?: Array<{
    artistDisplayName: string;
    displayOrder: 1 | 2;
    internalSideValue: string;
    publicDisplayName: string;
  }>;
  songs?: Array<{
    album?: string | null;
    appleMusicLink?: string | null;
    artist: string;
    csvRowNumber?: number | null;
    durationSeconds?: number | null;
    fixedOrder?: number | null;
    genre?: string | null;
    mood?: string | null;
    releaseYear?: number | null;
    sideDisplayOrder: 1 | 2;
    songTitle: string;
  }>;
};

const safeEventSelect =
  "id,event_name,event_slug,passcode_hint,host_display_name,status,matchup_mode,default_song_duration_seconds,current_round_number,started_at,completed_at,created_at,updated_at";

export async function GET(request: NextRequest) {
  const adminUser = await verifySupabaseAdminUser(request);

  if (!adminUser.verified) {
    return NextResponse.json(
      {
        message: adminUser.error,
      },
      { status: 401 },
    );
  }

  const adminAccess = verifyAdminAccessToken(
    request.headers.get("x-admin-access-token"),
  );

  if (!adminAccess.verified) {
    return NextResponse.json(
      {
        message: adminAccess.error,
      },
      { status: 401 },
    );
  }

  try {
    const { data, error } = await createSupabaseServerClient(
      adminUser.accessToken,
    )
      .from("events")
      .select(safeEventSelect)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        {
          message: `Load saved events failed: ${error.message}`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      events: (data as AdminEventRow[]).map(mapAdminBattleEvent),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Saved events could not be loaded.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await verifySupabaseAdminUser(request);

  if (!adminUser.verified) {
    return NextResponse.json(
      {
        message: adminUser.error,
      },
      { status: 401 },
    );
  }

  let body: CreateAdminEventRequest;

  try {
    body = (await request.json()) as CreateAdminEventRequest;
  } catch {
    return NextResponse.json(
      {
        message: "Create event request was not valid JSON.",
      },
      { status: 400 },
    );
  }

  const eventNameValidation = validateEventName(body.eventName ?? "");
  const eventSlugValidation = validateEventSlug(body.eventSlug ?? "");
  const passcodeValidation = validatePasscode(body.passcode ?? "");

  if (
    eventNameValidation.error ||
    eventSlugValidation.error ||
    passcodeValidation.error
  ) {
    return NextResponse.json(
      {
        message:
          eventNameValidation.error ||
          eventSlugValidation.error ||
          passcodeValidation.error,
      },
      { status: 400 },
    );
  }

  if (body.matchupMode !== "fixed" && body.matchupMode !== "randomized") {
    return NextResponse.json(
      {
        message: "Matchup mode must be fixed or randomized.",
      },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.sides) ||
    body.sides.length !== 2 ||
    !Array.isArray(body.songs) ||
    !Array.isArray(body.rounds) ||
    body.songs.length === 0 ||
    body.rounds.length === 0
  ) {
    return NextResponse.json(
      {
        message: "Event setup needs 2 sides, songs, and generated rounds.",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseServerClient(adminUser.accessToken);
    const defaultDuration =
      body.defaultSongDurationSeconds && body.defaultSongDurationSeconds > 0
        ? body.defaultSongDurationSeconds
        : 120;
    const fallbackEventInsert = {
      default_song_duration_seconds: defaultDuration,
      event_name: eventNameValidation.value,
      event_slug: eventSlugValidation.value,
      host_display_name: body.hostDisplayName ?? "Host",
      matchup_mode: body.matchupMode,
      passcode_hash: hashPasscode(passcodeValidation.value),
    };
    const eventInsert = {
      ...fallbackEventInsert,
      owner_user_id: adminUser.user.id,
    };

    const invalidSides = body.sides.filter(
      (side) =>
        !side.artistDisplayName.trim() ||
        !side.internalSideValue.trim() ||
        !side.publicDisplayName.trim() ||
        (side.displayOrder !== 1 && side.displayOrder !== 2),
    );

    if (invalidSides.length > 0) {
      return NextResponse.json(
        {
          message:
            "Each side needs an internal CSV value, public display name, artist display name, and display order.",
        },
        { status: 400 },
      );
    }

    const allowedDisplayOrders = new Set(body.sides.map((side) => side.displayOrder));
    const unmappedSong = body.songs.find(
      (song) =>
        !song.artist.trim() ||
        !song.songTitle.trim() ||
        !allowedDisplayOrders.has(song.sideDisplayOrder),
    );
    const unmappedRound = body.rounds.find(
      (round) =>
        !allowedDisplayOrders.has(round.sideOneDisplayOrder) ||
        !allowedDisplayOrders.has(round.sideTwoDisplayOrder),
    );

    if (unmappedSong || unmappedRound) {
      return NextResponse.json(
        {
          message:
            "Some songs or rounds could not be mapped to the two detected CSV sides.",
        },
        { status: 400 },
      );
    }

    const sideDisplayOrders = new Set(body.sides.map((side) => side.displayOrder));

    if (sideDisplayOrders.size !== 2) {
      return NextResponse.json(
        {
          message: "The two sides must have distinct display orders.",
        },
        { status: 400 },
      );
    }

    let eventResponse = await supabase
      .from("events")
      .insert(eventInsert)
      .select(safeEventSelect)
      .single();

    if (isMissingColumnError(eventResponse.error)) {
      eventResponse = await supabase
        .from("events")
        .insert(fallbackEventInsert)
        .select(safeEventSelect)
        .single();
    }

    if (eventResponse.error || !eventResponse.data) {
      return NextResponse.json(
        {
          message: `Create event failed: ${eventResponse.error?.message ?? "No event row returned."}`,
        },
        { status: 502 },
      );
    }

    const savedEvent = mapAdminBattleEvent(eventResponse.data as AdminEventRow);
    const sidesResponse = await supabase
      .from("event_sides")
      .insert(
        body.sides.map((side) => ({
          artist_display_name: side.artistDisplayName,
          display_order: side.displayOrder,
          event_id: savedEvent.id,
          internal_side_value: side.internalSideValue,
          public_display_name: side.publicDisplayName,
        })),
      )
      .select("id,display_order");

    if (sidesResponse.error || !sidesResponse.data) {
      return NextResponse.json(
        {
          message: `Create event sides failed: ${sidesResponse.error?.message ?? "No side rows returned."}`,
        },
        { status: 502 },
      );
    }

    const sideIdByDisplayOrder = new Map(
      (sidesResponse.data as Array<{ display_order: number; id: string }>).map(
        (side) => [side.display_order, side.id],
      ),
    );
    const songsResponse = await supabase
      .from("songs")
      .insert(
        body.songs.map((song) => ({
          album: song.album ?? null,
          apple_music_link: song.appleMusicLink ?? null,
          artist: song.artist,
          csv_row_number: song.csvRowNumber ?? null,
          duration_seconds: song.durationSeconds ?? null,
          event_id: savedEvent.id,
          fixed_order: song.fixedOrder ?? null,
          genre: song.genre ?? null,
          mood: song.mood ?? null,
          release_year: song.releaseYear ?? null,
          side_id: sideIdByDisplayOrder.get(song.sideDisplayOrder),
          song_title: song.songTitle,
        })),
      )
      .select("id,csv_row_number");

    if (songsResponse.error || !songsResponse.data) {
      return NextResponse.json(
        {
          message: `Save imported songs failed: ${songsResponse.error?.message ?? "No song rows returned."}`,
        },
        { status: 502 },
      );
    }

    const songIdByCsvRow = new Map(
      (songsResponse.data as Array<{ csv_row_number: number | null; id: string }>).map(
        (song) => [song.csv_row_number, song.id],
      ),
    );
    const roundsResponse = await supabase
      .from("rounds")
      .insert(
        body.rounds.map((round) => ({
          event_id: savedEvent.id,
          round_number: round.roundNumber,
          side_one_id: sideIdByDisplayOrder.get(round.sideOneDisplayOrder),
          side_one_song_id: songIdByCsvRow.get(round.sideOneSongCsvRow),
          side_two_id: sideIdByDisplayOrder.get(round.sideTwoDisplayOrder),
          side_two_song_id: songIdByCsvRow.get(round.sideTwoSongCsvRow),
          theme_label: round.themeLabel ?? null,
        })),
      )
      .select("id");

    if (roundsResponse.error || !roundsResponse.data) {
      return NextResponse.json(
        {
          message: `Save generated rounds failed: ${roundsResponse.error?.message ?? "No round rows returned."}`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      event: savedEvent,
      message: "Event saved to Supabase.",
      roundCount: roundsResponse.data.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Event could not be saved.",
      },
      { status: 502 },
    );
  }
}

function mapAdminBattleEvent(row: AdminEventRow): BattleEvent {
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    currentRound: row.current_round_number,
    currentRoundNumber: row.current_round_number,
    defaultSongDurationSeconds: row.default_song_duration_seconds,
    eventName: row.event_name,
    eventSlug: row.event_slug,
    hostDisplayName: row.host_display_name,
    id: row.id,
    matchupMode: row.matchup_mode,
    passcodeHint: row.passcode_hint,
    startedAt: row.started_at,
    status: row.status,
    timerSeconds: row.default_song_duration_seconds,
    title: row.event_name,
    updatedAt: row.updated_at,
  };
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message?.toLowerCase() ?? "";

  return (
    candidate.code === "42703" ||
    candidate.code === "PGRST204" ||
    message.includes("owner_user_id")
  );
}
