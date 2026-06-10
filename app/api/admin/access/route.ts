import { NextResponse, type NextRequest } from "next/server";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/security/rate-limit";
import {
  createAdminAccessToken,
  getAdminAccessConfigured,
  timingSafeStringEqual,
} from "@/lib/security/server-tokens";
import { validateAdminCode } from "@/lib/security/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminAccessRequest = {
  adminCode?: string;
};

export function GET() {
  return NextResponse.json({
    configured: getAdminAccessConfigured(),
    message:
      "Admin access status only reports whether ADMIN_ACCESS_CODE is configured.",
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit({
    key: getRateLimitKey(request, "admin-access"),
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message: `Too many admin access attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        verified: false,
      },
      { status: 429 },
    );
  }

  if (!getAdminAccessConfigured()) {
    return NextResponse.json(
      {
        message: "Admin access is not configured. Add ADMIN_ACCESS_CODE.",
        verified: false,
      },
      { status: 503 },
    );
  }

  let body: AdminAccessRequest;

  try {
    body = (await request.json()) as AdminAccessRequest;
  } catch {
    return NextResponse.json(
      {
        message: "Admin access request was not valid JSON.",
        verified: false,
      },
      { status: 400 },
    );
  }

  const validation = validateAdminCode(body.adminCode ?? "");

  if (validation.error) {
    return NextResponse.json(
      {
        message: validation.error,
        verified: false,
      },
      { status: 400 },
    );
  }

  const expectedCode = process.env.ADMIN_ACCESS_CODE?.trim() ?? "";

  if (!timingSafeStringEqual(validation.value, expectedCode)) {
    return NextResponse.json(
      {
        message: "That admin code did not match.",
        verified: false,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    message: "Admin access verified.",
    token: createAdminAccessToken(),
    verified: true,
  });
}
