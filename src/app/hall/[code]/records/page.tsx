import Link from "next/link";
import { notFound } from "next/navigation";
import { Stagger, StaggerItem } from "@/components/motion";
import { SectionTitle, Unavailable } from "@/components/ui";
import { getHall } from "@/lib/hall/queries";

export default async function RecordsPage({ params }: PageProps<"/hall/[code]/records">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const code = hall.league.code!;
  const { records, completedSeasons } = hall.records;

  return (
    <div>
      <SectionTitle eyebrow="The Record Book" title="Records">
        All-time records calculated only from imported ESPN data across {completedSeasons.length} completed season
        {completedSeasons.length === 1 ? "" : "s"}. Records without enough underlying data are not shown.
      </SectionTitle>

      {records.length === 0 ? (
        <Unavailable>No records can be calculated yet — records need at least one completed season.</Unavailable>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <StaggerItem key={r.key} className="flex">
            <article className="marble relative flex w-full flex-col overflow-hidden rounded-t-[2.5rem] rounded-b-lg px-6 pb-6 pt-8 text-center">
              {/* inner engraved border, like a carved tablet */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-t-[2.1rem] rounded-b-md border border-accent/20" />
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-accent">{r.title}</h2>
              <p className="gold-text mt-4 font-display text-5xl font-black leading-none sm:text-6xl">{r.value}</p>
              <span aria-hidden="true" className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
              <ul className="mt-4 space-y-1.5">
                {r.holders.map((h, i) => (
                  <li key={`${h.managerId}-${h.season ?? i}`} className="text-[15px]">
                    <Link href={`/hall/${code}/managers/${h.managerId}`} className="font-display text-base font-bold uppercase tracking-[0.06em] text-fg underline-offset-4 hover:underline">
                      {h.name}
                    </Link>
                    {(h.season || h.note || h.teamName) && (
                      <span className="block font-serif text-base italic text-muted">
                        {[h.season ?? h.note, h.teamName].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-5 text-xs leading-relaxed text-subtle">{r.detail}</p>
            </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
