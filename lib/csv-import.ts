import { sanitizeCsvCell } from "@/lib/security/validation";

export type MatchupMode = "fixed" | "randomized";

export type ImportedSong = {
  id: string;
  rowNumber: number;
  side: string;
  artist: string;
  songTitle: string;
  album: string;
  genre: string;
  durationSeconds: number | null;
  year: string;
  mood: string;
  fixedOrder: number | null;
  appleMusicLink: string;
};

export type GeneratedMatchup = {
  roundNumber: number;
  fixedOrder: number | null;
  sideOne: ImportedSong;
  sideTwo: ImportedSong;
};

export type SideCount = {
  value: string;
  count: number;
};

export type CsvValidationSummary = {
  totalRows: number;
  validSongs: number;
  sideCounts: SideCount[];
  matchupCount: number;
};

export type CsvImportResult = {
  songs: ImportedSong[];
  matchups: GeneratedMatchup[];
  summary: CsvValidationSummary;
  errors: string[];
  warnings: string[];
  missingColumns: string[];
  detectedSides: string[];
};

const supportedColumns = [
  "side",
  "artist",
  "song_title",
  "album",
  "genre",
  "duration_seconds",
  "year",
  "mood",
  "fixed_order",
  "apple_music_link",
] as const;

const baseRequiredColumns = ["side", "artist", "song_title"] as const;

export const sampleCsv = `side,artist,song_title,album,genre,duration_seconds,year,mood,fixed_order,apple_music_link
Joseph,Usher,Yeah!,Confessions,R&B,250,2004,Club,1,https://music.apple.com/demo/usher-yeah
Niece,Chris Brown,Run It!,Chris Brown,R&B,229,2005,Club,1,https://music.apple.com/demo/chris-brown-run-it
Joseph,Usher,Confessions Part II,Confessions,R&B,211,2004,Dramatic,2,https://music.apple.com/demo/usher-confessions
Niece,Chris Brown,Forever,Exclusive,Pop R&B,278,2008,Euphoric,2,https://music.apple.com/demo/chris-brown-forever
Joseph,Usher,U Got It Bad,8701,R&B,247,2001,Heartbreak,3,https://music.apple.com/demo/usher-u-got-it-bad
Niece,Chris Brown,With You,Exclusive,R&B,252,2007,Romantic,3,https://music.apple.com/demo/chris-brown-with-you
Joseph,Usher,Burn,Confessions,R&B,231,2004,Heartbreak,4,https://music.apple.com/demo/usher-burn
Niece,Chris Brown,Loyal,X,Hip-Hop R&B,264,2014,Party,4,https://music.apple.com/demo/chris-brown-loyal`;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function getCell(
  row: string[],
  headerIndexes: Map<string, number>,
  column: string,
) {
  const index = headerIndexes.get(column);
  return index === undefined ? "" : sanitizeCsvCell(row[index] ?? "");
}

