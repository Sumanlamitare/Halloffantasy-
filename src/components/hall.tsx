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

/**
 * Infinite scrolling banner of alternating solid / outline type, adapted
 * from the marquee in adyaman-singh/krishna-s-teachings (MIT). Items are
 * rendered twice so the -50% loop is seamless; the band clips its content
 * so the page never scrolls sideways.
 */
export function Marquee({ items, tone = "dark" }: { items: { strong: string; soft?: string }[]; tone?: "dark" | "light" }) {
  if (!items.length) return null;
  const loop = [...items, ...items, ...items, ...items];
  const dark = tone === "dark";
  return (
    // Outer wrapper clips the tilted band's corners so nothing sticks out sideways.
    <div className="-mx-4 overflow-hidden py-3 sm:-mx-6" aria-hidden="true">
    <div
      className={`relative -mx-[3%] -rotate-[1.5deg] overflow-hidden py-4 ${dark ? "bg-fg text-surface" : "border-y border-line bg-surface"}`}
    >
      <div className="marquee flex w-max items-center gap-8 whitespace-nowrap pr-8">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center gap-8">
            {loop.map((it, i) => (
              <span key={i} className="flex items-center gap-4">
                <span className="font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">{it.strong}</span>
                {it.soft && (
                  <span
                    className="font-serif text-3xl italic sm:text-4xl"
                    style={{ color: "transparent", WebkitTextStroke: `1px ${dark ? "#fffdf8" : "#1a1814"}` }}
                  >
                    {it.soft}
                  </span>
                )}
                <span className="text-accent">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
