import type { Metadata } from "next";
import { Wordmark } from "@/components/ui";
import { CreateWizard } from "./CreateWizard";

export const metadata: Metadata = { title: "Create Your Hall · Hall of Fantasy" };

export default function CreatePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Wordmark />
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-[max(env(safe-area-inset-bottom),3rem)] pt-8">
        <CreateWizard />
      </main>
    </div>
  );
}
