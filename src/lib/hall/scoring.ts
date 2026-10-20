/**
 * Hall of Fame Score — a transparent formula computed only from imported
 * ESPN results. Each completed season awards points for a manager's best
 * outcome that year (they don't stack), plus a bonus for finishing first in
 * the regular season.
 *
 * Shared by the server (computation) and UI (explanation), so the displayed
 * definition always matches the math.
 */
export const HOF_POINTS = {
  championship: 10,
  runnerUp: 6,
  playoffAppearance: 3,
  regularSeasonFirst: 2,
} as const;

export const HOF_SCORE_RULES: { label: string; points: number }[] = [
  { label: "Championship", points: HOF_POINTS.championship },
  { label: "Runner-up (lost in the finals)", points: HOF_POINTS.runnerUp },
  { label: "Other playoff appearance", points: HOF_POINTS.playoffAppearance },
  { label: "Bonus: #1 regular-season seed", points: HOF_POINTS.regularSeasonFirst },
];

export function seasonHofPoints(opts: {
  champion: boolean;
  runnerUp: boolean;
  madePlayoffs: boolean;
  firstSeed: boolean;
}): number {
  const base = opts.champion
    ? HOF_POINTS.championship
    : opts.runnerUp
      ? HOF_POINTS.runnerUp
      : opts.madePlayoffs
        ? HOF_POINTS.playoffAppearance
        : 0;
  return base + (opts.firstSeed ? HOF_POINTS.regularSeasonFirst : 0);
}

/**
 * Hall of Fame Probability — progress toward the league's induction bar,
 * computed only from career totals of completed seasons:
 *
 *   5+ championships, 10+ playoff appearances, 500,000+ points for, 100+ wins
 *
 * Each criterion's progress is capped at 100% and the probability is their
 * average. 100% means every bar is met ("Inducted"). Points for only exists
 * in points leagues; when no manager has points data, that criterion is left
 * out and the other three are averaged.
 */
export const HOF_INDUCTION = [
  { key: "championships", label: "Championships", target: 5 },
  { key: "playoffs", label: "Playoff appearances", target: 10 },
  { key: "pointsFor", label: "Points for", target: 500_000 },
  { key: "wins", label: "Wins", target: 100 },
] as const;

export type InductionKey = (typeof HOF_INDUCTION)[number]["key"];

export interface InductionProgress {
  key: InductionKey;
  label: string;
  target: number;
  value: number;
  /** 0–1, capped at 1. */
  progress: number;
}

export interface HofProbability {
  /** 0–100, rounded to a whole number. */
  percent: number;
  inducted: boolean;
  criteria: InductionProgress[];
}

export function hofProbability(
  m: { championships: number; playoffs: number; pointsFor: number | null; wins: number },
  pointsTracked: boolean,
): HofProbability {
  const criteria = HOF_INDUCTION.filter((c) => c.key !== "pointsFor" || pointsTracked).map((c) => {
    const value = c.key === "pointsFor" ? (m.pointsFor ?? 0) : m[c.key];
    return { key: c.key, label: c.label, target: c.target, value, progress: Math.min(1, value / c.target) };
  });
  const avg = criteria.reduce((sum, c) => sum + c.progress, 0) / criteria.length;
  const inducted = criteria.every((c) => c.progress >= 1);
  // Never show 100% unless every bar is actually met.
  const percent = inducted ? 100 : Math.min(99, Math.round(avg * 100));
  return { percent, inducted, criteria };
}

/** Points-for criterion applies when the league has any points-scoring data. */
export function leagueTracksPoints(managers: { pointsFor: number | null }[]): boolean {
  return managers.some((m) => m.pointsFor !== null);
}
