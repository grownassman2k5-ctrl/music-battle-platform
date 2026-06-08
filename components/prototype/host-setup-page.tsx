"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  type ImportedSong,
  type MatchupMode,
  sampleCsv,
  validateCsvImport,
} from "@/lib/csv-import";
import {
  clearLocalBattleSetup,
  createLocalBattleSetup,
  saveLocalBattleSetup,
  type LocalSideDisplayConfig,
} from "@/lib/local-demo-store";
import { hashEventPasscode } from "@/lib/persisted-event-access";
import {
  createEvent,
  createEventSides,
  saveGeneratedRounds,
  saveImportedSongs,
} from "@/lib/supabase/battle-repository";
import { AmbientMusicBackground } from "./ambient-music-background";
import { Panel, Pill, PreviewLink, MockButton } from "./ui";

const tableHeaders = [
  "Side",
  "Artist",
  "Song",
  "Album",
  "Genre",
  "Duration",
  "Year",
  "Mood",
  "Order",
  "Apple Music",
];

type SideDisplayConfig = LocalSideDisplayConfig;

type SideDisplayOverrides = Record<
  string,
  Partial<
    Pick<
      SideDisplayConfig,
      "csvValue" | "publicDisplayName" | "artistDisplayName"
    >
  >
>;

type SupabaseSaveStatus = "idle" | "saving" | "success" | "error";

