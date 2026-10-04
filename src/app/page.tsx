import { ButtonLink, TrophyIcon, Wordmark } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Wordmark />
      </header>

      <main className="stagger mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface">
          <TrophyIcon className="h-8 w-8 text-accent" />
        </div>
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-subtle">ESPN Fantasy Basketball</p>
        <h1 className="font-display text-[2.6rem] font-semibold uppercase leading-[1.02] tracking-wide sm:text-6xl md:text-7xl">
          Your Fantasy League
          <br />
          Has a History.
        </h1>
        <p className="mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-muted sm:text-xl">
          Turn your ESPN fantasy basketball league history into a Hall of Fame.
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink href="/create" className="w-full sm:w-auto sm:min-w-52">
            Create Your Hall
          </ButtonLink>
          <ButtonLink href="/join" variant="secondary" className="w-full sm:w-auto sm:min-w-52">
            Join a League
          </ButtonLink>
        </div>
      </main>

      <footer className="px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-center text-xs text-subtle">
        Not affiliated with ESPN.
      </footer>
    </div>
  );
}
