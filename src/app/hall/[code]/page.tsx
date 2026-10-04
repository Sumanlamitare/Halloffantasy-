import Link from "next/link";
import { notFound } from "next/navigation";
import { SeasonChips } from "@/components/hall";
import { Eyebrow, pressable, StatTile, TrophyIcon } from "@/components/ui";
import { getHall, hallSummary } from "@/lib/hall/queries";
import { hofProbability, leagueTracksPoints } from "@/lib/hall/scoring";

export default async function HallHome({ params }: PageProps<"/hall/[code]">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const code = hall.league.code!;
  const summary = hallSummary(hall);
  const recentChampions = hall.records.champions.filter((c) => c.champion).slice(0, 4);
  const pointsTracked = leagueTracksPoints(hall.records.managers);
  const leaders = hall.records.managers
    .map((m) => ({ ...m, prob: hofProbability(m, pointsTracked) }))
    .sort((a, b) => b.prob.percent - a.prob.percent || b.hofScore - a.hofScore || a.name.localeCompare(b.name))
    .slice(0, 3);

  return (
    <div className="space-y-12">
      <section className="pt-4 text-center">
        <TrophyIcon className="mx-auto h-11 w-11 text-accent" />
        <h1 className="mt-6 break-words font-display text-[2.5rem] font-bold uppercase leading-[1.02] tracking-wide sm:text-6xl md:text-7xl">
          {summary.name}
        </h1>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-subtle">Fantasy Basketball</p>
        <div className="mx-auto my-6 h-px max-w-[10rem] bg-line" />
        <p className="font-serif text-2xl italic text-muted sm:text-3xl">Hall of Fantasy</p>
      </section>

      <section className="stagger grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile value={summary.seasonCount} label={summary.seasonCount === 1 ? "Season" : "Seasons"} />
        <StatTile value={summary.managerCount} label="Managers" delay={80} />
        <StatTile value={summary.championshipCount} label="Titles" accent delay={160} />
      </section>

      <section>
        <Eyebrow className="mb-4">Historical Seasons</Eyebrow>
        <SeasonChips code={code} seasons={summary.seasons} />
      </section>

      <div className="stagger grid gap-4 md:grid-cols-2">
        <SectionLink href={`/hall/${code}/hall-of-fame`} eyebrow="The Greatest" title="Hall of Fame">
          {leaders.length ? (
            <ol className="space-y-2">
              {leaders.map((m, i) => (
                <li key={m.managerId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-display text-subtle">{i + 1}.</span>
                    {m.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {m.prob.inducted ? "Inducted" : `${m.prob.percent}% HOF`}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">No managers yet.</p>
          )}
        </SectionLink>

        <SectionLink href={`/hall/${code}/champions`} eyebrow="Banners" title="Champions">
          {recentChampions.length ? (
            <ul className="space-y-2">
              {recentChampions.map((c) => (
                <li key={c.season} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 font-display text-lg text-muted">{c.season}</span>
                  <TrophyIcon className="h-4 w-4 shrink-0 text-accent" />
                  <span className="min-w-0 truncate">{c.champion!.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No completed seasons yet.</p>
          )}
        </SectionLink>

        <SectionLink href={`/hall/${code}/seasons`} eyebrow="Year by Year" title="Season History">
          <p className="text-muted">Final standings, records, points and playoff results for every imported season.</p>
        </SectionLink>

        <SectionLink href={`/hall/${code}/records`} eyebrow="Record Book" title="League Records">
          <p className="text-muted">
            {hall.records.records.length} all-time league record{hall.records.records.length === 1 ? "" : "s"}.
          </p>
        </SectionLink>
      </div>
    </div>
  );
}

function SectionLink({ href, eyebrow, title, children }: { href: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${pressable} group p-6`}>
      <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">{title}</h2>
        <span aria-hidden="true" className="text-xl text-muted transition-transform duration-300 ease-[var(--ease-emphasized)] group-hover:translate-x-1">
          →
        </span>
      </div>
      <div className="text-[15px]">{children}</div>
    </Link>
  );
}
