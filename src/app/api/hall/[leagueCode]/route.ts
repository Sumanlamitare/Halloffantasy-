import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { getHall, hallSummary } from "@/lib/hall/queries";

export const runtime = "nodejs";

const NOT_FOUND = { error: "League not found. Check your code and try again." };

export async function GET(_req: Request, ctx: RouteContext<"/api/hall/[leagueCode]">) {
  try {
    const hall = await getHall((await ctx.params).leagueCode);
    if (!hall) return NextResponse.json(NOT_FOUND, { status: 404 });
    return NextResponse.json(hallSummary(hall));
  } catch (err) {
    return errorResponse(err);
  }
}
