"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { joinLeague, type JoinState } from "./actions";

export function JoinForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinLeague, { error: null });
  return (
    <form action={action} className="space-y-4">
      <label htmlFor="code" className="block text-sm font-medium text-muted">
        League code
      </label>
      <input
        id="code"
        name="code"
        required
        autoFocus
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        placeholder="HOF-7X92KQ"
        maxLength={16}
        aria-invalid={!!state.error}
        aria-describedby={state.error ? "code-error" : undefined}
        className="block w-full rounded-2xl border border-line bg-surface px-4 py-4 text-center font-display text-2xl uppercase tracking-[0.2em] text-fg placeholder:text-subtle transition-shadow focus:border-fg focus:shadow-[0_0_0_4px_rgba(28,27,25,0.06)] focus:outline-none"
      />
      {state.error && (
        <p id="code-error" role="alert" className="page-enter text-center text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Enter the Hall"}
      </Button>
    </form>
  );
}
