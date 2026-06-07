import type { BattleEvent } from "@/lib/mock-battle";
import { PreviewLink } from "./ui";

export function JoinEventCard({ event }: { event: BattleEvent }) {
  return (
    <section className="rounded-lg border border-white/15 bg-[#111116]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-[#f7c948]">
            Private event
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Join room</h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-zinc-200">
          {event.eventCode}
        </span>
      </div>

      <form className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Passcode</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f7c948]/70"
            name="passcode"
            placeholder="Enter passcode"
            type="password"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">
            Display name
          </span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#43d9cf]/70"
            name="displayName"
            placeholder="Your battle name"
            type="text"
          />
        </label>
        <button
          className="min-h-12 w-full rounded-md border border-white/15 bg-white/10 px-4 text-sm font-semibold text-zinc-300"
          type="button"
        >
          Join event preview
        </button>
      </form>

      <div className="mt-5 grid gap-3">
        <PreviewLink className="w-full" href="/host/demo" tone="primary">
          Host Demo
        </PreviewLink>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewLink className="w-full" href="/event/demo" tone="secondary">
            Guest Demo
          </PreviewLink>
          <PreviewLink className="w-full" href="/results/demo" tone="ghost">
            Results Demo
          </PreviewLink>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-500">
        {event.passcodeHint}
      </p>
    </section>
  );
}
