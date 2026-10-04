import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { getHall, getManager } from "@/lib/hall/queries";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/hall/[leagueCode]/managers/[managerId]">) {
  try {
    const { leagueCode, managerId } = await ctx.params;
    const hall = await getHall(leagueCode);
    if (!hall) return NextResponse.json({ error: "League not found. Check your code and try again." }, { status: 404 });
    const manager = getManager(hall, managerId);
    if (!manager) return NextResponse.json({ error: "Manager not found." }, { status: 404 });
    return NextResponse.json({ manager });
  } catch (err) {
    return errorResponse(err);
  }
}
