import "server-only";
import type {
  MatchupDoc,
  MatchupSide,
  MatchupWinner,
  MemberDoc,
  PlayoffDoc,
  SeasonDoc,
  TeamDoc,
} from "@/lib/db/collections";
import type { EspnLeague, EspnScheduleSide, EspnTeam } from "@/lib/espn/types";

/** ESPN member GUIDs look like "{ABCD-...}". Strip braces, lowercase. */
export function cleanId(id: string): string {
  return id.replace(/[{}]/g, "").toLowerCase();
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function teamName(t: EspnTeam): string {
  if (t.name?.trim()) return t.name.trim();
  const combined = [t.location, t.nickname].filter(Boolean).join(" ").trim();
  return combined || `Team ${t.id}`;
}

export function isPointsScoring(scoringType: string | null): boolean {
  return !!scoringType && scoringType.includes("POINTS");
}

function side(s: EspnScheduleSide, pointsLeague: boolean): MatchupSide | null {
  if (typeof s?.teamId !== "number") return null;
  const cs = s.cumulativeScore;
  const hasCats = !pointsLeague && cs && (num(cs.wins) !== null || num(cs.losses) !== null);
  return {
    teamId: s.teamId,
    score: pointsLeague ? num(s.totalPoints) : null,
    categoryWins: hasCats ? num(cs!.wins) : null,
    categoryLosses: hasCats ? num(cs!.losses) : null,
    categoryTies: hasCats ? num(cs!.ties) : null,
  };
}

function normalizeWinner(w: unknown): MatchupWinner {
  return w === "HOME" || w === "AWAY" || w === "TIE" ? w : "UNDECIDED";
}

export function winnerTeamId(m: { home: MatchupSide; away: MatchupSide | null; winner: MatchupWinner }): number | null {
  if (m.winner === "HOME") return m.home.teamId;
  if (m.winner === "AWAY") return m.away?.teamId ?? null;
  return null;
}

export function loserTeamId(m: { home: MatchupSide; away: MatchupSide | null; winner: MatchupWinner }): number | null {
  if (m.winner === "HOME") return m.away?.teamId ?? null;
  if (m.winner === "AWAY") return m.home.teamId;
  return null;
}

function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finals";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}

export interface NormalizedCore {
  season: Omit<SeasonDoc, "data" | "importedAt">;
  teams: TeamDoc[];
  members: MemberDoc[];
  matchups: MatchupDoc[];
  playoffs: PlayoffDoc[];
}

/**
 * Converts one season of ESPN league data into our documents.
 * Only values ESPN actually returned are stored; missing values stay null.
 */
export function normalizeCore(
  leagueId: string,
  seasonYear: number,
  league: EspnLeague,
  fromLeagueHistory: boolean,
): NormalizedCore {
  const settings = league.settings ?? {};
  const sched = settings.scheduleSettings ?? {};
  const scoringType = settings.scoringSettings?.scoringType ?? null;
  const pointsLeague = isPointsScoring(scoringType);
  const regularPeriods = num(sched.matchupPeriodCount);
  const playoffTeamCount = num(sched.playoffTeamCount);

  /* Members ---------------------------------------------------------- */
  const members: MemberDoc[] = (league.members ?? [])
    .filter((m) => typeof m.id === "string")
    .map((m) => ({
      leagueId,
      season: seasonYear,
      memberId: cleanId(m.id!),
      displayName: m.displayName?.trim() || null,
      firstName: m.firstName?.trim() || null,
      lastName: m.lastName?.trim() || null,
      isLeagueManager: !!m.isLeagueManager,
    }));

  /* Matchups --------------------------------------------------------- */
  const matchups: MatchupDoc[] = [];
  for (const item of league.schedule ?? []) {
    if (typeof item.id !== "number" || typeof item.matchupPeriodId !== "number") continue;
    const home = side(item.home ?? {}, pointsLeague);
    if (!home) continue;
    const away = item.away ? side(item.away, pointsLeague) : null;
    const tier = item.playoffTierType ?? null;
    const isPlayoff =
      (tier !== null && tier !== "NONE") ||
      (regularPeriods !== null && item.matchupPeriodId > regularPeriods);
    matchups.push({
      leagueId,
      season: seasonYear,
      matchupId: item.id,
      matchupPeriodId: item.matchupPeriodId,
      isPlayoff,
      playoffTierType: tier,
      home,
      away,
      winner: normalizeWinner(item.winner),
    });
  }

  /* Playoffs --------------------------------------------------------- */
  const playoffMatchups = matchups.filter((m) => m.isPlayoff);
  const firstPlayoffPeriod = playoffMatchups.length
    ? Math.min(...playoffMatchups.map((m) => m.matchupPeriodId))
    : 0;
  const lastPlayoffPeriod = playoffMatchups.length
    ? Math.max(...playoffMatchups.map((m) => m.matchupPeriodId))
    : 0;
  const totalRounds = lastPlayoffPeriod - firstPlayoffPeriod + 1;

  // Championship = the single winners-bracket matchup in the final playoff period.
  const winnersBracket = playoffMatchups.filter((m) => m.playoffTierType === "WINNERS_BRACKET");
  const lastWinnersPeriod = winnersBracket.length
    ? Math.max(...winnersBracket.map((m) => m.matchupPeriodId))
    : null;
  const finalCandidates = winnersBracket.filter(
    (m) => m.matchupPeriodId === lastWinnersPeriod && m.away !== null,
  );
  const championship = finalCandidates.length === 1 ? finalCandidates[0] : null;

  const playoffs: PlayoffDoc[] = playoffMatchups.map((m) => {
    const round = m.matchupPeriodId - firstPlayoffPeriod + 1;
    return {
      leagueId,
      season: seasonYear,
      matchupId: m.matchupId,
      matchupPeriodId: m.matchupPeriodId,
      round,
      roundName: roundName(round, totalRounds),
      tier: m.playoffTierType ?? "UNKNOWN",
      home: m.home,
      away: m.away,
      winner: m.winner,
      winnerTeamId: winnerTeamId(m),
      isChampionship: championship?.matchupId === m.matchupId,
    };
  });

  /* Teams ------------------------------------------------------------ */
  const playoffParticipants = new Set<number>();
  for (const m of winnersBracket) {
    playoffParticipants.add(m.home.teamId);
    if (m.away) playoffParticipants.add(m.away.teamId);
  }

  const teams: TeamDoc[] = (league.teams ?? [])
    .filter((t) => typeof t.id === "number")
    .map((t) => {
      const ownerIds = (t.owners ?? []).filter((o) => typeof o === "string").map(cleanId);
      const primary = t.primaryOwner ? cleanId(t.primaryOwner) : ownerIds[0];
      const rec = t.record?.overall ?? {};
      const seed = num(t.playoffSeed);
      // ESPN's final placement after playoffs; 0 until the season is decided.
      const finalStanding = num(t.rankCalculatedFinal) || num(t.rankFinal);
      let madePlayoffs: boolean | null = null;
      if (playoffTeamCount !== null && seed !== null && seed > 0) {
        madePlayoffs = seed <= playoffTeamCount;
      } else if (winnersBracket.length > 0) {
        madePlayoffs = playoffParticipants.has(t.id!);
      }
      return {
        leagueId,
        season: seasonYear,
        teamId: t.id!,
        name: teamName(t),
        abbrev: t.abbrev ?? null,
        // No owner on record: identify the manager by team slot, flagged as unknown.
        managerId: primary ?? `team-${t.id}`,
        ownerIds,
        wins: num(rec.wins),
        losses: num(rec.losses),
        ties: num(rec.ties),
        pointsFor: num(rec.pointsFor),
        pointsAgainst: num(rec.pointsAgainst),
        playoffSeed: seed && seed > 0 ? seed : null,
        finalStanding: finalStanding && finalStanding > 0 ? finalStanding : null,
        madePlayoffs,
      };
    });

  /* Champion --------------------------------------------------------- */
  // Prefer ESPN's official final ranking; fall back to the championship matchup result.
  let championTeamId = teams.find((t) => t.finalStanding === 1)?.teamId ?? null;
  let runnerUpTeamId = teams.find((t) => t.finalStanding === 2)?.teamId ?? null;
  if (championTeamId === null && championship) {
    championTeamId = winnerTeamId(championship);
    runnerUpTeamId = loserTeamId(championship);
  }
  if (runnerUpTeamId === null && championship && championTeamId !== null) {
    const ids = [championship.home.teamId, championship.away?.teamId];
    if (ids.includes(championTeamId)) {
      runnerUpTeamId = ids.find((id) => id !== championTeamId) ?? null;
    }
  }

  // Season still in progress: current seeds are not final, so only teams
  // already in the winners bracket are known playoff teams.
  if (championTeamId === null) {
    for (const t of teams) {
      t.madePlayoffs = winnersBracket.length > 0 && playoffParticipants.has(t.teamId) ? true : null;
    }
  }

  return {
    season: {
      leagueId,
      season: seasonYear,
      name: settings.name?.trim() || `League ${leagueId}`,
      size: num(settings.size) ?? teams.length,
      scoringType,
      settings: {
        regularSeasonMatchupPeriods: regularPeriods,
        playoffTeamCount,
        playoffMatchupPeriodLength: num(sched.playoffMatchupPeriodLength),
        isPublic: typeof settings.isPublic === "boolean" ? settings.isPublic : null,
      },
      isComplete: championTeamId !== null,
      championTeamId,
      runnerUpTeamId,
      championshipMatchupId: championship?.matchupId ?? null,
      fromLeagueHistory,
    },
    teams,
    members,
    matchups,
    playoffs,
  };
}
