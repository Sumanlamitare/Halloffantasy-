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
