import type {
  GeneratedMatchup,
  ImportedSong,
  MatchupMode,
} from "@/lib/csv-import";

export const LOCAL_BATTLE_STORAGE_KEY =
  "music-battle-platform.local-demo-event.v1";
export const LOCAL_BATTLE_STORAGE_EVENT = "local-battle-demo-event-updated";

export type LocalSideDisplayConfig = {
  sourceCsvValue: string;
  csvValue: string;
  publicDisplayName: string;
  artistDisplayName: string;
};

export type LocalBattleSetup = {
  version: 1;
  generatedAt: string;
  eventName: string;
  eventPasscode: string;
  defaultSongDuration: number;
  matchupMode: MatchupMode;
  detectedSideValues: string[];
  sideDisplayConfigs: LocalSideDisplayConfig[];
  importedSongs: ImportedSong[];
  generatedMatchups: GeneratedMatchup[];
  visualMoods: string[];
  visualThemes: string[];
};

type CreateLocalBattleSetupInput = {
  eventName: string;
  eventPasscode: string;
  defaultSongDuration: number;
  matchupMode: MatchupMode;
  detectedSideValues: string[];
  sideDisplayConfigs: LocalSideDisplayConfig[];
  importedSongs: ImportedSong[];
  generatedMatchups: GeneratedMatchup[];
};

export function createLocalBattleSetup({
  eventName,
  eventPasscode,
  defaultSongDuration,
  matchupMode,
  detectedSideValues,
  sideDisplayConfigs,
  importedSongs,
  generatedMatchups,
}: CreateLocalBattleSetupInput): LocalBattleSetup {
  const visualMoods = getUniqueValues(importedSongs.map((song) => song.mood));
  const visualThemes = getUniqueValues([
    "Custom Battle Stage",
    ...visualMoods.map((mood) => `${mood} Stage`),
    "R&B Lounge",
    "Hip-Hop Stage",
  ]).slice(0, 8);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    eventName: eventName.trim() || "Untitled Music Battle",
    eventPasscode: eventPasscode.trim(),
    defaultSongDuration: Number.isFinite(defaultSongDuration)
      ? defaultSongDuration
      : 120,
    matchupMode,
    detectedSideValues,
    sideDisplayConfigs,
    importedSongs,
    generatedMatchups,
    visualMoods,
    visualThemes,
  };
}

export function saveLocalBattleSetup(setup: LocalBattleSetup) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_BATTLE_STORAGE_KEY, JSON.stringify(setup));
  window.dispatchEvent(new Event(LOCAL_BATTLE_STORAGE_EVENT));
}

export function clearLocalBattleSetup() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOCAL_BATTLE_STORAGE_KEY);
  window.dispatchEvent(new Event(LOCAL_BATTLE_STORAGE_EVENT));
}

export function readLocalBattleSetup(): LocalBattleSetup | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseLocalBattleSetup(
    window.localStorage.getItem(LOCAL_BATTLE_STORAGE_KEY),
  );
}

export function parseLocalBattleSetup(
  rawValue: string | null,
): LocalBattleSetup | null {
  if (!rawValue?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<LocalBattleSetup>;

    if (
      parsed.version !== 1 ||
      typeof parsed.eventName !== "string" ||
      typeof parsed.eventPasscode !== "string" ||
      !isValidMatchupMode(parsed.matchupMode) ||
      !Array.isArray(parsed.detectedSideValues) ||
      !Array.isArray(parsed.sideDisplayConfigs) ||
      !Array.isArray(parsed.importedSongs) ||
      !Array.isArray(parsed.generatedMatchups)
    ) {
      return null;
    }

    return {
      version: 1,
      generatedAt:
        typeof parsed.generatedAt === "string"
          ? parsed.generatedAt
          : new Date(0).toISOString(),
      eventName: parsed.eventName,
      eventPasscode: parsed.eventPasscode,
      defaultSongDuration:
        typeof parsed.defaultSongDuration === "number"
          ? parsed.defaultSongDuration
          : 120,
      matchupMode: parsed.matchupMode,
      detectedSideValues: parsed.detectedSideValues.filter(isStringValue),
      sideDisplayConfigs:
        parsed.sideDisplayConfigs.filter(isLocalSideDisplayConfig),
      importedSongs: parsed.importedSongs.filter(isImportedSong),
      generatedMatchups: parsed.generatedMatchups.filter(isGeneratedMatchup),
      visualMoods: Array.isArray(parsed.visualMoods)
        ? parsed.visualMoods.filter(isStringValue)
        : [],
      visualThemes: Array.isArray(parsed.visualThemes)
        ? parsed.visualThemes.filter(isStringValue)
        : ["Custom Battle Stage", "R&B Lounge", "Hip-Hop Stage"],
    };
  } catch {
    return null;
  }
}

export function getLocalSideConfig(setup: LocalBattleSetup, sideValue: string) {
  return (
    setup.sideDisplayConfigs.find(
      (config) =>
        config.sourceCsvValue === sideValue || config.csvValue === sideValue,
    ) ?? {
      sourceCsvValue: sideValue,
      csvValue: sideValue,
      publicDisplayName: `Team ${sideValue}`,
      artistDisplayName: sideValue,
    }
  );
}

function isValidMatchupMode(value: unknown): value is MatchupMode {
  return value === "fixed" || value === "randomized";
}

function isStringValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalSideDisplayConfig(
  value: unknown,
): value is LocalSideDisplayConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LocalSideDisplayConfig>;

  return (
    typeof candidate.sourceCsvValue === "string" &&
    typeof candidate.csvValue === "string" &&
    typeof candidate.publicDisplayName === "string" &&
    typeof candidate.artistDisplayName === "string"
  );
}

function isImportedSong(value: unknown): value is ImportedSong {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ImportedSong>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.side === "string" &&
    typeof candidate.artist === "string" &&
    typeof candidate.songTitle === "string"
  );
}

function isGeneratedMatchup(value: unknown): value is GeneratedMatchup {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GeneratedMatchup>;

  return (
    typeof candidate.roundNumber === "number" &&
    isImportedSong(candidate.sideOne) &&
    isImportedSong(candidate.sideTwo)
  );
}

function getUniqueValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}
