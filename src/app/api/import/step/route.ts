import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, errorResponse, noStore } from "@/lib/api";
import { runImportStep } from "@/lib/import/job";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ importId: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/) });

/** Runs the next slice of an import. The client calls this until complete/failed. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.");
  try {
    const view = await runImportStep(parsed.data.importId);
    if (!view) return NextResponse.json({ error: "Import not found. Please reconnect your league." }, { status: 404 });
    return NextResponse.json(view, noStore);
  } catch (err) {
    return errorResponse(err);
  }
}
