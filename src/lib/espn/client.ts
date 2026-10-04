import "server-only";
import { FIRST_MODERN_SEASON } from "./constants";
import type { EspnLeague } from "./types";

/**
 * Server-side client for ESPN's unofficial Fantasy Basketball (v3) API.
 *
 * Private leagues are read with the commissioner's ESPN session cookies
 * (espn_s2 + SWID). These are only ever attached to outbound requests to
 * ESPN from the server. They are never logged and never included in error
 * messages.
 */

const BASE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 20_000;

export interface EspnCredentials {
  espnS2: string;
  swid: string;
}

export class EspnError extends Error {
  constructor(
    message: string,
    /** "auth" = credentials missing/invalid, "not_found" = league/season does
     *  not exist, "unavailable" = ESPN doesn't serve this data, "transient" =
     *  network/server failure after retries. */
    public readonly kind: "auth" | "not_found" | "unavailable" | "transient",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "EspnError";
  }
}

/** SWID must be wrapped in braces: {XXXXXXXX-XXXX-...}. */
export function normalizeSwid(swid: string): string {
  const s = swid.trim().replace(/^\{|\}$/g, "");
  return `{${s}}`;
}

interface RequestOptions {
  views?: string[];
  creds?: EspnCredentials | null;
}

type EndpointFormat = "seasons" | "leagueHistory";

function leagueUrl(leagueId: string, season: number, format: EndpointFormat): URL {
  if (format === "leagueHistory") {
    const url = new URL(`${BASE_URL}/leagueHistory/${encodeURIComponent(leagueId)}`);
    url.searchParams.set("seasonId", String(season));
    return url;
  }
  return new URL(
    `${BASE_URL}/seasons/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}`,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function requestJson<T>(url: URL, opts: RequestOptions): Promise<T> {
  for (const v of opts.views ?? []) url.searchParams.append("view", v);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "HallOfFantasy/1.0",
  };
  if (opts.creds) {
    headers.Cookie = `espn_s2=${opts.creds.espnS2}; SWID=${normalizeSwid(opts.creds.swid)}`;
  }

  let lastError: EspnError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      lastError = new EspnError("Could not reach ESPN.", "transient");
      await sleep(500 * 2 ** (attempt - 1));
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      // ESPN's API answers auth failures with JSON. An HTML 403 means the
      // request was blocked upstream (bot protection), not a credentials issue.
      const body = await res.text().catch(() => "");
      if (res.status === 403 && !body.trimStart().startsWith("{")) {
        throw new EspnError(
          "ESPN blocked the request from this server (HTTP 403). Please try again in a few minutes.",
          "transient",
          403,
        );
      }
      throw new EspnError(
        opts.creds
          ? `ESPN rejected the provided credentials (HTTP ${res.status}). Check that: the season is right (try the previous season); espn_s2 was copied completely, with "Show URL-decoded" unchecked; and the ESPN account is a member of this league. Cookies expire, so copy fresh ones if needed.`
          : "This league is private. ESPN credentials (espn_s2 and SWID) are required.",
        "auth",
        res.status,
      );
    }
    if (res.status === 404) {
      throw new EspnError("League or season not found on ESPN.", "not_found", 404);
    }
    if (res.status >= 300 && res.status < 400) {
      // ESPN redirects to a login page for some unauthenticated requests.
      throw new EspnError(
        "ESPN requires authentication for this league.",
        "auth",
        res.status,
      );
    }
    if (res.status === 429 || res.status >= 500) {
      lastError = new EspnError(`ESPN is temporarily unavailable (HTTP ${res.status}).`, "transient", res.status);
      await sleep(750 * 2 ** (attempt - 1));
      continue;
    }
    if (!res.ok) {
      throw new EspnError(`ESPN returned HTTP ${res.status}.`, "unavailable", res.status);
    }

    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new EspnError("ESPN returned an unexpected (non-JSON) response.", "unavailable", res.status);
    }
  }
  throw lastError ?? new EspnError("Could not reach ESPN.", "transient");
}

/**
 * Fetches league data for one season. Seasons before 2018 normally live at
 * ESPN's leagueHistory endpoint; if the expected endpoint answers 401 the
 * other format is tried too (as the espn-api library does), since ESPN serves
 * some leagues' seasons from the other one.
 */
export async function fetchLeague(
  leagueId: string,
  season: number,
  opts: RequestOptions = {},
): Promise<EspnLeague> {
  const primary: EndpointFormat = season < FIRST_MODERN_SEASON ? "leagueHistory" : "seasons";
  const fallback: EndpointFormat = primary === "seasons" ? "leagueHistory" : "seasons";
  let data: EspnLeague | EspnLeague[];
  try {
    data = await requestJson<EspnLeague | EspnLeague[]>(leagueUrl(leagueId, season, primary), opts);
  } catch (err) {
    if (!(err instanceof EspnError) || err.kind !== "auth") throw err;
    try {
      data = await requestJson<EspnLeague | EspnLeague[]>(leagueUrl(leagueId, season, fallback), opts);
    } catch {
      throw err; // report the original auth error
    }
  }
  const league = Array.isArray(data) ? data.find((l) => l?.seasonId === season) ?? data[0] : data;
  if (!league || typeof league !== "object") {
    throw new EspnError("League or season not found on ESPN.", "not_found");
  }
  return league;
}
