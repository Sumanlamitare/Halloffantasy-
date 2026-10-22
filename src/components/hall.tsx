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
    <ul className="flex flex-wrap justify-center gap-2">
      {seasons.map((s) => (
        <li key={s}>
          <Link
            href={hrefFor ? hrefFor(s) : `/hall/${code}/seasons/${s}`}
            scroll={!hrefFor}
            aria-current={active === s ? "page" : undefined}
            className={`ripple inline-flex min-h-11 min-w-16 items-center justify-center rounded-full border px-4 font-display text-base tracking-wide transition-colors duration-200 ${
              active === s
                ? "border-accent bg-gradient-to-b from-[#f3d68f] via-[#d4ad57] to-[#a77e2e] text-[#1f1607]"
                : "border-accent/30 bg-transparent text-fg hover:border-accent/70"
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
  const dark = tone === "dark"; // dark = oxblood banner cloth, light = black marble
  return (
    // Outer wrapper clips the tilted band's corners so nothing sticks out sideways.
    <div className="-mx-4 overflow-hidden py-3 sm:-mx-6" aria-hidden="true">
    <div
      className={`relative -mx-[3%] -rotate-[1.5deg] overflow-hidden border-y border-accent/40 py-4 ${dark ? "bg-[#4a1419]" : "bg-[#120f0c]"}`}
    >
      <div className="marquee flex w-max items-center gap-8 whitespace-nowrap pr-8">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center gap-8">
            {loop.map((it, i) => (
              <span key={i} className="flex items-center gap-4">
                <span className="gold-text font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">{it.strong}</span>
                {it.soft && (
                  <span
                    className="font-serif text-3xl italic sm:text-4xl"
                    style={{ color: "transparent", WebkitTextStroke: "1px #efe6d2" }}
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

/** Roman numerals for gallery numbering (1–39 is plenty here). */
export function roman(n: number): string {
  const map: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, r] of map) while (n >= v) { out += r; n -= v; }
  return out;
}

/**
 * Championship banner hanging from a brass rod in the rafters.
 * `inProgress` shows an unclaimed (dimmed) banner for a season not yet decided.
 */
export function Banner({
  season,
  champion,
  teamName,
  mark,
  note,
  inProgress = false,
  selected = false,
  delay = 0,
}: {
  season: number;
  champion: string | null;
  teamName?: string | null;
  /** Commissioner mark after the champion's name, e.g. "*". */
  mark?: string;
  /** Commissioner line under the champion's name. */
  note?: string;
  inProgress?: boolean;
  selected?: boolean;
  delay?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* this banner's section of the rafter beam (adjacent cells join into one beam) */}
      <div aria-hidden="true" className="h-3 w-full bg-gradient-to-b from-[#3a2a17] to-[#1c140b] shadow-[0_6px_14px_rgba(0,0,0,0.7)]" />
      {/* rod */}
      <div className="banner-rod relative z-10 -mt-1 h-1.5 w-[86%] rounded-full" />
      <div
        className={`banner-sway relative -mt-0.5 w-[78%] ${inProgress ? "opacity-45" : ""}`}
        style={{ animationDelay: `${-delay}s` }}
      >
        <div
          className={`banner-cloth flex min-h-[13.5rem] flex-col items-center px-2 pb-12 pt-5 text-center sm:min-h-[16rem] ${
            selected ? "drop-shadow-[0_0_18px_rgba(212,173,87,0.55)]" : ""
          }`}
        >
          <span className="gold-text font-display text-2xl font-black leading-none sm:text-3xl">{season}</span>
          <TrophyIcon className="mt-3 h-6 w-6 text-accent sm:h-7 sm:w-7" />
          <span className="mt-3 w-full break-words font-display text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-fg sm:text-sm">
            {champion ?? (inProgress ? "To be decided" : "—")}
            {champion && mark && <span className="text-accent">{mark}</span>}
          </span>
          {teamName && (
            <span className="mt-1 line-clamp-2 w-full font-serif text-[12px] italic leading-tight text-muted sm:text-sm">{teamName}</span>
          )}
          {note && (
            <span className="mt-1.5 w-full break-words font-serif text-[12px] italic leading-tight text-accent sm:text-sm">{note}</span>
          )}
          <span className="mt-auto pt-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-accent/80">
            {inProgress ? "In progress" : "Champions"}
          </span>
        </div>
      </div>
    </div>
  );
}
