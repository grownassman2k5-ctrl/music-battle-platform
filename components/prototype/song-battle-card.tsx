import type { Song } from "@/lib/mock-battle";
import { MockButton } from "./ui";

const accentClass = {
  gold: {
    shell: "border-[#f7c948]/40 bg-[#f7c948]/10",
    marker: "bg-[#f7c948]",
    text: "text-[#ffe7a3]",
    button: "primary" as const,
  },
  cyan: {
    shell: "border-[#43d9cf]/40 bg-[#43d9cf]/10",
    marker: "bg-[#43d9cf]",
    text: "text-[#cbfffb]",
    button: "secondary" as const,
  },
};

export function SongBattleCard({ song }: { song: Song }) {
  const accent = accentClass[song.accent];

  return (
    <article
      className={`relative min-h-[22rem] overflow-hidden rounded-lg border p-5 ${accent.shell}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold uppercase ${accent.text}`}>
            Seed {song.seed}
          </p>
          <h2 className="mt-3 text-4xl font-black leading-none text-white">
            {song.artist}
          </h2>
        </div>
        <span className={`h-12 w-12 rounded-md ${accent.marker}`} />
      </div>

      <div className="mt-10">
        <p className="text-sm font-semibold uppercase text-zinc-400">
          Now playing
        </p>
        <h3 className="mt-3 text-4xl font-black leading-tight text-white">
          {song.title}
        </h3>
        <p className="mt-3 text-base text-zinc-300">
          {song.album} / {song.year}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-4">
        <div>
          <p className="text-sm text-zinc-500">Mock vote total</p>
          <p className="mt-1 text-4xl font-black text-white">{song.votes}</p>
        </div>
        <MockButton tone={accent.button}>Vote {song.artist}</MockButton>
      </div>
    </article>
  );
}
