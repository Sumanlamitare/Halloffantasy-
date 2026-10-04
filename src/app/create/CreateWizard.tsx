"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Card, Eyebrow, TrophyIcon } from "@/components/ui";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import type { ImportView } from "@/lib/import/job";

type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = [
  "Create Hall",
  "Connect ESPN League",
  "Import History",
  "Hall Created",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ESPN labels NBA seasons by the year they end (2025 = 2024–25). */
function defaultSeason(): number {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
}

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      (data as { error?: string }).error ?? "Something went wrong.",
    );
  return data as T;
}

export function CreateWizard() {
  const [step, setStep] = useState<Step>(1);
  const [job, setJob] = useState<ImportView | null>(null);

  return (
    <div>
      <StepIndicator step={step} />
      <div key={step} className="axis-enter">
        {step === 1 && <IntroStep onNext={() => setStep(2)} />}
        {step === 2 && (
          <ConnectStep
            onConnected={(view) => {
              setJob(view);
              setStep(3);
            }}
          />
        )}
        {step === 3 && job && (
          <ImportStep
            job={job}
            onUpdate={setJob}
            onComplete={(view) => {
              setJob(view);
              setStep(4);
            }}
            onRestart={() => {
              setJob(null);
              setStep(2);
            }}
          />
        )}
        {step === 4 && job?.code && (
          <DoneStep code={job.code} leagueName={job.league.name} />
        )}
      </div>
    </div>
  );
}

/* Step indicator ---------------------------------------------------------- */

