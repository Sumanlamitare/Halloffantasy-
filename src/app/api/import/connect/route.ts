import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, errorResponse, noStore } from "@/lib/api";
import { connectLeague } from "@/lib/import/job";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z
  .object({
    leagueId: z.string().trim().regex(/^\d{1,12}$/, "League ID should be the number from your ESPN league URL."),
    season: z.coerce.number().int().min(2000).max(2100),
    isPrivate: z.boolean(),
    // Whitespace (often added by copy/paste) is removed; header-breaking characters are rejected.
    espnS2: z
      .string()
      .transform((s) => s.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^[^;,"\\]{20,2048}$/, "espn_s2 doesn't look right."))
      .optional(),
    swid: z
      .string()
      .transform((s) => s.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^\{?[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}?$/, "SWID should look like {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}."))
      .optional(),
  })
  .refine((d) => !d.isPrivate || (d.espnS2 && d.swid), {
    message: "Private leagues need both espn_s2 and SWID.",
  });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  const { leagueId, season, isPrivate, espnS2, swid } = parsed.data;
  try {
    const view = await connectLeague({
      leagueId,
      season,
      creds: isPrivate && espnS2 && swid ? { espnS2, swid } : null,
    });
    return NextResponse.json(view, noStore);
  } catch (err) {
    return errorResponse(err);
  }
}
