import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type EventAccessRole = "guest" | "host";

type SignedAccessPayload =
  | {
      exp: number;
      scope: "admin";
    }
  | {
      eventId: string;
      eventSlug: string;
      exp: number;
      participantId?: string | null;
      role: EventAccessRole;
      scope: "event";
    };

const tokenPrefix = "mbp1";
const adminTokenMaxAgeSeconds = 60 * 60 * 12;
const eventTokenMaxAgeSeconds = 60 * 60 * 12;

export function hashPasscode(passcode: string) {
  return createHash("sha256").update(passcode).digest("hex");
}

export function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminAccessConfigured() {
  return Boolean(process.env.ADMIN_ACCESS_CODE?.trim());
}

export function createAdminAccessToken() {
  const adminCode = getAdminAccessCode();

  return signAccessPayload(
    {
      exp: getExpiration(adminTokenMaxAgeSeconds),
      scope: "admin",
    },
    adminCode,
  );
}

export function verifyAdminAccessToken(token: string | null | undefined) {
  const adminCode = process.env.ADMIN_ACCESS_CODE?.trim();

  if (!adminCode) {
    return {
      error: "Admin access is not configured. Add ADMIN_ACCESS_CODE.",
      verified: false,
    };
  }

  const result = verifySignedAccessPayload(token, adminCode);

  if (!result.verified || !result.payload || result.payload.scope !== "admin") {
    return {
      error: result.error || "Admin access expired or was not valid.",
      verified: false,
    };
  }

  return {
    error: "",
    verified: true,
  };
}

export function createEventAccessToken({
  eventId,
  eventSlug,
  participantId,
  passcodeHash,
  role,
}: {
  eventId: string;
  eventSlug: string;
  participantId?: string | null;
  passcodeHash: string;
  role: EventAccessRole;
}) {
  return signAccessPayload(
    {
      eventId,
      eventSlug,
      exp: getExpiration(eventTokenMaxAgeSeconds),
      participantId: participantId ?? null,
      role,
      scope: "event",
    },
    passcodeHash,
  );
}

export function verifyEventAccessToken({
  eventId,
  eventSlug,
  passcodeHash,
  requiredRole,
  token,
}: {
  eventId: string;
  eventSlug: string;
  passcodeHash: string;
  requiredRole: EventAccessRole;
  token: string | null | undefined;
}) {
  const result = verifySignedAccessPayload(token, passcodeHash);

  if (!result.verified || !result.payload || result.payload.scope !== "event") {
    return {
      error: result.error || "Event access expired or was not valid.",
      verified: false,
    };
  }

  if (
    result.payload.eventId !== eventId ||
    result.payload.eventSlug !== eventSlug ||
    result.payload.role !== requiredRole
  ) {
    return {
      error: "This access marker does not match the requested event.",
      verified: false,
    };
  }

  return {
    error: "",
    payload: result.payload,
    verified: true,
  };
}

export function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice("bearer ".length).trim();
}

function getAdminAccessCode() {
  const adminCode = process.env.ADMIN_ACCESS_CODE?.trim();

  if (!adminCode) {
    throw new Error("ADMIN_ACCESS_CODE is not configured.");
  }

  return adminCode;
}

function getExpiration(maxAgeSeconds: number) {
  return Math.floor(Date.now() / 1000) + maxAgeSeconds;
}

function signAccessPayload(payload: SignedAccessPayload, secret: string) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${tokenPrefix}.${encodedPayload}`;
  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

function verifySignedAccessPayload(
  token: string | null | undefined,
  secret: string,
):
  | {
      error: string;
      payload: null;
      verified: false;
    }
  | {
      error: "";
      payload: SignedAccessPayload;
      verified: true;
    } {
  if (!token) {
    return {
      error: "Access marker is missing.",
      payload: null,
      verified: false,
    };
  }

  const parts = token.split(".");

  if (parts.length !== 3 || parts[0] !== tokenPrefix) {
    return {
      error: "Access marker format was not valid.",
      payload: null,
      verified: false,
    };
  }

  const signingInput = `${parts[0]}.${parts[1]}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  if (!timingSafeStringEqual(parts[2], expectedSignature)) {
    return {
      error: "Access marker signature was not valid.",
      payload: null,
      verified: false,
    };
  }

  let payload: SignedAccessPayload;

  try {
    payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as SignedAccessPayload;
  } catch {
    return {
      error: "Access marker payload was not valid.",
      payload: null,
      verified: false,
    };
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return {
      error: "Access marker has expired.",
      payload: null,
      verified: false,
    };
  }

  return {
    error: "",
    payload,
    verified: true,
  };
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}
