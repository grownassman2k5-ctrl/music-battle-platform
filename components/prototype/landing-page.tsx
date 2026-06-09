import { mockBattleEvent } from "@/lib/mock-battle";
import { AmbientMusicBackground } from "./ambient-music-background";
import { JoinEventCard } from "./join-event-card";
import { Panel, Pill, PreviewLink } from "./ui";

const previewStats = [
  ["40", "song bracket"],
  ["120s", "default timer"],
  ["2", "battle sides"],
];

const demoLinks = [
  {
    href: "/host/setup",
    title: "Setup Demo",
    description: "Import CSV songs and preview matchups.",
    tone: "neutral" as const,
  },
  {
    href: "/host/demo",
    title: "Host Demo",
    description: "Command center for the room.",
    tone: "gold" as const,
  },
  {
    href: "/event/demo",
    title: "Guest Demo",
    description: "Audience view for the battle.",
    tone: "cyan" as const,
  },
  {
    href: "/results/demo",
    title: "Results Demo",
    description: "Final board after the smoke clears.",
    tone: "rose" as const,
  },
];

const organizerLinks = [
  {
    href: "/host/setup",
    title: "Host Setup",
    description: "Upload the CSV, configure passcode, and save a battle.",
  },
  {
    href: "/admin/events",
    title: "Event Admin Dashboard",
    description: "Find saved events, open routes, and copy live links.",
  },
  {
    href: "/debug/deployment",
    title: "Debug Deployment",
    description: "Check Supabase env, tables, realtime reminders, and routes.",
  },
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
          <PreviewLink href="/host/demo" tone="ghost">
            Host Demo
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
              {mockBattleEvent.subtitle} Three demo views frame the night from
              host booth to guest floor to final scoreboard.
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

            <div className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {demoLinks.map((link) => (
                <Panel className="p-4" key={link.href}>
                  <Pill tone={link.tone}>{link.title}</Pill>
                  <p className="mt-4 min-h-12 text-sm leading-6 text-zinc-400">
                    {link.description}
                  </p>
                  <PreviewLink className="mt-4 w-full" href={link.href} tone="ghost">
                    Open {link.title}
                  </PreviewLink>
                </Panel>
              ))}
            </div>

            <Panel className="mt-8 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Organizer tools
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Setup, admin, and deployment checks
                  </h2>
                </div>
                <Pill tone="gold">Private MVP</Pill>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {organizerLinks.map((link) => (
                  <div
                    className="rounded-lg border border-white/10 bg-black/20 p-4"
                    key={link.href}
                  >
                    <p className="text-sm font-bold text-white">{link.title}</p>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">
                      {link.description}
                    </p>
                    <PreviewLink
                      className="mt-4 w-full"
                      href={link.href}
                      tone="ghost"
                    >
                      Open
                    </PreviewLink>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <JoinEventCard event={mockBattleEvent} />
        </section>
      </div>
    </main>
  );
}
