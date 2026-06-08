import type { UUID } from "@/lib/types/battle";

export type PersistedAccessRole = "guest" | "host";

export type PersistedEventAccess = {
  version: 1;
  eventId: UUID;
  role: PersistedAccessRole;
  displayName?: string;
  participantId?: UUID;
  verifiedAt: string;
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

export async function verifyEventPasscode(
  passcode: string,
  expectedPasscodeHash?: string | null,
) {
  const trimmedPasscode = passcode.trim();

  if (!trimmedPasscode) {
    return {
      error: "Enter the event passcode.",
      verified: false,
    };
  }

  if (!expectedPasscodeHash) {
    return {
      error: "This event does not have a saved passcode hash.",
      verified: false,
    };
  }

  // Temporary MVP: this compares hashes in the browser because the current app
  // uses only the publishable Supabase client. Move passcode verification to a
  // server action, Edge Function, or SECURITY DEFINER RPC before public launch.
  const passcodeHash = await hashEventPasscode(trimmedPasscode);

  if (passcodeHash !== expectedPasscodeHash) {
    return {
      error: "That passcode did not match this event.",
      verified: false,
    };
  }

  return {
    error: "",
    verified: true,
  };
}
