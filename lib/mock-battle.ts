export type ArtistSide = "usher" | "chrisBrown";

export type Song = {
  id: string;
  artist: string;
  title: string;
  album: string;
  year: string;
  seed: number;
  votes: number;
  accent: "gold" | "cyan";
};

export type ScoreboardEntry = {
  artist: string;
  score: number;
  lastWinner: string;
  accent: "gold" | "cyan";
};

export type ChatMessage = {
  id: string;
  author: string;
  role: "Host" | "Moderator" | "Guest";
  message: string;
  timestamp: string;
};

export type BattleEvent = {
  title: string;
  subtitle: string;
  eventCode: string;
  passcodeHint: string;
  themeLabel: string;
  currentRound: number;
  totalRounds: number;
  roundTitle: string;
  timerSeconds: number;
  votingStatus: string;
  matchup: {
    usher: Song;
    chrisBrown: Song;
  };
  scoreboard: ScoreboardEntry[];
  chatMessages: ChatMessage[];
};

export const mockBattleEvent: BattleEvent = {
  title: "Usher vs Chris Brown Music Battle",
  subtitle: "A private host-controlled battle night for R&B loyalists.",
  eventCode: "USHER-CB-001",
  passcodeHint: "Prototype passcode: 8701",
  themeLabel: "R&B Lounge",
  currentRound: 3,
  totalRounds: 7,
  roundTitle: "Slow Jam Heat",
  timerSeconds: 120,
  votingStatus: "Voting closed",
  matchup: {
    usher: {
      id: "usher-u-got-it-bad",
      artist: "Usher",
      title: "U Got It Bad",
      album: "8701",
      year: "2001",
      seed: 4,
      votes: 63,
      accent: "gold",
    },
    chrisBrown: {
      id: "cb-with-you",
      artist: "Chris Brown",
      title: "With You",
      album: "Exclusive",
      year: "2007",
      seed: 5,
      votes: 58,
      accent: "cyan",
    },
  },
  scoreboard: [
    {
      artist: "Usher",
      score: 4,
      lastWinner: "Confessions Part II",
      accent: "gold",
    },
    {
      artist: "Chris Brown",
      score: 3,
      lastWinner: "Run It!",
      accent: "cyan",
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
