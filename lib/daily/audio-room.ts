export type DailyAudioRole = "host" | "guest";

export type DailyAudioRoomPayload = {
  configured: boolean;
  message: string;
  roomName?: string;
  roomUrl?: string;
  token?: string;
  expiresAt?: number;
};

type DailyRoom = {
  name: string;
  url: string;
};

type DailyTokenResponse = {
  token: string;
};

const DAILY_API_BASE = "https://api.daily.co/v1";
const ROOM_DURATION_SECONDS = 60 * 60 * 6;
const TOKEN_DURATION_SECONDS = 60 * 60 * 4;

export function getDailyRoomName(eventSlug: string) {
  const safeSlug =
    eventSlug
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "")
      .slice(0, 96) || "event";

  return `music-battle-${safeSlug}`.slice(0, 128);
}

export function getDailyAudioConfigStatus() {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;

  return {
    configured: Boolean(apiKey),
    hasApiKey: Boolean(apiKey),
    hasDomain: Boolean(domain),
  };
}

export async function createOrRetrieveDailyAudioRoom({
  displayName,
  eventSlug,
  role,
}: {
  displayName: string;
  eventSlug: string;
  role: DailyAudioRole;
}): Promise<DailyAudioRoomPayload> {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = normalizeDailyDomain(process.env.NEXT_PUBLIC_DAILY_DOMAIN);

  if (!apiKey) {
    return {
      configured: false,
      message:
        "In-app audio is not configured yet. Add DAILY_API_KEY, then redeploy.",
    };
  }

  const roomName = getDailyRoomName(eventSlug);
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_DURATION_SECONDS;
  const room =
    (await fetchDailyRoom(roomName, apiKey)) ??
    (await createDailyRoom(roomName, apiKey));
  const token = await createDailyMeetingToken({
    apiKey,
    displayName,
    expiresAt,
    role,
    roomName,
  });
  const roomUrl = room.url || (domain ? `${domain}/${roomName}` : "");

  if (!roomUrl) {
    throw new Error(
      "Daily room was created, but no room URL was returned. Check the Daily dashboard room settings.",
    );
  }

  return {
    configured: true,
    expiresAt,
    message:
      role === "host"
        ? "Daily audio room is ready for host sharing."
        : "Daily audio room is ready for listening.",
    roomName: room.name,
    roomUrl,
    token,
  };
}

function normalizeDailyDomain(value: string | undefined) {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim().replace(/\/+$/g, "");

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("https://")) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("http://")) {
    return trimmedValue.replace("http://", "https://");
  }

  return `https://${trimmedValue}`;
}

async function fetchDailyRoom(roomName: string, apiKey: string) {
  const response = await dailyFetch<DailyRoom>(`/rooms/${roomName}`, apiKey, {
    method: "GET",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok || !response.data) {
    throw new Error(
      response.message || "Daily room lookup failed. Check your Daily settings.",
    );
  }

  return response.data;
}

async function createDailyRoom(roomName: string, apiKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const response = await dailyFetch<DailyRoom>("/rooms", apiKey, {
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        enable_chat: false,
        enable_screenshare: true,
        exp: now + ROOM_DURATION_SECONDS,
        start_audio_off: true,
        start_video_off: true,
      },
    }),
    method: "POST",
  });

  if (!response.ok || !response.data) {
    throw new Error(
      response.message || "Daily room creation failed. Check your API key.",
    );
  }

  return response.data;
}

async function createDailyMeetingToken({
  apiKey,
  displayName,
  expiresAt,
  role,
  roomName,
}: {
  apiKey: string;
  displayName: string;
  expiresAt: number;
  role: DailyAudioRole;
  roomName: string;
}) {
  const response = await dailyFetch<DailyTokenResponse>("/meeting-tokens", apiKey, {
    body: JSON.stringify({
      properties: {
        eject_at_token_exp: true,
        enable_screenshare: role === "host",
        exp: expiresAt,
        is_owner: role === "host",
        permissions:
          role === "host"
            ? {
                canAdmin: ["participants"],
                canSend: ["screenVideo", "screenAudio"],
                hasPresence: true,
              }
            : {
                canAdmin: false,
                canSend: false,
                hasPresence: true,
              },
        room_name: roomName,
        start_audio_off: true,
        start_video_off: true,
        user_name: displayName || (role === "host" ? "Host" : "Guest"),
      },
    }),
    method: "POST",
  });

  if (!response.ok || !response.data?.token) {
    throw new Error(
      response.message || "Daily meeting token creation failed.",
    );
  }

  return response.data.token;
}

async function dailyFetch<T>(
  path: string,
  apiKey: string,
  init: RequestInit,
): Promise<{
  data: T | null;
  message: string;
  ok: boolean;
  status: number;
}> {
  let response: Response;

  try {
    response = await fetch(`${DAILY_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    return {
      data: null,
      message:
        "Daily did not respond. Check the API key, Daily settings, and network access.",
      ok: false,
      status: 0,
    };
  }

  const text = await response.text();
  const parsed = parseDailyJson<T>(text);

  return {
    data: parsed.data,
    message: parsed.message,
    ok: response.ok,
    status: response.status,
  };
}

function parseDailyJson<T>(text: string): { data: T | null; message: string } {
  if (!text) {
    return { data: null, message: "" };
  }

  try {
    const parsed = JSON.parse(text) as T & {
      error?: string;
      info?: string;
      message?: string;
    };

    return {
      data: parsed,
      message: parsed.error ?? parsed.info ?? parsed.message ?? "",
    };
  } catch {
    return {
      data: null,
      message: text,
    };
  }
}
