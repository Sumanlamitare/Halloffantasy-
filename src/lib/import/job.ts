import "server-only";
import { randomBytes } from "node:crypto";
import {
  getCollections,
  type ImportDoc,
  type ImportSeasonState,
  type ImportStep,
} from "@/lib/db/collections";
import {
  deleteImportCredentials,
  loadImportCredentials,
  saveImportCredentials,
} from "@/lib/credentials";
import { EspnError, fetchLeague, type EspnCredentials } from "@/lib/espn/client";
import { generateLeagueCode } from "@/lib/league-code.server";
import { recomputeHall } from "@/lib/hall/compute";
import { describeServerError } from "@/lib/server-errors";
import { importSeason } from "./steps";

const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOCK_MS = 90_000;
/** Work budget per step request — keeps each call well under serverless limits. */
const STEP_BUDGET_MS = 20_000;

/** Public view of an import job. Never contains credentials. */
export interface ImportView {
  importId: string;
  status: ImportDoc["status"];
  league: { name: string; size: number; currentSeason: number; availableSeasons: number[] };
  seasons: { season: number; status: ImportSeasonState["status"]; steps: ImportSeasonState["steps"]; error: string | null }[];
  error: string | null;
  code: string | null;
  busy?: boolean;
}

async function toView(job: ImportDoc, busy = false): Promise<ImportView> {
  let code: string | null = null;
  if (job.status === "complete") {
    const { leagues } = await getCollections();
    code = (await leagues.findOne({ _id: job.leagueId }, { projection: { code: 1 } }))?.code ?? null;
  }
  return {
    importId: job._id,
    status: job.status,
    league: {
      name: job.leagueName,
      size: job.leagueSize,
      currentSeason: job.currentSeason,
      availableSeasons: job.availableSeasons,
    },
    seasons: job.seasons.map((s) => ({ season: s.season, status: s.status, steps: s.steps, error: s.error })),
    error: job.error,
    code,
    ...(busy ? { busy: true } : {}),
  };
}

/* Connect / discovery ---------------------------------------------------- */

export interface ConnectInput {
  leagueId: string;
  season: number;
  creds: EspnCredentials | null;
}

/**
 * Finds the league on ESPN, lists its available seasons, and creates an
 * import job. If credentials were supplied they are encrypted server-side
 * and tied to this job only.
 */
export async function connectLeague(input: ConnectInput): Promise<ImportView> {
  const views = ["mSettings", "mTeam", "mStatus"];
  let season = input.season;
  let league;
  try {
    league = await fetchLeague(input.leagueId, season, { views, creds: input.creds });
  } catch (err) {
    // The league may not have renewed for the requested season yet.
    if (err instanceof EspnError && err.kind === "not_found") {
      season = input.season - 1;
      league = await fetchLeague(input.leagueId, season, { views, creds: input.creds });
    } else {
      throw err;
    }
  }

  const foundSeason = typeof league.seasonId === "number" ? league.seasonId : season;
  const previous = (league.status?.previousSeasons ?? []).filter(
    (s): s is number => typeof s === "number" && s > 1990 && s < foundSeason,
  );
  const availableSeasons = Array.from(new Set([foundSeason, ...previous])).sort((a, b) => b - a);

  const now = new Date();
  const importId = randomBytes(24).toString("base64url");
  const job: ImportDoc = {
    _id: importId,
    leagueId: input.leagueId,
    leagueName: league.settings?.name?.trim() || `League ${input.leagueId}`,
    leagueSize: league.settings?.size ?? league.teams?.length ?? 0,
    currentSeason: foundSeason,
    availableSeasons,
    isPrivate: !!input.creds,
    status: "connected",
    seasons: [],
    error: null,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + JOB_TTL_MS),
  };

  if (input.creds) await saveImportCredentials(importId, input.creds);
  const { imports } = await getCollections();
  await imports.insertOne(job);
  return toView(job);
}

/* Start ------------------------------------------------------------------ */

