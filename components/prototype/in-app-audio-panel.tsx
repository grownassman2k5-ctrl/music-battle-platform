"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DailyCall,
  DailyEventObject,
  DailyParticipant,
} from "@daily-co/daily-js";
import { MockButton, Panel, Pill } from "./ui";

type AudioRole = "host" | "guest";

type AudioStatus =
  | "idle"
  | "not_configured"
  | "room_ready"
  | "connecting"
  | "joined"
  | "audio_live"
  | "error";

type DailyAudioRoomResponse = {
  configured: boolean;
  message: string;
  roomName?: string;
  roomUrl?: string;
  token?: string;
};

const statusTone: Record<AudioStatus, "gold" | "cyan" | "rose" | "neutral"> = {
  audio_live: "cyan",
  connecting: "gold",
  error: "rose",
  idle: "neutral",
  joined: "cyan",
  not_configured: "neutral",
  room_ready: "gold",
};

const statusLabel: Record<AudioStatus, string> = {
  audio_live: "Audio live",
  connecting: "Connecting",
  error: "Audio error",
  idle: "External audio mode",
  joined: "Room joined",
  not_configured: "Not configured",
  room_ready: "Room ready",
};

export function InAppAudioPanel({
  displayName,
  eventName,
  eventSlug,
  role,
}: {
  displayName?: string | null;
  eventName: string;
  eventSlug: string;
  role: AudioRole;
}) {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [message, setMessage] = useState(
    "External Zoom, Discord, Meet, speaker, or phone audio still works as the fallback.",
  );
  const [roomName, setRoomName] = useState("");
  const [remoteAudioReady, setRemoteAudioReady] = useState(false);

  const isHost = role === "host";
  const isBusy = status === "connecting";
  const isJoined = status === "joined" || status === "audio_live";

  useEffect(() => {
    return () => {
      const call = callRef.current;
      callRef.current = null;

      if (call && !call.isDestroyed()) {
        void call.destroy();
      }
    };
  }, []);

  async function requestAudioRoom() {
    const response = await fetch("/api/daily/audio-room", {
      body: JSON.stringify({
        displayName: displayName || (isHost ? "Host" : "Guest"),
        eventSlug,
        role,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json()) as DailyAudioRoomResponse;

    if (!response.ok) {
      throw new Error(payload.message || "Audio room request failed.");
    }

    return payload;
  }

  async function joinAudioRoom({ shareScreen }: { shareScreen: boolean }) {
    if (shareScreen && !supportsScreenSharing()) {
      setStatus("error");
      setMessage(
        "This browser does not support tab or screen sharing. Use Chrome or Edge on desktop, or use the external audio fallback.",
      );
      return;
    }

    setStatus("connecting");
    setMessage("Preparing the private Daily audio room...");

    try {
      const room = await requestAudioRoom();

      if (!room.configured || !room.roomUrl || !room.token) {
        setStatus("not_configured");
        setMessage(room.message);
        return;
      }

      setRoomName(room.roomName ?? "");
      setStatus("room_ready");
      setMessage(room.message);

      const Daily = (await import("@daily-co/daily-js")).default;
      const call = Daily.createCallObject({
        allowMultipleCallInstances: true,
        audioSource: false,
        startAudioOff: true,
        startVideoOff: true,
        subscribeToTracksAutomatically: true,
        videoSource: false,
      });

      callRef.current = call;
      attachDailyListeners(call);

      setStatus("connecting");
      setMessage(
        isHost
          ? "Joining as host with camera and microphone off..."
          : "Joining as listener with camera and microphone off...",
      );

      await call.join({
        audioSource: false,
        startAudioOff: true,
        startVideoOff: true,
        token: room.token,
        url: room.roomUrl,
        userName: displayName || (isHost ? "Host" : "Guest"),
        videoSource: false,
      });

      call.setLocalAudio(false);
      call.setLocalVideo(false);

      if (shareScreen) {
        startHostTabShare(call);
      } else {
        setStatus("joined");
        setMessage(
          "You are in the listening room. Use Enable Audio if your browser needs another tap.",
        );
        syncRemoteAudio(call);
      }
    } catch (error) {
      setStatus("error");
      setMessage(getFriendlyAudioError(error));
    }
  }

  function attachDailyListeners(call: DailyCall) {
    const onJoined = () => {
      setStatus((currentStatus) =>
        currentStatus === "audio_live" ? "audio_live" : "joined",
      );
    };
    const onLeft = () => {
      setStatus("idle");
      setMessage("You left the in-app audio room.");
      setRemoteAudioReady(false);
    };
    const onError = (event: DailyEventObject<"error" | "nonfatal-error">) => {
      setStatus("error");
      setMessage(getFriendlyAudioError(event.errorMsg ?? "Daily audio failed."));
    };
    const onParticipantChanged = () => {
      syncRemoteAudio(call);
    };
    const onShareStarted = () => {
      setStatus("audio_live");
      setMessage(
        "Tab sharing is live. Make sure the browser share dialog included tab audio.",
      );
    };
    const onShareStopped = () => {
      setStatus("joined");
      setMessage("Tab sharing stopped. The room is still open.");
    };

    call.on("joined-meeting", onJoined);
    call.on("left-meeting", onLeft);
    call.on("error", onError);
    call.on("nonfatal-error", onError);
    call.on("participant-joined", onParticipantChanged);
    call.on("participant-updated", onParticipantChanged);
    call.on("participant-left", onParticipantChanged);
    call.on("track-started", onParticipantChanged);
    call.on("track-stopped", onParticipantChanged);
    call.on("local-screen-share-started", onShareStarted);
    call.on("local-screen-share-stopped", onShareStopped);
    call.on("local-screen-share-canceled", onShareStopped);
  }

  function startHostTabShare(call = callRef.current) {
    if (!call) {
      setStatus("error");
      setMessage("Join the Daily room before sharing tab audio.");
      return;
    }

    if (!supportsScreenSharing()) {
      setStatus("error");
      setMessage(
        "This browser does not support tab or screen sharing. Use Chrome or Edge on desktop.",
      );
      return;
    }

    try {
      call.startScreenShare({
        displayMediaOptions: {
          audio: true,
          selfBrowserSurface: "include",
          surfaceSwitching: "include",
          systemAudio: "include",
          video: true,
        },
      });
      setStatus("audio_live");
      setMessage(
        "Choose the Apple Music tab and turn on tab audio in the browser sharing prompt.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(getFriendlyAudioError(error));
    }
  }

  async function leaveAudioRoom() {
    const call = callRef.current;
    callRef.current = null;
    setRemoteAudioReady(false);

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }

    try {
      if (call && !call.isDestroyed()) {
        await call.leave();
        await call.destroy();
      }

      setStatus("idle");
      setMessage("In-app audio is off. External audio remains available.");
    } catch (error) {
      setStatus("error");
      setMessage(getFriendlyAudioError(error));
    }
  }

  function stopHostShare() {
    const call = callRef.current;

    if (!call) {
      return;
    }

    try {
      call.stopScreenShare();
      setStatus("joined");
      setMessage("Tab sharing stopped. You can share again or leave the room.");
    } catch (error) {
      setStatus("error");
      setMessage(getFriendlyAudioError(error));
    }
  }

  function syncRemoteAudio(call = callRef.current) {
    if (!audioElementRef.current || !call || isHost) {
      return;
    }

    const remoteTrack = findRemoteAudioTrack(call.participants());

    if (!remoteTrack) {
      setRemoteAudioReady(false);
      return;
    }

    const currentStream = audioElementRef.current.srcObject;

    if (
      currentStream instanceof MediaStream &&
      currentStream.getAudioTracks()[0]?.id === remoteTrack.id
    ) {
      return;
    }

    audioElementRef.current.srcObject = new MediaStream([remoteTrack]);
    setRemoteAudioReady(true);

    void audioElementRef.current.play().catch(() => {
      setMessage(
        "Audio is available, but the browser needs another tap. Press Enable Audio.",
      );
    });
  }

  function enableRemoteAudio() {
    const audioElement = audioElementRef.current;

    if (!audioElement) {
      return;
    }

    void audioElement
      .play()
      .then(() => {
        setStatus("audio_live");
        setMessage("Audio playback is enabled on this device.");
      })
      .catch(() => {
        setStatus("error");
        setMessage(
          "The browser blocked audio playback. Try tapping Join Event Audio again or check site audio permissions.",
        );
      });
  }

  return (
    <Panel className="p-4">
      <audio autoPlay playsInline ref={audioElementRef}>
        <track kind="captions" />
      </audio>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-500">
            {isHost ? "Managed audio" : "Event audio"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            In-App Audio Room
          </h2>
        </div>
        <Pill tone={statusTone[status]}>{statusLabel[status]}</Pill>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p>

      {roomName ? (
        <p className="mt-3 break-words font-mono text-xs text-zinc-500">
          Room: {roomName}
        </p>
      ) : null}

      {isHost ? (
        <HostAudioInstructions eventName={eventName} />
      ) : (
        <GuestAudioInstructions remoteAudioReady={remoteAudioReady} />
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {isHost ? (
          <>
            <MockButton
              disabled={isBusy || isJoined}
              onClick={() => void joinAudioRoom({ shareScreen: true })}
              tone="primary"
            >
              {isBusy ? "Connecting..." : "Start In-App Audio"}
            </MockButton>
            <MockButton
              disabled={isBusy || !isJoined}
              onClick={() => startHostTabShare()}
              tone="secondary"
            >
              Share Tab Audio
            </MockButton>
            <MockButton
              disabled={!isJoined}
              onClick={stopHostShare}
              tone="ghost"
            >
              Stop Sharing
            </MockButton>
            <MockButton
              disabled={!isJoined}
              onClick={() => void leaveAudioRoom()}
              tone="danger"
            >
              Leave Audio Room
            </MockButton>
          </>
        ) : (
          <>
            <MockButton
              disabled={isBusy || isJoined}
              onClick={() => void joinAudioRoom({ shareScreen: false })}
              tone="primary"
            >
              {isBusy ? "Connecting..." : "Join Event Audio"}
            </MockButton>
            <MockButton
              disabled={!isJoined || !remoteAudioReady}
              onClick={enableRemoteAudio}
              tone="secondary"
            >
              Enable Audio
            </MockButton>
            <MockButton
              className="sm:col-span-2"
              disabled={!isJoined}
              onClick={() => void leaveAudioRoom()}
              tone="danger"
            >
              Leave Event Audio
            </MockButton>
          </>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        This private MVP uses Daily meeting tokens from a server route. Real
        host authorization should be enforced server-side with Supabase Auth
        before public launch.
      </p>
    </Panel>
  );
}

function HostAudioInstructions({ eventName }: { eventName: string }) {
  const steps = [
    "Open Apple Music Web in Chrome or Edge.",
    "Start the playlist or song for the current round.",
    "Click Start In-App Audio.",
    "Choose the Apple Music tab and enable tab audio.",
  ];

  return (
    <div className="mt-4 rounded-lg border border-[#f7c948]/20 bg-[#f7c948]/10 p-3">
      <p className="text-sm font-semibold text-[#ffe7a3]">{eventName}</p>
      <div className="mt-3 grid gap-2">
        {steps.map((step, index) => (
          <div className="flex gap-2 text-sm leading-5 text-zinc-300" key={step}>
            <span className="font-black text-[#f7c948]">{index + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-400">
        External Audio Mode is still the recommended fallback for the live test.
      </p>
    </div>
  );
}

function GuestAudioInstructions({
  remoteAudioReady,
}: {
  remoteAudioReady: boolean;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#43d9cf]/20 bg-[#43d9cf]/10 p-3">
      <p className="text-sm font-semibold text-[#cbfffb]">
        Listen without leaving the battle page.
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Tap Join Event Audio after entering the event. Camera and microphone are
        off for guests; voting and chat continue even if audio is unavailable.
      </p>
      <p className="mt-2 text-xs font-semibold uppercase text-zinc-500">
        {remoteAudioReady ? "Host audio detected" : "Waiting for host audio"}
      </p>
    </div>
  );
}

function findRemoteAudioTrack(participants: Record<string, DailyParticipant>) {
  const remoteParticipants = Object.values(participants).filter(
    (participant) => !participant.local,
  );

  for (const participant of remoteParticipants) {
    const screenAudioTrack =
      participant.tracks.screenAudio.persistentTrack ??
      participant.tracks.screenAudio.track;

    if (screenAudioTrack) {
      return screenAudioTrack;
    }

    const audioTrack =
      participant.tracks.audio.persistentTrack ?? participant.tracks.audio.track;

    if (audioTrack) {
      return audioTrack;
    }
  }

  return null;
}

function supportsScreenSharing() {
  return Boolean(navigator.mediaDevices?.getDisplayMedia);
}

function getFriendlyAudioError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "In-app audio failed.";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("permission") || lowerMessage.includes("denied")) {
    return "The browser denied audio or tab-sharing permission. Try again and allow the requested permission, or use External Audio Mode.";
  }

  if (
    lowerMessage.includes("not configured") ||
    lowerMessage.includes("daily_api_key") ||
    lowerMessage.includes("daily")
  ) {
    return message;
  }

  if (lowerMessage.includes("not supported")) {
    return "This browser does not support the requested audio sharing feature. Chrome or Edge on desktop is recommended.";
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "Daily could not be reached. Check the connection and deployment environment variables.";
  }

  return message;
}
