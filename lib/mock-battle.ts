export type ArtistSide = "usher" | "chrisBrown";
export type Accent = "gold" | "cyan";

export type Song = {
  id: string;
  artist: string;
  title: string;
  album: string;
  year: string;
  seed: number;
  votes: number;
  accent: Accent;
};

export type ScoreboardEntry = {
  artist: string;
  score: number;
  lastWinner: string;
  accent: Accent;
};

export type ChatMessage = {
  id: string;
  author: string;
  role: "Host" | "Moderator" | "Guest";
  message: string;
  timestamp: string;
};

export type BattleRound = {
  roundNumber: number;
  title: string;
  themeLabel: string;
  matchup: {
    usher: Song;
    chrisBrown: Song;
  };
  winnerSide: ArtistSide;
  winnerNote: string;
  voteTotals: Record<ArtistSide, number>;
};

export type PlaylistLink = {
  label: string;
  href: string;
};

export type BattleEvent = {
  title: string;
  subtitle: string;
  eventCode: string;
  passcodeHint: string;
  currentRound: number;
  totalRounds: number;
  timerSeconds: number;
  votingStatus: string;
  themeLabel: string;
  themes: string[];
  matchup: {
    usher: Song;
    chrisBrown: Song;
  };
  scoreboard: ScoreboardEntry[];
  chatMessages: ChatMessage[];
  rounds: BattleRound[];
  playlistLinks: PlaylistLink[];
};

const usherSongs = {
  yeah: {
    id: "usher-yeah",
    artist: "Usher",
    title: "Yeah!",
    album: "Confessions",
    year: "2004",
    seed: 1,
    votes: 71,
    accent: "gold" as const,
  },
  confessions: {
    id: "usher-confessions-part-ii",
    artist: "Usher",
    title: "Confessions Part II",
    album: "Confessions",
    year: "2004",
    seed: 2,
    votes: 69,
    accent: "gold" as const,
  },
  uGotItBad: {
    id: "usher-u-got-it-bad",
    artist: "Usher",
    title: "U Got It Bad",
    album: "8701",
    year: "2001",
    seed: 4,
    votes: 63,
    accent: "gold" as const,
  },
  burn: {
    id: "usher-burn",
    artist: "Usher",
    title: "Burn",
    album: "Confessions",
    year: "2004",
    seed: 3,
    votes: 66,
    accent: "gold" as const,
  },
  lovers: {
    id: "usher-lovers-and-friends",
    artist: "Usher",
    title: "Lovers and Friends",
    album: "Crunk Juice",
    year: "2004",
    seed: 6,
    votes: 59,
    accent: "gold" as const,
  },
  climax: {
    id: "usher-climax",
    artist: "Usher",
    title: "Climax",
    album: "Looking 4 Myself",
    year: "2012",
    seed: 9,
    votes: 52,
    accent: "gold" as const,
  },
  myBoo: {
    id: "usher-my-boo",
    artist: "Usher",
    title: "My Boo",
    album: "Confessions",
    year: "2004",
    seed: 7,
    votes: 60,
    accent: "gold" as const,
  },
};

const chrisBrownSongs = {
  runIt: {
    id: "cb-run-it",
    artist: "Chris Brown",
    title: "Run It!",
    album: "Chris Brown",
    year: "2005",
    seed: 1,
    votes: 74,
    accent: "cyan" as const,
  },
  withYou: {
    id: "cb-with-you",
    artist: "Chris Brown",
    title: "With You",
    album: "Exclusive",
    year: "2007",
    seed: 5,
    votes: 58,
    accent: "cyan" as const,
  },
  forever: {
    id: "cb-forever",
    artist: "Chris Brown",
    title: "Forever",
    album: "Exclusive",
    year: "2008",
    seed: 2,
    votes: 70,
    accent: "cyan" as const,
  },
  loyal: {
    id: "cb-loyal",
    artist: "Chris Brown",
    title: "Loyal",
    album: "X",
    year: "2014",
    seed: 3,
    votes: 68,
    accent: "cyan" as const,
  },
  noGuidance: {
    id: "cb-no-guidance",
    artist: "Chris Brown",
    title: "No Guidance",
    album: "Indigo",
    year: "2019",
    seed: 4,
    votes: 65,
    accent: "cyan" as const,
  },
  fineChina: {
    id: "cb-fine-china",
    artist: "Chris Brown",
    title: "Fine China",
    album: "X",
    year: "2013",
    seed: 8,
    votes: 55,
    accent: "cyan" as const,
  },
  goCrazy: {
    id: "cb-go-crazy",
    artist: "Chris Brown",
    title: "Go Crazy",
    album: "Slime and B",
    year: "2020",
    seed: 7,
    votes: 57,
    accent: "cyan" as const,
  },
};

