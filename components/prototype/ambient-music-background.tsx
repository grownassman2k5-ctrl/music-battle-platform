type AmbientMusicBackgroundProps = {
  density?: "calm" | "stage";
};

const bars = Array.from({ length: 24 }, (_, index) => index);

export function AmbientMusicBackground({
  density = "stage",
}: AmbientMusicBackgroundProps) {
  const barOpacity = density === "stage" ? "opacity-70" : "opacity-50";

  return (
    <div
      aria-hidden="true"
      className="music-background pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08080b]"
    >
      <div className="animated-grid absolute inset-0 opacity-50" />
      <div className="stage-wash absolute inset-0" />
      <div className="record-ring absolute -right-28 top-12 h-80 w-80 rounded-full opacity-30 md:h-[30rem] md:w-[30rem]" />
      <div className="record-ring record-ring-slow absolute -left-32 bottom-8 h-72 w-72 rounded-full opacity-25 md:h-96 md:w-96" />
      <div className="beat-lane beat-lane-one absolute left-0 right-0 top-[18%]" />
      <div className="beat-lane beat-lane-two absolute left-0 right-0 top-[67%]" />
      <div
        className={`sound-bars absolute bottom-0 left-1/2 flex h-40 w-[min(92vw,58rem)] -translate-x-1/2 items-end justify-between gap-1 ${barOpacity}`}
      >
        {bars.map((bar) => (
          <span
            className="sound-bar block w-full rounded-t-sm bg-gradient-to-t from-[#e9b949] via-[#c7396b] to-[#39d0c8]"
            key={bar}
          />
        ))}
      </div>
    </div>
  );
}
