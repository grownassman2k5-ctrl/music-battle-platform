import { NextResponse, type NextRequest } from "next/server";
import {
  createOrRetrieveDailyAudioRoom,
  getDailyAudioConfigStatus,
  type DailyAudioRole,
} from "@/lib/daily/audio-room";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AudioRoomRequestBody = {
  displayName?: string;
  eventSlug?: string;
  role?: DailyAudioRole;
};

export function GET() {
  return NextResponse.json({
    ...getDailyAudioConfigStatus(),
    message:
      "Daily status check reports only whether audio environment variables are present.",
  });
}

export async function POST(request: NextRequest) {
  let body: AudioRoomRequestBody;

  try {
    body = (await request.json()) as AudioRoomRequestBody;
  } catch {
    return NextResponse.json(
      {
        configured: false,
        message: "Audio room request was not valid JSON.",
      },
      { status: 400 },
    );
  }

  const eventSlug = body.eventSlug?.trim();
  const role = body.role;

  if (!eventSlug) {
    return NextResponse.json(
      {
        configured: false,
        message: "Missing event slug for the audio room.",
      },
      { status: 400 },
    );
  }

  if (role !== "host" && role !== "guest") {
    return NextResponse.json(
      {
        configured: false,
        message: "Audio room role must be host or guest.",
      },
      { status: 400 },
    );
  }

  try {
    // TODO: protect host token creation with Supabase Auth or a server-side host
    // access check before public launch. This private MVP relies on route access.
    const audioRoom = await createOrRetrieveDailyAudioRoom({
      displayName: body.displayName?.trim() ?? "",
      eventSlug,
      role,
    });

    return NextResponse.json(audioRoom);
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        message:
          error instanceof Error
            ? error.message
            : "Daily audio room could not be prepared.",
      },
      { status: 502 },
    );
  }
}
