import Link from "next/link";
import { notFound } from "next/navigation";
import { TrophyRow } from "@/components/hall";
import { Eyebrow, StatTile } from "@/components/ui";
import type { ManagerSeason } from "@/lib/db/collections";
import { formatPct, formatPoints, formatRecord, ordinal } from "@/lib/format";
import { getHall, getManager } from "@/lib/hall/queries";
import { hofProbability, leagueTracksPoints } from "@/lib/hall/scoring";

function seasonResult(s: ManagerSeason): { text: string; tone: "gold" | "silver" | "plain" | "dim" } {
  if (s.result === "CHAMPION") return { text: "Champion", tone: "gold" };
  if (s.result === "RUNNER_UP") return { text: "Runner-up", tone: "silver" };
  if (!s.isComplete) return { text: "In progress", tone: "dim" };
  if (s.finalStanding !== null) return { text: ordinal(s.finalStanding), tone: "plain" };
  if (s.playoffSeed !== null) return { text: `${ordinal(s.playoffSeed)} (reg. season)`, tone: "plain" };
  return { text: "Finish unavailable", tone: "dim" };
}

export default async function ManagerPage({ params }: PageProps<"/hall/[code]/managers/[managerId]">) {
  const { code: rawCode, managerId } = await params;
  const hall = await getHall(rawCode);
  if (!hall) notFound();
  const code = hall.league.code!;
  const m = getManager(hall, decodeURIComponent(managerId));
  if (!m) notFound();
  const rank = hall.records.managers.findIndex((x) => x.managerId === m.managerId) + 1;
  const prob = hofProbability(m, leagueTracksPoints(hall.records.managers));

  const stats: { label: string; value: string | null }[] = [
    { label: "Regular-season wins", value: String(m.wins) },
    { label: "Regular-season losses", value: String(m.losses) },
    ...(m.ties ? [{ label: "Ties", value: String(m.ties) }] : []),
    { label: "Career win %", value: formatPct(m.winPct) },
    { label: "Points for", value: formatPoints(m.pointsFor) },
    { label: "Best regular-season finish", value: m.bestFinish !== null ? ordinal(m.bestFinish) : null },
    { label: "Worst regular-season finish", value: m.worstFinish !== null ? ordinal(m.worstFinish) : null },
    { label: "Seasons played", value: String(m.seasonsPlayed) },
    { label: "HOF points", value: `${m.hofScore} (#${rank})` },
  ];

  return (
    <div className="space-y-10">
      <header className="text-center">
        <Eyebrow className="mb-3">Manager</Eyebrow>
        <div className="mb-4 flex justify-center">
          <TrophyRow count={m.championships} max={10} />
        </div>
        <h1 className="break-words font-display text-[2.5rem] font-bold uppercase leading-[1.02] tracking-wide text-fg sm:text-6xl">
          {m.name}
        </h1>
        {m.championshipSeasons.length > 0 && (
          <p className="mt-3 font-serif text-lg italic text-muted">
            Champion {m.championshipSeasons.join(" · ")}
          </p>
        )}
        {!m.ownerKnown && <p className="mt-2 text-sm text-subtle">ESPN did not provide this manager&apos;s name; shown by team name.</p>}
      </header>

      <section className="stagger grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile value={m.championships} label="Titles" accent />
        <StatTile value={m.finals} label="Finals" delay={80} />
        <StatTile value={m.playoffs} label="Playoffs" delay={160} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Hall of Fame Probability</p>
            <p className={`mt-1 font-display text-5xl font-semibold leading-none ${prob.inducted ? "text-accent" : ""}`}>
              {prob.inducted ? "Inducted" : `${prob.percent}%`}
            </p>
          </div>
          <p className="text-right text-sm text-muted">
            <span className="block font-display text-2xl text-fg">{m.hofScore}</span>
            HOF points
          </p>
        </div>
        <ul className="mt-5 space-y-3">
          {prob.criteria.map((c) => (
            <li key={c.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">{c.label}</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{Math.round(c.value).toLocaleString("en-US")}</span>
                  <span className="text-subtle"> / {c.target.toLocaleString("en-US")}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className={`h-full rounded-full ${c.progress >= 1 ? "bg-accent" : "bg-fg"}`}
                  style={{ width: `${Math.round(c.progress * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold uppercase tracking-wide">Career</h2>
        <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {stats
            .filter((s) => s.value !== null)
            .map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-muted">{s.label}</dt>
                <dd className="shrink-0 font-display text-xl text-fg">{s.value}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-2 text-xs text-subtle">
          Career totals include completed seasons only. Points for counts points-scoring seasons only.
        </p>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold uppercase tracking-wide">Season by Season</h2>
        <ol className="stagger relative space-y-3 border-l border-line pl-6">
          {m.seasons.map((s) => {
            const r = seasonResult(s);
            return (
              <li key={s.season} className="relative">
                <span
                  className={`absolute -left-[31px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${r.tone === "gold" ? "bg-accent" : "bg-line"}`}
                  aria-hidden="true"
                />
                <Link
                  href={`/hall/${code}/seasons/${s.season}`}
                  className={`ripple flex items-center gap-4 rounded-2xl border px-4 py-3 transition-colors duration-200 hover:bg-sunken ${r.tone === "gold" ? "border-line bg-accent-soft" : "border-line bg-surface"}`}
                >
                  <span className="w-14 shrink-0 font-display text-2xl font-semibold text-muted">{s.season}</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block font-display text-lg uppercase tracking-wide ${
                        r.tone === "gold" ? "text-accent" : r.tone === "silver" ? "text-fg" : r.tone === "dim" ? "text-subtle" : "text-fg"
                      }`}
                    >
                      {r.text}
                    </span>
                    <span className="block truncate text-sm text-muted">{s.teamName}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm text-muted">{formatRecord(s.wins, s.losses, s.ties) ?? ""}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
