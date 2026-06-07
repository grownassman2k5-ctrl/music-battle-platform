import { mockBattleEvent } from "@/lib/mock-battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { JoinEventCard } from "./join-event-card";
import { Pill, PreviewLink } from "./ui";

const previewStats = [
  ["40", "song bracket"],
  ["120s", "default timer"],
  ["2", "battle sides"],
];

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#f7c948]/40 bg-[#f7c948]/10">
              <span className="h-4 w-4 rounded-sm bg-[#f7c948]" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-zinc-400">
                Private battle
              </p>
              <p className="font-semibold text-white">Host controlled</p>
            </div>
          </div>
          <PreviewLink href="/battle" tone="ghost">
            Battle room
          </PreviewLink>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_28rem] lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-6 flex flex-wrap gap-3">
              <Pill tone="gold">{mockBattleEvent.themeLabel}</Pill>
              <Pill tone="cyan">Round controls preview</Pill>
            </div>
            <p className="mb-4 text-sm font-semibold uppercase text-[#43d9cf]">
              One night. Two catalogs. No filler.
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              {mockBattleEvent.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">
              {mockBattleEvent.subtitle} This first pass shows the party flow:
              join card, host preview, current matchup, voting controls, chat,
              and the live scoreboard.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {previewStats.map(([value, label]) => (
                <div
                  className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur-md"
                  key={label}
                >
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="mt-1 text-sm text-zinc-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <JoinEventCard event={mockBattleEvent} />
        </section>
      </div>
    </main>
  );
}
