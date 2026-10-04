import "server-only";
import { NextResponse } from "next/server";
import { CredentialsNotConfiguredError } from "@/lib/credentials";
import { EspnError } from "@/lib/espn/client";
import { describeServerError } from "@/lib/server-errors";

/** Converts errors into safe JSON responses. Never echoes request data. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof EspnError) {
    const status = err.kind === "auth" ? 401 : err.kind === "not_found" ? 404 : 502;
    return NextResponse.json({ error: err.message, kind: err.kind }, { status });
  }
  if (err instanceof CredentialsNotConfiguredError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  // Logged without request data; visible in Vercel → Logs.
  console.error("Request failed:", (err as Error)?.name, (err as Error)?.message);
  const described = describeServerError(err);
  if (described) return NextResponse.json({ error: described, kind: "server_setup" }, { status: 503 });
  return NextResponse.json(
    { error: "Something went wrong on the server. Check Vercel → Logs for details, or open /api/health." },
    { status: 500 },
  );
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export const noStore = { headers: { "Cache-Control": "no-store" } };
