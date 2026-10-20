import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, errorResponse, noStore } from "@/lib/api";
import { startImport } from "@/lib/import/job";

export const runtime = "nodejs";

const schema = z.object({
  importId: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
  seasons: z.array(z.number().int().min(1990).max(2100)).min(1, "Select at least one season.").max(60),
  autoUpdate: z.boolean().default(false),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");
  try {
    const view = await startImport(parsed.data.importId, parsed.data.seasons, parsed.data.autoUpdate);
    if (!view) return NextResponse.json({ error: "Import not found. Please reconnect your league." }, { status: 404 });
    return NextResponse.json(view, noStore);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Select")) return badRequest(err.message);
    return errorResponse(err);
  }
}
