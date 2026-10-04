import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, SectionTitle, TrophyIcon, Unavailable } from "@/components/ui";
import { getHall } from "@/lib/hall/queries";
import { HOF_INDUCTION, HOF_SCORE_RULES, hofProbability, leagueTracksPoints } from "@/lib/hall/scoring";

export default async function HallOfFamePage({ params }: PageProps<"/hall/[code]/hall-of-fame">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const code = hall.league.code!;
  const { managers, completedSeasons } = hall.records;
  const pointsTracked = leagueTracksPoints(managers);

  // Leaderboard: Hall of Fame Probability, then total Hall of Fame points.
  const rows = managers
    .map((m) => ({ m, p: hofProbability(m, pointsTracked) }))
    .sort((a, b) => b.p.percent - a.p.percent || b.m.hofScore - a.m.hofScore || a.m.name.localeCompare(b.m.name));

  const criteria = HOF_INDUCTION.filter((c) => c.key !== "pointsFor" || pointsTracked);

  return (
    <div>
      <SectionTitle eyebrow="The Greatest Managers" title="Hall of Fame">
        Leaderboard by Hall of Fame Probability, calculated only from {completedSeasons.length} completed season
        {completedSeasons.length === 1 ? "" : "s"} of imported ESPN results.
      </SectionTitle>

      {rows.length === 0 ? (
        <Unavailable>No managers have been imported yet.</Unavailable>
      ) : (
        <ol className="stagger divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          <li className="hidden grid-cols-[2.5rem_1fr_7rem_6rem] items-center gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle sm:grid">
            <span>#</span>
            <span>Manager</span>
            <span className="text-right">HOF Prob.</span>
            <span className="text-right">HOF Pts</span>
          </li>
          {rows.map(({ m, p }, i) => (
            <li key={m.managerId}>
              <Link
                href={`/hall/${code}/managers/${m.managerId}`}
                className="ripple grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-sunken sm:grid-cols-[2.5rem_1fr_7rem_6rem]"
              >
                <span className={`font-display text-xl ${i === 0 ? "text-accent" : "text-subtle"}`}>{i + 1}</span>

                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-lg font-semibold uppercase tracking-wide">{m.name}</span>
                    {m.championships > 0 && (
                      <span className="flex shrink-0 items-center gap-0.5 text-sm text-accent" aria-label={`${m.championships} championships`}>
                        <TrophyIcon className="h-4 w-4" />
                        {m.championships > 1 && m.championships}
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sunken">
                    <span
                      className={`block h-full origin-left rounded-full ${p.inducted ? "bg-accent" : "bg-fg"}`}
                      style={{ width: `${p.percent}%` }}
                    />
                  </span>
                </span>

                {/* Phone: % and points stacked on the right */}
                <span className="text-right sm:hidden">
                  <span className={`block font-display text-2xl font-semibold leading-none ${p.inducted ? "text-accent" : ""}`}>
                    {p.inducted ? "HOF" : `${p.percent}%`}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{m.hofScore} pts</span>
                </span>

                {/* Tablet / desktop columns */}
                <span className={`hidden text-right font-display text-2xl font-semibold sm:block ${p.inducted ? "text-accent" : ""}`}>
                  {p.inducted ? "Inducted" : `${p.percent}%`}
                </span>
                <span className="hidden text-right font-display text-2xl text-muted sm:block">{m.hofScore}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg uppercase tracking-wide">How Hall of Fame Probability works</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Progress toward the induction bar. Each requirement counts up to 100%, and the probability is their
            average. A manager is <span className="font-semibold text-fg">Inducted</span> once every requirement is met.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {criteria.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
                <span>{c.label}</span>
                <span className="shrink-0 font-display text-lg">{c.target.toLocaleString("en-US")}+</span>
              </li>
            ))}
          </ul>
          {!pointsTracked && (
            <p className="mt-3 text-xs text-subtle">
              This league doesn&apos;t use points scoring, so the points-for requirement doesn&apos;t apply.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg uppercase tracking-wide">How HOF points work</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            For each completed season, a manager earns points for their best result that year (results don&apos;t
            stack), plus a bonus for finishing as the #1 regular-season seed.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {HOF_SCORE_RULES.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
                <span>{r.label}</span>
                <span className="shrink-0 font-display text-lg">+{r.points}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-4 text-xs text-subtle">
        Only completed seasons count. Wins and points for are regular-season totals from ESPN standings.
      </p>
    </div>
  );
}
