import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionTitle, Unavailable } from "@/components/ui";
import { getHall } from "@/lib/hall/queries";

export default async function RecordsPage({ params }: PageProps<"/hall/[code]/records">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const code = hall.league.code!;
  const { records, completedSeasons } = hall.records;

  return (
    <div>
      <SectionTitle eyebrow="The Record Book" title="League Records">
        All-time records calculated only from imported ESPN data across {completedSeasons.length} completed season
        {completedSeasons.length === 1 ? "" : "s"}. Records without enough underlying data are not shown.
      </SectionTitle>

      {records.length === 0 ? (
        <Unavailable>No records can be calculated yet — records need at least one completed season.</Unavailable>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <article key={r.key} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,0.04)]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{r.title}</h2>
              <p className="mt-3 font-display text-5xl font-semibold leading-none text-fg">{r.value}</p>
              <ul className="mt-4 space-y-1.5">
                {r.holders.map((h, i) => (
                  <li key={`${h.managerId}-${h.season ?? i}`} className="text-[15px]">
                    <Link href={`/hall/${code}/managers/${h.managerId}`} className="font-semibold uppercase tracking-wide text-fg underline-offset-4 hover:underline">
                      {h.name}
                    </Link>
                    {(h.season || h.note || h.teamName) && (
                      <span className="block text-sm text-muted">
                        {[h.season ?? h.note, h.teamName].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-4 text-xs leading-relaxed text-subtle">{r.detail}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
