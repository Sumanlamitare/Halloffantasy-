import "server-only";
import { getCollections, type LeagueDoc } from "@/lib/db/collections";
import { loadLeagueCredentials } from "@/lib/credentials";
import { EspnError, fetchLeague } from "@/lib/espn/client";
import { recomputeHall } from "@/lib/hall/compute";
import { importSeason } from "@/lib/import/steps";

/**
 * Keeps an opted-in Hall in sync with ESPN.
 *
 * Only seasons that can still change are re-imported: any season not yet
 * complete, plus a check for whether the league has renewed for a new
 * season. Completed seasons are never re-fetched.
 *
 * Throttled per league: at most every 30 minutes while a season is in
 * progress, otherwise once a day (to notice renewal). A lock prevents
 * concurrent syncs of the same league.
 */

const ACTIVE_INTERVAL_MS = 30 * 60 * 1000;
const IDLE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LOCK_MS = 2 * 60 * 1000;

export type SyncResult = "synced" | "skipped" | "needs_credentials" | "error";

/** True when a league is due for a sync (cheap check, no locking). */
export function isSyncDue(league: Pick<LeagueDoc, "autoUpdate" | "hasActiveSeason" | "lastSyncAttemptAt">): boolean {
  if (!league.autoUpdate) return false;
  const last = league.lastSyncAttemptAt?.getTime() ?? 0;
  const interval = league.hasActiveSeason ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
  return Date.now() - last >= interval;
}

export async function syncLeague(leagueId: string): Promise<SyncResult> {
  const c = await getCollections();
  const now = new Date();

  // Claim the league: must be opted in, due, and not already syncing.
  const league = await c.leagues.findOneAndUpdate(
    {
      _id: leagueId,
      autoUpdate: true,
      $and: [
        { $or: [{ syncLockedUntil: null }, { syncLockedUntil: { $exists: false } }, { syncLockedUntil: { $lt: now } }] },
        {
          $or: [
            { lastSyncAttemptAt: null },
            { lastSyncAttemptAt: { $exists: false } },
            { hasActiveSeason: true, lastSyncAttemptAt: { $lt: new Date(now.getTime() - ACTIVE_INTERVAL_MS) } },
            { lastSyncAttemptAt: { $lt: new Date(now.getTime() - IDLE_INTERVAL_MS) } },
          ],
        },
      ],
    },
    { $set: { syncLockedUntil: new Date(now.getTime() + LOCK_MS), lastSyncAttemptAt: now } },
    { returnDocument: "after" },
  );
  if (!league) return "skipped";

  const finish = (fields: Partial<LeagueDoc>) =>
    c.leagues.updateOne({ _id: leagueId }, { $set: { ...fields, syncLockedUntil: null, updatedAt: new Date() } });

  try {
    const creds = league.isPrivate ? await loadLeagueCredentials(leagueId) : null;
    if (league.isPrivate && !creds) {
      await finish({ syncStatus: "needs_credentials" });
      return "needs_credentials";
    }

    const seasons = new Set(league.seasons);
    const latest = Math.max(...league.seasons);

    // 1. Has the league renewed for a new season?
    let renewed: number | null = null;
    try {
      await importSeason(leagueId, latest + 1, creds);
      renewed = latest + 1;
      seasons.add(renewed);
    } catch (err) {
      // Not renewed yet: ESPN says "not found" ("not authorized" for private leagues).
      if (!(err instanceof EspnError) || err.kind === "transient") throw err;
      if (err.kind === "auth" && creds) {
        // Make sure the stored cookies still work (also covers the off-season).
        await fetchLeague(leagueId, latest, { views: ["mSettings"], creds });
      }
    }

    // 2. Re-import every season that can still change.
    const incomplete = await c.seasons
      .find({ leagueId, isComplete: false }, { projection: { season: 1 } })
      .toArray();
    for (const { season } of incomplete) {
      if (season !== renewed) await importSeason(leagueId, season, creds);
    }

    await recomputeHall(leagueId);
    const sorted = [...seasons].sort((a, b) => b - a);
    const stillActive = (await c.seasons.countDocuments({ leagueId, isComplete: false }, { limit: 1 })) > 0;
    await finish({
      seasons: sorted,
      currentSeason: sorted[0],
      hasActiveSeason: stillActive,
      lastSyncedAt: new Date(),
      syncStatus: "ok",
    });
    return "synced";
  } catch (err) {
    const expired = err instanceof EspnError && err.kind === "auth";
    // Logged without request data or credentials.
    console.error("League sync failed:", (err as Error)?.name, (err as Error)?.message);
    await finish({ syncStatus: expired ? "needs_credentials" : "error" });
    return expired ? "needs_credentials" : "error";
  }
}
