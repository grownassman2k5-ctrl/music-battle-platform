"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addChatMessage,
  loadChatMessages,
  moderateChatMessage,
} from "@/lib/supabase/battle-repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type {
  ChatMessage,
  ChatMessageStatus,
  ModerationActionType,
  Participant,
  UUID,
} from "@/lib/types/battle";
import { MockButton, Panel, Pill } from "./ui";

type PersistedChatMode = "guest" | "host";
type ChatLoadStatus = "loading" | "ready" | "error";
type ChatSyncStatus = "connecting" | "connected" | "unavailable";
type ChatSendStatus = "idle" | "sending" | "sent" | "blocked" | "error";

type ChatModerationState = {
  messageId: UUID | null;
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

const chatMessageMaxLength = 1000;
const blockedChatTerms = [
  "asshole",
  "bitch",
  "damn",
  "fuck",
  "idiot",
  "kill yourself",
  "shit",
  "shut up",
  "stupid",
  "trash person",
];

export function PersistedChatPanel({
  eventId,
  mode,
  participant,
}: {
  eventId: UUID;
  mode: PersistedChatMode;
  participant?: Participant | null;
}) {
  const includeModerated = mode === "host";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadStatus, setLoadStatus] = useState<ChatLoadStatus>("loading");
  const [loadMessage, setLoadMessage] = useState("Loading live chat...");
  const [syncStatus, setSyncStatus] =
    useState<ChatSyncStatus>("connecting");
  const [draft, setDraft] = useState("");
  const [sendStatus, setSendStatus] = useState<ChatSendStatus>("idle");
  const [sendMessage, setSendMessage] = useState(
    mode === "guest" ? "Join the event to send chat messages." : "",
  );
  const [moderationState, setModerationState] =
    useState<ChatModerationState>({
      message: "",
      messageId: null,
      status: "idle",
    });
  const visibleMessages = useMemo(
    () =>
      includeModerated
        ? messages
        : messages.filter((message) => message.status === "visible"),
    [includeModerated, messages],
  );
  const canSend = mode === "guest" && Boolean(participant);
  const remainingCharacters = chatMessageMaxLength - draft.length;

  const refreshMessages = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      if (!quiet) {
        setLoadStatus("loading");
        setLoadMessage("Loading live chat...");
      }

      const result = await loadChatMessages(eventId, {
        includeModerated,
        limit: 150,
      });

      if (result.error || !result.data) {
        setLoadStatus("error");
        setLoadMessage(
          getFriendlyChatError(
            result.error ?? "Supabase did not return chat messages.",
          ),
        );
        return;
      }

      setMessages(result.data);
      setLoadStatus("ready");
      setLoadMessage(
        result.data.length
          ? "Live chat loaded from Supabase."
          : "No chat messages yet.",
      );
    },
    [eventId, includeModerated],
  );

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void refreshMessages();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [refreshMessages]);

  useEffect(() => {
    let isActive = true;
    let reloadTimer: number | null = null;
    const supabase = getSupabaseBrowserClient();
    const scheduleReload = () => {
      if (reloadTimer) {
        window.clearTimeout(reloadTimer);
      }

      reloadTimer = window.setTimeout(() => {
        if (isActive) {
          void refreshMessages({ quiet: true });
        }
      }, 150);
    };
    const channel = supabase
      .channel(`persisted-chat:${eventId}:${mode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `event_id=eq.${eventId}`,
          schema: "public",
          table: "chat_messages",
        },
        scheduleReload,
      );

    channel.subscribe((status) => {
      if (!isActive) {
        return;
      }

      if (status === "SUBSCRIBED") {
        setSyncStatus("connected");
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        setSyncStatus("unavailable");
      }
    });

    return () => {
      isActive = false;

      if (reloadTimer) {
        window.clearTimeout(reloadTimer);
      }

      void supabase.removeChannel(channel);
    };
  }, [eventId, mode, refreshMessages]);

  async function sendChatMessage() {
    if (!participant) {
      setSendStatus("error");
      setSendMessage("Join this event before sending chat messages.");
      return;
    }

    const validationMessage = validateChatDraft(draft);

    if (validationMessage) {
      setSendStatus("blocked");
      setSendMessage(validationMessage);
      return;
    }

    const cleanMessage = draft.trim();
    setSendStatus("sending");
    setSendMessage("Sending message...");

    const result = await addChatMessage({
      displayNameSnapshot: participant.displayName,
      eventId,
      messageBody: cleanMessage,
      participantId: participant.id,
    });

    if (result.error || !result.data) {
      setSendStatus("error");
      setSendMessage(
        getFriendlyChatError(result.error ?? "Message was not saved."),
      );
      return;
    }

    setDraft("");
    setSendStatus("sent");
    setSendMessage("Message sent.");
    await refreshMessages({ quiet: true });
  }

  async function moderateMessage(
    message: ChatMessage,
    status: Extract<ChatMessageStatus, "hidden" | "deleted">,
  ) {
    const actionType: ModerationActionType =
      status === "deleted" ? "delete_message" : "hide_message";
    const reason =
      status === "deleted"
        ? "Deleted by host from the MVP moderation panel."
        : "Hidden by host from the MVP moderation panel.";

    setModerationState({
      message: `${status === "deleted" ? "Deleting" : "Hiding"} message...`,
      messageId: message.id,
      status: "saving",
    });

    // TODO: Require a real authenticated host/moderator role before public use.
    const result = await moderateChatMessage({
      actionType,
      eventId,
      messageId: message.id,
      metadata: {
        moderatedFrom: "persisted-host-route",
      },
      moderationReason: reason,
      moderatorParticipantId: null,
      status,
      targetParticipantId: message.participantId,
    });

    if (result.error || !result.data) {
      setModerationState({
        message: getFriendlyChatError(
          result.error ?? "Moderation action was not saved.",
        ),
        messageId: message.id,
        status: "error",
      });
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((currentMessage) =>
        currentMessage.id === result.data.id ? result.data : currentMessage,
      ),
    );
    setModerationState({
      message: `Message ${status === "deleted" ? "deleted" : "hidden"}.`,
      messageId: message.id,
      status: "saved",
    });
    await refreshMessages({ quiet: true });
  }

  return (
    <Panel className="flex min-h-[32rem] flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Live chat
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {mode === "host" ? "Host moderation" : "Event room"}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ChatSyncPill status={syncStatus} />
          <Pill tone={loadStatus === "error" ? "rose" : "neutral"}>
            {loadStatus === "loading" ? "Loading" : "Supabase"}
          </Pill>
        </div>
      </div>

      {loadMessage ? (
        <p
          className={`mt-4 text-sm leading-6 ${
            loadStatus === "error" ? "text-[#ffe2e8]" : "text-zinc-400"
          }`}
        >
          {loadMessage}
        </p>
      ) : null}

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {visibleMessages.map((message) => (
          <PersistedChatMessageRow
            isModerating={
              moderationState.status === "saving" &&
              moderationState.messageId === message.id
            }
            key={message.id}
            message={message}
            mode={mode}
            onDelete={() => void moderateMessage(message, "deleted")}
            onHide={() => void moderateMessage(message, "hidden")}
          />
        ))}

        {loadStatus !== "loading" && visibleMessages.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-500">
            {mode === "host"
              ? "No persisted chat messages yet."
              : "No visible messages yet. Be the first to say something kind."}
          </p>
        ) : null}
      </div>

      {mode === "host" ? (
        <HostModerationFeedback state={moderationState} />
      ) : (
        <div className="mt-5 grid gap-3">
          <textarea
            className="min-h-24 resize-none rounded-md border border-white/15 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600"
            disabled={!canSend || sendStatus === "sending"}
            maxLength={chatMessageMaxLength}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              canSend ? "Drop a kind hot take" : "Join the event to chat"
            }
            value={draft}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className={`text-xs font-semibold ${
                remainingCharacters < 80 ? "text-[#ffe7a3]" : "text-zinc-500"
              }`}
            >
              {remainingCharacters} characters left
            </span>
            <MockButton
              className="min-w-32"
              disabled={!canSend || sendStatus === "sending"}
              onClick={() => void sendChatMessage()}
              tone="ghost"
            >
              {sendStatus === "sending" ? "Sending..." : "Send"}
            </MockButton>
          </div>
          <GuestChatFeedback message={sendMessage} status={sendStatus} />
        </div>
      )}
    </Panel>
  );
}

function PersistedChatMessageRow({
  isModerating,
  message,
  mode,
  onDelete,
  onHide,
}: {
  isModerating: boolean;
  message: ChatMessage;
  mode: PersistedChatMode;
  onDelete: () => void;
  onHide: () => void;
}) {
  const isModerated = message.status !== "visible";

  return (
    <article
      className={`rounded-lg border p-3 ${
        isModerated
          ? "border-[#f7c948]/25 bg-[#f7c948]/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            {message.displayNameSnapshot}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill tone={getChatStatusTone(message.status)}>
              {getChatStatusLabel(message.status)}
            </Pill>
            <time className="inline-flex items-center text-xs font-semibold uppercase text-zinc-500">
              {formatChatTime(message.createdAt)}
            </time>
          </div>
        </div>
        {mode === "host" ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <MockButton
              className="min-h-9 px-3"
              disabled={isModerating || message.status !== "visible"}
              onClick={onHide}
              tone="ghost"
            >
              Hide
            </MockButton>
            <MockButton
              className="min-h-9 px-3"
              disabled={isModerating || message.status === "deleted"}
              onClick={onDelete}
              tone="danger"
            >
              Delete
            </MockButton>
          </div>
        ) : null}
      </div>
      <p
        className={`mt-3 text-sm leading-6 ${
          isModerated ? "text-zinc-400" : "text-zinc-300"
        }`}
      >
        {message.messageBody}
      </p>
      {mode === "host" && message.moderationReason ? (
        <p className="mt-3 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-400">
          {message.moderationReason}
        </p>
      ) : null}
    </article>
  );
}

function ChatSyncPill({ status }: { status: ChatSyncStatus }) {
  const label = {
    connected: "Chat sync connected",
    connecting: "Chat sync connecting",
    unavailable: "Chat sync unavailable",
  }[status];
  const tone = {
    connected: "cyan",
    connecting: "gold",
    unavailable: "rose",
  }[status] as "cyan" | "gold" | "rose";

  return <Pill tone={tone}>{label}</Pill>;
}

function GuestChatFeedback({
  message,
  status,
}: {
  message: string;
  status: ChatSendStatus;
}) {
  if (!message) {
    return null;
  }

  const className =
    status === "error" || status === "blocked"
      ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
      : status === "sent"
        ? "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]"
        : "border-white/10 bg-white/10 text-zinc-400";

  return (
    <p className={`rounded-lg border px-3 py-2 text-sm leading-6 ${className}`}>
      {message}
    </p>
  );
}

function HostModerationFeedback({ state }: { state: ChatModerationState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const className =
    state.status === "error"
      ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
      : state.status === "saved"
        ? "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]"
        : "border-white/10 bg-white/10 text-zinc-400";

  return (
    <p className={`mt-5 rounded-lg border px-3 py-2 text-sm leading-6 ${className}`}>
      {state.message}
    </p>
  );
}

function validateChatDraft(draft: string) {
  const cleanMessage = draft.trim();

  if (!cleanMessage) {
    return "Write a message before sending.";
  }

  if (cleanMessage.length > chatMessageMaxLength) {
    return `Keep chat messages under ${chatMessageMaxLength} characters.`;
  }

  const normalizedMessage = cleanMessage.toLowerCase();
  const blockedTerm = blockedChatTerms.find((term) =>
    new RegExp(`\\b${escapeRegex(term)}\\b`, "i").test(normalizedMessage),
  );

  if (blockedTerm) {
    return "That message was blocked by the family-friendly filter. Try rephrasing it kindly.";
  }

  return "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFriendlyChatError(error: string) {
  const lowerError = error.toLowerCase();

  if (lowerError.includes("row-level security") || lowerError.includes("rls")) {
    return "Supabase blocked this chat action. Check the temporary MVP RLS policies.";
  }

  if (lowerError.includes("permission")) {
    return "Supabase permissions blocked this chat action.";
  }

  if (lowerError.includes("1000") || lowerError.includes("message_body")) {
    return `Keep chat messages under ${chatMessageMaxLength} characters.`;
  }

  return error;
}

function getChatStatusLabel(status: ChatMessageStatus) {
  return {
    deleted: "Deleted",
    flagged: "Flagged",
    hidden: "Hidden",
    visible: "Visible",
  }[status];
}

function getChatStatusTone(status: ChatMessageStatus) {
  return {
    deleted: "rose",
    flagged: "gold",
    hidden: "gold",
    visible: "cyan",
  }[status] as "rose" | "gold" | "cyan";
}

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
