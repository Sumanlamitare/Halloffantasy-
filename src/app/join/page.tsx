import type { Metadata } from "next";
import { Eyebrow, TrophyIcon, Wordmark } from "@/components/ui";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "Join a League · Hall of Fantasy" };

export default function JoinPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Wordmark />
      </header>
      <main className="page-enter mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface">
            <TrophyIcon className="h-7 w-7 text-accent" />
          </div>
          <Eyebrow className="mb-3">Members</Eyebrow>
          <h1 className="font-display text-3xl font-semibold uppercase tracking-wide">Join a League</h1>
          <p className="mt-3 text-[15px] text-muted">Enter the code your commissioner shared. No ESPN account needed.</p>
        </div>
        <JoinForm />
      </main>
    </div>
  );
}
