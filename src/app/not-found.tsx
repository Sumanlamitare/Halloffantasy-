import { ButtonLink, TrophyIcon } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface">
        <TrophyIcon className="h-7 w-7 text-subtle" />
      </div>
      <h1 className="font-display text-2xl font-semibold uppercase tracking-wide">League not found</h1>
      <p className="mt-3 text-[15px] text-muted">League not found. Check your code and try again.</p>
      <ButtonLink href="/join" className="mt-8 w-full">
        Enter a Code
      </ButtonLink>
      <ButtonLink href="/" variant="ghost" className="mt-2 w-full">
        Back to home
      </ButtonLink>
    </main>
  );
}
