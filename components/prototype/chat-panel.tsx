import type { BattleEvent } from "@/lib/mock-battle";
import { MockButton, Panel } from "./ui";

const roleTone = {
  Host: "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]",
  Moderator: "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]",
  Guest: "border-white/15 bg-white/10 text-zinc-300",
};

export function ChatPanel({ event }: { event: BattleEvent }) {
  return (
    <Panel className="flex min-h-[32rem] flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-500">
            Live chat
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Moderated room
          </h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-zinc-300">
          Mock
        </span>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {event.chatMessages.map((message) => (
          <article
            className="rounded-lg border border-white/10 bg-black/20 p-3"
            key={message.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {message.author}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-md border px-2 py-1 text-[0.68rem] font-semibold uppercase ${roleTone[message.role]}`}
                >
                  {message.role}
                </span>
              </div>
              <time className="shrink-0 text-xs text-zinc-500">
                {message.timestamp}
              </time>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {message.message}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        <input
          className="h-11 rounded-md border border-white/15 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-600"
          placeholder="Chat is static in this prototype"
          type="text"
        />
        <MockButton className="w-full" tone="ghost">
          Send mock message
        </MockButton>
      </div>
    </Panel>
  );
}
