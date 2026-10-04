import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo";
import { getCredentialsKey } from "@/lib/env";
import { EspnError, fetchLeague } from "@/lib/espn/client";
import { describeServerError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Check = { ok: boolean; detail: string };

/**
 * Setup check for the deployment: database connection, encryption key and
 * whether ESPN is reachable from this server. Reports status only — never
 * any secret values.
 */
export async function GET() {
  const [database, credentialsKey, espn] = await Promise.all([checkDatabase(), checkKey(), checkEspn()]);
  const ok = database.ok && espn.ok;
  return NextResponse.json(
    { ok, database, credentialsKey, espn },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function checkDatabase(): Promise<Check> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { ok: true, detail: `Connected (database "${db.databaseName}").` };
  } catch (err) {
    return { ok: false, detail: describeServerError(err) ?? `Database error: ${(err as Error)?.name ?? "unknown"}.` };
  }
}

async function checkKey(): Promise<Check> {
  try {
    return getCredentialsKey()
      ? { ok: true, detail: "Set. Private leagues are enabled." }
      : { ok: false, detail: "Not set. Public leagues work; private leagues need ESPN_CREDENTIALS_KEY." };
  } catch (err) {
    return { ok: false, detail: describeServerError(err) ?? "Invalid ESPN_CREDENTIALS_KEY." };
  }
}

async function checkEspn(): Promise<Check> {
  // Any answer from ESPN (even "not found" or "private") proves it's reachable.
  try {
    await fetchLeague("1", new Date().getFullYear(), { views: ["mSettings"] });
    return { ok: true, detail: "Reachable." };
  } catch (err) {
    if (err instanceof EspnError && err.kind !== "transient") return { ok: true, detail: "Reachable." };
    return { ok: false, detail: "ESPN could not be reached from this server." };
  }
}
