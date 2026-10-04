import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { getHall, getSeasonDetail } from "@/lib/hall/queries";

export const runtime = "nodejs";

/** Without ?season= lists seasons; with ?season=2025 returns that season's detail. */
export async function GET(req: Request, ctx: RouteContext<"/api/hall/[leagueCode]/seasons">) {
  try {
    const hall = await getHall((await ctx.params).leagueCode);
    if (!hall) return NextResponse.json({ error: "League not found. Check your code and try again." }, { status: 404 });
    const seasonParam = new URL(req.url).searchParams.get("season");
    if (seasonParam) {
      const detail = await getSeasonDetail(hall, Number(seasonParam));
      if (!detail) return NextResponse.json({ error: "Season not found." }, { status: 404 });
      return NextResponse.json(detail);
    }
    return NextResponse.json({
      seasons: hall.records.allSeasons,
      completedSeasons: hall.records.completedSeasons,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
