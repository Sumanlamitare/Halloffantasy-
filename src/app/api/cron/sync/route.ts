import { NextResponse } from "next/server";
import { getCollections } from "@/lib/db/collections";
import { errorResponse } from "@/lib/api";
import { isSyncDue, syncLeague, type SyncResult } from "@/lib/sync/league-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Leave headroom below maxDuration so the response is always sent. */
const BUDGET_MS = 240_000;

/**
 * Daily Vercel Cron job (see vercel.json): refreshes every Hall that opted
 * in to automatic updates and is due. When CRON_SECRET is set in Vercel,
 * Vercel sends it as a Bearer token and other callers are rejected.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const started = Date.now();
    const { leagues } = await getCollections();
    const candidates = await leagues
      .find({ autoUpdate: true }, { projection: { autoUpdate: 1, hasActiveSeason: 1, lastSyncAttemptAt: 1 } })
      .toArray();
    const results: Record<SyncResult | "deferred", number> = {
      synced: 0,
      skipped: 0,
      needs_credentials: 0,
      error: 0,
      deferred: 0,
    };
    for (const league of candidates) {
      if (!isSyncDue(league)) {
        results.skipped++;
        continue;
      }
      if (Date.now() - started > BUDGET_MS) {
        results.deferred++;
        continue;
      }
      results[await syncLeague(league._id)]++;
    }
    return NextResponse.json({ ok: true, leagues: candidates.length, ...results });
  } catch (err) {
    return errorResponse(err);
  }
}
