import "server-only";
import { cache } from "react";
import {
  getCollections,
  type ChampionEntry,
  type HallRecordsDoc,
  type LeagueDoc,
  type ManagerSummary,
  type MatchupDoc,
  type PlayoffDoc,
  type SeasonDoc,
} from "@/lib/db/collections";
import { normalizeLeagueCode } from "@/lib/league-code";
import { isSyncDue } from "@/lib/sync/league-sync";

/**
 * Read-side of the Hall. Everything here reads MongoDB only — visitors never
 * trigger requests to ESPN. Results are plain JSON-safe objects without
 * Mongo internals or any credentials.
 */

export interface HallSync {
  autoUpdate: boolean;
  hasActiveSeason: boolean;
  lastSyncedAt: string | null;
  status: "ok" | "needs_credentials" | "error" | null;
  /** A background refresh from ESPN is due. */
  due: boolean;
}

export interface Hall {
  league: Pick<LeagueDoc, "name" | "size" | "currentSeason" | "code"> & { leagueId: string };
  sync: HallSync;
  records: Omit<HallRecordsDoc, "leagueId" | "computedAt"> & { computedAt: string };
}

export const getHall = cache(async (rawCode: string): Promise<Hall | null> => {
  const code = normalizeLeagueCode(decodeURIComponent(rawCode));
  if (!code) return null;
  const c = await getCollections();
  const league = await c.leagues.findOne({ code });
  if (!league) return null;
  const records = await c.hallRecords.findOne({ leagueId: league._id }, { projection: { _id: 0 } });
  if (!records) return null;
  return {
    league: {
      leagueId: league._id,
      name: league.name,
      size: league.size,
      currentSeason: league.currentSeason,
      code: league.code,
    },
    sync: {
      autoUpdate: !!league.autoUpdate,
      hasActiveSeason: !!league.hasActiveSeason,
      lastSyncedAt: (league.lastSyncedAt ?? league.updatedAt)?.toISOString() ?? null,
      status: league.syncStatus ?? null,
      due: isSyncDue(league),
    },
    records: {
      completedSeasons: records.completedSeasons,
      allSeasons: records.allSeasons,
      managers: records.managers,
      champions: records.champions,
      records: records.records,
      computedAt: records.computedAt.toISOString(),
    },
  };
});

export function hallSummary(hall: Hall) {
  const r = hall.records;
  return {
    name: hall.league.name,
    code: hall.league.code,
    seasons: r.allSeasons,
    completedSeasons: r.completedSeasons,
    seasonCount: r.allSeasons.length,
    managerCount: r.managers.length,
    championshipCount: r.champions.filter((c) => c.champion).length,
  };
}

export function getManager(hall: Hall, managerId: string): ManagerSummary | null {
  return hall.records.managers.find((m) => m.managerId === managerId) ?? null;
}

/* Season detail --------------------------------------------------------- */

export interface TeamRow {
  teamId: number;
  name: string;
  managerId: string;
  managerName: string;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  pointsFor: number | null;
  pointsAgainst: number | null;
  playoffSeed: number | null;
  finalStanding: number | null;
  madePlayoffs: boolean | null;
}

type Strip<T> = Omit<T, "leagueId" | "season">;

export interface SeasonDetail {
  season: Omit<SeasonDoc, "leagueId" | "importedAt"> & { importedAt: string };
  teams: TeamRow[];
  champion: ChampionEntry | null;
  playoffs: Strip<PlayoffDoc>[];
  regularSeason: Strip<MatchupDoc>[];
}

export async function getSeasonDetail(hall: Hall, season: number): Promise<SeasonDetail | null> {
  const leagueId = hall.league.leagueId;
  const c = await getCollections();
  const seasonDoc = await c.seasons.findOne({ leagueId, season }, { projection: { _id: 0 } });
  if (!seasonDoc) return null;
  const proj = { projection: { _id: 0, leagueId: 0, season: 0 } } as const;
  const [teams, playoffs, regular] = await Promise.all([
    c.teams.find({ leagueId, season }, proj).toArray(),
    c.playoffs.find({ leagueId, season }, proj).sort({ round: 1, matchupId: 1 }).toArray(),
    c.matchups.find({ leagueId, season, isPlayoff: false }, proj).sort({ matchupPeriodId: 1, matchupId: 1 }).toArray(),
  ]);

  const managerNames = new Map(hall.records.managers.map((m) => [m.managerId, m.name]));
  const rows: TeamRow[] = teams.map((t) => ({
    teamId: t.teamId,
    name: t.name,
    managerId: t.managerId,
    managerName: managerNames.get(t.managerId) ?? t.name,
    wins: t.wins,
    losses: t.losses,
    ties: t.ties,
    pointsFor: t.pointsFor,
    pointsAgainst: t.pointsAgainst,
    playoffSeed: t.playoffSeed,
    finalStanding: t.finalStanding,
    madePlayoffs: t.madePlayoffs,
  }));

  const { leagueId: _l, importedAt, ...seasonRest } = seasonDoc;
  void _l;
  return {
    season: { ...seasonRest, importedAt: importedAt.toISOString() },
    teams: rows,
    champion: hall.records.champions.find((ch) => ch.season === season) ?? null,
    playoffs: playoffs as Strip<PlayoffDoc>[],
    regularSeason: regular as Strip<MatchupDoc>[],
  };
}

/** Champion's playoff path for a season (winners bracket games, including byes). */
export async function getPlayoffPath(hall: Hall, season: number) {
  const entry = hall.records.champions.find((c) => c.season === season);
  if (!entry?.champion) return [];
  const teamId = entry.champion.teamId;
  const c = await getCollections();
  const games = await c.playoffs
    .find(
      {
        leagueId: hall.league.leagueId,
        season,
        tier: "WINNERS_BRACKET",
        $or: [{ "home.teamId": teamId }, { "away.teamId": teamId }],
      },
      { projection: { _id: 0, leagueId: 0 } },
    )
    .sort({ round: 1 })
    .toArray();
  const teams = await c.teams
    .find({ leagueId: hall.league.leagueId, season }, { projection: { _id: 0, teamId: 1, name: 1 } })
    .toArray();
  const teamNames = new Map(teams.map((t) => [t.teamId, t.name]));
  const seasonDoc = await c.seasons.findOne({ leagueId: hall.league.leagueId, season }, { projection: { scoringType: 1 } });
  return games.map((g) => {
    const us = g.home.teamId === teamId ? g.home : g.away!;
    const them = g.home.teamId === teamId ? g.away : g.home;
    return {
      round: g.round,
      roundName: g.roundName,
      isBye: them === null,
      opponentName: them ? teamNames.get(them.teamId) ?? `Team ${them.teamId}` : null,
      us,
      them,
      won: g.winnerTeamId === teamId,
      scoringType: seasonDoc?.scoringType ?? null,
    };
  });
}
