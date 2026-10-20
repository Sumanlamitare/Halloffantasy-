import { notFound } from "next/navigation";
import { CountUp, PressLink, ProgressBar, Stagger, StaggerItem } from "@/components/motion";
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
        <>
          {/* Podium: 2nd · 1st · 3rd */}
          {rows.length >= 3 && (
            <Stagger className="mb-8 grid grid-cols-3 items-end gap-2 sm:gap-4">
              {[1, 0, 2].map((idx) => {
                const { m, p } = rows[idx];
                const first = idx === 0;
                return (
                  <StaggerItem key={m.managerId}>
                    <PressLink
                      href={`/hall/${code}/managers/${m.managerId}`}
                      className={`ripple relative flex flex-col items-center overflow-hidden rounded-3xl border px-2 text-center sm:px-4 ${
                        first
                          ? "border-fg bg-fg pb-6 pt-8 text-surface shadow-[0_18px_50px_-24px_rgba(26,24,20,0.6)] sm:pt-10"
                          : "border-line bg-surface pb-5 pt-6"
                      }`}
                    >
                      <span className={`font-display text-sm tracking-[0.2em] ${first ? "text-accent" : "text-subtle"}`}>
                        {idx + 1 === 1 ? "1ST" : idx + 1 === 2 ? "2ND" : "3RD"}
                      </span>
                      <TrophyIcon className={`mt-2 ${first ? "h-9 w-9 text-accent" : "h-6 w-6 text-subtle"}`} />
                      <span
                        className={`mt-3 line-clamp-2 w-full break-words font-display font-semibold uppercase leading-tight tracking-wide ${
                          first ? "text-lg sm:text-2xl" : "text-sm sm:text-xl"
                        }`}
                      >
                        {m.name}
                      </span>
                      <span className={`mt-3 font-display font-semibold leading-none ${first ? "text-4xl sm:text-5xl" : "text-2xl sm:text-4xl"} ${p.inducted ? "text-accent" : ""}`}>
                        {p.inducted ? "HOF" : <><CountUp value={p.percent} delay={0.2} />%</>}
                      </span>
                      <span className={`mt-1 text-xs ${first ? "text-surface/70" : "text-muted"}`}>{m.hofScore} HOF pts</span>
                    </PressLink>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}

          <div className="overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="hidden grid-cols-[2.5rem_1fr_7rem_6rem] items-center gap-3 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle sm:grid">
              <span>#</span>
              <span>Manager</span>
              <span className="text-right">HOF Prob.</span>
              <span className="text-right">HOF Pts</span>
            </div>
            <Stagger as="ol" className="divide-y divide-line">
              {rows.map(({ m, p }, i) => (
                <StaggerItem as="li" key={m.managerId}>
                  <PressLink
                    href={`/hall/${code}/managers/${m.managerId}`}
                    className="ripple grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-sunken sm:grid-cols-[2.5rem_1fr_7rem_6rem]"
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
                      <ProgressBar percent={p.percent} accent={p.inducted} delay={0.1 + i * 0.05} className="mt-2 h-1.5" />
                    </span>
                    <span className="text-right sm:hidden">
                      <span className={`block font-display text-2xl font-semibold leading-none ${p.inducted ? "text-accent" : ""}`}>
                        {p.inducted ? "HOF" : <><CountUp value={p.percent} delay={0.1 + i * 0.05} />%</>}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{m.hofScore} pts</span>
                    </span>
                    <span className={`hidden text-right font-display text-2xl font-semibold sm:block ${p.inducted ? "text-accent" : ""}`}>
                      {p.inducted ? "Inducted" : <><CountUp value={p.percent} delay={0.1 + i * 0.05} />%</>}
                    </span>
                    <span className="hidden text-right font-display text-2xl text-muted sm:block">{m.hofScore}</span>
                  </PressLink>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </>
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
