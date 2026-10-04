"use client";

import { useEffect, useState } from "react";
import { TrophyIcon } from "@/components/ui";

/**
 * Opening animation shown when a member enters a Hall: the league name rises
 * in letter by letter, a rule draws across, then the overlay lifts away.
 * Driven by CSS so it plays from the first paint (before hydration).
 * Tap anywhere to skip. Plays once per browser session per Hall; the inline
 * script hides it before first paint on later loads.
 */
export function HallIntro({ name, code }: { name: string; code: string }) {
  const [visible, setVisible] = useState(true);
  const key = `hof-intro-${code}`;

  useEffect(() => {
    // Already seen this session: CSS hides it (.intro-seen); just unmount soon.
    const seen = document.documentElement.classList.contains("intro-seen");
    if (!seen) {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // Storage unavailable (private mode): the intro simply plays again next time.
      }
    }
    const t = setTimeout(() => setVisible(false), seen ? 0 : 2800);
    return () => clearTimeout(t);
  }, [key]);

  const seenScript = `try{if(sessionStorage.getItem(${JSON.stringify(key)}))document.documentElement.classList.add("intro-seen")}catch(e){}`;
  if (!visible) return null;

  const skip = () => {
    document.documentElement.classList.add("intro-skipped");
    setVisible(false);
  };

  const words = name.toUpperCase().split(" ");
  let i = 0;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: seenScript }} />
      <div
        className="intro fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-bg px-6 text-center"
        onClick={skip}
        role="presentation"
      >
        <TrophyIcon className="intro-trophy h-12 w-12 text-accent" />
        <h1
          aria-label={name}
          className="mt-6 max-w-4xl font-display text-[2.6rem] font-bold leading-[1.05] tracking-wide sm:text-6xl md:text-7xl"
        >
          {words.map((word, w) => (
            <span
              key={w}
              className="inline-block whitespace-nowrap"
              aria-hidden="true"
            >
              {Array.from(word).map((ch) => (
                <span
                  key={i}
                  className="intro-char"
                  style={{ "--i": i++ } as React.CSSProperties}
                >
                  {ch}
                </span>
              ))}
              {w < words.length - 1 && (
                <span className="inline-block w-[0.3em]" />
              )}
            </span>
          ))}
        </h1>
        <div className="intro-line mt-6 h-px w-40 bg-fg/30" />
        <p className="intro-fade mt-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-subtle">
          Fantasy Basketball
        </p>
        <p className="intro-fade mt-2 font-serif text-2xl italic text-muted">
          Hall of Fantasy
        </p>
      </div>
    </>
  );
}
