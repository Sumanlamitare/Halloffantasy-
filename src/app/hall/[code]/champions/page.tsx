import Link from "next/link";
import { notFound } from "next/navigation";
import { SeasonChips } from "@/components/hall";
import { Card, Eyebrow, SectionTitle, TrophyIcon, Unavailable } from "@/components/ui";
import { formatPoints, formatRecord, seasonSpan } from "@/lib/format";
import { getHall, getPlayoffPath } from "@/lib/hall/queries";
import { isPointsScoring } from "@/lib/import/normalize";

export default async function ChampionsPage({ params, searchParams }: PageProps<"/hall/[code]/champions">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const code = hall.league.code!;
  const champions = hall.records.champions;
  const sp = await searchParams;
  const requested = Number(Array.isArray(sp.season) ? sp.season[0] : sp.season);
  const selected = champions.find((c) => c.season === requested) ?? champions.find((c) => c.champion) ?? champions[0];
  const path = selected?.champion ? await getPlayoffPath(hall, selected.season) : [];

  return (
    <div className="space-y-10">
      <SectionTitle eyebrow="Banners in the Rafters" title="Champions" />

      {champions.length === 0 ? (
        <Unavailable>No seasons imported yet.</Unavailable>
      ) : (
        <>
          {/* Timeline */}
          <ol className="stagger relative space-y-3 border-l border-line pl-6">
            {champions.map((c) => (
              <li key={c.season} className="relative">
                <span className="absolute -left-[31px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent" aria-hidden="true" />
                <Link
                  href={`/hall/${code}/champions?season=${c.season}`}
                  scroll={false}
                  className={`ripple flex min-h-14 items-center gap-4 rounded-2xl border px-4 py-3 transition-[background-color,box-shadow,border-color] duration-200 ${
                    selected?.season === c.season ? "border-fg bg-surface shadow-[0_6px_20px_rgba(28,27,25,0.07)]" : "border-line bg-surface hover:bg-sunken"
                  }`}
                >
                  <span className="w-14 shrink-0 font-display text-2xl font-semibold text-muted">{c.season}</span>
                  {c.champion ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <TrophyIcon className="h-5 w-5 shrink-0 text-accent" />
                      <span className="min-w-0 truncate font-display text-lg uppercase tracking-wide text-fg">
                        {c.champion.name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-subtle">{c.isComplete ? "Champion unavailable" : "Season in progress"}</span>
                  )}
                </Link>
              </li>
            ))}
          </ol>

          {/* Season detail */}
          {selected && (
            <section id="detail" className="space-y-4">
              <div>
                <Eyebrow className="mb-3">Select a season</Eyebrow>
                <SeasonChips
                  code={code}
                  seasons={champions.map((c) => c.season)}
                  active={selected.season}
                  hrefFor={(s) => `/hall/${code}/champions?season=${s}`}
                />
              </div>

              <Card key={selected.season} className="page-enter space-y-6">
                <div className="text-center">
                  <p className="font-display text-sm uppercase tracking-[0.3em] text-muted">
                    {selected.season} · {seasonSpan(selected.season)}
                  </p>
                  {selected.champion ? (
                    <>
                      <TrophyIcon className="mx-auto mt-4 h-12 w-12 text-accent" />
                      <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-accent">Champion</p>
                      <Link
                        href={`/hall/${code}/managers/${selected.champion.managerId}`}
                        className="mt-1 block break-words font-display text-4xl font-bold uppercase leading-tight tracking-wide text-fg"
                      >
                        {selected.champion.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted">{selected.champion.teamName}</p>
                    </>
                  ) : (
                    <p className="mt-4 text-muted">
                      {selected.isComplete ? "ESPN did not report a champion for this season." : "This season is still in progress."}
                    </p>
                  )}
                </div>

                {(selected.runnerUp || selected.finalScore) && (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {selected.runnerUp && (
                      <div className="rounded-xl bg-sunken px-4 py-3">
                        <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">Runner-up</dt>
                        <dd className="mt-1">
                          <Link href={`/hall/${code}/managers/${selected.runnerUp.managerId}`} className="font-display text-xl uppercase tracking-wide text-fg">
                            {selected.runnerUp.name}
                          </Link>
                          <span className="block text-sm text-subtle">{selected.runnerUp.teamName}</span>
                        </dd>
                      </div>
                    )}
                    <div className="rounded-xl bg-sunken px-4 py-3">
                      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">Final score</dt>
                      <dd className="mt-1 font-display text-xl tracking-wide text-fg">
                        {selected.finalScore ? (
                          `${selected.finalScore.champion} – ${selected.finalScore.runnerUp}`
                        ) : (
                          <span className="text-base text-subtle">Not available</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                )}

                {path.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-display text-lg uppercase tracking-wide text-fg">Playoff path</h3>
                    <ol className="space-y-2">
                      {path.map((g) => {
                        const pts = isPointsScoring(g.scoringType);
                        const fmt = (s: typeof g.us | null) =>
                          s ? (pts ? formatPoints(s.score) : formatRecord(s.categoryWins, s.categoryLosses, s.categoryTies)) : null;
                        const us = fmt(g.us);
                        const them = fmt(g.them);
                        return (
                          <li key={g.round} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-sunken px-4 py-3">
                            <span className="text-sm text-muted">{g.roundName}</span>
                            <span className="text-[15px] text-fg">
                              {g.isBye ? (
                                "Bye"
                              ) : (
                                <>
                                  <span className={g.won ? "text-fg font-semibold" : "text-muted"}>{g.won ? "W" : "L"}</span>{" "}
                                  vs {g.opponentName}
                                  {us && them && <span className="ml-2 text-muted">{us} – {them}</span>}
                                </>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}

                <Link href={`/hall/${code}/seasons/${selected.season}`} className="inline-flex min-h-11 items-center text-sm font-medium text-fg underline-offset-4 hover:underline">
                  Full {selected.season} season →
                </Link>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