export const mockRounds: BattleRound[] = [
  {
    roundNumber: 1,
    title: "Club Openers",
    themeLabel: "Hip-Hop Stage",
    matchup: {
      usher: usherSongs.yeah,
      chrisBrown: chrisBrownSongs.runIt,
    },
    winnerSide: "chrisBrown",
    winnerNote: "Chris Brown takes the opener with pure debut energy.",
    voteTotals: {
      usher: 71,
      chrisBrown: 74,
    },
  },
  {
    roundNumber: 2,
    title: "Confession Booth",
    themeLabel: "R&B Lounge",
    matchup: {
      usher: usherSongs.confessions,
      chrisBrown: chrisBrownSongs.forever,
    },
    winnerSide: "usher",
    winnerNote: "Usher answers with a catalog-defining singalong.",
    voteTotals: {
      usher: 69,
      chrisBrown: 62,
    },
  },
  {
    roundNumber: 3,
    title: "Slow Jam Heat",
    themeLabel: "R&B Lounge",
    matchup: {
      usher: usherSongs.uGotItBad,
      chrisBrown: chrisBrownSongs.withYou,
    },
    winnerSide: "usher",
    winnerNote: "The room leans into heartbreak and gives Usher the round.",
    voteTotals: {
      usher: 63,
      chrisBrown: 58,
    },
  },
  {
    roundNumber: 4,
    title: "Dance Floor Pressure",
    themeLabel: "Neon Arena",
    matchup: {
      usher: usherSongs.burn,
      chrisBrown: chrisBrownSongs.loyal,
    },
    winnerSide: "chrisBrown",
    winnerNote: "The bounce wins this one by a narrow margin.",
    voteTotals: {
      usher: 66,
      chrisBrown: 68,
    },
  },
  {
    roundNumber: 5,
    title: "Feature Flex",
    themeLabel: "After Hours",
    matchup: {
      usher: usherSongs.lovers,
      chrisBrown: chrisBrownSongs.noGuidance,
    },
    winnerSide: "chrisBrown",
    winnerNote: "Modern duet gravity pulls the crowd to Chris Brown.",
    voteTotals: {
      usher: 59,
      chrisBrown: 65,
    },
  },
  {
    roundNumber: 6,
    title: "Deep Cut Control",
    themeLabel: "R&B Lounge",
    matchup: {
      usher: usherSongs.climax,
      chrisBrown: chrisBrownSongs.fineChina,
    },
    winnerSide: "usher",
    winnerNote: "Usher's restraint lands with the late-night crowd.",
    voteTotals: {
      usher: 52,
      chrisBrown: 48,
    },
  },
  {
    roundNumber: 7,
    title: "Final Crowd Call",
    themeLabel: "Arena Finale",
    matchup: {
      usher: usherSongs.myBoo,
      chrisBrown: chrisBrownSongs.goCrazy,
    },
    winnerSide: "usher",
    winnerNote: "The finale goes nostalgic and seals the battle.",
    voteTotals: {
      usher: 60,
      chrisBrown: 57,
    },
  },
];

export function getWinnerArtist(round: BattleRound) {
  return round.matchup[round.winnerSide].artist;
}

export function getWinnerSong(round: BattleRound) {
  return round.matchup[round.winnerSide];
}

export function buildScoreboard(
  rounds: BattleRound[],
  completedThroughRound: number,
): ScoreboardEntry[] {
  const completedRounds = rounds.filter(
    (round) => round.roundNumber <= completedThroughRound,
  );
  const usherWins = completedRounds.filter(
    (round) => round.winnerSide === "usher",
  );
  const chrisBrownWins = completedRounds.filter(
    (round) => round.winnerSide === "chrisBrown",
  );

  return [
    {
      artist: "Usher",
      score: usherWins.length,
      lastWinner:
        usherWins.at(-1)?.matchup.usher.title ?? "Waiting for first win",
      accent: "gold",
    },
    {
      artist: "Chris Brown",
      score: chrisBrownWins.length,
      lastWinner:
        chrisBrownWins.at(-1)?.matchup.chrisBrown.title ??
        "Waiting for first win",
      accent: "cyan",
    },
  ];
}

export const mockBattleEvent: BattleEvent = {
  title: "Usher vs Chris Brown Music Battle",
  subtitle: "A private host-controlled battle night for R&B loyalists.",
  eventCode: "USHER-CB-001",
  passcodeHint: "Prototype passcode: 8701",
  themeLabel: "R&B Lounge",
  themes: [
    "R&B Lounge",
    "Hip-Hop Stage",
    "Neon Arena",
    "After Hours",
    "Arena Finale",
  ],
  currentRound: 3,
  totalRounds: mockRounds.length,
  timerSeconds: 120,
  votingStatus: "Voting closed",
  matchup: mockRounds[2].matchup,
  scoreboard: buildScoreboard(mockRounds, 3),
  rounds: mockRounds,
  playlistLinks: [
    {
      label: "Full Battle Playlist",
      href: "https://music.apple.com/us/playlist/usher-vs-chris-brown-demo/pl.demo001",
    },
    {
      label: "Usher Highlights",
      href: "https://music.apple.com/us/playlist/usher-demo-highlights/pl.demo002",
    },
    {
      label: "Chris Brown Highlights",
      href: "https://music.apple.com/us/playlist/chris-brown-demo-highlights/pl.demo003",
    },
  ],
  chatMessages: [
    {
      id: "chat-1",
      author: "Maya",
      role: "Host",
      message: "Round 3 is loaded. Let the songs breathe before voting opens.",
      timestamp: "8:41 PM",
    },
    {
      id: "chat-2",
      author: "Devin",
      role: "Moderator",
      message: "Keep it fun. Song takes are welcome, spam is not.",
      timestamp: "8:42 PM",
    },
    {
      id: "chat-3",
      author: "Guest 14",
      role: "Guest",
      message: "This matchup is unfair in the best way.",
      timestamp: "8:42 PM",
    },
    {
      id: "chat-4",
      author: "Tasha",
      role: "Guest",
      message: "If the crowd goes with nostalgia, Usher has this one.",
      timestamp: "8:43 PM",
    },
  ],
};
