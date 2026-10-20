"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CountUp } from "@/components/motion";
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
    const t = setTimeout(() => setDone(true), seen || reduced ? 0 : 3100);
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

const DOOR_EASE = [0.65, 0, 0.35, 1] as const;

function IntroOverlay({ name, stats, onSkip }: { name: string; stats: IntroStats; onSkip: () => void }) {
  const letters = Array.from(name.toUpperCase());

  return (
    <motion.div
      className="hall-intro fixed inset-0 z-50 cursor-pointer overflow-hidden [perspective:1400px]"
      onClick={onSkip}
      role="presentation"
      initial="closed"
      animate="lit"
      exit="open"
      variants={{ open: { opacity: [1, 1, 0], transition: { duration: 1.2, times: [0, 0.8, 1] } } }}
    >
      {/* The two marble doors (they swing open on exit) */}
      {(["left", "right"] as const).map((side) => (
        <motion.div
          key={side}
          aria-hidden="true"
          className={`absolute inset-y-0 w-1/2 bg-[#0a0908] ${side === "left" ? "left-0 origin-left border-r" : "right-0 origin-right border-l"} border-accent/30`}
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,230,180,0.05), transparent 30%), url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='800'><filter id='m'><feTurbulence type='turbulence' baseFrequency='0.008 0.02' numOctaves='4' seed='3'/><feColorMatrix values='0 0 0 0 0.86  0 0 0 0 0.8  0 0 0 0 0.68  0 0 0 -1.6 1.15'/></filter><rect width='100%' height='100%' filter='url(%23m)' opacity='0.12'/></svg>\")",
          }}
          variants={{
            open: {
              rotateY: side === "left" ? -100 : 100,
              transition: { duration: 1, ease: DOOR_EASE },
            },
          }}
        >
          {/* Door panel moulding + handle */}
          <span className="absolute inset-6 rounded-sm border border-accent/15" />
          <span className="absolute inset-10 rounded-sm border border-accent/10" />
          <span
            className={`absolute top-1/2 h-16 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#f3d68f] to-[#8a6420] shadow-[0_0_10px_rgba(212,173,87,0.5)] ${side === "left" ? "right-4" : "left-4"}`}
          />
        </motion.div>
      ))}

      {/* Ceiling spotlight */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[85%]"
        style={{ background: "radial-gradient(45% 75% at 50% 0%, rgba(255,226,160,0.28), rgba(255,226,160,0.06) 55%, transparent 75%)" }}
        variants={{
          closed: { opacity: 0, scaleX: 0.4 },
          lit: { opacity: 1, scaleX: 1, transition: { duration: 1.1, ease: EASE_OUT } },
          open: { opacity: 0, transition: { duration: 0.4 } },
        }}
      />

      {/* Plaque + inscription */}
      <motion.div
        className="relative flex h-full flex-col items-center justify-center px-6 text-center"
        variants={{
          closed: { opacity: 0, y: 24, scale: 0.96 },
          lit: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, delay: 0.3, ease: EASE_OUT } },
          open: { opacity: 0, scale: 1.08, transition: { duration: 0.5, ease: "easeIn" } },
        }}
      >
        <div className="plaque w-full max-w-md overflow-hidden px-8 pb-9 pt-10 sm:max-w-xl sm:px-12">
          {stats.since && (
            <motion.p
              className="engraved-muted font-display text-[11px] font-semibold uppercase"
              variants={{
                closed: { opacity: 0, letterSpacing: "0.7em" },
                lit: { opacity: 1, letterSpacing: "0.4em", transition: { duration: 1, delay: 0.7, ease: EASE_OUT } },
              }}
            >
              Est. {stats.since}
            </motion.p>
          )}

          <motion.h1
            layoutId={TITLE_ID}
            aria-label={name}
            className="engraved mt-3 break-words font-display text-[2.4rem] font-black uppercase leading-[1.04] tracking-[0.06em] sm:text-6xl"
            transition={{ layout: { duration: 0.9, ease: DOOR_EASE } }}
          >
            {letters.map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="inline-block"
                variants={{
                  closed: { opacity: 0, y: 6, filter: "blur(6px)" },
                  lit: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: 0.45, delay: 0.75 + i * 0.05, ease: EASE_OUT },
                  },
                }}
              >
                {ch === " " ? "\u00a0" : ch}
              </motion.span>
            ))}
          </motion.h1>

          <div aria-hidden="true" className="mx-auto mt-5 h-px w-40 bg-gradient-to-r from-transparent via-[#3d240c]/60 to-transparent" />

          <motion.dl
            className="mt-5 flex items-center justify-center gap-6"
            variants={{ closed: { opacity: 0 }, lit: { opacity: 1, transition: { delay: 1.5, duration: 0.6 } } }}
          >
            {[
              [stats.seasons, stats.seasons === 1 ? "Season" : "Seasons"],
              [stats.managers, "Managers"],
              [stats.titles, "Titles"],
            ].map(([value, label]) => (
              <div key={label as string}>
                <dd className="engraved font-display text-2xl font-bold leading-none">
                  <CountUp value={value as number} delay={1.5} duration={0.9} />
                </dd>
                <dt className="engraved-muted mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</dt>
              </div>
            ))}
          </motion.dl>

          {/* Light glint sweeping across the bronze */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent mix-blend-overlay"
            variants={{
              closed: { x: "0%" },
              lit: { x: "400%", transition: { duration: 1.1, delay: 1.35, ease: "easeInOut" } },
            }}
          />
        </div>

        <motion.p
          className="gold-text mt-8 font-serif text-3xl italic"
          variants={{ closed: { opacity: 0, y: 10 }, lit: { opacity: 1, y: 0, transition: { delay: 1.7, duration: 0.7, ease: EASE_OUT } } }}
        >
          Hall of Fantasy
        </motion.p>
      </motion.div>

      <motion.p
        className="absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),1.5rem)] text-center text-[11px] uppercase tracking-[0.3em] text-subtle"
        variants={{ closed: { opacity: 0 }, lit: { opacity: 0.8, transition: { delay: 1.2 } }, open: { opacity: 0 } }}
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
          className="gold-text truncate font-display text-[15px] font-bold uppercase tracking-[0.16em]"
          transition={{ layout: { duration: 0.9, ease: DOOR_EASE } }}
        >
          {name}
        </motion.span>
      ) : (
        // Placeholder keeps the header layout stable until the hand-off.
        <span className="truncate font-display text-[15px] font-bold uppercase tracking-[0.16em] opacity-0">{name}</span>
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
