import "server-only";
import type { Collection, Db } from "mongodb";
import { getDb } from "./mongo";

/* ------------------------------------------------------------------ */
/* Document types                                                      */
/* ------------------------------------------------------------------ */

/** Status of one category of data for a season. */
export type DataStatus = "pending" | "complete" | "unavailable" | "failed";

export interface LeagueDoc {
  _id: string; // ESPN league ID
  espnLeagueId: string;
  code: string | null; // Hall of Fantasy access code, e.g. HOF-7X92KQ
  name: string;
  size: number;
  currentSeason: number;
  /** Seasons with core data successfully imported. */
  seasons: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SeasonDoc {
  leagueId: string;
  season: number;
  name: string;
  size: number;
  scoringType: string | null;
  /** Subset of ESPN league settings that we use or display. */
  settings: {
    regularSeasonMatchupPeriods: number | null;
    playoffTeamCount: number | null;
    playoffMatchupPeriodLength: number | null;
    isPublic: boolean | null;
  };
  isComplete: boolean;
  championTeamId: number | null;
  runnerUpTeamId: number | null;
  championshipMatchupId: number | null;
  /** True when this season was read from ESPN's pre-2018 leagueHistory endpoint. */
  fromLeagueHistory: boolean;
  data: {
    core: DataStatus;
  };
  importedAt: Date;
}

export interface TeamDoc {
  leagueId: string;
  season: number;
  teamId: number;
  name: string;
  abbrev: string | null;
  /** Stable manager identity across seasons (ESPN member GUID, braces stripped). */
  managerId: string;
  ownerIds: string[];
  wins: number | null;
  losses: number | null;
  ties: number | null;
  pointsFor: number | null;
  pointsAgainst: number | null;
  /** Regular-season seed from ESPN. */
  playoffSeed: number | null;
  /** Final standing after playoffs from ESPN (rankCalculatedFinal). */
  finalStanding: number | null;
  madePlayoffs: boolean | null;
}

export interface MemberDoc {
  leagueId: string;
  season: number;
  memberId: string; // braces stripped, lowercase
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  isLeagueManager: boolean;
}

export interface MatchupSide {
  teamId: number;
  /** Points scored (points leagues) — null when ESPN did not provide it. */
  score: number | null;
  /** Category results for category leagues, when ESPN provided them. */
  categoryWins: number | null;
  categoryLosses: number | null;
  categoryTies: number | null;
}

export type MatchupWinner = "HOME" | "AWAY" | "TIE" | "UNDECIDED";

export interface MatchupDoc {
  leagueId: string;
  season: number;
  matchupId: number;
  matchupPeriodId: number;
  isPlayoff: boolean;
  playoffTierType: string | null;
  home: MatchupSide;
  away: MatchupSide | null; // null = bye
  winner: MatchupWinner;
}

export interface PlayoffDoc {
  leagueId: string;
  season: number;
  matchupId: number;
  matchupPeriodId: number;
  round: number;
  roundName: string;
  tier: string; // WINNERS_BRACKET, WINNERS_CONSOLATION_LADDER, ...
  home: MatchupSide;
  away: MatchupSide | null;
  winner: MatchupWinner;
  winnerTeamId: number | null;
  isChampionship: boolean;
}

/* Computed hall data ------------------------------------------------ */

export interface ManagerSeason {
  season: number;
  teamId: number;
  teamName: string;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  pointsFor: number | null;
  playoffSeed: number | null;
  finalStanding: number | null;
  madePlayoffs: boolean | null;
  result: "CHAMPION" | "RUNNER_UP" | null;
  isComplete: boolean;
}

export interface ManagerSummary {
  managerId: string;
  name: string;
  ownerKnown: boolean;
  seasonsPlayed: number; // completed seasons
  championships: number;
  championshipSeasons: number[];
  finals: number;
  playoffs: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number | null;
  pointsFor: number | null; // only from points-based seasons
  bestFinish: number | null; // best regular-season seed
  worstFinish: number | null;
  hofScore: number;
  seasons: ManagerSeason[]; // newest first, includes in-progress seasons
}

export interface ChampionEntry {
  season: number;
  isComplete: boolean;
  champion: { managerId: string; name: string; teamName: string; teamId: number } | null;
  runnerUp: { managerId: string; name: string; teamName: string; teamId: number } | null;
  finalScore: { champion: string; runnerUp: string } | null;
}

export interface RecordHolder {
  managerId: string;
  name: string;
  season?: number;
  teamName?: string;
  note?: string;
}

export interface RecordEntry {
  key: string;
  title: string;
  value: string;
  detail: string;
  holders: RecordHolder[];
}

export interface HallRecordsDoc {
  leagueId: string;
  computedAt: Date;
  completedSeasons: number[];
  allSeasons: number[];
  managers: ManagerSummary[];
  champions: ChampionEntry[];
  records: RecordEntry[];
}

/* Import job -------------------------------------------------------- */

export type ImportStep = "core";

export interface ImportSeasonState {
  season: number;
  status: "pending" | "running" | "complete" | "unavailable" | "failed";
  steps: Record<ImportStep, DataStatus>;
  error: string | null;
}

export interface ImportDoc {
  _id: string; // random, unguessable import ID
  leagueId: string;
  leagueName: string;
  leagueSize: number;
  currentSeason: number;
  availableSeasons: number[];
  isPrivate: boolean;
  status: "connected" | "running" | "complete" | "failed";
  seasons: ImportSeasonState[];
  error: string | null;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface ImportCredentialsDoc {
  _id: string; // same as import ID
  iv: string;
  tag: string;
  ciphertext: string;
  expiresAt: Date;
}

/* ------------------------------------------------------------------ */
/* Accessors + indexes                                                  */
/* ------------------------------------------------------------------ */

export interface Collections {
  leagues: Collection<LeagueDoc>;
  seasons: Collection<SeasonDoc>;
  teams: Collection<TeamDoc>;
  members: Collection<MemberDoc>;
  matchups: Collection<MatchupDoc>;
  playoffs: Collection<PlayoffDoc>;
  hallRecords: Collection<HallRecordsDoc>;
  imports: Collection<ImportDoc>;
  importCredentials: Collection<ImportCredentialsDoc>;
}

function bind(db: Db): Collections {
  return {
    leagues: db.collection<LeagueDoc>("leagues"),
    seasons: db.collection<SeasonDoc>("seasons"),
    teams: db.collection<TeamDoc>("teams"),
    members: db.collection<MemberDoc>("members"),
    matchups: db.collection<MatchupDoc>("matchups"),
    playoffs: db.collection<PlayoffDoc>("playoffs"),
    hallRecords: db.collection<HallRecordsDoc>("hall_records"),
    imports: db.collection<ImportDoc>("imports"),
    importCredentials: db.collection<ImportCredentialsDoc>("import_credentials"),
  };
}

async function ensureIndexes(c: Collections): Promise<void> {
  await Promise.all([
    c.leagues.createIndex({ code: 1 }, { unique: true, partialFilterExpression: { code: { $type: "string" } } }),
    c.seasons.createIndex({ leagueId: 1, season: 1 }, { unique: true }),
    c.teams.createIndex({ leagueId: 1, season: 1, teamId: 1 }, { unique: true }),
    c.teams.createIndex({ leagueId: 1, managerId: 1 }),
    c.members.createIndex({ leagueId: 1, season: 1, memberId: 1 }, { unique: true }),
    c.matchups.createIndex({ leagueId: 1, season: 1, matchupId: 1 }, { unique: true }),
    c.matchups.createIndex({ leagueId: 1, season: 1, matchupPeriodId: 1 }),
    c.playoffs.createIndex({ leagueId: 1, season: 1, matchupId: 1 }, { unique: true }),
    c.hallRecords.createIndex({ leagueId: 1 }, { unique: true }),
    c.imports.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.importCredentials.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

type IndexGlobal = typeof globalThis & { _hofIndexes?: Promise<void> };
const g = globalThis as IndexGlobal;

export async function getCollections(): Promise<Collections> {
  const c = bind(await getDb());
  if (!g._hofIndexes) {
    g._hofIndexes = ensureIndexes(c).catch((err) => {
      g._hofIndexes = undefined;
      throw err;
    });
  }
  await g._hofIndexes;
  return c;
}
