import type { UUID } from "@/lib/types/battle";

export type PersistedAccessRole = "guest" | "host";

export type PersistedEventAccess = {
  version: 1;
  accessToken?: string;
  eventId: UUID;
  role: PersistedAccessRole;
  displayName?: string;
  participantId?: UUID;
  verifiedAt: string;
};

type VerifyPersistedEventAccessInput = {
  displayName?: string;
  eventSlug: string;
  passcode: string;
  role: PersistedAccessRole;
};

type VerifyPersistedEventAccessResult =
  | {
      accessToken: string;
      error: "";
      eventId: string;
      verified: true;
    }
  | {
      accessToken: "";
      error: string;
      eventId: "";
      verified: false;
    };

function getEventAccessStorageKey(eventId: UUID, role: PersistedAccessRole) {
  return `music-battle-platform.access.${eventId}.${role}.v1`;
}

export function readPersistedEventAccess(
  eventId: UUID,
  role: PersistedAccessRole,
) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(
    getEventAccessStorageKey(eventId, role),
  );

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedEventAccess>;

    if (
      parsed.version !== 1 ||
      parsed.eventId !== eventId ||
      parsed.role !== role ||
      typeof parsed.verifiedAt !== "string"
    ) {
      return null;
    }

    return parsed as PersistedEventAccess;
  } catch {
    return null;
  }
}

export function savePersistedEventAccess(
  access: Omit<PersistedEventAccess, "verifiedAt" | "version">,
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextAccess: PersistedEventAccess = {
    ...access,
    verifiedAt: new Date().toISOString(),
    version: 1,
  };

  window.localStorage.setItem(
    getEventAccessStorageKey(access.eventId, access.role),
    JSON.stringify(nextAccess),
  );
}

export function clearPersistedEventAccess(
  eventId: UUID,
  role: PersistedAccessRole,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getEventAccessStorageKey(eventId, role));
}

export async function verifyPersistedEventAccess({
  displayName,
  eventSlug,
  passcode,
  role,
}: VerifyPersistedEventAccessInput): Promise<VerifyPersistedEventAccessResult> {
  const response = await fetch("/api/event-access/verify", {
    body: JSON.stringify({
      displayName,
      eventSlug,
      passcode,
      role,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as Partial<{
    accessToken: string;
    eventId: string;
    message: string;
    verified: boolean;
  }>;

  if (!response.ok || !payload.verified || !payload.accessToken) {
    return {
      accessToken: "",
      error: payload.message ?? "Event access could not be verified.",
      eventId: "",
      verified: false,
    };
  }

  return {
    accessToken: payload.accessToken,
    error: "",
    eventId: payload.eventId ?? "",
    verified: true,
  };
}

export async function hashEventPasscode(passcode: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Browser crypto is unavailable for passcode hashing.");
  }

  const encodedPasscode = new TextEncoder().encode(passcode);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    encodedPasscode,
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
