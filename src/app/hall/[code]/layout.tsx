import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrophyIcon } from "@/components/ui";
import { getHall } from "@/lib/hall/queries";
import { HallIntro } from "./HallIntro";
import { HallNav, HallTabBar } from "./HallNav";

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
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 sm:px-6 md:pb-16">{children}</main>
        <footer className="hidden px-6 pb-8 text-center text-xs text-subtle md:block">
          Hall of Fantasy · League code {code} · Data imported from ESPN
        </footer>
      </div>
      <HallTabBar code={code} />
    </div>
  );
}
