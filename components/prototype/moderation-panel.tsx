"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/mock-battle";
import { MockButton, Panel, Pill } from "./ui";

export function ModerationPanel({ messages }: { messages: ChatMessage[] }) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [slowMode, setSlowMode] = useState(false);
  const visibleMessages = messages.filter(
    (message) => !hiddenIds.includes(message.id),
  );

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Chat moderation
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Room control</h2>
        </div>
        <Pill tone={slowMode ? "gold" : "neutral"}>
          Slow mode {slowMode ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-4 space-y-3">
        {visibleMessages.map((message) => (
          <article
            className="rounded-lg border border-white/10 bg-black/20 p-3"
            key={message.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">
                  {message.author}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {message.message}
                </p>
              </div>
              <MockButton
                className="min-h-9 px-3"
                onClick={() =>
                  setHiddenIds((current) => [...current, message.id])
                }
                tone="danger"
              >
                Hide
              </MockButton>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MockButton
          onClick={() => setSlowMode((value) => !value)}
          tone={slowMode ? "primary" : "ghost"}
        >
          Toggle Slow Mode
        </MockButton>
        <MockButton onClick={() => setHiddenIds([])} tone="ghost">
          Restore Messages
        </MockButton>
      </div>
    </Panel>
  );
}
