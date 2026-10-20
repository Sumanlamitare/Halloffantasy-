import { notFound } from "next/navigation";
import { Banner, roman, SeasonChips } from "@/components/hall";
import { CountUp, PressLink, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Eyebrow, TrophyIcon } from "@/components/ui";
import { getHall, hallSummary } from "@/lib/hall/queries";
import { hofProbability, leagueTracksPoints } from "@/lib/hall/scoring";

export default async function HallHome({ params }: PageProps<"/hall/[code]">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const code = hall.league.code!;
  const summary = hallSummary(hall);
  const champions = hall.records.champions.filter((c) => c.champion);
  const reigning = champions[0] ?? null;
  const pointsTracked = leagueTracksPoints(hall.records.managers);
  const inducted = hall.records.managers.filter((m) => hofProbability(m, pointsTracked).inducted).length;
  const leader = hall.records.managers
    .map((m) => ({ ...m, prob: hofProbability(m, pointsTracked) }))
    .sort((a, b) => b.prob.percent - a.prob.percent || b.hofScore - a.hofScore)[0];
  const since = summary.seasons.length ? Math.min(...summary.seasons) : null;

  const galleries = [
    {
      href: `/hall/${code}/hall-of-fame`,
      title: "Hall of Fame",
      note: inducted
        ? `${inducted} inducted`
        : leader
          ? `${leader.name} leads the candidates at ${leader.prob.percent}%`
          : "The inductees",
    },
    { href: `/hall/${code}/champions`, title: "The Rafters", note: `${summary.championshipCount} championship banners` },
    { href: `/hall/${code}/seasons`, title: "Season Archive", note: `${summary.seasonCount} seasons of standings & playoffs` },
    { href: `/hall/${code}/records`, title: "Record Book", note: `${hall.records.records.length} all-time records` },
  ];

  return (
    <div className="space-y-20">
      {/* Entrance */}
      <section className="relative pt-4 text-center">
        <div aria-hidden="true" className="spotlight pointer-events-none absolute inset-x-0 -top-16 mx-auto h-[28rem] max-w-3xl" />
        <Reveal className="relative">
          {since && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-accent/80">Est. {since}</p>
          )}
          <h1 className="gold-text mt-5 break-words font-display text-[2.6rem] font-black uppercase leading-[1.02] tracking-[0.06em] drop-shadow-[0_4px_18px_rgba(212,173,87,0.25)] sm:text-7xl md:text-8xl">
            {summary.name}
          </h1>
          <div aria-hidden="true" className="mx-auto mt-6 flex items-center justify-center gap-3 text-accent">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-accent" />
            <TrophyIcon className="h-5 w-5" />
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-accent" />
          </div>
          <p className="mt-4 font-serif text-2xl italic text-muted sm:text-3xl">Hall of Fantasy</p>
        </Reveal>

        {/* Bronze stat plates */}
        <Stagger className="relative mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3 sm:gap-5">
          {[
            [summary.seasonCount, summary.seasonCount === 1 ? "Season" : "Seasons"],
            [summary.managerCount, "Managers"],
            [summary.championshipCount, "Titles"],
          ].map(([value, label]) => (
            <StaggerItem key={label as string}>
              <div className="plaque px-2 pb-5 pt-6 text-center">
                <p className="engraved font-display text-4xl font-black leading-none sm:text-5xl">
                  <CountUp value={value as number} delay={0.25} />
                </p>
                <p className="engraved-muted mt-2 text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px]">{label as string}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* The rafters */}
      {champions.length > 0 && (
        <section>
          <div className="mb-2 text-center">
            <Eyebrow className="text-accent/80">The Rafters</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.08em] sm:text-3xl">Championship Banners</h2>
          </div>
          <Stagger className="mt-6 flex flex-wrap justify-center gap-y-10">
            {champions.map((c, i) => (
              <StaggerItem key={c.season} className="w-1/3 sm:w-1/4 lg:w-1/6">
                <PressLink href={`/hall/${code}/champions?season=${c.season}`} className="block">
                  <Banner season={c.season} champion={c.champion!.name} teamName={c.champion!.teamName} delay={i * 0.9} />
                </PressLink>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Reigning champion */}
      {reigning && (
        <Reveal className="relative">
          <div aria-hidden="true" className="spotlight pointer-events-none absolute inset-x-0 -top-24 h-72" />
          <PressLink href={`/hall/${code}/champions?season=${reigning.season}`} className="relative mx-auto block max-w-3xl">
            <div className="plaque px-7 pb-10 pt-11 text-center sm:px-14">
              <p className="engraved-muted font-display text-xs font-bold uppercase tracking-[0.35em]">
                Reigning Champion · {reigning.season}
              </p>
              <p className="engraved mt-4 break-words font-display text-4xl font-black uppercase leading-tight tracking-[0.05em] sm:text-6xl">
                {reigning.champion!.name}
              </p>
              <p className="engraved-muted mt-2 font-serif text-xl italic">{reigning.champion!.teamName}</p>
              {reigning.finalScore && (
                <p className="engraved-muted mt-5 text-sm font-semibold">
                  Won the final {reigning.finalScore.champion} – {reigning.finalScore.runnerUp}
                  {reigning.runnerUp ? ` over ${reigning.runnerUp.name}` : ""}
                </p>
              )}
            </div>
          </PressLink>
        </Reveal>
      )}

      {/* Galleries */}
      <section>
        <div className="mb-6 text-center">
          <Eyebrow className="text-accent/80">Directory</Eyebrow>
          <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.08em] sm:text-3xl">The Galleries</h2>
        </div>
        <Stagger as="ol" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {galleries.map((g, i) => (
            <StaggerItem as="li" key={g.href}>
              <PressLink href={g.href} className="marble group flex items-center gap-4 rounded-xl px-5 py-6 hover:border-accent/50">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-sm font-bold text-accent">
                  {roman(i + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-display text-xl font-bold uppercase tracking-[0.06em] sm:text-2xl">{g.title}</span>
                  <span className="mt-1 block truncate font-serif text-base italic text-muted">{g.note}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-accent transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </PressLink>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <Reveal className="text-center">
        <Eyebrow className="mb-4 text-accent/80">Season Archive</Eyebrow>
        <div className="flex justify-center">
          <SeasonChips code={code} seasons={summary.seasons} />
        </div>
      </Reveal>
    </div>
  );
}