function StepIndicator({ step }: { step: Step }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="grid grid-cols-4 gap-2">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li
              key={label}
              aria-current={state === "current" ? "step" : undefined}
            >
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full origin-left rounded-full bg-fg transition-transform duration-500 ease-[var(--ease-emphasized)] ${state === "todo" ? "scale-x-0" : "scale-x-100"}`}
                />
              </div>
              <p
                className={`mt-2 hidden text-xs sm:block ${state === "current" ? "text-fg" : "text-subtle"}`}
              >
                {n}. {label}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted sm:hidden">
        Step {step} of 4 ·{" "}
        <span className="text-fg">{STEP_LABELS[step - 1]}</span>
      </p>
    </nav>
  );
}

/* Step 1 ---------------------------------------------------------------- */

function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <Eyebrow className="mb-3">Commissioner</Eyebrow>
      <h1 className="font-display text-3xl font-semibold uppercase leading-tight tracking-wide sm:text-4xl">
        Create Your Hall
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Connect your ESPN Fantasy Basketball league, choose the seasons to
        import, and we&apos;ll build a permanent Hall of Fantasy. You&apos;ll
        get a league code to share with your members.
      </p>
      <Card className="mt-6 space-y-4">
        <h2 className="font-display text-lg uppercase tracking-wide text-fg">
          What you&apos;ll need
        </h2>
        <ul className="space-y-3 text-[15px] text-muted">
          <li>
            <span className="font-semibold text-fg">Your ESPN League ID.</span>{" "}
            It&apos;s the number after{" "}
            <code className="break-all rounded bg-surface px-1 text-fg">
              leagueId=
            </code>{" "}
            in your league&apos;s ESPN web address.
          </li>
          <li>
            <span className="font-semibold text-fg">For private leagues:</span>{" "}
            your ESPN session cookies{" "}
            <code className="rounded bg-surface px-1 text-fg">espn_s2</code> and{" "}
            <code className="rounded bg-surface px-1 text-fg">SWID</code>.
            We&apos;ll show you how to find them.
          </li>
        </ul>
        <p className="text-sm text-subtle">
          We will never ask for your ESPN username or password.
        </p>
      </Card>
      <Button onClick={onNext} className="mt-8 w-full sm:w-auto">
        Get Started
      </Button>
    </div>
  );
}

/* Step 2 ---------------------------------------------------------------- */

function ConnectStep({
  onConnected,
}: {
  onConnected: (view: ImportView) => void;
}) {
  const [leagueId, setLeagueId] = useState("");
  const [season, setSeason] = useState(defaultSeason());
  const [isPrivate, setIsPrivate] = useState(false);
  const [espnS2, setEspnS2] = useState("");
  const [swid, setSwid] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting">("idle");
  const [error, setError] = useState<string | null>(null);

  const seasonOptions = Array.from(
    { length: 16 },
    (_, i) => defaultSeason() - i,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("connecting");
    try {
      const view = await post<ImportView>("/api/import/connect", {
        leagueId: leagueId.trim(),
        season,
        isPrivate,
        ...(isPrivate ? { espnS2, swid } : {}),
      });
      // Credentials are held by the server now; drop them from the page.
      setEspnS2("");
      setSwid("");
      onConnected(view);
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }

  const inputCls =
    "block w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-base text-fg placeholder:text-subtle transition-shadow focus:border-fg focus:shadow-[0_0_0_4px_rgba(28,27,25,0.06)] focus:outline-none";

  return (
    <form onSubmit={submit} className="space-y-6" autoComplete="off">
      <div>
        <h1 className="font-display text-3xl font-semibold uppercase tracking-wide">
          Connect ESPN League
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Tell us where to find your league on ESPN.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="leagueId" className="block text-sm font-medium text-fg">
          ESPN League ID
        </label>
        <input
          id="leagueId"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 12345678"
          className={inputCls}
        />
        <p className="text-xs text-subtle">
          Find it in your league URL:
          fantasy.espn.com/basketball/league?leagueId=
          <span className="text-muted">12345678</span>
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="season" className="block text-sm font-medium text-fg">
          Most recent season
        </label>
        <select
          id="season"
          value={season}
          onChange={(e) => setSeason(Number(e.target.value))}
          className={inputCls}
        >
          {seasonOptions.map((s) => (
            <option key={s} value={s}>
              {s} ({s - 1}–{String(s).slice(-2)})
            </option>
          ))}
        </select>
        <p className="text-xs text-subtle">
          We&apos;ll discover your league&apos;s earlier seasons automatically.
        </p>
      </div>

      <label className="ripple flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-5 w-5 accent-[var(--color-fg)]"
        />
        <span className="text-[15px] text-fg">My league is private</span>
      </label>

      {isPrivate && (
        <div className="page-enter space-y-5 rounded-2xl border border-line bg-sunken p-5">
          <div className="space-y-2 text-sm leading-relaxed text-muted">
            <p className="font-semibold text-fg">
              These are sensitive ESPN session credentials.
            </p>
            <p>
              <code className="text-fg">espn_s2</code> and{" "}
              <code className="text-fg">SWID</code> let our server read your
              private league from ESPN. They are sent securely to our server,
              encrypted, used only for this import, and deleted when it
              finishes. They are never shown on screen, saved in your browser,
              or shared with league members. Never share them with anyone else.
            </p>
            <details className="rounded-xl border border-line bg-sunken px-4 py-3">
              <summary className="cursor-pointer py-1 font-medium text-fg">
                How do I find them?
              </summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  On a computer, sign in to fantasy.espn.com and open your
                  league.
                </li>
                <li>
                  Open your browser&apos;s developer tools (Chrome: View →
                  Developer → Developer Tools) and go to{" "}
                  <span className="text-fg">
                    Application → Cookies → https://fantasy.espn.com
                  </span>{" "}
                  (Safari/Firefox: the Storage tab).
                </li>
                <li>
                  Copy the values of <code className="text-fg">espn_s2</code>{" "}
                  and <code className="text-fg">SWID</code>. You can send them
                  to your phone (e.g. a private note) to finish here.
                </li>
              </ol>
            </details>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="espnS2"
              className="block text-sm font-medium text-fg"
            >
              espn_s2
            </label>
            <input
              id="espnS2"
              type="password"
              required
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={espnS2}
              onChange={(e) => setEspnS2(e.target.value)}
              placeholder="Long value starting with AE…"
              className={inputCls}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="swid" className="block text-sm font-medium text-fg">
              SWID
            </label>
            <input
              id="swid"
              type="password"
              required
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={swid}
              onChange={(e) => setSwid(e.target.value)}
              placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {status === "connecting" && (
        <p
          className="flex items-center gap-3 text-[15px] text-muted"
          role="status"
        >
          <Spinner /> Connecting to ESPN...
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={status === "connecting" || !leagueId}
        className="w-full"
      >
        {status === "connecting" ? "Connecting…" : "Find My League"}
      </Button>
    </form>
  );
}

/* Step 3 ---------------------------------------------------------------- */

function ImportStep({
  job,
  onUpdate,
  onComplete,
  onRestart,
}: {
  job: ImportView;
  onUpdate: (v: ImportView) => void;
  onComplete: (v: ImportView) => void;
  onRestart: () => void;
}) {
  const [selected, setSelected] = useState<number[]>(
    job.league.availableSeasons,
  );
  const [running, setRunning] = useState(job.status === "running");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const loop = useCallback(async () => {
    setRunning(true);
    setError(null);
    let failures = 0;
    while (!cancelled.current) {
      try {
        const view = await post<ImportView>("/api/import/step", {
          importId: job.importId,
        });
        failures = 0;
        onUpdate(view);
        if (view.status === "complete") {
          onComplete(view);
          return;
        }
        if (view.status === "failed") {
          setError(view.error ?? "Import paused.");
          setRunning(false);
          return;
        }
        if (view.busy) await sleep(2000);
      } catch (err) {
        failures += 1;
        if (failures >= 3) {
          setError((err as Error).message);
          setRunning(false);
          return;
        }
        await sleep(1500 * failures);
      }
    }
  }, [job.importId, onComplete, onUpdate]);

  async function start() {
    setError(null);
    try {
      const view = await post<ImportView>("/api/import/start", {
        importId: job.importId,
        seasons: selected,
      });
      onUpdate(view);
      await loop();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const toggle = (s: number) =>
    setSelected((cur) =>
      cur.includes(s)
        ? cur.filter((x) => x !== s)
        : [...cur, s].sort((a, b) => b - a),
    );

  const started = job.status !== "connected";
  const completedCount = job.seasons.filter(
    (s) => s.status === "complete" || s.status === "unavailable",
  ).length;
  const total = job.seasons.length || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold uppercase tracking-wide">
          Import History
        </h1>
        <p className="mt-2 flex items-center gap-2 text-[15px] text-fg">
          <CheckIcon /> <span className="text-fg">League found.</span>
        </p>
      </div>

      <Card>
        <p className="font-display text-2xl font-semibold uppercase tracking-wide text-fg">
          {job.league.name}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">
              Teams
            </dt>
            <dd className="font-display text-2xl text-fg">
              {job.league.size || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">
              Current
            </dt>
            <dd className="font-display text-2xl text-fg">
              {job.league.currentSeason}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">
              Seasons
            </dt>
            <dd className="font-display text-2xl text-fg">
              {job.league.availableSeasons.length}
            </dd>
          </div>
        </dl>
      </Card>

      {!started ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase tracking-wide text-fg">
              Choose seasons
            </h2>
            <button
              type="button"
              className="min-h-11 px-2 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
              onClick={() =>
                setSelected(
                  selected.length === job.league.availableSeasons.length
                    ? []
                    : job.league.availableSeasons,
                )
              }
            >
              {selected.length === job.league.availableSeasons.length
                ? "Clear all"
                : "Select all"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {job.league.availableSeasons.map((s) => (
              <label
                key={s}
                className={`ripple flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors duration-200 ${
                  selected.includes(s)
                    ? "border-fg bg-accent-soft"
                    : "border-line bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s)}
                  onChange={() => toggle(s)}
                  className="h-5 w-5 shrink-0 accent-[var(--color-fg)]"
                />
                <span>
                  <span className="block font-display text-xl leading-none text-fg">
                    {s}
                  </span>
                  <span className="text-xs text-subtle">
                    {s - 1}–{String(s).slice(-2)}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <Button
            onClick={start}
            disabled={selected.length === 0}
            className="w-full"
          >
            Import {selected.length} Season{selected.length === 1 ? "" : "s"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-fg transition-[width] duration-700 ease-[var(--ease-emphasized)]"
              style={{
                width: `${Math.round((completedCount / total) * 100)}%`,
              }}
            />
          </div>
          <ul className="space-y-2">
            <LogLine state="done">Connecting to ESPN...</LogLine>
            <LogLine state="done">League found.</LogLine>
            {job.seasons.map((s) => (
              <LogLine
                key={s.season}
                state={
                  s.status === "complete"
                    ? "done"
                    : s.status === "unavailable"
                      ? "skipped"
                      : s.status === "failed"
                        ? "error"
                        : s.status === "running" ||
                            (running &&
                              s ===
                                job.seasons.find((x) => x.status === "pending"))
                          ? "active"
                          : "todo"
                }
              >
                {s.status === "complete"
                  ? `${s.season} imported`
                  : s.status === "unavailable"
                    ? `${s.season} — not available from ESPN`
                    : `Importing ${s.season}...`}
              </LogLine>
            ))}
            {job.status === "complete" && (
              <LogLine state="done">Import complete.</LogLine>
            )}
          </ul>

          {error && (
            <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-4">
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
              <p className="text-xs text-muted">
                Seasons already imported are saved. Resuming picks up where it
                stopped.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={loop}
                  disabled={running}
                  className="w-full sm:w-auto"
                >
                  Resume Import
                </Button>
                <Button
                  variant="ghost"
                  onClick={onRestart}
                  className="w-full sm:w-auto"
                >
                  Reconnect League
                </Button>
              </div>
            </div>
          )}
          {running && !error && (
            <p className="text-sm text-subtle">
              Keep this page open while we import your history.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LogLine({
  state,
  children,
}: {
  state: "done" | "active" | "todo" | "skipped" | "error";
  children: React.ReactNode;
}) {
  const color =
    state === "done"
      ? "text-fg"
      : state === "active"
        ? "text-fg"
        : state === "error"
          ? "text-danger"
          : "text-subtle";
  return (
    <li className={`page-enter flex items-start gap-3 text-[15px] ${color}`}>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {state === "done" ? (
          <CheckIcon />
        ) : state === "active" ? (
          <Spinner />
        ) : state === "error" ? (
          "!"
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/* Step 4 ---------------------------------------------------------------- */

function DoneStep({ code, leagueName }: { code: string; leagueName: string }) {
  return (
    <div className="text-center">
      <TrophyIcon className="intro-trophy mx-auto h-14 w-14 text-accent" />
      <h1 className="mt-6 font-display text-3xl font-semibold uppercase leading-tight tracking-wide sm:text-4xl">
        Your Hall of Fantasy is ready.
      </h1>
      <p className="mt-3 text-[15px] text-muted">{leagueName}</p>

      <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-line bg-surface px-5 py-7 shadow-[0_8px_30px_rgba(28,27,25,0.06)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">
          League Code
        </p>
        <p className="mt-2 select-all break-all font-display text-4xl font-semibold tracking-[0.12em] text-accent-gradient sm:text-5xl">
          {code}
        </p>
      </div>
      <p className="mx-auto mt-4 max-w-sm text-sm text-subtle">
        Share this code with your league. Members enter it under “Join a League”
        — no ESPN account needed.
      </p>

      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
        <CopyCodeButton code={code} className="w-full" />
        <ButtonLink
          href={`/hall/${code}`}
          variant="secondary"
          className="w-full"
        >
          View Hall
        </ButtonLink>
      </div>
      <p className="mt-8 text-xs text-subtle">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

/* Bits ------------------------------------------------------------------ */

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-fg"
    />
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 text-fg">
      <path
        d="M5 10.5l3.2 3L15 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
