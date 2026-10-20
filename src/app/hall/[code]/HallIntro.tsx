"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CountUp, DrawnCrest } from "@/components/motion";
import { TrophyIcon } from "@/components/ui";

/**
 * Hall entrance sequence (Motion):
 *   1. a ring and the trophy draw themselves, "EST." fades in
 *   2. the league name rises letter by letter out of a mask, de-blurring
 *   3. a brass rule sweeps under it; seasons/managers/titles count up
 *   4. the overlay lifts like a curtain while the name flies into the header
 *      (shared layoutId), and the page content rises in behind it.
 *
 * Plays once per browser session per Hall (tap to skip). An inline script
 * marks repeat visits before first paint so the overlay never flashes.
 */

const IntroContext = createContext<{ done: boolean }>({ done: true });
const TITLE_ID = "hall-league-name";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const CURTAIN = [0.76, 0, 0.24, 1] as const;

interface IntroStats {
  seasons: number;
  managers: number;
  titles: number;
  since: number | null;
}

export function IntroProvider({
  name,
  code,
  stats,
  children,
}: {
  name: string;
  code: string;
  stats: IntroStats;
  children: ReactNode;
}) {
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();
  const key = `hof-intro-${code}`;

  useEffect(() => {
    const seen = document.documentElement.classList.contains("intro-seen");
    if (!seen) {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // Storage unavailable (private mode): the intro simply plays again next time.
      }
    }
    const t = setTimeout(() => setDone(true), seen || reduced ? 0 : 2900);
    return () => clearTimeout(t);
  }, [key, reduced]);

  const seenScript = `try{if(sessionStorage.getItem(${JSON.stringify(key)}))document.documentElement.classList.add("intro-seen")}catch(e){}`;

  return (
    <IntroContext.Provider value={{ done }}>
      <script dangerouslySetInnerHTML={{ __html: seenScript }} />
      <AnimatePresence>{!done && <IntroOverlay key="intro" name={name} stats={stats} onSkip={() => setDone(true)} />}</AnimatePresence>
      {children}
    </IntroContext.Provider>
  );
}

function IntroOverlay({ name, stats, onSkip }: { name: string; stats: IntroStats; onSkip: () => void }) {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  let index = 0;

  return (
    <motion.div
      className="hall-intro fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center"
      onClick={onSkip}
      role="presentation"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      exit={{ clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.85, ease: CURTAIN } }}
    >
      {/* Soft brass glow behind the crest */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(160,124,44,0.16), transparent 62%)" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: EASE_OUT }}
      />

      {/* Crest: ring + trophy draw */}
      <DrawnCrest className="h-20 w-20" />

      {stats.since && (
        <motion.p
          className="mt-6 text-[11px] font-semibold uppercase text-subtle"
          initial={{ opacity: 0, letterSpacing: "0.8em" }}
          animate={{ opacity: 1, letterSpacing: "0.4em" }}
          transition={{ duration: 1, delay: 0.35, ease: EASE_OUT }}
        >
          Est. {stats.since}
        </motion.p>
      )}

      {/* League name: letters rise out of a mask. layoutId hands it to the header. */}
      <motion.h1
        layoutId={TITLE_ID}
        aria-label={name}
        className="relative mt-4 max-w-5xl font-display text-[2.75rem] font-bold uppercase leading-[1.02] tracking-wide sm:text-7xl md:text-8xl"
        transition={{ layout: { duration: 0.8, ease: CURTAIN } }}
      >
        {words.map((word, w) => (
          <span key={w} aria-hidden="true" className="inline-block overflow-hidden whitespace-nowrap pb-[0.08em] align-bottom">
            {Array.from(word).map((ch) => {
              const i = index++;
              return (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ y: "105%", rotate: 6, filter: "blur(8px)", opacity: 0 }}
                  animate={{ y: "0%", rotate: 0, filter: "blur(0px)", opacity: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 20, delay: 0.55 + i * 0.045 }}
                >
                  {ch}
                </motion.span>
              );
            })}
            {w < words.length - 1 && <span className="inline-block w-[0.28em]" />}
          </span>
        ))}
      </motion.h1>

      <motion.div
        aria-hidden="true"
        className="mt-6 h-px w-48 origin-center bg-gradient-to-r from-transparent via-accent to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 1.15, ease: EASE_OUT }}
      />

      <motion.p
        className="mt-5 font-serif text-2xl italic text-muted"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.3, ease: EASE_OUT }}
      >
        Hall of Fantasy
      </motion.p>

      <motion.dl
        className="mt-7 flex items-center gap-6 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.55, ease: EASE_OUT }}
      >
        {[
          [stats.seasons, stats.seasons === 1 ? "Season" : "Seasons"],
          [stats.managers, "Managers"],
          [stats.titles, "Titles"],
        ].map(([value, label]) => (
          <div key={label as string}>
            <dd className="font-display text-2xl font-semibold leading-none">
              <CountUp value={value as number} delay={1.6} duration={0.9} />
            </dd>
            <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">{label}</dt>
          </div>
        ))}
      </motion.dl>

      <motion.p
        className="absolute bottom-[max(env(safe-area-inset-bottom),1.5rem)] text-[11px] uppercase tracking-[0.25em] text-subtle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 1.2 }}
      >
        Tap to enter
      </motion.p>
    </motion.div>
  );
}

/** League name in the header; receives the intro title via shared layout. */
export function HallBrand({ name, code }: { name: string; code: string }) {
  const { done } = useContext(IntroContext);
  return (
    <Link href={`/hall/${code}`} className="flex min-h-11 min-w-0 items-center gap-2.5">
      <TrophyIcon className="h-5 w-5 shrink-0 text-accent" />
      {done ? (
        <motion.span
          layoutId={TITLE_ID}
          className="truncate font-display text-base font-semibold uppercase tracking-[0.12em]"
          transition={{ layout: { duration: 0.8, ease: CURTAIN } }}
        >
          {name}
        </motion.span>
      ) : (
        // Placeholder keeps the header layout stable until the hand-off.
        <span className="truncate font-display text-base font-semibold uppercase tracking-[0.12em] opacity-0">{name}</span>
      )}
    </Link>
  );
}

/** Page content rises in as the curtain lifts (immediately on repeat visits). */
export function IntroReveal({ children, className }: { children: ReactNode; className?: string }) {
  const { done } = useContext(IntroContext);
  return (
    <motion.div
      className={`intro-reveal ${className ?? ""}`}
      initial={{ opacity: 0, y: 28 }}
      animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.9, delay: done ? 0.15 : 0, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
