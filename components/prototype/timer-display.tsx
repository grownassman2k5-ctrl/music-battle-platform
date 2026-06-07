export function TimerDisplay({ seconds }: { seconds: number }) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;

  return (
    <div className="rounded-lg border border-[#f7c948]/25 bg-[#f7c948]/10 px-5 py-4 text-center">
      <p className="text-xs font-semibold uppercase text-[#ffe7a3]">
        Song timer
      </p>
      <p className="mt-1 font-mono text-5xl font-black text-white">
        {display}
      </p>
      <p className="mt-1 text-xs text-zinc-400">Default round length</p>
    </div>
  );
}
