import { notFound } from "next/navigation";
import { ManagerCard } from "@/components/hall";
import { Card, SectionTitle, Unavailable } from "@/components/ui";
import { getHall } from "@/lib/hall/queries";
import { HOF_SCORE_RULES } from "@/lib/hall/scoring";

export default async function HallOfFamePage({ params }: PageProps<"/hall/[code]/hall-of-fame">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const code = hall.league.code!;
  const { managers, completedSeasons } = hall.records;

  return (
    <div>
      <SectionTitle eyebrow="The Greatest Managers" title="Hall of Fame">
        Ranked by Hall of Fame Score, calculated only from {completedSeasons.length} completed season
        {completedSeasons.length === 1 ? "" : "s"} of imported ESPN results.
      </SectionTitle>

      {managers.length === 0 ? (
        <Unavailable>No managers have been imported yet.</Unavailable>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managers.map((m, i) => (
            <ManagerCard key={m.managerId} code={code} m={m} rank={i + 1} />
          ))}
        </div>
      )}

      <Card className="mt-10">
        <h2 className="font-display text-lg uppercase tracking-wide text-fg">How the Hall of Fame Score works</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          For each completed season, a manager earns points for their best result that year (results don&apos;t stack),
          plus a bonus for finishing as the #1 regular-season seed. Ties are broken by championships, finals appearances,
          playoff appearances, then career win percentage.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {HOF_SCORE_RULES.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
              <span className="text-fg">{r.label}</span>
              <span className="shrink-0 font-display text-lg">+{r.points}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-subtle">
          Seasons still in progress are not counted. Playoff appearances use ESPN&apos;s regular-season seeding and the
          league&apos;s playoff team count.
        </p>
      </Card>
    </div>
  );
}
