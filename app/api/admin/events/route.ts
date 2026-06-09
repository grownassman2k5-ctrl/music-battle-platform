import { NextResponse, type NextRequest } from "next/server";
import {
  extractBearerToken,
  verifyAdminAccessToken,
} from "@/lib/security/server-tokens";
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

const safeEventSelect =
  "id,event_name,event_slug,passcode_hint,host_display_name,status,matchup_mode,default_song_duration_seconds,current_round_number,started_at,completed_at,created_at,updated_at";

export async function GET(request: NextRequest) {
  const adminAccess = verifyAdminAccessToken(extractBearerToken(request));

  if (!adminAccess.verified) {
    return NextResponse.json(
      {
        message: adminAccess.error,
      },
      { status: 401 },
    );
  }

  try {
    const { data, error } = await createSupabaseServerClient()
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
