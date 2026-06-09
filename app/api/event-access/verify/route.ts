import { NextResponse, type NextRequest } from "next/server";
import {
  createEventAccessToken,
  hashPasscode,
  timingSafeStringEqual,
  type EventAccessRole,
} from "@/lib/security/server-tokens";
import {
  validateDisplayName,
  validateEventSlug,
  validatePasscode,
} from "@/lib/security/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EventAccessRequest = {
  displayName?: string;
  eventSlug?: string;
  passcode?: string;
  role?: EventAccessRole;
};

type EventAccessRow = {
  event_name: string;
  event_slug: string;
  id: string;
  passcode_hash: string | null;
};

export async function POST(request: NextRequest) {
  let body: EventAccessRequest;

  try {
    body = (await request.json()) as EventAccessRequest;
  } catch {
    return NextResponse.json(
      {
        message: "Event access request was not valid JSON.",
        verified: false,
      },
      { status: 400 },
    );
  }

  const role = body.role;

  if (role !== "host" && role !== "guest") {
    return NextResponse.json(
      {
        message: "Event access role must be host or guest.",
        verified: false,
      },
      { status: 400 },
    );
  }

  const slugValidation = validateEventSlug(body.eventSlug ?? "");
  const passcodeValidation = validatePasscode(body.passcode ?? "");

  if (slugValidation.error || passcodeValidation.error) {
    return NextResponse.json(
      {
        message: slugValidation.error || passcodeValidation.error,
        verified: false,
      },
      { status: 400 },
    );
  }

  if (role === "guest") {
    const displayNameValidation = validateDisplayName(body.displayName ?? "");

    if (displayNameValidation.error) {
      return NextResponse.json(
        {
          message: displayNameValidation.error,
          verified: false,
        },
        { status: 400 },
      );
    }
  }

  try {
    const { data, error } = await createSupabaseServerClient()
      .from("events")
      .select("id,event_name,event_slug,passcode_hash")
      .eq("event_slug", slugValidation.value)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          message: `Event access lookup failed: ${error.message}`,
          verified: false,
        },
        { status: 502 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          message: "No event was found for that link.",
          verified: false,
        },
        { status: 404 },
      );
    }

    const event = data as EventAccessRow;

    if (!event.passcode_hash) {
      return NextResponse.json(
        {
          message:
            "This event does not have a saved passcode hash. Ask the host to recreate or resave the event.",
          verified: false,
        },
        { status: 400 },
      );
    }

    const enteredPasscodeHash = hashPasscode(passcodeValidation.value);

    if (!timingSafeStringEqual(enteredPasscodeHash, event.passcode_hash)) {
      return NextResponse.json(
        {
          message:
            "That passcode did not match this event. Check the code and try again.",
          verified: false,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      accessToken: createEventAccessToken({
        eventId: event.id,
        eventSlug: event.event_slug,
        passcodeHash: event.passcode_hash,
        role,
      }),
      eventId: event.id,
      eventName: event.event_name,
      message: `${role === "host" ? "Host" : "Guest"} access verified.`,
      role,
      verified: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Event access failed.",
        verified: false,
      },
      { status: 502 },
    );
  }
}
