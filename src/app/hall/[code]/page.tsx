import { notFound } from "next/navigation";
import { Marquee, SeasonChips } from "@/components/hall";
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
  const leaders = hall.records.managers
    .map((m) => ({ ...m, prob: hofProbability(m, pointsTracked) }))
    .sort((a, b) => b.prob.percent - a.prob.percent || b.hofScore - a.hofScore || a.name.localeCompare(b.name))
    .slice(0, 3);
  const span =
    summary.seasons.length > 1
      ? `${Math.min(...summary.seasons)}–${String(Math.max(...summary.seasons)).slice(-2)}`
      : String(summary.seasons[0] ?? "");

  const sections = [
    {
      href: `/hall/${code}/hall-of-fame`,
      title: "Hall of Fame",
      note: leaders[0] ? `${leaders[0].name} leads at ${leaders[0].prob.inducted ? "Inducted" : `${leaders[0].prob.percent}%`}` : "The leaderboard",
    },
    { href: `/hall/${code}/champions`, title: "Champions", note: `${summary.championshipCount} banners` },
    { href: `/hall/${code}/seasons`, title: "Seasons", note: `${summary.seasonCount} seasons of standings & playoffs` },
    { href: `/hall/${code}/records`, title: "Records", note: `${hall.records.records.length} all-time records` },
  ];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative pt-6 text-center">
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 select-none font-display text-[5.5rem] font-bold leading-none tracking-tight opacity-[0.07] sm:text-[11rem]"
          style={{ color: "transparent", WebkitTextStroke: "2px #1a1814" }}
        >
          {span}
        </p>
        <Reveal>
          <TrophyIcon className="relative mx-auto h-10 w-10 text-accent" />
          <h1 className="relative mt-6 break-words font-display text-[2.75rem] font-bold uppercase leading-[0.98] tracking-wide sm:text-7xl md:text-8xl">
            {summary.name}
          </h1>
          <p className="mt-4 font-serif text-xl italic text-muted sm:text-2xl">
            Hall of Fantasy <span className="not-italic text-subtle">·</span> Fantasy Basketball
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-line border-y border-line">
          {[
            [summary.seasonCount, summary.seasonCount === 1 ? "Season" : "Seasons", false],
            [summary.managerCount, "Managers", false],
            [summary.championshipCount, "Titles", true],
          ].map(([value, label, accent]) => (
            <div key={label as string} className="px-2 py-5">
              <p className={`font-display text-5xl font-semibold leading-none sm:text-6xl ${accent ? "text-accent" : ""}`}>
                <CountUp value={value as number} delay={0.2} />
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{label as string}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Champions banner */}
      {champions.length > 0 && (
        <Marquee items={champions.map((c) => ({ strong: `${c.season} ${c.champion!.name}`, soft: "champion" }))} />
      )}

      {/* Reigning champion */}
      {reigning && (
        <Reveal>
          <PressLink
            href={`/hall/${code}/champions?season=${reigning.season}`}
            className="ripple relative block overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-[0_10px_40px_-20px_rgba(26,24,20,0.35)] sm:p-10"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-6 -top-10 font-display text-[9rem] font-bold leading-none opacity-[0.06] sm:text-[13rem]"
            >
              {reigning.season}
            </span>
            <Eyebrow className="relative">Reigning champion · {reigning.season}</Eyebrow>
            <div className="relative mt-4 flex items-end justify-between gap-6">
              <div className="min-w-0">
                <p className="break-words font-serif text-4xl font-bold leading-tight sm:text-6xl">{reigning.champion!.name}</p>
                <p className="mt-2 text-muted">{reigning.champion!.teamName}</p>
                {reigning.finalScore && (
                  <p className="mt-4 text-sm text-subtle">
                    Won the final {reigning.finalScore.champion} – {reigning.finalScore.runnerUp}
                    {reigning.runnerUp ? ` over ${reigning.runnerUp.name}` : ""}
                  </p>
                )}
              </div>
              <TrophyIcon className="h-14 w-14 shrink-0 text-accent sm:h-20 sm:w-20" />
            </div>
          </PressLink>
        </Reveal>
      )}

      {/* Sections index */}
      <section>
        <Eyebrow className="mb-2">The Hall</Eyebrow>
        <Stagger as="ol" className="divide-y divide-line border-y border-line">
          {sections.map((s, i) => (
            <StaggerItem as="li" key={s.href}>
              <PressLink href={s.href} className="group flex items-center gap-4 py-5 sm:gap-8 sm:py-7">
                <span className="w-8 shrink-0 font-display text-lg text-subtle sm:w-12 sm:text-2xl">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-3xl font-semibold uppercase tracking-wide sm:text-5xl">{s.title}</span>
                  <span className="mt-1 block truncate text-sm text-muted">{s.note}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-lg transition-colors duration-300 group-hover:border-fg group-hover:bg-fg group-hover:text-surface"
                >
                  →
                </span>
              </PressLink>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <Reveal>
        <Eyebrow className="mb-4">Historical Seasons</Eyebrow>
        <SeasonChips code={code} seasons={summary.seasons} />
      </Reveal>
    </div>
  );
}