function parseOptionalNumber(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function seededShuffle<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const swapIndex = hash % (index + 1);
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

function buildFixedMatchups(
  songs: ImportedSong[],
  sides: string[],
  warnings: string[],
) {
  const sideOneSongs = songs.filter((song) => song.side === sides[0]);
  const sideTwoSongs = songs.filter((song) => song.side === sides[1]);
  const orders = Array.from(
    new Set(
      songs
        .map((song) => song.fixedOrder)
        .filter((order): order is number => order !== null),
    ),
  ).sort((a, b) => a - b);

  return orders.flatMap((order) => {
    const sideOneMatches = sideOneSongs.filter(
      (song) => song.fixedOrder === order,
    );
    const sideTwoMatches = sideTwoSongs.filter(
      (song) => song.fixedOrder === order,
    );

    if (sideOneMatches.length > 1 || sideTwoMatches.length > 1) {
      warnings.push(
        `Fixed order ${order} has duplicate songs on one side. The first song from each side is used in the preview.`,
      );
    }

    if (!sideOneMatches[0] || !sideTwoMatches[0]) {
      warnings.push(
        `Fixed order ${order} is missing a matching song from both sides, so it was skipped.`,
      );
      return [];
    }

    return [
      {
        roundNumber: order,
        fixedOrder: order,
        sideOne: sideOneMatches[0],
        sideTwo: sideTwoMatches[0],
      },
    ];
  });
}

function buildRandomizedMatchups(
  songs: ImportedSong[],
  sides: string[],
  warnings: string[],
) {
  const sideOneSongs = seededShuffle(
    songs.filter((song) => song.side === sides[0]),
    `${sides[0]}-demo-seed`,
  );
  const sideTwoSongs = seededShuffle(
    songs.filter((song) => song.side === sides[1]),
    `${sides[1]}-demo-seed`,
  );
  const matchupCount = Math.min(sideOneSongs.length, sideTwoSongs.length);

  if (sideOneSongs.length !== sideTwoSongs.length) {
    warnings.push(
      "Randomized mode can only pair complete rounds. Extra songs from the larger side are not shown in the matchup preview.",
    );
  }

  return Array.from({ length: matchupCount }, (_, index) => ({
    roundNumber: index + 1,
    fixedOrder: null,
    sideOne: sideOneSongs[index],
    sideTwo: sideTwoSongs[index],
  }));
}

function getSideCounts(songs: ImportedSong[]): SideCount[] {
  const counts = new Map<string, number>();

  for (const song of songs) {
    counts.set(song.side, (counts.get(song.side) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([value, count]) => ({
    value,
    count,
  }));
}

export function validateCsvImport(
  csvText: string,
  mode: MatchupMode,
): CsvImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const csvByteLength = new Blob([csvText]).size;

  if (csvByteLength > 1024 * 1024) {
    return {
      detectedSides: [],
      errors: ["CSV file is too large for this MVP import. Keep it under 1 MB."],
      matchups: [],
      missingColumns: [],
      songs: [],
      summary: {
        matchupCount: 0,
        sideCounts: [],
        totalRows: 0,
        validSongs: 0,
      },
      warnings: [],
    };
  }

  const rows = parseCsv(csvText);
  const requiredColumns =
    mode === "fixed"
      ? [...baseRequiredColumns, "fixed_order"]
      : [...baseRequiredColumns];

  if (rows.length === 0) {
    return {
      songs: [],
      matchups: [],
      summary: {
        totalRows: 0,
        validSongs: 0,
        sideCounts: [],
        matchupCount: 0,
      },
      errors: ["Upload a CSV with a header row before generating matchups."],
      warnings: [],
      missingColumns: requiredColumns,
      detectedSides: [],
    };
  }

  if (rows.length > 501) {
    errors.push("CSV has too many rows for this MVP import. Keep it to 500 songs or fewer.");
  }

  const headers = rows[0].map(normalizeHeader);
  const headerIndexes = new Map(headers.map((header, index) => [header, index]));
  const missingColumns = requiredColumns.filter(
    (column) => !headerIndexes.has(column),
  );

  if (missingColumns.length > 0) {
    errors.push(
      `Missing required column${missingColumns.length > 1 ? "s" : ""}: ${missingColumns.join(
        ", ",
      )}.`,
    );
  }

  const unsupportedHeaders = headers.filter(
    (header) =>
      header.length > 0 &&
      !supportedColumns.includes(header as (typeof supportedColumns)[number]),
  );

  if (unsupportedHeaders.length > 0) {
    warnings.push(
      `Unsupported column${unsupportedHeaders.length > 1 ? "s" : ""} ignored: ${unsupportedHeaders.join(
        ", ",
      )}.`,
    );
  }

  const songs = rows.slice(1).flatMap((row, index) => {
    const rowNumber = index + 2;
    const sideValue = getCell(row, headerIndexes, "side");
    const artist = getCell(row, headerIndexes, "artist");
    const songTitle = getCell(row, headerIndexes, "song_title");
    const durationValue = getCell(row, headerIndexes, "duration_seconds");
    const fixedOrderValue = getCell(row, headerIndexes, "fixed_order");
    const durationSeconds = parseOptionalNumber(durationValue);
    const fixedOrder = parseOptionalNumber(fixedOrderValue);
    const side = sideValue.trim();
    const rowErrors: string[] = [];

    if (!sideValue) {
      rowErrors.push(`Row ${rowNumber}: side is required.`);
    }

    if (!artist) {
      rowErrors.push(`Row ${rowNumber}: artist is required.`);
    }

    if (!songTitle) {
      rowErrors.push(`Row ${rowNumber}: song_title is required.`);
    }

    if (mode === "fixed" && !fixedOrderValue) {
      rowErrors.push(
        `Row ${rowNumber}: fixed_order is required for Fixed Order mode.`,
      );
    }

    if (Number.isNaN(durationSeconds)) {
      rowErrors.push(
        `Row ${rowNumber}: duration_seconds must be a number if provided.`,
      );
    }

    if (Number.isNaN(fixedOrder)) {
      rowErrors.push(
        `Row ${rowNumber}: fixed_order must be a number if provided.`,
      );
    }

    if (rowErrors.length > 0 || !side) {
      errors.push(...rowErrors);
      return [];
    }

    return [
      {
        id: `${side}-${rowNumber}-${songTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        rowNumber,
        side,
        artist,
        songTitle,
        album: getCell(row, headerIndexes, "album"),
        genre: getCell(row, headerIndexes, "genre"),
        durationSeconds,
        year: getCell(row, headerIndexes, "year"),
        mood: getCell(row, headerIndexes, "mood"),
        fixedOrder,
        appleMusicLink: getCell(row, headerIndexes, "apple_music_link"),
      },
    ];
  });

  const sideCounts = getSideCounts(songs);
  const detectedSides = sideCounts.map((side) => side.value);

  if (detectedSides.length < 2 && songs.length > 0) {
    errors.push(
      "The setup needs exactly 2 unique side values. This CSV currently has fewer than 2.",
    );
  }

  if (detectedSides.length > 2) {
    errors.push(
      `The setup needs exactly 2 unique side values. This CSV has ${detectedSides.length}: ${detectedSides.join(
        ", ",
      )}.`,
    );
  }

  for (const side of sideCounts) {
    if (side.count !== 20) {
      warnings.push(
        `${side.value} has ${side.count} song${side.count === 1 ? "" : "s"}. A full battle should have exactly 20.`,
      );
    }
  }

  const matchups =
    errors.length > 0 || detectedSides.length !== 2
      ? []
      : mode === "fixed"
        ? buildFixedMatchups(songs, detectedSides, warnings)
        : buildRandomizedMatchups(songs, detectedSides, warnings);

  return {
    songs,
    matchups,
    summary: {
      totalRows: Math.max(0, rows.length - 1),
      validSongs: songs.length,
      sideCounts,
      matchupCount: matchups.length,
    },
    errors,
    warnings,
    missingColumns,
    detectedSides,
  };
}
