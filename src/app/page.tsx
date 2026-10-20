import { Marquee } from "@/components/hall";
import { DrawnCrest, Reveal, RiseText } from "@/components/motion";
import { ButtonLink, Wordmark } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Wordmark />
      </header>

      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 py-14 text-center">
        {/* Soft brass glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(160,124,44,0.14), transparent 62%)" }}
        />
        <DrawnCrest className="mb-8 h-20 w-20" />
        <Reveal delay={0.2}>
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-subtle">ESPN Fantasy Basketball</p>
        </Reveal>
        <RiseText
          text={"Your Fantasy League\nHas a History."}
          delay={0.3}
          className="font-display text-[2.7rem] font-bold uppercase leading-[0.98] tracking-wide sm:text-6xl md:text-[5.5rem]"
        />
        <Reveal delay={0.75}>
          <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-muted sm:text-2xl">
            Turn your ESPN fantasy basketball league history into a Hall of Fame.
          </p>
        </Reveal>

        <Reveal delay={0.95} className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink href="/create" className="w-full sm:w-auto sm:min-w-52">
            Create Your Hall
          </ButtonLink>
          <ButtonLink href="/join" variant="secondary" className="w-full sm:w-auto sm:min-w-52">
            Join a League
          </ButtonLink>
        </Reveal>
      </main>

      <div className="mb-10 px-4 sm:px-6">
        <Marquee
          tone="light"
          items={[
            { strong: "Champions", soft: "forever" },
            { strong: "Records", soft: "all-time" },
            { strong: "Dynasties", soft: "remembered" },
            { strong: "Legacies", soft: "settled" },
          ]}
        />
      </div>

      <footer className="px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-center text-xs text-subtle">
        Not affiliated with ESPN.
      </footer>
    </div>
  );
}
