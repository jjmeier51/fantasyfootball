// Types mirroring the JSON produced by sync/normalize.py and sync/build_stats.py.

export interface RosterPlayer {
  playerId: number | null;
  name: string;
  position: string;
  proTeam: string;
  slot?: string;
  points?: number | null;
  seasonPoints?: number | null;
}

export interface TeamSeason {
  teamId: number;
  ownerKey: string;
  coOwnerKeys: string[];
  name: string;
  abbrev: string;
  logo: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  seed: number;
  finalRank: number;
  roster: RosterPlayer[];
  fromOverride?: boolean;
}

export interface MatchupSide {
  teamId: number;
  ownerKey: string;
  score: number;
}

export interface Matchup {
  id: string;
  week: number;
  isPlayoff: boolean;
  type: string;
  home: MatchupSide;
  away: MatchupSide;
  winnerKey: string | null;
  decided: boolean;
  fromOverride?: boolean;
}

export interface DraftPick {
  round: number;
  pick: number;
  overall: number;
  teamId: number | null;
  ownerKey: string | null;
  playerId: number | null;
  playerName: string;
  position: string;
  proTeam: string;
  seasonPoints?: number | null;
  keeper: boolean;
  bid: number | null;
}

export interface BoxEntry {
  teamId: number;
  ownerKey: string | null;
  players: RosterPlayer[];
}

export interface Honors {
  champion: string | null;
  runnerUp: string | null;
  third: string | null;
  lastPlace: string | null;
  regSeasonChamp: string | null;
  topScorer: string | null;
}

export type CoverageState = "full" | "partial" | "missing" | "n/a";

export interface Coverage {
  fields: Record<string, CoverageState>;
  tier: "full" | "partial" | "missing";
  screenshotsNeeded: string[];
  source: string;
}

export interface Season {
  year: number;
  name: string;
  teamCount: number;
  regSeasonWeeks: number;
  playoffTeamCount: number;
  isComplete: boolean;
  completedWeeks: number[];
  currentWeek: number | null;
  source: string;
  teams: TeamSeason[];
  matchups: Matchup[];
  draft: DraftPick[];
  boxscores: Record<string, BoxEntry[]>;
  honors: Honors;
  championRoster: RosterPlayer[] | null;
  championRosterSource: "title-week" | "final-roster" | "override" | null;
  warnings: string[];
  hasOverride?: boolean;
  coverage: Coverage;
}

export interface League {
  leagueName: string;
  seasons: Season[];
}

export interface Owner {
  key: string;
  name: string;
  color: string | null;
  swids: string[];
  active: boolean;
  seasons: number[];
  firstSeason: number | null;
  lastSeason: number | null;
  teamNames: Record<string, { name: string; abbrev: string; teamId: number }>;
  logos: Record<string, string>;
  currentLogo: string | null;
  titles: number[];
}

export interface GameRef {
  value: number;
  year: number;
  week: number;
  oppKey: string;
  matchupId: string;
  won: boolean | null;
  oppScore: number;
}

export interface Streak {
  length: number;
  start: { year: number; week: number };
  end: { year: number; week: number };
}

export interface Finish {
  year: number;
  rank: number | null;
  seed: number | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  teamName: string;
  logo: string | null;
  madePlayoffs: boolean;
  isComplete: boolean;
  expectedWins: number | null;
  pfZ: number | null;
  champion: boolean;
}

export interface Career {
  ownerKey: string;
  name: string;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
  titles: number[];
  runnerUps: number[];
  thirds: number[];
  lastPlaces: number[];
  regSeasonTitles: number[];
  topScorerSeasons: number[];
  playoffApps: number[];
  playoffWins: number;
  playoffLosses: number;
  finalsApps: number[];
  finishes: Finish[];
  bestFinish: number | null;
  worstFinish: number | null;
  avgFinish: number | null;
  allPlayWins: number;
  allPlayLosses: number;
  expectedWins: number;
  luck: number;
  weeksTop: number;
  weeksBottom: number;
  highWeek: GameRef | null;
  lowWeek: GameRef | null;
  biggestWin: GameRef | null;
  worstLoss: GameRef | null;
  longestWinStreak: Streak | null;
  longestLossStreak: Streak | null;
  currentStreak: { type: string; length: number } | null;
  pfZAvg: number;
  coverageSeasons: number[];
  winPct: number;
  ppg: number;
  papg: number;
  playoffRecord: string;
}

export interface RecordEntry {
  ownerKey: string;
  value: number;
  year?: number;
  week?: number;
  oppKey?: string;
  matchupId?: string;
  teamName?: string;
  logo?: string | null;
  score?: number;
  oppScore?: number;
  isPlayoff?: boolean;
  won?: boolean | null;
  record?: string;
  pointsFor?: number;
  finalRank?: number | null;
  champion?: boolean;
  seasons?: number;
  endYear?: number;
  endWeek?: number;
  wins?: number;
  losses?: number;
  expectedWins?: number;
  luck?: number;
  allPlay?: string;
}

export interface RecordDef {
  id: string;
  category: "singleGame" | "season" | "career" | "playoffs" | "streaks" | "oddities";
  title: string;
  unit: string;
  better: "high" | "low";
  description: string;
  entries: RecordEntry[];
}

export interface H2HCell {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  playoffWins: number;
  playoffLosses: number;
  games: number;
  streak: { type: string; length: number } | null;
  lastYear: number | null;
  biggestWin: { margin: number; year: number; week: number; matchupId: string } | null;
  closest: { margin: number; year: number; week: number; matchupId: string } | null;
  avgMargin: number;
}

