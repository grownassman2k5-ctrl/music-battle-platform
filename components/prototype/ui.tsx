import Link from "next/link";

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

const buttonToneClass: Record<ButtonTone, string> = {
  primary:
    "border-[#f7c948]/70 bg-[#f7c948] text-[#151006] shadow-[0_18px_45px_rgba(247,201,72,0.22)] hover:bg-[#ffe08a]",
  secondary:
    "border-[#43d9cf]/50 bg-[#43d9cf]/10 text-[#dffdfa] hover:bg-[#43d9cf]/20",
  ghost:
    "border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/15",
  danger:
    "border-[#ff6b8a]/40 bg-[#ff6b8a]/10 text-[#ffe6ec] hover:bg-[#ff6b8a]/20",
};

type ButtonProps = {
  children: React.ReactNode;
  tone?: ButtonTone;
  className?: string;
};

export function MockButton({
  children,
  tone = "ghost",
  className = "",
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition ${buttonToneClass[tone]} ${className}`}
      type="button"
    >
      {children}
    </button>
  );
}

export function PreviewLink({
  children,
  href,
  tone = "primary",
  className = "",
}: ButtonProps & { href: string }) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition ${buttonToneClass[tone]} ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function Pill({
  children,
  tone = "gold",
}: {
  children: React.ReactNode;
  tone?: "gold" | "cyan" | "rose" | "neutral";
}) {
  const toneClass = {
    gold: "border-[#f7c948]/40 bg-[#f7c948]/10 text-[#ffe7a3]",
    cyan: "border-[#43d9cf]/40 bg-[#43d9cf]/10 text-[#cbfffb]",
    rose: "border-[#ff6b8a]/40 bg-[#ff6b8a]/10 text-[#ffe2e8]",
    neutral: "border-white/15 bg-white/10 text-zinc-200",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold uppercase ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-white/10 bg-[#101014]/90 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}