export async function startImport(importId: string, seasons: number[]): Promise<ImportView | null> {
  const { imports } = await getCollections();
  const job = await imports.findOne({ _id: importId });
  if (!job) return null;
  if (job.status !== "connected") return toView(job);

  const selected = Array.from(new Set(seasons))
    .filter((s) => job.availableSeasons.includes(s))
    .sort((a, b) => b - a);
  if (!selected.length) throw new Error("Select at least one season to import.");

  const states: ImportSeasonState[] = selected.map((season) => ({
    season,
    status: "pending",
    steps: { core: "pending" },
    error: null,
  }));
  const updated = await imports.findOneAndUpdate(
    { _id: importId, status: "connected" },
    { $set: { seasons: states, status: "running", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return toView(updated ?? (await imports.findOne({ _id: importId }))!);
}

export async function getImport(importId: string): Promise<ImportView | null> {
  const { imports } = await getCollections();
  const job = await imports.findOne({ _id: importId });
  return job ? toView(job) : null;
}

/* Step ------------------------------------------------------------------- */

/**
 * Performs the next unit(s) of work for an import, within a time budget.
 * The client calls this repeatedly until status is "complete" or "failed".
 * A failed import can be resumed by calling this again: completed seasons
 * and steps are skipped, and the failing step is retried.
 */
export async function runImportStep(importId: string): Promise<ImportView | null> {
  const { imports } = await getCollections();
  const now = new Date();

  // Acquire a short lock so double-clicks / two tabs can't run the same job concurrently.
  const job = await imports.findOneAndUpdate(
    {
      _id: importId,
      status: { $in: ["running", "failed"] },
      $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
    },
    { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS), status: "running", error: null } },
    { returnDocument: "after" },
  );
  if (!job) {
    const current = await imports.findOne({ _id: importId });
    return current ? toView(current, current.status === "running") : null;
  }

  const deadline = Date.now() + STEP_BUDGET_MS;
  let current: { state: ImportSeasonState; step: ImportStep } | null = null;
  let creds: EspnCredentials | null = null;
  try {
    if (job.isPrivate) {
      creds = await loadImportCredentials(importId);
      if (!creds) {
        throw new EspnError(
          "Your ESPN credentials for this import have expired. Start again from Connect ESPN League.",
          "auth",
        );
      }
    }

    for (const state of job.seasons) {
      if (state.status === "complete" || state.status === "unavailable") continue;
      if (Date.now() > deadline) break; // resume with the next call
      state.status = "running";
      state.error = null;
      current = { state, step: "core" };
      try {
        await importSeason(job.leagueId, state.season, creds);
        state.steps.core = "complete";
        state.status = "complete";
      } catch (err) {
        if (!(err instanceof EspnError)) throw err;
        if (err.kind === "transient" || err.kind === "auth") throw err;
        // ESPN doesn't provide this season.
        state.steps.core = "unavailable";
        state.status = "unavailable";
        state.error = err.message;
      }
    }

    const allDone = job.seasons.every((s) => s.status === "complete" || s.status === "unavailable");
    if (allDone) {
      await finalizeImport(job);
    } else {
      job.updatedAt = new Date();
    }
  } catch (err) {
    const message =
      err instanceof EspnError
        ? err.message
        : (describeServerError(err) ??
          "Something went wrong while saving your league. Your progress is saved — try resuming.");
    // Unexpected errors are logged without any request data or credentials.
    if (!(err instanceof EspnError)) console.error("Import step failed:", (err as Error)?.name, (err as Error)?.message);
    if (current && current.state.status === "running") {
      current.state.status = "failed";
      current.state.error = message;
      current.state.steps[current.step] = "failed";
    }
    job.status = "failed";
    job.error = message;
  }

  job.lockedUntil = null;
  job.updatedAt = new Date();
  await imports.replaceOne({ _id: importId }, job);
  return toView(job);
}

/** Creates/updates the league's Hall, computes records, issues a code, and deletes credentials. */
async function finalizeImport(job: ImportDoc): Promise<void> {
  const c = await getCollections();
  const importedSeasons = await c.seasons
    .find({ leagueId: job.leagueId, "data.core": "complete" }, { projection: { season: 1 } })
    .toArray();
  if (importedSeasons.length === 0) {
    throw new EspnError("ESPN didn't return usable data for any of the selected seasons.", "unavailable");
  }

  const now = new Date();
  await c.leagues.updateOne(
    { _id: job.leagueId },
    {
      $set: {
        espnLeagueId: job.leagueId,
        name: job.leagueName,
        size: job.leagueSize,
        currentSeason: job.currentSeason,
        seasons: importedSeasons.map((s) => s.season).sort((a, b) => b - a),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, code: null },
    },
    { upsert: true },
  );

  await recomputeHall(job.leagueId);

  // Assign a permanent code once; re-imports keep the existing code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const league = await c.leagues.findOne({ _id: job.leagueId }, { projection: { code: 1 } });
    if (league?.code) break;
    try {
      await c.leagues.updateOne({ _id: job.leagueId, code: null }, { $set: { code: generateLeagueCode() } });
    } catch (err) {
      // Duplicate key on code: extremely unlikely collision, try another.
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }

  await deleteImportCredentials(job._id);
  job.status = "complete";
  job.error = null;
}
