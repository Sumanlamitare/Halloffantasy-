import { notFound } from "next/navigation";
import { CountUp, PressLink, ProgressBar, Stagger, StaggerItem } from "@/components/motion";
import { roman } from "@/components/hall";
import { Card, SectionTitle, Unavailable } from "@/components/ui";
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

  const inductees = rows.filter((r) => r.p.inducted);
  const candidates = rows.filter((r) => !r.p.inducted);
  const podium = candidates.slice(0, 3);
  const rest = candidates.slice(3);

  const plaqueFor = ({ m, p }: (typeof rows)[number], rank: number, big = false) => (
    <PressLink
      href={`/hall/${code}/managers/${m.managerId}`}
      className={`${p.inducted ? "plaque plaque-gold" : "plaque"} block h-full text-center ${
        big ? "px-5 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10" : "px-3 pb-5 pt-6 sm:px-5 sm:pb-6 sm:pt-7"
      }`}
    >
      <span className="engraved-muted block font-display text-[10px] font-bold tracking-[0.3em] sm:text-xs">
        {p.inducted ? "INDUCTED" : `No. ${roman(rank)}`}
      </span>
      <span
        className={`engraved mt-2 block break-words font-display font-black uppercase leading-tight tracking-[0.04em] ${
          big ? "text-2xl sm:text-4xl" : "text-[15px] sm:text-2xl"
        }`}
      >
        {m.name}
      </span>
      {m.championshipSeasons.length > 0 && (
        <span className="engraved-muted mt-1 block font-serif text-[13px] font-semibold italic sm:text-sm">
          Champion {m.championshipSeasons.join(" · ")}
        </span>
      )}
      <span className={`engraved mt-3 block font-display font-black leading-none sm:mt-4 ${big ? "text-5xl" : "text-3xl sm:text-4xl"}`}>
        {p.inducted ? "100%" : <><CountUp value={p.percent} delay={0.2} />%</>}
      </span>
      <span className="engraved-muted mt-1 block text-[10px] font-bold uppercase tracking-[0.2em]">
        {p.inducted ? "Hall of Famer" : "To induction"}
      </span>
      {/* engraved groove showing progress */}
      <span className="mx-auto mt-3 block h-2 max-w-[12rem] sm:mt-4 overflow-hidden rounded-full bg-[#3d240c]/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_1px_0_rgba(255,222,170,0.35)]">
        <ProgressBar percent={p.percent} className="h-full !bg-transparent" accent />
      </span>
      <span className="engraved-muted mt-3 block text-[11px] font-semibold sm:mt-4 sm:text-xs">
        {m.wins}-{m.losses}
        {m.ties ? `-${m.ties}` : ""} · {m.playoffs} playoffs · {m.hofScore} HOF pts
      </span>
    </PressLink>
  );

  return (
    <div>
      <SectionTitle eyebrow="The Gallery" title="Hall of Fame">
        Every manager&apos;s plaque, ranked by Hall of Fame Probability, from {completedSeasons.length} completed season
        {completedSeasons.length === 1 ? "" : "s"} of imported ESPN results.
      </SectionTitle>

      {rows.length === 0 ? (
        <Unavailable>No managers have been imported yet.</Unavailable>
      ) : (
        <div className="space-y-14">
          {inductees.length > 0 && (
            <section className="relative">
              <div aria-hidden="true" className="spotlight pointer-events-none absolute inset-x-0 -top-20 h-72" />
              <h2 className="relative mb-5 text-center font-display text-sm font-bold uppercase tracking-[0.35em] text-accent">Inductees</h2>
              <Stagger className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {inductees.map((r, i) => (
                  <StaggerItem key={r.m.managerId}>{plaqueFor(r, i + 1, true)}</StaggerItem>
                ))}
              </Stagger>
            </section>
          )}

          {podium.length > 0 && (
            <section className="relative">
              <div aria-hidden="true" className="spotlight pointer-events-none absolute inset-x-0 -top-20 h-72" />
              <h2 className="relative mb-6 text-center font-display text-sm font-bold uppercase tracking-[0.35em] text-accent sm:mb-12">
                {inductees.length ? "Closest to Induction" : "Leading Candidates"}
              </h2>
              <Stagger className="relative grid grid-cols-2 items-end gap-3 sm:grid-cols-3 sm:gap-4">
                {podium.map((r, idx) => (
                  <StaggerItem
                    key={r.m.managerId}
                    className={
                      idx === 0
                        ? "col-span-2 sm:order-2 sm:col-span-1 sm:-translate-y-6"
                        : idx === 1
                          ? "sm:order-1"
                          : "sm:order-3"
                    }
                  >
                    {plaqueFor(r, inductees.length + idx + 1, idx === 0)}
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <h2 className="mb-5 text-center font-display text-sm font-bold uppercase tracking-[0.35em] text-muted">The Gallery</h2>
              <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {rest.map((r, i) => (
                  <StaggerItem key={r.m.managerId} className="h-full">{plaqueFor(r, inductees.length + podium.length + i + 1)}</StaggerItem>
                ))}
              </Stagger>
            </section>
          )}
        </div>
      )}

      <div className="mt-16 grid gap-4 md:grid-cols-2">
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
