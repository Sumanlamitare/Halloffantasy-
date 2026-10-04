import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { TrophyIcon } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { getHall } from "@/lib/hall/queries";
import { syncLeague } from "@/lib/sync/league-sync";
import { HallIntro } from "./HallIntro";
import { HallNav, HallTabBar } from "./HallNav";
import { LiveRefresh } from "./LiveRefresh";

/** Allows the background ESPN refresh (scheduled with after()) to finish. */
export const maxDuration = 60;

export async function generateMetadata({ params }: LayoutProps<"/hall/[code]">): Promise<Metadata> {
  const hall = await getHall((await params).code);
  return {
    title: hall ? `${hall.league.name} · Hall of Fantasy` : "League not found · Hall of Fantasy",
    robots: { index: false, follow: false },
  };
}

export default async function HallLayout({ children, params }: LayoutProps<"/hall/[code]">) {
  const hall = await getHall((await params).code);
  if (!hall || !hall.league.code) notFound();
  const code = hall.league.code;
  const { sync } = hall;

  // Auto-updating Halls refresh from ESPN in the background once they're due
  // (throttled and locked per league), after the page has been sent.
  if (sync.due) {
    after(() => syncLeague(hall.league.leagueId).catch(() => undefined));
  }
  const updated = timeAgo(sync.lastSyncedAt);

  return (
    <div className="flex min-h-dvh flex-col">
      <HallIntro name={hall.league.name} code={code} />
      <div className="after-intro flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href={`/hall/${code}`} className="flex min-h-11 min-w-0 items-center gap-2.5">
              <TrophyIcon className="h-5 w-5 shrink-0 text-accent" />
              <span className="truncate font-display text-base font-medium uppercase tracking-[0.12em]">{hall.league.name}</span>
            </Link>
            <HallNav code={code} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-8 sm:px-6 md:pb-12">{children}</main>
        <footer className="px-6 pb-28 text-center text-xs text-subtle md:pb-8">
          {sync.autoUpdate && sync.status === "needs_credentials" ? (
            <span>Automatic updates paused — the commissioner needs to reconnect ESPN.</span>
          ) : sync.autoUpdate ? (
            <span>
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
              Auto-updating from ESPN{updated ? ` · Updated ${updated}` : ""}
            </span>
          ) : (
            <span>Data imported from ESPN{updated ? ` · Updated ${updated}` : ""}</span>
          )}
          <span className="hidden md:inline"> · League code {code}</span>
        </footer>
      </div>
      <HallTabBar code={code} />
      {sync.autoUpdate && <LiveRefresh syncStarted={sync.due} />}
    </div>
  );
}
