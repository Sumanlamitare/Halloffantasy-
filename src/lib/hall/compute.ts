import "server-only";
import {
  getCollections,
  type ChampionEntry,
  type HallRecordsDoc,
  type ManagerSeason,
  type ManagerSummary,
  type MatchupSide,
  type MemberDoc,
  type RecordEntry,
  type RecordHolder,
  type SeasonDoc,
  type TeamDoc,
} from "@/lib/db/collections";
import { formatPct, formatPoints, formatRecord, winPct } from "@/lib/format";
import { isPointsScoring } from "@/lib/import/normalize";
import { seasonHofPoints } from "./scoring";

/**
 * Builds the league's Hall of Fame data (managers, champions, records)
 * purely from imported ESPN data and stores it in `hall_records`.
 *
 * Rules:
 *  - Career stats, Hall of Fame Score and records use completed seasons only
 *    (a season is complete once ESPN reports its champion).
 *  - Points-based stats only use seasons with a points scoring type.
 *  - A record is omitted when the data needed to calculate it doesn't exist.
 */

function memberName(m: MemberDoc | undefined): string | null {
  if (!m) return null;
  if (m.firstName && m.lastName) return `${m.firstName} ${m.lastName}`;
  return m.displayName ?? m.firstName ?? null;
}

function scoreText(s: MatchupSide | null, pointsLeague: boolean): string | null {
  if (!s) return null;
  if (pointsLeague) return formatPoints(s.score);
  if (s.categoryWins === null || s.categoryLosses === null) return null;
  return formatRecord(s.categoryWins, s.categoryLosses, s.categoryTies ?? 0);
}

