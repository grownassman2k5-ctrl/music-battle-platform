"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import {
  CopyLinkButton,
  CopyTextButton,
} from "@/components/prototype/copy-link-button";
import { MockButton, Panel, Pill, PreviewLink } from "@/components/prototype/ui";
import {
  clearStoredAdminAccessToken,
  readStoredAdminAccessToken,
  saveStoredAdminAccessToken,
} from "@/lib/admin-access";
import type { BattleEvent } from "@/lib/types/battle";

type AdminLoadState =
  | {
      error: "";
      events: BattleEvent[];
      status: "loading" | "ready";
    }
  | {
      error: string;
      events: BattleEvent[];
      status: "error";
    };

type AdminNotice =
  | {
      message: string;
      status: "success";
    }
  | {
      message: string;
      status: "error";
    }
  | null;

type DeleteActionState =
  | {
      message: string;
      status: "idle";
    }
  | {
      message: string;
      status: "deleting";
    }
  | {
      message: string;
      status: "error";
    };

type AdminAccessState = {
  message: string;
  status: "checking" | "locked" | "verified";
  token: string;
};

type AdminAccessAttemptState =
  | {
      message: string;
      status: "idle";
    }
  | {
      message: string;
      status: "checking";
    }
  | {
      message: string;
      status: "verified";
    }
  | {
      message: string;
      status: "error";
    };

const liveTestItems = [
  "host access",
  "guest passcode",
  "audio fallback",
  "voting",
  "realtime vote totals",
  "chat",
  "moderation",
  "results page",
  "mobile layout",
];

