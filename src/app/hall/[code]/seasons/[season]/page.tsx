import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SeasonChips } from "@/components/hall";
import { Card, Eyebrow, TrophyIcon, Unavailable } from "@/components/ui";
import type { MatchupSide } from "@/lib/db/collections";
import { formatPoints, formatRecord, ordinal, seasonSpan } from "@/lib/format";
import { getHall, getSeasonDetail, type TeamRow } from "@/lib/hall/queries";
import { isPointsScoring } from "@/lib/import/normalize";

const SCORING_LABEL: Record<string, string> = {
  H2H_POINTS: "Head-to-head points",
  H2H_CATEGORY: "Head-to-head each category",
  H2H_MOST_CATEGORIES: "Head-to-head most categories",
  ROTO: "Rotisserie",
  TOTAL_POINTS: "Season points",
};

export default async function SeasonPage({ params }: PageProps<"/hall/[code]/seasons/[season]">) {
  const { code: rawCode, season: seasonParam } = await params;
  const hall = await getHall(rawCode);
  if (!hall) notFound();
  const code = hall.league.code!;
  const seasonYear = Number(seasonParam);
  if (!Number.isInteger(seasonYear)) notFound();
  const d = await getSeasonDetail(hall, seasonYear);
  if (!d) notFound();

  const pts = isPointsScoring(d.season.scoringType);
  const teamById = new Map<number, TeamRow>(d.teams.map((t) => [t.teamId, t]));
  const teamName = (id: number | null) => (id === null ? "—" : teamById.get(id)?.name ?? `Team ${id}`);
  const score = (s: MatchupSide | null) =>
    s ? (pts ? formatPoints(s.score) : formatRecord(s.categoryWins, s.categoryLosses, s.categoryTies)) : null;

  const hasFinal = d.teams.some((t) => t.finalStanding !== null);
  const finalOrder = [...d.teams].sort(
    (a, b) => (a.finalStanding ?? 99) - (b.finalStanding ?? 99) || (a.playoffSeed ?? 99) - (b.playoffSeed ?? 99),
  );
  const seedOrder = [...d.teams].sort((a, b) => (a.playoffSeed ?? 99) - (b.playoffSeed ?? 99));

  const rounds = new Map<string, typeof d.playoffs>();
  for (const g of d.playoffs) {
    const key = g.tier === "WINNERS_BRACKET" ? g.roundName : "Consolation";
    rounds.set(key, [...(rounds.get(key) ?? []), g]);
  }
  const weeks = new Map<number, typeof d.regularSeason>();
  for (const m of d.regularSeason) weeks.set(m.matchupPeriodId, [...(weeks.get(m.matchupPeriodId) ?? []), m]);

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow className="mb-2">Season History</Eyebrow>
        <h1 className="font-display text-5xl font-bold tracking-wide sm:text-6xl">{seasonYear}</h1>
        <p className="mt-1 text-muted">
          {seasonSpan(seasonYear)} · {d.season.size} teams
          {d.season.scoringType ? ` · ${SCORING_LABEL[d.season.scoringType] ?? d.season.scoringType}` : ""}
          {!d.season.isComplete && " · In progress"}
        </p>
        <div className="mt-5">
          <SeasonChips code={code} seasons={hall.records.allSeasons} active={seasonYear} />
        </div>
      </header>

      {/* Champion & runner-up */}
      <section className="stagger grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-accent/25 bg-accent-soft p-5 text-center">
          <TrophyIcon className="mx-auto h-9 w-9 text-accent" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Champion</p>
          {d.champion?.champion ? (
            <>
              <ManagerLink code={code} id={d.champion.champion.managerId} className="mt-1 block font-display text-3xl font-bold uppercase tracking-wide">
                {d.champion.champion.name}
              </ManagerLink>
              <p className="text-sm text-muted">{d.champion.champion.teamName}</p>
            </>
          ) : (
            <p className="mt-2 text-muted">{d.season.isComplete ? "Not available" : "Season in progress"}</p>
          )}
        </div>
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Runner-up</p>
          {d.champion?.runnerUp ? (
            <>
              <ManagerLink code={code} id={d.champion.runnerUp.managerId} className="mt-1 block font-display text-3xl font-semibold uppercase tracking-wide">
                {d.champion.runnerUp.name}
              </ManagerLink>
              <p className="text-sm text-muted">{d.champion.runnerUp.teamName}</p>
            </>
          ) : (
            <p className="mt-2 text-muted">{d.season.isComplete ? "Not available" : "—"}</p>
          )}
          {d.champion?.finalScore && (
            <p className="mt-3 text-sm text-subtle">
              Final: {d.champion.finalScore.champion} – {d.champion.finalScore.runnerUp}
            </p>
          )}
        </Card>
      </section>

      {/* Final standings */}
      <Section title={hasFinal ? "Final Standings" : "Standings"}>
        <StandingsList code={code} rows={hasFinal ? finalOrder : seedOrder} place={(t) => (hasFinal ? t.finalStanding : t.playoffSeed)} pts={pts} showSeed={hasFinal} />
      </Section>

      {/* Playoffs */}
      <Section title="Playoff Results">
        {rounds.size === 0 ? (
          <Unavailable>No playoff results available for this season.</Unavailable>
        ) : (
          <div className="space-y-5">
            {[...rounds.entries()].map(([name, games]) => (
              <div key={name}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{name}</h3>
                <ul className="stagger space-y-2">
                  {games.map((g) => (
                    <li key={g.matchupId}>
                      <MatchupRow
                        home={{ name: teamName(g.home.teamId), score: score(g.home), won: g.winner === "HOME" }}
                        away={g.away ? { name: teamName(g.away.teamId), score: score(g.away), won: g.winner === "AWAY" } : null}
                        highlight={g.isChampionship}
                        label={name === "Consolation" ? `Round ${g.round}` : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Regular season */}
      <Section title="Regular Season">
        <StandingsList code={code} rows={seedOrder} place={(t) => t.playoffSeed} pts={pts} showSeed={false} />
        {weeks.size > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Weekly results</h3>
            {[...weeks.entries()].map(([week, games]) => (
              <details key={week} className="group rounded-2xl border border-line bg-surface">
                <summary className="ripple flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl px-4">
                  <span className="font-medium">Week {week}</span>
                  <span className="flex items-center gap-2 text-sm text-subtle">
                    {games.length} matchups
                    <span aria-hidden="true" className="transition-transform duration-300 ease-[var(--ease-emphasized)] group-open:rotate-180">
                      ⌄
                    </span>
                  </span>
                </summary>
                <ul className="page-enter space-y-2 border-t border-line px-4 py-3">
                  {games.map((g) => (
                    <li key={g.matchupId}>
                      <MatchupRow
                        home={{ name: teamName(g.home.teamId), score: score(g.home), won: g.winner === "HOME" }}
                        away={g.away ? { name: teamName(g.away.teamId), score: score(g.away), won: g.winner === "AWAY" } : null}
                      />
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-semibold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function ManagerLink({ code, id, className, children }: { code: string; id: string; className?: string; children: ReactNode }) {
  return (
    <Link href={`/hall/${code}/managers/${id}`} className={`underline-offset-4 hover:underline ${className ?? ""}`}>
      {children}
    </Link>
  );
}

function StandingsList({
  code,
  rows,
  place,
  pts,
  showSeed,
}: {
  code: string;
  rows: TeamRow[];
  place: (t: TeamRow) => number | null;
  pts: boolean;
  showSeed: boolean;
}) {
  return (
    <ol className="stagger divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {rows.map((t, i) => {
        const p = place(t);
        return (
          <li key={t.teamId} className="flex items-center gap-3 px-4 py-3">
            <span className={`w-8 shrink-0 font-display text-xl ${p === 1 ? "text-accent" : "text-subtle"}`}>{p ?? i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{t.name}</p>
              <ManagerLink code={code} id={t.managerId} className="block truncate text-sm text-muted">
                {t.managerName}
              </ManagerLink>
            </div>
            <div className="shrink-0 text-right text-sm">
              <p className="font-medium">{formatRecord(t.wins, t.losses, t.ties) ?? "—"}</p>
              {pts && t.pointsFor !== null ? (
                <p className="text-subtle">
                  {formatPoints(t.pointsFor)} PF
                  {t.pointsAgainst !== null && <span className="hidden sm:inline"> · {formatPoints(t.pointsAgainst)} PA</span>}
                </p>
              ) : null}
              {pts && t.pointsAgainst !== null && <p className="text-subtle sm:hidden">{formatPoints(t.pointsAgainst)} PA</p>}
              {showSeed && t.playoffSeed !== null && <p className="text-subtle">{ordinal(t.playoffSeed)} seed</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MatchupRow({
  home,
  away,
  highlight,
  label,
}: {
  home: { name: string; score: string | null; won: boolean };
  away: { name: string; score: string | null; won: boolean } | null;
  highlight?: boolean;
  label?: string;
}) {
  const line = (t: { name: string; score: string | null; won: boolean }) => (
    <div className="flex items-center justify-between gap-3">
      <span className={`min-w-0 truncate ${t.won ? "font-semibold" : "text-muted"}`}>{t.name}</span>
      <span className={`shrink-0 font-display text-lg tabular-nums ${t.won ? "" : "text-muted"}`}>{t.score ?? ""}</span>
    </div>
  );
  return (
    <div className={`space-y-1 rounded-xl px-4 py-3 ${highlight ? "border border-accent/40 bg-accent-soft" : "bg-sunken"}`}>
      {(highlight || label) && (
        <p className={`text-[10.5px] font-semibold uppercase tracking-[0.2em] ${highlight ? "text-accent" : "text-subtle"}`}>
          {highlight ? "Championship" : label}
        </p>
      )}
      {line(home)}
      {away ? line(away) : <p className="text-sm text-subtle">Bye</p>}
    </div>
  );
}