export async function recomputeHall(leagueId: string): Promise<HallRecordsDoc> {
  const c = await getCollections();
  const [seasons, teams, members, regularMatchups, finals] = await Promise.all([
    c.seasons.find({ leagueId, "data.core": "complete" }).sort({ season: 1 }).toArray(),
    c.teams.find({ leagueId }).toArray(),
    c.members.find({ leagueId }).toArray(),
    c.matchups.find({ leagueId, isPlayoff: false }).sort({ season: 1, matchupPeriodId: 1, matchupId: 1 }).toArray(),
    c.playoffs.find({ leagueId, isChampionship: true }).toArray(),
  ]);

  const seasonByYear = new Map<number, SeasonDoc>(seasons.map((s) => [s.season, s]));
  const validTeams = teams.filter((t) => seasonByYear.has(t.season));
  const completed = seasons.filter((s) => s.isComplete).map((s) => s.season);
  const completedSet = new Set(completed);

  const memberByKey = new Map<string, MemberDoc>();
  for (const m of members) memberByKey.set(`${m.season}:${m.memberId}`, m);

  /* Manager names: most recent season wins ----------------------------- */
  const nameByManager = new Map<string, { name: string; known: boolean; season: number }>();
  for (const t of validTeams) {
    const prev = nameByManager.get(t.managerId);
    if (prev && prev.season > t.season) continue;
    const resolved = memberName(memberByKey.get(`${t.season}:${t.managerId}`));
    if (resolved) nameByManager.set(t.managerId, { name: resolved, known: true, season: t.season });
    else if (!prev || !prev.known) nameByManager.set(t.managerId, { name: t.name, known: false, season: t.season });
  }
  const nameOf = (id: string) => nameByManager.get(id)?.name ?? "Unknown manager";

  const teamKey = (season: number, teamId: number) => `${season}:${teamId}`;
  const teamByKey = new Map<string, TeamDoc>(validTeams.map((t) => [teamKey(t.season, t.teamId), t]));

  /* Managers ----------------------------------------------------------- */
  const byManager = new Map<string, TeamDoc[]>();
  for (const t of validTeams) {
    const list = byManager.get(t.managerId) ?? [];
    list.push(t);
    byManager.set(t.managerId, list);
  }

  const managers: ManagerSummary[] = [];
  for (const [managerId, list] of byManager) {
    let championships = 0, finalsCount = 0, playoffs = 0, wins = 0, losses = 0, ties = 0, hofScore = 0;
    let pointsFor: number | null = null;
    let best: number | null = null, worst: number | null = null, played = 0;
    const championshipSeasons: number[] = [];
    const seasonRows: ManagerSeason[] = [];

    for (const t of list.sort((a, b) => b.season - a.season)) {
      const s = seasonByYear.get(t.season)!;
      const isChamp = s.championTeamId === t.teamId;
      const isRunnerUp = s.runnerUpTeamId === t.teamId;
      seasonRows.push({
        season: t.season,
        teamId: t.teamId,
        teamName: t.name,
        wins: t.wins,
        losses: t.losses,
        ties: t.ties,
        pointsFor: t.pointsFor,
        playoffSeed: t.playoffSeed,
        finalStanding: t.finalStanding,
        madePlayoffs: t.madePlayoffs,
        result: isChamp ? "CHAMPION" : isRunnerUp ? "RUNNER_UP" : null,
        isComplete: s.isComplete,
      });
      if (!completedSet.has(t.season)) continue;

      played += 1;
      if (isChamp) {
        championships += 1;
        championshipSeasons.push(t.season);
      }
      if (isChamp || isRunnerUp) finalsCount += 1;
      const madePlayoffs = t.madePlayoffs === true || isChamp || isRunnerUp;
      if (madePlayoffs) playoffs += 1;
      if (t.wins !== null && t.losses !== null) {
        wins += t.wins;
        losses += t.losses;
        ties += t.ties ?? 0;
      }
      if (isPointsScoring(s.scoringType) && t.pointsFor !== null) {
        pointsFor = (pointsFor ?? 0) + t.pointsFor;
      }
      if (t.playoffSeed !== null) {
        best = best === null ? t.playoffSeed : Math.min(best, t.playoffSeed);
        worst = worst === null ? t.playoffSeed : Math.max(worst, t.playoffSeed);
      }
      hofScore += seasonHofPoints({
        champion: isChamp,
        runnerUp: isRunnerUp,
        madePlayoffs,
        firstSeed: t.playoffSeed === 1,
      });
    }

    managers.push({
      managerId,
      name: nameOf(managerId),
      ownerKnown: nameByManager.get(managerId)?.known ?? false,
      seasonsPlayed: played,
      championships,
      championshipSeasons: championshipSeasons.sort((a, b) => b - a),
      finals: finalsCount,
      playoffs,
      wins,
      losses,
      ties,
      winPct: winPct(wins, losses, ties),
      pointsFor: pointsFor === null ? null : Math.round(pointsFor * 10) / 10,
      bestFinish: best,
      worstFinish: worst,
      hofScore,
      seasons: seasonRows,
    });
  }

  managers.sort(
    (a, b) =>
      b.hofScore - a.hofScore ||
      b.championships - a.championships ||
      b.finals - a.finals ||
      b.playoffs - a.playoffs ||
      (b.winPct ?? 0) - (a.winPct ?? 0) ||
      a.name.localeCompare(b.name),
  );

  /* Champions ---------------------------------------------------------- */
  const finalBySeason = new Map(finals.map((f) => [f.season, f]));
  const champions: ChampionEntry[] = [...seasons].reverse().map((s) => {
    const ref = (teamId: number | null) => {
      if (teamId === null) return null;
      const t = teamByKey.get(teamKey(s.season, teamId));
      if (!t) return null;
      return { managerId: t.managerId, name: nameOf(t.managerId), teamName: t.name, teamId };
    };
    const champion = ref(s.championTeamId);
    const runnerUp = ref(s.runnerUpTeamId);
    let finalScore: ChampionEntry["finalScore"] = null;
    const f = finalBySeason.get(s.season);
    if (f && champion && runnerUp && f.away) {
      const pts = isPointsScoring(s.scoringType);
      const champSide = f.home.teamId === champion.teamId ? f.home : f.away.teamId === champion.teamId ? f.away : null;
      const ruSide = f.home.teamId === runnerUp.teamId ? f.home : f.away.teamId === runnerUp.teamId ? f.away : null;
      const cs = scoreText(champSide, pts);
      const rs = scoreText(ruSide, pts);
      if (cs && rs) finalScore = { champion: cs, runnerUp: rs };
    }
    return { season: s.season, isComplete: s.isComplete, champion, runnerUp, finalScore };
  });

  /* Records ------------------------------------------------------------ */
  const records: RecordEntry[] = [];
  const holder = (m: ManagerSummary): RecordHolder => ({ managerId: m.managerId, name: m.name });

  function careerRecord(
    key: string,
    title: string,
    detail: string,
    pool: ManagerSummary[],
    value: (m: ManagerSummary) => number | null,
    display: (v: number) => string,
  ) {
    const scored = pool
      .map((m) => ({ m, v: value(m) }))
      .filter((x): x is { m: ManagerSummary; v: number } => x.v !== null && x.v > 0);
    if (!scored.length) return;
    const top = Math.max(...scored.map((x) => x.v));
    records.push({
      key,
      title,
      value: display(top),
      detail,
      holders: scored.filter((x) => x.v === top).map((x) => holder(x.m)),
    });
  }

  const n = (v: number) => v.toLocaleString("en-US");
  careerRecord("most_championships", "Most Championships", "Career titles", managers, (m) => m.championships, n);
  careerRecord("most_wins", "Most Wins", "Career regular-season wins (ESPN standings record)", managers, (m) => m.wins, n);

  const minSeasons = Math.max(1, Math.ceil(completed.length / 2));
  careerRecord(
    "best_win_pct",
    "Best Win Percentage",
    `Career regular-season win % (ties count as half), minimum ${minSeasons} completed season${minSeasons === 1 ? "" : "s"}`,
    managers.filter((m) => m.seasonsPlayed >= minSeasons),
    (m) => m.winPct,
    (v) => formatPct(v) ?? "",
  );
  careerRecord("most_points_for", "Most Points For", "Career regular-season points (points leagues only)", managers, (m) => m.pointsFor, (v) => formatPoints(v) ?? "");
  careerRecord("most_finals", "Most Finals Appearances", "Championship or runner-up finishes", managers, (m) => m.finals, n);
  careerRecord("most_playoffs", "Most Playoff Appearances", "Seasons reaching the playoffs", managers, (m) => m.playoffs, n);

  // Best single regular season
  const seasonTeams = validTeams.filter((t) => completedSet.has(t.season) && t.wins !== null && t.losses !== null);
  if (seasonTeams.length) {
    const scored = seasonTeams.map((t) => ({ t, pct: winPct(t.wins!, t.losses!, t.ties ?? 0) ?? -1 }));
    scored.sort((a, b) => b.pct - a.pct || b.t.wins! - a.t.wins! || (b.t.pointsFor ?? 0) - (a.t.pointsFor ?? 0));
    const topRow = scored[0];
    if (topRow.pct >= 0) {
      const tied = scored.filter(
        (x) => x.pct === topRow.pct && x.t.wins === topRow.t.wins && (x.t.pointsFor ?? 0) === (topRow.t.pointsFor ?? 0),
      );
      records.push({
        key: "best_regular_season",
        title: "Best Regular Season",
        value: formatRecord(topRow.t.wins, topRow.t.losses, topRow.t.ties) ?? "",
        detail: "Highest single-season regular-season win % (tiebreakers: wins, then points for)",
        holders: tied.map((x) => ({ managerId: x.t.managerId, name: nameOf(x.t.managerId), season: x.t.season, teamName: x.t.name })),
      });
    }
  }

  // Longest winning streak (regular-season head-to-head matchups, spanning seasons)
  const streak = new Map<string, { current: number; best: number; bestEnd: number | null; currentStart: number | null; bestStart: number | null }>();
  let anyDecided = false;
  for (const m of regularMatchups) {
    if (!completedSet.has(m.season) || !m.away || m.winner === "UNDECIDED") continue;
    anyDecided = true;
    for (const [sideTeam, won] of [
      [m.home.teamId, m.winner === "HOME"],
      [m.away.teamId, m.winner === "AWAY"],
    ] as const) {
      const t = teamByKey.get(teamKey(m.season, sideTeam));
      if (!t) continue;
      const st = streak.get(t.managerId) ?? { current: 0, best: 0, bestEnd: null, currentStart: null, bestStart: null };
      if (won) {
        if (st.current === 0) st.currentStart = m.season;
        st.current += 1;
        if (st.current > st.best) {
          st.best = st.current;
          st.bestStart = st.currentStart;
          st.bestEnd = m.season;
        }
      } else {
        st.current = 0;
        st.currentStart = null;
      }
      streak.set(t.managerId, st);
    }
  }
  if (anyDecided) {
    const top = Math.max(0, ...[...streak.values()].map((s) => s.best));
    if (top > 0) {
      records.push({
        key: "longest_win_streak",
        title: "Longest Winning Streak",
        value: `${top}`,
        detail: "Consecutive regular-season matchup wins (can span seasons)",
        holders: [...streak.entries()]
          .filter(([, s]) => s.best === top)
          .map(([id, s]) => ({
            managerId: id,
            name: nameOf(id),
            note: s.bestStart !== null && s.bestStart !== s.bestEnd ? `${s.bestStart}–${s.bestEnd}` : `${s.bestEnd}`,
          })),
      });
    }
  }

  // Highest single-season points
  const pointsTeams = validTeams.filter(
    (t) => completedSet.has(t.season) && isPointsScoring(seasonByYear.get(t.season)!.scoringType) && t.pointsFor !== null,
  );
  if (pointsTeams.length) {
    const top = Math.max(...pointsTeams.map((t) => t.pointsFor!));
    if (top > 0) {
      records.push({
        key: "highest_season_points",
        title: "Highest Single-Season Points",
        value: formatPoints(top) ?? "",
        detail: "Most regular-season points for in one season",
        holders: pointsTeams
          .filter((t) => t.pointsFor === top)
          .map((t) => ({ managerId: t.managerId, name: nameOf(t.managerId), season: t.season, teamName: t.name })),
      });
    }
  }

  const doc: HallRecordsDoc = {
    leagueId,
    computedAt: new Date(),
    completedSeasons: [...completed].sort((a, b) => b - a),
    allSeasons: seasons.map((s) => s.season).sort((a, b) => b - a),
    managers,
    champions,
    records,
  };
  await c.hallRecords.replaceOne({ leagueId }, doc, { upsert: true });
  return doc;
}
