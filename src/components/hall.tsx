import Link from "next/link";
import { TrophyIcon } from "./ui";

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
