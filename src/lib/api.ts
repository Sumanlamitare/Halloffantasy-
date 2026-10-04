import "server-only";
import { NextResponse } from "next/server";
import { CredentialsNotConfiguredError } from "@/lib/credentials";
import { EspnError } from "@/lib/espn/client";

/** Converts errors into safe JSON responses. Never echoes request data. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof EspnError) {
    const status = err.kind === "auth" ? 401 : err.kind === "not_found" ? 404 : 502;
    return NextResponse.json({ error: err.message, kind: err.kind }, { status });
  }
  if (err instanceof CredentialsNotConfiguredError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  console.error("Request failed:", (err as Error)?.name, (err as Error)?.message);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export const noStore = { headers: { "Cache-Control": "no-store" } };
