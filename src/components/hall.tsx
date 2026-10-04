import Link from "next/link";
import type { ManagerSummary } from "@/lib/db/collections";
import { formatPct } from "@/lib/format";
import { pressable, TrophyIcon } from "./ui";

export function SeasonChips({
  code,
  seasons,
  active,
  hrefFor,
}: {
  code: string;
  seasons: number[];
  active?: number;
  hrefFor?: (season: number) => string;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {seasons.map((s) => (
        <li key={s}>
          <Link
            href={hrefFor ? hrefFor(s) : `/hall/${code}/seasons/${s}`}
            scroll={!hrefFor}
            aria-current={active === s ? "page" : undefined}
            className={`ripple inline-flex min-h-11 min-w-16 items-center justify-center rounded-full border px-4 font-display text-base tracking-wide transition-colors duration-200 ${
              active === s ? "border-fg bg-fg text-surface" : "border-line bg-surface text-fg hover:bg-sunken"
            }`}
          >
            {s}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TrophyRow({ count, max = 8 }: { count: number; max?: number }) {
  if (count <= 0) return null;
  const shown = Math.min(count, max);
  return (
    <div className="flex flex-wrap items-center justify-center gap-0.5 text-accent" aria-label={`${count} championships`}>
      {Array.from({ length: shown }, (_, i) => (
        <TrophyIcon key={i} className="h-5 w-5" />
      ))}
      {count > max && <span className="ml-1 text-sm">+{count - max}</span>}
    </div>
  );
}

export function ManagerCard({ code, m, rank }: { code: string; m: ManagerSummary; rank: number }) {
  return (
    <Link href={`/hall/${code}/managers/${m.managerId}`} className={`${pressable} relative flex flex-col p-5 text-center`}>
      <span className={`absolute left-5 top-5 font-display text-sm tracking-wider ${rank === 1 ? "text-accent" : "text-subtle"}`}>
        #{rank}
      </span>
      <div className="mx-auto mb-3 flex h-10 items-center justify-center">
        {m.championships > 0 ? <TrophyRow count={m.championships} /> : <span className="h-5" />}
      </div>
      <h3 className="break-words font-display text-2xl font-semibold uppercase leading-tight tracking-wide">{m.name}</h3>
      {!m.ownerKnown && <p className="mt-1 text-xs text-subtle">Manager name unavailable from ESPN</p>}

      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Stat value={m.championships} label={m.championships === 1 ? "Title" : "Titles"} />
        <Stat value={m.finals} label="Finals" />
        <Stat value={m.playoffs} label="Playoffs" />
      </dl>

      <div className="mt-4 flex items-end justify-between gap-3 rounded-xl bg-sunken px-4 py-3 text-left">
        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted">Hall of Fame Score</p>
          <p className="font-display text-3xl font-semibold leading-none">{m.hofScore}</p>
        </div>
        <div className="text-right text-xs text-muted">
          <p>
            {m.wins}-{m.losses}
            {m.ties ? `-${m.ties}` : ""}
          </p>
          {m.winPct !== null && <p>{formatPct(m.winPct)} win%</p>}
        </div>
      </div>
    </Link>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dd className="font-display text-2xl font-semibold leading-none">{value}</dd>
      <dt className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-muted">{label}</dt>
    </div>
  );
}
