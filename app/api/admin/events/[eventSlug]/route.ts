import { NextResponse, type NextRequest } from "next/server";
import {
  extractBearerToken,
  verifyAdminAccessToken,
} from "@/lib/security/server-tokens";
import { validateEventSlug } from "@/lib/security/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeleteEventRequest = {
  confirmationSlug?: string;
};

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/admin/events/[eventSlug]">,
) {
  const adminAccess = verifyAdminAccessToken(extractBearerToken(request));

  if (!adminAccess.verified) {
    return NextResponse.json(
      {
        message: adminAccess.error,
      },
      { status: 401 },
    );
  }

  const { eventSlug: rawEventSlug } = await context.params;
  const eventSlugValidation = validateEventSlug(rawEventSlug);

  if (eventSlugValidation.error) {
    return NextResponse.json(
      {
        message: eventSlugValidation.error,
      },
      { status: 400 },
    );
  }

  let body: DeleteEventRequest;

  try {
    body = (await request.json()) as DeleteEventRequest;
  } catch {
    return NextResponse.json(
      {
        message: "Delete request was not valid JSON.",
      },
      { status: 400 },
    );
  }

  if (body.confirmationSlug !== eventSlugValidation.value) {
    return NextResponse.json(
      {
        message: "Type the exact event slug before deleting this test event.",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: eventData, error: lookupError } = await supabase
      .from("events")
      .select("id,event_slug")
      .eq("event_slug", eventSlugValidation.value)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        {
          message: `Delete test event lookup failed: ${lookupError.message}`,
        },
        { status: 502 },
      );
    }

    if (!eventData) {
      return NextResponse.json(
        {
          message: `No event was found for "${eventSlugValidation.value}".`,
        },
        { status: 404 },
      );
    }

    // This is still using the publishable Supabase key and MVP RLS policies.
    // Protect this with Supabase Auth/service-side authorization in Phase 2.
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", (eventData as { id: string }).id)
      .eq("event_slug", eventSlugValidation.value);

    if (deleteError) {
      return NextResponse.json(
        {
          message: `Delete test event failed: ${deleteError.message}`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      eventId: (eventData as { id: string }).id,
      eventSlug: (eventData as { event_slug: string }).event_slug,
      message: "Test event deleted.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Delete test event failed.",
      },
      { status: 502 },
    );
  }
}