export function HostSetupPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState(
    "Usher vs Chris Brown Music Battle",
  );
  const [eventPasscode, setEventPasscode] = useState("");
  const [defaultDuration, setDefaultDuration] = useState(120);
  const [matchupMode, setMatchupMode] = useState<MatchupMode>("fixed");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [generated, setGenerated] = useState(false);
  const [supabaseSaveStatus, setSupabaseSaveStatus] =
    useState<SupabaseSaveStatus>("idle");
  const [supabaseSaveMessage, setSupabaseSaveMessage] = useState("");
  const [supabaseEventSlug, setSupabaseEventSlug] = useState("");
  const [sideDisplayOverrides, setSideDisplayOverrides] =
    useState<SideDisplayOverrides>({});

  const importResult = useMemo(
    () => validateCsvImport(csvText, matchupMode),
    [csvText, matchupMode],
  );
  const canGenerate =
    csvText.trim().length > 0 &&
    importResult.errors.length === 0 &&
    importResult.matchups.length > 0;

  const sideDisplayConfigs = useMemo(
    () =>
      importResult.detectedSides.slice(0, 2).map((csvValue) => {
        const inferredArtistName = inferArtistName(csvValue, importResult.songs);
        const overrides = sideDisplayOverrides[csvValue] ?? {};

        return {
          sourceCsvValue: csvValue,
          csvValue: overrides.csvValue ?? csvValue,
          publicDisplayName:
            overrides.publicDisplayName ??
            (inferredArtistName
              ? `Team ${inferredArtistName}`
              : `Team ${csvValue}`),
          artistDisplayName:
            overrides.artistDisplayName ?? (inferredArtistName || csvValue),
        };
      }),
    [importResult.detectedSides, importResult.songs, sideDisplayOverrides],
  );

  function getSideConfig(side: string) {
    return (
      sideDisplayConfigs.find((config) => config.sourceCsvValue === side) ?? {
        sourceCsvValue: side,
        csvValue: side,
        publicDisplayName: `Team ${side}`,
        artistDisplayName: side,
      }
    );
  }

  function updateSideConfig(
    sourceCsvValue: string,
    field: "csvValue" | "publicDisplayName" | "artistDisplayName",
    value: string,
  ) {
    setGenerated(false);
    setSideDisplayOverrides((currentOverrides) => ({
      ...currentOverrides,
      [sourceCsvValue]: {
        ...currentOverrides[sourceCsvValue],
        [field]: value,
      },
    }));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setGenerated(false);
    setSupabaseSaveStatus("idle");
    setSupabaseSaveMessage("");
    setSupabaseEventSlug("");

    if (!file) {
      setCsvText("");
      setFileName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  }

  function loadSampleCsv() {
    setCsvText(sampleCsv);
    setFileName("sample-battle-songs.csv");
    setGenerated(false);
    setSupabaseSaveStatus("idle");
    setSupabaseSaveMessage("");
    setSupabaseEventSlug("");
  }

  function handleGenerate() {
    if (!canGenerate) {
      return;
    }

    const setup = createLocalBattleSetup({
      eventName,
      eventPasscode,
      defaultSongDuration: defaultDuration || 120,
      matchupMode,
      detectedSideValues: importResult.detectedSides,
      sideDisplayConfigs,
      importedSongs: importResult.songs,
      generatedMatchups: importResult.matchups,
    });

    saveLocalBattleSetup(setup);
    setGenerated(true);
    router.push("/host/demo");
  }

  async function handleSaveToSupabase() {
    if (!canGenerate) {
      return;
    }

    if (!eventPasscode.trim()) {
      setSupabaseSaveStatus("error");
      setSupabaseSaveMessage(
        "Add an event passcode before saving this battle to Supabase.",
      );
      return;
    }

    setSupabaseSaveStatus("saving");
    setSupabaseSaveMessage("Saving event, sides, songs, and rounds...");
    setSupabaseEventSlug("");

    try {
      const eventSlug = createEventSlug(eventName);
      const passcodeHash = await hashEventPasscode(eventPasscode.trim());
      const eventResult = await createEvent({
        eventName: eventName.trim() || "Untitled Music Battle",
        eventSlug,
        passcodeHash,
        hostDisplayName: "Host",
        matchupMode,
        defaultSongDurationSeconds: defaultDuration || 120,
      });

      if (eventResult.error || !eventResult.data) {
        throw new Error(eventResult.error ?? "Supabase did not return an event.");
      }

      const savedEvent = eventResult.data;
      const sideResult = await createEventSides(
        savedEvent.id,
        sideDisplayConfigs.map((config, index) => ({
          internalSideValue: config.csvValue.trim() || config.sourceCsvValue,
          publicDisplayName:
            config.publicDisplayName.trim() || `Side ${index + 1}`,
          artistDisplayName:
            config.artistDisplayName.trim() ||
            config.publicDisplayName.trim() ||
            `Side ${index + 1}`,
          displayOrder: index === 0 ? 1 : 2,
        })),
      );

      if (sideResult.error || !sideResult.data) {
        throw new Error(
          sideResult.error ?? "Supabase did not return saved event sides.",
        );
      }

      const sideBySourceValue = new Map(
        sideDisplayConfigs.map((config, index) => {
          const savedSide = sideResult.data.find(
            (side) => side.displayOrder === (index === 0 ? 1 : 2),
          );

          if (!savedSide) {
            throw new Error(
              `Supabase did not return a saved side for ${config.sourceCsvValue}.`,
            );
          }

          return [config.sourceCsvValue, savedSide] as const;
        }),
      );

      const songsResult = await saveImportedSongs(
        savedEvent.id,
        importResult.songs.map((song) => {
          const side = sideBySourceValue.get(song.side);

          if (!side) {
            throw new Error(`No saved side matched CSV value "${song.side}".`);
          }

          return {
            sideId: side.id,
            csvRowNumber: song.rowNumber,
            artist: song.artist,
            songTitle: song.songTitle,
            album: song.album || null,
            genre: song.genre || null,
            durationSeconds: song.durationSeconds,
            releaseYear: parseOptionalYear(song.year),
            mood: song.mood || null,
            fixedOrder: song.fixedOrder,
            appleMusicLink: song.appleMusicLink || null,
          };
        }),
      );

      if (songsResult.error || !songsResult.data) {
        throw new Error(
          songsResult.error ?? "Supabase did not return saved songs.",
        );
      }

      const songByCsvRow = new Map(
        songsResult.data.map((song) => [song.csvRowNumber, song]),
      );
      const roundsResult = await saveGeneratedRounds(
        savedEvent.id,
        importResult.matchups.map((matchup) => {
          const sideOne = sideBySourceValue.get(matchup.sideOne.side);
          const sideTwo = sideBySourceValue.get(matchup.sideTwo.side);
          const sideOneSong = songByCsvRow.get(matchup.sideOne.rowNumber);
          const sideTwoSong = songByCsvRow.get(matchup.sideTwo.rowNumber);

          if (!sideOne || !sideTwo || !sideOneSong || !sideTwoSong) {
            throw new Error(
              `Round ${matchup.roundNumber} could not be mapped to saved Supabase rows.`,
            );
          }

          return {
            roundNumber: matchup.roundNumber,
            themeLabel: getMatchupThemeLabel(
              matchup.sideOne.mood,
              matchup.sideTwo.mood,
            ),
            sideOneId: sideOne.id,
            sideTwoId: sideTwo.id,
            sideOneSongId: sideOneSong.id,
            sideTwoSongId: sideTwoSong.id,
          };
        }),
      );

      if (roundsResult.error || !roundsResult.data) {
        throw new Error(
          roundsResult.error ?? "Supabase did not return saved rounds.",
        );
      }

      setSupabaseEventSlug(eventSlug);
      setSupabaseSaveStatus("success");
      setSupabaseSaveMessage(
        `Saved ${eventName || "Untitled Event"} to Supabase with ${roundsResult.data.length} rounds.`,
      );
    } catch (error) {
      setSupabaseSaveStatus("error");
      setSupabaseSaveMessage(getFriendlyErrorMessage(error));
    }
  }

  function handleResetDemoData() {
    clearLocalBattleSetup();
    setGenerated(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
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
                Host setup
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                Build a local battle from CSV
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="gold">Local only</Pill>
              <MockButton onClick={handleResetDemoData} tone="ghost">
                Reset Demo Data
              </MockButton>
              <PreviewLink href="/host/demo" tone="ghost">
                Host Demo
              </PreviewLink>
            </div>
          </div>
        </header>

        <section className="grid gap-5 py-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="space-y-5">
            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Event basics
              </p>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">
                    Event name
                  </span>
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f7c948]/70"
                    onChange={(event) => setEventName(event.target.value)}
                    type="text"
                    value={eventName}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">
                    Event passcode
                  </span>
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#43d9cf]/70"
                    onChange={(event) => setEventPasscode(event.target.value)}
                    placeholder="Choose a private passcode"
                    type="password"
                    value={eventPasscode}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">
                    Default song duration
                  </span>
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[#f7c948]/70"
                    min={15}
                    onChange={(event) =>
                      setDefaultDuration(Number(event.target.value))
                    }
                    type="number"
                    value={defaultDuration}
                  />
                </label>
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                Matchup mode
              </p>
              <div className="mt-4 grid gap-3">
                <MockButton
                  onClick={() => {
                    setMatchupMode("fixed");
                    setGenerated(false);
                  }}
                  tone={matchupMode === "fixed" ? "primary" : "ghost"}
                >
                  Fixed Order
                </MockButton>
                <MockButton
                  onClick={() => {
                    setMatchupMode("randomized");
                    setGenerated(false);
                  }}
                  tone={matchupMode === "randomized" ? "secondary" : "ghost"}
                >
                  Randomized
                </MockButton>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Fixed Order pairs songs with the same fixed_order value.
                Randomized shuffles each side before pairing rounds.
              </p>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold uppercase text-zinc-500">
                CSV upload
              </p>
              <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/25 p-5 text-center transition hover:border-[#43d9cf]/60">
                <span className="text-base font-semibold text-white">
                  Choose CSV file
                </span>
                <span className="mt-2 text-sm text-zinc-500">
                  {fileName || "No file selected"}
                </span>
                <input
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={handleFileChange}
                  type="file"
                />
              </label>
              <MockButton className="mt-3 w-full" onClick={loadSampleCsv}>
                Load Sample CSV
              </MockButton>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Validation summary
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {importResult.summary.validSongs} imported songs
                  </h2>
                </div>
                <Pill tone={importResult.errors.length > 0 ? "rose" : "cyan"}>
                  {importResult.errors.length > 0 ? "Needs fixes" : "Ready"}
                </Pill>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <StatTile
                  label="CSV rows"
                  value={String(importResult.summary.totalRows)}
                />
                <StatTile
                  label="Valid songs"
                  value={String(importResult.summary.validSongs)}
                />
                <StatTile
                  label="Matchups"
                  value={String(importResult.summary.matchupCount)}
                />
                <StatTile
                  label="Unique sides"
                  value={String(importResult.detectedSides.length)}
                />
              </div>

              {importResult.summary.sideCounts.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {importResult.summary.sideCounts.map((side) => (
                    <StatTile
                      key={side.value}
                      label={`${side.value} songs`}
                      value={String(side.count)}
                    />
                  ))}
                </div>
              ) : null}

              {sideDisplayConfigs.length > 0 ? (
                <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Side display names
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {sideDisplayConfigs.map((config, index) => (
                      <div
                        className="rounded-lg border border-white/10 bg-white/10 p-4"
                        key={config.sourceCsvValue}
                      >
                        <p className="text-sm font-bold text-white">
                          Side {index + 1}
                        </p>
                        <label className="mt-3 block">
                          <span className="text-sm font-medium text-zinc-300">
                            Side {index + 1} internal CSV value
                          </span>
                          <input
                            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-sm text-zinc-300 outline-none"
                            onChange={(event) =>
                              updateSideConfig(
                                config.sourceCsvValue,
                                "csvValue",
                                event.target.value,
                              )
                            }
                            type="text"
                            value={config.csvValue}
                          />
                        </label>
                        <label className="mt-3 block">
                          <span className="text-sm font-medium text-zinc-300">
                            Side {index + 1} public display name
                          </span>
                          <input
                            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#f7c948]/70"
                            onChange={(event) =>
                              updateSideConfig(
                                config.sourceCsvValue,
                                "publicDisplayName",
                                event.target.value,
                              )
                            }
                            type="text"
                            value={config.publicDisplayName}
                          />
                        </label>
                        <label className="mt-3 block">
                          <span className="text-sm font-medium text-zinc-300">
                            Side {index + 1} artist display name
                          </span>
                          <input
                            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#43d9cf]/70"
                            onChange={(event) =>
                              updateSideConfig(
                                config.sourceCsvValue,
                                "artistDisplayName",
                                event.target.value,
                              )
                            }
                            type="text"
                            value={config.artistDisplayName}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {importResult.errors.length > 0 ? (
                <MessageList
                  messages={importResult.errors}
                  title="Errors"
                  tone="error"
                />
              ) : null}

              {importResult.warnings.length > 0 ? (
                <MessageList
                  messages={importResult.warnings}
                  title="Warnings"
                  tone="warning"
                />
              ) : null}
            </Panel>

            <Panel className="overflow-hidden p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Imported song preview
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Song table
                  </h2>
                </div>
                <Pill tone="neutral">
                  {matchupMode === "fixed" ? "Fixed Order" : "Randomized"}
                </Pill>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[62rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
                      {tableHeaders.map((header) => (
                        <th className="px-3 py-3 font-semibold" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {importResult.songs.length > 0 ? (
                      importResult.songs.map((song) => (
                        <tr className="text-zinc-300" key={song.id}>
                          <td className="px-3 py-3 font-semibold text-white">
                            <span>{getSideConfig(song.side).publicDisplayName}</span>
                            <span className="mt-1 block text-xs font-normal text-zinc-500">
                              CSV: {getSideConfig(song.side).csvValue}
                            </span>
                          </td>
                          <td className="px-3 py-3">{song.artist}</td>
                          <td className="px-3 py-3 font-semibold text-white">
                            {song.songTitle}
                          </td>
                          <td className="px-3 py-3">{song.album || "-"}</td>
                          <td className="px-3 py-3">{song.genre || "-"}</td>
                          <td className="px-3 py-3">
                            {song.durationSeconds ?? "-"}
                          </td>
                          <td className="px-3 py-3">{song.year || "-"}</td>
                          <td className="px-3 py-3">{song.mood || "-"}</td>
                          <td className="px-3 py-3">
                            {song.fixedOrder ?? "-"}
                          </td>
                          <td className="px-3 py-3">
                            {song.appleMusicLink ? "Linked" : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-3 py-8 text-center text-zinc-500"
                          colSpan={tableHeaders.length}
                        >
                          Upload a CSV to preview imported songs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-zinc-500">
                    Generated matchup preview
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {importResult.matchups.length} rounds
                  </h2>
                </div>
                <MockButton
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  tone="primary"
                >
                  Generate Battle Demo
                </MockButton>
                <MockButton
                  disabled={!canGenerate || supabaseSaveStatus === "saving"}
                  onClick={handleSaveToSupabase}
                  tone="secondary"
                >
                  {supabaseSaveStatus === "saving"
                    ? "Saving..."
                    : "Save Battle to Supabase"}
                </MockButton>
              </div>

              {generated ? (
                <div className="mt-5 rounded-lg border border-[#43d9cf]/30 bg-[#43d9cf]/10 p-4 text-sm font-semibold text-[#cbfffb]">
                  Battle demo generated locally for {eventName || "Untitled Event"}.
                  Default timer: {defaultDuration || 120} seconds.
                  {eventPasscode ? " Passcode captured in local state." : ""}
                </div>
              ) : null}

              {supabaseSaveStatus !== "idle" ? (
                <div
                  className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${
                    supabaseSaveStatus === "success"
                      ? "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]"
                      : supabaseSaveStatus === "error"
                        ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
                        : "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]"
                  }`}
                >
                  <p>{supabaseSaveMessage}</p>
                  {supabaseSaveStatus === "success" && supabaseEventSlug ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PreviewLink href={`/host/${supabaseEventSlug}`}>
                        Persisted Host
                      </PreviewLink>
                      <PreviewLink
                        href={`/event/${supabaseEventSlug}`}
                        tone="ghost"
                      >
                        Persisted Guest
                      </PreviewLink>
                      <PreviewLink
                        href={`/results/${supabaseEventSlug}`}
                        tone="ghost"
                      >
                        Persisted Results
                      </PreviewLink>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                {importResult.matchups.length > 0 ? (
                  importResult.matchups.map((matchup) => (
                    <article
                      className="rounded-lg border border-white/10 bg-black/20 p-4"
                      key={`${matchup.roundNumber}-${matchup.sideOne.id}-${matchup.sideTwo.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase text-[#43d9cf]">
                            Round {matchup.roundNumber}
                          </p>
                          <h3 className="mt-2 text-xl font-black text-white">
                            {matchup.sideOne.songTitle} vs{" "}
                            {matchup.sideTwo.songTitle}
                          </h3>
                          <p className="mt-2 text-sm text-zinc-400">
                            {
                              getSideConfig(matchup.sideOne.side)
                                .publicDisplayName
                            }{" "}
                            (
                            {
                              getSideConfig(matchup.sideOne.side)
                                .artistDisplayName
                            }
                            ) /{" "}
                            {
                              getSideConfig(matchup.sideTwo.side)
                                .publicDisplayName
                            }{" "}
                            (
                            {
                              getSideConfig(matchup.sideTwo.side)
                                .artistDisplayName
                            }
                            )
                          </p>
                        </div>
                        <Pill tone={matchup.fixedOrder ? "gold" : "cyan"}>
                          {matchup.fixedOrder
                            ? `Order ${matchup.fixedOrder}`
                            : "Randomized"}
                        </Pill>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg border border-white/10 bg-black/20 p-5 text-sm text-zinc-500">
                    Valid matchups will appear here after CSV validation.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function inferArtistName(side: string, songs: ImportedSong[]) {
  return songs.find((song) => song.side === side)?.artist.trim() ?? "";
}

function createEventSlug(eventName: string) {
  const slugBase =
    eventName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "music-battle";

  return `${slugBase}-${Date.now().toString(36)}`;
}

function parseOptionalYear(year: string) {
  const parsedYear = Number(year);

  return Number.isInteger(parsedYear) && parsedYear > 0 ? parsedYear : null;
}

function getMatchupThemeLabel(sideOneMood: string, sideTwoMood: string) {
  return sideOneMood || sideTwoMood || "R&B Lounge";
}

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while saving to Supabase.";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function MessageList({
  messages,
  title,
  tone,
}: {
  messages: string[];
  title: string;
  tone: "error" | "warning";
}) {
  const toneClass =
    tone === "error"
      ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
      : "border-[#f7c948]/30 bg-[#f7c948]/10 text-[#ffe7a3]";

  return (
    <div className={`mt-5 rounded-lg border p-4 ${toneClass}`}>
      <p className="text-sm font-bold uppercase">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
