import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { getHall } from "@/lib/hall/queries";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/hall/[leagueCode]/champions">) {
  try {
    const hall = await getHall((await ctx.params).leagueCode);
    if (!hall) return NextResponse.json({ error: "League not found. Check your code and try again." }, { status: 404 });
    return NextResponse.json({ champions: hall.records.champions });
  } catch (err) {
    return errorResponse(err);
  }
}
