import "server-only";
import type { AnyBulkWriteOperation, Collection, Document, Filter } from "mongodb";
import { getCollections } from "@/lib/db/collections";
import { EspnError, fetchLeague, type EspnCredentials } from "@/lib/espn/client";
import { FIRST_MODERN_SEASON } from "@/lib/espn/constants";
import { normalizeCore } from "./normalize";

/**
 * Imports one season's results (settings, teams, managers, standings,
 * matchups, playoffs) from ESPN into MongoDB. Upserts keyed on the unique
 * indexes make it idempotent: re-running never duplicates records.
 */

async function upsertMany<T extends Document>(
  coll: Collection<T>,
  docs: T[],
  key: (d: T) => Filter<T>,
): Promise<void> {
  if (docs.length === 0) return;
  const ops: AnyBulkWriteOperation<T>[] = docs.map((d) => ({
    replaceOne: { filter: key(d), replacement: d, upsert: true },
  }));
  for (let i = 0; i < ops.length; i += 1000) {
    await coll.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
  }
}

export async function importSeason(
  leagueId: string,
  seasonYear: number,
  creds: EspnCredentials | null,
): Promise<void> {
  const league = await fetchLeague(leagueId, seasonYear, {
    views: ["mTeam", "mSettings", "mStatus", "mMatchupScore", "mStandings"],
    creds,
  });
  const core = normalizeCore(leagueId, seasonYear, league, seasonYear < FIRST_MODERN_SEASON);
  if (core.teams.length === 0) {
    throw new EspnError(`ESPN returned no teams for ${seasonYear}.`, "unavailable");
  }

  const c = await getCollections();
  await upsertMany(c.teams, core.teams, (d) => ({ leagueId, season: seasonYear, teamId: d.teamId }));
  await upsertMany(c.members, core.members, (d) => ({ leagueId, season: seasonYear, memberId: d.memberId }));
  await upsertMany(c.matchups, core.matchups, (d) => ({ leagueId, season: seasonYear, matchupId: d.matchupId }));
  await upsertMany(c.playoffs, core.playoffs, (d) => ({ leagueId, season: seasonYear, matchupId: d.matchupId }));

  // Season doc is written last, so a season only appears once its data is in place.
  await c.seasons.replaceOne(
    { leagueId, season: seasonYear },
    { ...core.season, data: { core: "complete" }, importedAt: new Date() },
    { upsert: true },
  );
}
