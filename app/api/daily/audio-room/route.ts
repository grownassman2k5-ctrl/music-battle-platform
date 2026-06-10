import { NextResponse, type NextRequest } from "next/server";
import {
  createOrRetrieveDailyAudioRoom,
  getDailyAudioConfigStatus,
  type DailyAudioRole,
} from "@/lib/daily/audio-room";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/security/rate-limit";
import {
  verifyEventAccessToken,
  type EventAccessRole,
} from "@/lib/security/server-tokens";
import { validateEventSlug } from "@/lib/security/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AudioRoomRequestBody = {
  accessToken?: string;
  displayName?: string;
  eventSlug?: string;
  role?: DailyAudioRole;
};

type AudioAccessRow = {
  id: string;
  passcode_hash: string | null;
};

export function GET() {
  return NextResponse.json({
    ...getDailyAudioConfigStatus(),
    message:
      "Daily status check reports only whether audio environment variables are present.",
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit({
    key: getRateLimitKey(request, "daily-audio"),
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        configured: true,
        message: `Too many audio room requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 },
    );
  }

  const configStatus = getDailyAudioConfigStatus();

  if (!configStatus.configured) {
    return NextResponse.json({
      configured: false,
      message:
        "In-app audio is not configured yet. Add DAILY_API_KEY, then redeploy.",
    });
  }

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

  const eventSlugValidation = validateEventSlug(body.eventSlug ?? "");
  const role = body.role;

  if (eventSlugValidation.error) {
    return NextResponse.json(
      {
        configured: false,
        message: eventSlugValidation.error,
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
    const accessResult = await verifyDailyEventAccess({
      accessToken: body.accessToken,
      eventSlug: eventSlugValidation.value,
      role,
    });

    if (!accessResult.verified) {
      return NextResponse.json(
        {
          configured: true,
          message: accessResult.error,
        },
        { status: 401 },
      );
    }

    // TODO: replace this signed passcode marker with Supabase Auth or a
    // server-side host role check before public launch.
    const audioRoom = await createOrRetrieveDailyAudioRoom({
      displayName: body.displayName?.trim() ?? "",
      eventSlug: eventSlugValidation.value,
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

async function verifyDailyEventAccess({
  accessToken,
  eventSlug,
  role,
}: {
  accessToken?: string;
  eventSlug: string;
  role: EventAccessRole;
}) {
  const { data, error } = await createSupabaseServerClient()
    .from("events")
    .select("id,passcode_hash")
    .eq("event_slug", eventSlug)
    .maybeSingle();

  if (error) {
    return {
      error: `Audio access lookup failed: ${error.message}`,
      verified: false,
    };
  }

  if (!data) {
    return {
      error: "No event was found for this audio room.",
      verified: false,
    };
  }

  const event = data as AudioAccessRow;

  if (!event.passcode_hash) {
    return {
      error: "This event does not have a saved passcode hash.",
      verified: false,
    };
  }

  return verifyEventAccessToken({
    eventId: event.id,
    eventSlug,
    passcodeHash: event.passcode_hash,
    requiredRole: role,
    token: accessToken,
  });
}