export interface H2HGame {
  matchupId: string;
  year: number;
  week: number;
  type: string;
  isPlayoff: boolean;
  scores: Record<string, number>;
  winnerKey: string | null;
}

export interface TeamSeasonRank {
  ownerKey: string;
  year: number;
  teamName: string;
  logo: string | null;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pfZ: number;
  finalRank: number | null;
  result: "champion" | "runnerUp" | "third" | "playoffs" | "missed";
  score: number;
  components: { winPct: number; scoring: number; playoffs: number };
  rank: number;
}

export interface GoatRow {
  ownerKey: string;
  score: number;
  components: Record<string, number>;
  seasons: number;
  rank: number;
  adjusted?: boolean;
}

export interface LuckRow {
  ownerKey: string;
  year: number;
  teamName: string;
  logo: string | null;
  wins: number;
  losses: number;
  expectedWins: number;
  luck: number;
  allPlay: string;
  isComplete: boolean;
  finalRank: number | null;
}

export interface DraftProfile {
  drafts: number;
  picks: number;
  facts: string[];
  firstKRound: number | null;
  firstToK: number;
  firstDSTRound: number | null;
  firstToDST: number;
  firstQBRound: number | null;
  firstToQB: number;
  firstTERound: number | null;
  firstToTE: number;
  favoriteTeam?: { team: string; name: string; picks: number; pct: number; leaguePct: number; streak: number };
  mostDraftedPlayer?: { name: string; times: number };
  earlyRoundMix?: Record<string, number>;
}

export interface DraftValueRow {
  ownerKey: string;
  year: number;
  player: string;
  position: string;
  proTeam: string;
  round: number;
  overall: number;
  seasonPoints: number;
  finishRank: number;
  posFinishRank?: number;
  posDraftRank?: number;
  value: number;
  rank?: number;
}

export interface FunFact {
  id: string;
  category: string;
  text: string;
  tone?: "positive" | "negative" | "neutral";
  ownerKey?: string;
  year?: number;
  href?: string;
}

export interface TrophySide {
  ownerKey: string;
  name: string;
  teamName: string;
  logo: string | null;
  record: string;
  pointsFor: number | null;
  seed: number | null;
}

export interface Trophy {
  year: number;
  isComplete: boolean;
  champion: TrophySide | null;
  runnerUp: TrophySide | null;
  third: TrophySide | null;
  lastPlace: TrophySide | null;
  regSeasonChamp: TrophySide | null;
  topScorer: TrophySide | null;
  titleGame: { matchupId: string; week: number; winnerScore: number; loserScore: number } | null;
  playoffRun: { week: number; oppKey: string; oppName: string; score: number; oppScore: number; matchupId: string }[];
  roster: RosterPlayer[] | null;
  rosterSource: "title-week" | "final-roster" | "override" | null;
  coverageTier: string;
  teamCount: number;
}

export interface BestTeamRoster {
  playerId: number | null;
  name: string;
  position: string;
  proTeam: string;
  seasonPoints: number | null;
  starter: boolean | null;
}

export interface BestTeam {
  year: number;
  teamName: string;
  logo: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  seed: number | null;
  finalRank: number | null;
  rank: number;
  result: TeamSeasonRank["result"];
  score: number;
  roster: BestTeamRoster[];
}

export interface Mvp {
  playerId: number | null;
  name: string;
  position: string;
  proTeam: string;
  year: number;
  teamName: string;
  points: number;
  seasonPoints: number | null;
  weeks: number | null;
  totalWeeks: number | null;
  source: "rostered-weeks" | "season-total";
  espnUrl: string | null;
  headshot: string | null;
  ownerKey?: string;
}

export interface OwnerHighlights {
  bestTeam: BestTeam | null;
  bestPlayers: { qb: Mvp | null; flex: Mvp | null };
}

export interface Records {
  generatedAt: string;
  trophies: Trophy[];
  podium: { ownerKey: string; titles: number[]; runnerUps: number[]; thirds: number[]; lastPlaces: number[] }[];
  careers: Career[];
  records: RecordDef[];
  h2h: { matrix: Record<string, Record<string, H2HCell>>; games: Record<string, H2HGame[]> };
  teamSeasons: TeamSeasonRank[];
  goat: GoatRow[];
  luck: LuckRow[];
  draft: { profiles: Record<string, DraftProfile>; facts: FunFact[]; steals: DraftValueRow[]; busts: DraftValueRow[]; greatest: DraftValueRow[]; draftsAnalyzed: number };
  funFacts: FunFact[];
  ownerHighlights: Record<string, OwnerHighlights>;
  topPlayerSeasons: Mvp[];
}

export interface Meta {
  leagueName: string;
  lastSynced: string;
  generatedAt: string;
  seasons: number[];
  firstSeason: number;
  currentSeason: number;
  currentSeasonComplete: boolean;
  currentWeek: number | null;
  isSample: boolean;
  coverage: Record<string, string>;
  screenshotsNeeded: Record<string, string[]>;
  warnings: { year: number; message: string }[];
  counts: { owners: number; games: number; facts: number; records: number };
}

/** Slim owner info that is safe to ship to client components. */
export interface OwnerLite {
  key: string;
  name: string;
  color: string | null;
  logo: string | null;
}
