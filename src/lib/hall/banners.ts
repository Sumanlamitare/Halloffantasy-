import type { ChampionEntry } from "@/lib/db/collections";
import type { Hall } from "@/lib/hall/queries";

/**
 * Commissioner additions to a league's championship banners, keyed by league
 * name. They only change the banners in the rafters (Home and Champions);
 * the Hall of Fame, records and season pages still use imported ESPN data.
 * League and manager names are matched on their letters and digits only.
 */
interface BannerEdits {
  /** Text added right after a champion's name on their banners, e.g. "*". */
  marks?: Record<string, string>;
  /** A short line shown under a champion's name on their banners. */
  notes?: Record<string, string>;
  /** Titles from seasons that aren't in the imported ESPN history. */
  extraTitles?: { season: number; champion: string; teamName?: string }[];
}

const LEAGUE_BANNER_EDITS: Record<string, BannerEdits> = {
  "Nepali Boyz": {
    marks: { "Hari Timsina": "*" },
    notes: { "Leela Pokhrel": "(Thank you Suman)" },
    extraTitles: [{ season: 2021, champion: "Suman Lamitare" }],
  },
};

export interface BannerEntry extends ChampionEntry {
  mark?: string;
  note?: string;
  /** Added by the commissioner; no ESPN season data behind it. */
  manual?: boolean;
}

/** Letters and digits only, so spacing, punctuation, emoji and invisible characters don't matter. */
const norm = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");

/** One entry per season (newest first) with the league's banner additions applied. */
export function championBanners(hall: Hall): BannerEntry[] {
  const list: BannerEntry[] = hall.records.champions.map((c) => ({ ...c }));
  const edits = Object.entries(LEAGUE_BANNER_EDITS).find(([name]) => norm(name) === norm(hall.league.name))?.[1];
  if (!edits) return list;
  const lookup = (map: Record<string, string> | undefined, name: string) =>
    Object.entries(map ?? {}).find(([key]) => norm(key) === norm(name))?.[1];

  for (const t of edits.extraTitles ?? []) {
    if (list.some((c) => c.season === t.season)) continue; // imported ESPN data wins
    const manager = hall.records.managers.find((m) => norm(m.name) === norm(t.champion));
    list.push({
      season: t.season,
      isComplete: true,
      champion: { managerId: manager?.managerId ?? "", name: manager?.name ?? t.champion, teamName: t.teamName ?? "", teamId: -1 },
      runnerUp: null,
      finalScore: null,
      manual: true,
    });
  }
  list.sort((a, b) => b.season - a.season);

  for (const c of list) {
    if (!c.champion) continue;
    c.mark = lookup(edits.marks, c.champion.name);
    c.note = lookup(edits.notes, c.champion.name);
  }
  return list;
}