export function EventAdminPage() {
  const [adminAccess, setAdminAccess] = useState<AdminAccessState>({
    message: "Checking saved admin access...",
    status: "checking",
    token: "",
  });
  const [adminAccessAttempt, setAdminAccessAttempt] =
    useState<AdminAccessAttemptState>({
      message: "",
      status: "idle",
    });
  const [loadState, setLoadState] = useState<AdminLoadState>({
    error: "",
    events: [],
    status: "ready",
  });
  const [adminNotice, setAdminNotice] = useState<AdminNotice>(null);

  const loadEvents = useCallback(async (adminToken: string) => {
    if (!adminToken) {
      setLoadState({
        error: "Unlock admin access before loading saved events.",
        events: [],
        status: "error",
      });
      return;
    }

    setLoadState((currentState) => ({
      error: "",
      events: currentState.events,
      status: "loading",
    }));

    try {
      const response = await withAdminTimeout(
        fetch("/api/admin/events", {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
        9000,
      );
      const payload = (await response.json()) as Partial<{
        events: BattleEvent[];
        message: string;
      }>;

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAdminAccessToken();
          setAdminAccess({
            message: "Admin access expired. Enter the admin code again.",
            status: "locked",
            token: "",
          });
        }

        setLoadState({
          error: getFriendlyAdminError(
            payload.message ?? "Saved events could not be loaded.",
          ),
          events: [],
          status: "error",
        });
        return;
      }

      setLoadState({
        error: "",
        events: payload.events ?? [],
        status: "ready",
      });
    } catch {
      setLoadState({
        error: getFriendlyAdminError("Supabase request timed out."),
        events: [],
        status: "error",
      });
      return;
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let loadTimer: number | null = null;

    Promise.resolve().then(() => {
      const adminToken = readStoredAdminAccessToken();

      if (!isActive) {
        return;
      }

      if (!adminToken) {
        setAdminAccess({
          message: "Enter the admin access code to manage saved events.",
          status: "locked",
          token: "",
        });
        return;
      }

      setAdminAccess({
        message: "Admin access is verified on this browser.",
        status: "verified",
        token: adminToken,
      });

      loadTimer = window.setTimeout(() => {
        void loadEvents(adminToken);
      }, 0);
    });

    return () => {
      isActive = false;

      if (loadTimer) {
        window.clearTimeout(loadTimer);
      }
    };
  }, [loadEvents]);

  async function verifyAdminAccess(adminCode: string) {
    setAdminAccessAttempt({
      message: "Checking admin access code...",
      status: "checking",
    });

    try {
      const response = await fetch("/api/admin/access", {
        body: JSON.stringify({ adminCode }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as Partial<{
        message: string;
        token: string;
        verified: boolean;
      }>;

      if (!response.ok || !payload.verified || !payload.token) {
        setAdminAccessAttempt({
          message: payload.message ?? "Admin access could not be verified.",
          status: "error",
        });
        return;
      }

      saveStoredAdminAccessToken(payload.token);
      setAdminAccess({
        message: "Admin access verified on this browser.",
        status: "verified",
        token: payload.token,
      });
      setAdminAccessAttempt({
        message: "Admin access verified.",
        status: "verified",
      });
      await loadEvents(payload.token);
    } catch {
      setAdminAccessAttempt({
        message: "Admin access check failed. Try again.",
        status: "error",
      });
    }
  }

  function clearAdminAccess() {
    clearStoredAdminAccessToken();
    setAdminAccess({
      message: "Admin access cleared. Enter the code again.",
      status: "locked",
      token: "",
    });
    setLoadState({
      error: "",
      events: [],
      status: "ready",
    });
  }

  if (adminAccess.status !== "verified") {
    return (
      <AdminAccessGate
        accessState={adminAccess}
        attemptState={adminAccessAttempt}
        onSubmit={(adminCode) => void verifyAdminAccess(adminCode)}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="border-b border-white/10 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                className="text-sm font-semibold text-zinc-400 transition hover:text-white"
                href="/"
              >
                Back to landing
              </Link>
              <p className="mt-4 text-sm font-semibold uppercase text-[#43d9cf]">
                Organizer
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                Event admin dashboard
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <MockButton onClick={clearAdminAccess} tone="danger">
                Clear Admin Access
              </MockButton>
              <PreviewLink href="/host/setup" tone="primary">
                Host Setup
              </PreviewLink>
              <PreviewLink href="/debug/deployment" tone="ghost">
                Debug Deployment
              </PreviewLink>
            </div>
          </div>
        </header>

        <section className="grid gap-5 py-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Saved events
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {loadState.status === "loading"
                      ? "Loading Supabase events"
                      : `${loadState.events.length} events found`}
                  </h2>
                </div>
                <MockButton
                  disabled={loadState.status === "loading"}
                  onClick={() => void loadEvents(adminAccess.token)}
                  tone="ghost"
                >
                  {loadState.status === "loading" ? "Refreshing..." : "Refresh Events"}
                </MockButton>
              </div>

              {loadState.status === "error" ? (
                <p className="mt-5 rounded-lg border border-[#ff6b8a]/30 bg-[#ff6b8a]/10 p-4 text-sm font-semibold text-[#ffe2e8]">
                  {loadState.error}
                </p>
              ) : null}

              {adminNotice ? (
                <p
                  className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${
                    adminNotice.status === "success"
                      ? "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]"
                      : "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
                  }`}
                >
                  {adminNotice.message}
                </p>
              ) : null}

              <div className="mt-5 grid gap-4">
                {loadState.events.map((event) => (
                  <AdminEventCard
                    adminAccessToken={adminAccess.token}
                    event={event}
                    key={event.id}
                    onDeleted={(deletedEvent) => {
                      setAdminNotice({
                        message: `${deletedEvent.eventName} was deleted. Refreshing saved events...`,
                        status: "success",
                      });
                      void loadEvents(adminAccess.token);
                    }}
                  />
                ))}
              </div>

              {loadState.status !== "loading" && loadState.events.length === 0 ? (
                <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">
                    No saved events yet.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Use Host Setup to upload a CSV and save a battle to
                    Supabase. It will appear here after saving.
                  </p>
                </div>
              ) : null}
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel className="p-4">
              <Pill tone="rose">MVP warning</Pill>
              <h2 className="mt-4 text-xl font-bold text-white">
                Admin uses temporary access
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                This dashboard now requires `ADMIN_ACCESS_CODE`, but it still
                uses temporary MVP Supabase policies. Keep it private for
                testing. Protect this route with Supabase Auth before
                production.
              </p>
            </Panel>

            <Panel className="p-4">
              <Pill tone="cyan">Daily optional</Pill>
              <h2 className="mt-4 text-xl font-bold text-white">
                In-app audio needs Daily
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Add `DAILY_API_KEY` in Vercel to turn on managed browser
                audio. External Zoom, Discord, Meet, or speaker audio remains
                the fallback.
              </p>
            </Panel>

            <Panel className="p-4">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Live test checklist
              </p>
              <div className="mt-4 grid gap-2">
                {liveTestItems.map((item, index) => (
                  <div
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/10 p-3"
                    key={item}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#f7c948]/40 bg-[#f7c948]/10 text-sm font-black text-[#ffe7a3]">
                      {index + 1}
                    </span>
                    <span className="self-center text-sm font-semibold capitalize text-zinc-300">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AdminAccessGate({
  accessState,
  attemptState,
  onSubmit,
}: {
  accessState: AdminAccessState;
  attemptState: AdminAccessAttemptState;
  onSubmit: (adminCode: string) => void;
}) {
  const [adminCode, setAdminCode] = useState("");
  const isChecking =
    accessState.status === "checking" || attemptState.status === "checking";

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-10 sm:px-8">
        <Panel className="w-full p-6">
          <Link
            className="text-sm font-semibold text-zinc-400 transition hover:text-white"
            href="/"
          >
            Back to landing
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-[#43d9cf]">
                Organizer access
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">
                Unlock event admin
              </h1>
            </div>
            <Pill tone={isChecking ? "gold" : "rose"}>Admin code</Pill>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            {accessState.message} This private beta gate uses the server-only
            `ADMIN_ACCESS_CODE`. It should be replaced with Supabase Auth before
            public launch.
          </p>

          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(adminCode);
            }}
          >
            <label>
              <span className="text-sm font-semibold text-zinc-200">
                Admin access code
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#43d9cf]/70"
                disabled={isChecking}
                onChange={(event) => setAdminCode(event.target.value)}
                placeholder="Enter admin code"
                type="password"
                value={adminCode}
              />
            </label>
            <MockButton
              disabled={isChecking}
              onClick={() => onSubmit(adminCode)}
              tone="primary"
            >
              {isChecking ? "Checking..." : "Unlock Admin Dashboard"}
            </MockButton>
          </form>

          {attemptState.message ? (
            <p
              className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${
                attemptState.status === "error"
                  ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
                  : "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]"
              }`}
            >
              {attemptState.message}
            </p>
          ) : null}
        </Panel>
      </div>
    </main>
  );
}

function AdminEventCard({
  adminAccessToken,
  event,
  onDeleted,
}: {
  adminAccessToken: string;
  event: BattleEvent;
  onDeleted: (event: BattleEvent) => void;
}) {
  const hostPath = `/host/${event.eventSlug}`;
  const guestPath = `/event/${event.eventSlug}`;
  const resultsPath = `/results/${event.eventSlug}`;
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [deleteActionState, setDeleteActionState] =
    useState<DeleteActionState>({
      message: "",
      status: "idle",
    });
  const confirmationMatches = confirmationSlug === event.eventSlug;
  const isDeleting = deleteActionState.status === "deleting";

  async function deleteEvent() {
    if (!confirmationMatches) {
      setDeleteActionState({
        message: "Type the exact event slug before deleting this test event.",
        status: "error",
      });
      return;
    }

    setDeleteActionState({
      message: "Deleting test event from Supabase...",
      status: "deleting",
    });

    const response = await fetch(
      `/api/admin/events/${encodeURIComponent(event.eventSlug)}`,
      {
        body: JSON.stringify({
          confirmationSlug,
        }),
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          "Content-Type": "application/json",
        },
        method: "DELETE",
      },
    );
    const payload = (await response.json()) as Partial<{ message: string }>;

    if (!response.ok) {
      setDeleteActionState({
        message: getFriendlyAdminError(
          payload.message ?? "Delete test event failed.",
        ),
        status: "error",
      });
      return;
    }

    onDeleted(event);
  }

  return (
    <article className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Pill tone={getEventStatusTone(event.status)}>{event.status}</Pill>
            <Pill tone="neutral">{event.matchupMode}</Pill>
          </div>
          <h3 className="mt-4 break-words text-2xl font-black text-white">
            {event.eventName}
          </h3>
          <p className="mt-2 break-words font-mono text-sm text-[#cbfffb]">
            {event.eventSlug}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
          <PreviewLink className="w-full" href={hostPath} tone="primary">
            Host
          </PreviewLink>
          <PreviewLink className="w-full" href={guestPath} tone="ghost">
            Guest
          </PreviewLink>
          <PreviewLink className="w-full" href={resultsPath} tone="ghost">
            Results
          </PreviewLink>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminFact label="Default duration" value={`${event.timerSeconds}s`} />
        <AdminFact
          label="Current round"
          value={event.currentRoundNumber ? String(event.currentRoundNumber) : "Not started"}
        />
        <AdminFact label="Created" value={formatEventDate(event.createdAt)} />
        <AdminFact label="Mode" value={event.matchupMode} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CopyLinkButton label="Copy Host Link" path={hostPath} />
        <CopyLinkButton label="Copy Guest Link" path={guestPath} />
        <CopyLinkButton label="Copy Results Link" path={resultsPath} />
        <CopyTextButton
          label="Copy Guest Invitation"
          text={() => buildGuestInvitation(event, guestPath)}
        />
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-zinc-500">
              Test cleanup
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Use only for events you are done testing.
            </p>
          </div>
          <MockButton
            className="w-full sm:w-auto"
            disabled={isDeleting}
            onClick={() => {
              setDeletePanelOpen((isOpen) => !isOpen);
              setDeleteActionState({
                message: "",
                status: "idle",
              });
            }}
            tone="danger"
          >
            Delete Test Event
          </MockButton>
        </div>

        {deletePanelOpen ? (
          <div className="mt-4 rounded-lg border border-[#ff6b8a]/30 bg-[#ff6b8a]/10 p-4">
            <Pill tone="rose">Permanent delete</Pill>
            <h4 className="mt-4 text-lg font-black text-white">
              Type the event slug to confirm
            </h4>
            <p className="mt-2 text-sm leading-6 text-[#ffe2e8]">
              This permanently removes the event, songs, rounds, votes,
              participants, chat messages, and moderation records. It cannot be
              undone.
            </p>
            <p className="mt-3 break-words font-mono text-sm font-bold text-white">
              {event.eventSlug}
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-zinc-200">
                Confirm event slug
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-[#ff6b8a]/30 bg-black/30 px-4 font-mono text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#ff6b8a]/70"
                disabled={isDeleting}
                onChange={(inputEvent) =>
                  setConfirmationSlug(inputEvent.target.value)
                }
                placeholder={event.eventSlug}
                type="text"
                value={confirmationSlug}
              />
            </label>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-xs leading-5 text-[#ffe2e8]">
                TODO: protect this admin-only action with Supabase Auth before
                public launch.
              </p>
              <MockButton
                disabled={!confirmationMatches || isDeleting}
                onClick={() => void deleteEvent()}
                tone="danger"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </MockButton>
            </div>
            {deleteActionState.message ? (
              <p
                className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${
                  deleteActionState.status === "error"
                    ? "border-[#ff6b8a]/40 bg-black/20 text-[#ffe2e8]"
                    : "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]"
                }`}
              >
                {deleteActionState.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AdminFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getEventStatusTone(status: BattleEvent["status"]) {
  return {
    archived: "neutral",
    completed: "cyan",
    live: "gold",
    lobby: "cyan",
    paused: "gold",
    setup: "neutral",
  }[status] as "neutral" | "cyan" | "gold";
}

function getFriendlyAdminError(error: string) {
  const lowerError = error.toLowerCase();

  if (lowerError.includes("row-level") || lowerError.includes("rls")) {
    return "Supabase blocked this admin action with a row-level security policy. Check MVP RLS settings.";
  }

  if (
    lowerError.includes("foreign key") ||
    lowerError.includes("violates") ||
    lowerError.includes("constraint")
  ) {
    return "Supabase could not delete the event because related rows are still protected by database constraints.";
  }

  if (
    lowerError.includes("failed to fetch") ||
    lowerError.includes("network") ||
    lowerError.includes("timed out")
  ) {
    return "Supabase did not respond. Check your connection and /debug/deployment.";
  }

  return error;
}

function buildGuestInvitation(event: BattleEvent, guestPath: string) {
  const guestUrl = new URL(guestPath, window.location.origin).toString();

  return [
    `${event.eventName}`,
    "",
    `Guest link: ${guestUrl}`,
    "Passcode: [enter passcode here]",
    "",
    "Audio will be shared by the host outside the app.",
    "Enter the passcode, add a display name, wait for the host, vote when voting opens, and chat respectfully.",
  ].join("\n");
}

function withAdminTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Supabase request timed out."));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}
