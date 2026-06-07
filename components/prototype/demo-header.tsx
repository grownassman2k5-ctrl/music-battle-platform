import Link from "next/link";
import { mockBattleEvent } from "@/lib/mock-battle";
import { Pill, PreviewLink } from "./ui";

type DemoHeaderProps = {
  eyebrow: string;
  title?: string;
  activeHref: "/host/demo" | "/event/demo" | "/results/demo";
  themeLabel?: string;
};

const navLinks = [
  { href: "/host/demo", label: "Host" },
  { href: "/event/demo", label: "Guest" },
  { href: "/results/demo", label: "Results" },
] as const;

export function DemoHeader({
  eyebrow,
  title = mockBattleEvent.title,
  activeHref,
  themeLabel = mockBattleEvent.themeLabel,
}: DemoHeaderProps) {
  return (
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
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            {title}
          </h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Pill tone="gold">{themeLabel}</Pill>
          <nav className="flex flex-wrap gap-2">
            {navLinks.map((link) => (
              <PreviewLink
                className={
                  activeHref === link.href
                    ? "bg-white/15 text-white"
                    : "text-zinc-300"
                }
                href={link.href}
                key={link.href}
                tone="ghost"
              >
                {link.label}
              </PreviewLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
