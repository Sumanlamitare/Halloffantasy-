"use client";

/**
 * Small Motion (motion.dev) building blocks shared across the app.
 * All of them respect the user's "Reduce Motion" setting via <MotionProvider>.
 */

import Link from "next/link";
import { animate, motion, MotionConfig, useInView, type Variants } from "motion/react";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";

/** Springs tuned to feel like native mobile UI (quick, no wobble). */
export const spring = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
export const softSpring = { type: "spring", stiffness: 140, damping: 22 } as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades + lifts content in when it scrolls into view (once). */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ ...softSpring, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
};

/** Parent that reveals its <StaggerItem> children one after another. */
export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ol" | "ul";
}) {
  const Comp = as === "ol" ? motion.ol : as === "ul" ? motion.ul : motion.div;
  return (
    <Comp
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -5% 0px" }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp className={className} variants={staggerChild}>
      {children}
    </Comp>
  );
}

/** Counts from 0 to `value` when visible. Renders the final value on the server. */
export function CountUp({
  value,
  delay = 0,
  duration = 1.1,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
}: {
  value: number;
  delay?: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
    // format is a stable formatter in practice; re-running on identity change would restart the count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, delay, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}

/** Horizontal progress bar that grows to `percent` when visible. */
export function ProgressBar({
  percent,
  accent = false,
  delay = 0,
  className = "h-1.5",
}: {
  percent: number;
  accent?: boolean;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`block overflow-hidden rounded-full bg-sunken ${className}`}>
      <motion.span
        className={`block h-full origin-left rounded-full ${accent ? "bg-accent" : "bg-fg"}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </span>
  );
}

const MotionNextLink = motion.create(Link);

/** Link with spring hover lift and press feedback. */
export function PressLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <MotionNextLink
      {...(props as ComponentProps<typeof MotionNextLink>)}
      className={className}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.975 }}
      transition={spring}
    />
  );
}

/** Headline whose words rise out of a mask one after another. */
export function RiseText({
  text,
  className,
  delay = 0,
  as = "h1",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "p";
}) {
  const Comp = as === "h2" ? motion.h2 : as === "p" ? motion.p : motion.h1;
  const lines = text.split("\n");
  let i = 0;
  return (
    <Comp className={className} aria-label={text.replace(/\n/g, " ")} initial="hidden" animate="show">
      {lines.map((line, l) => (
        <span key={l} className="block" aria-hidden="true">
          {line.split(" ").map((word, w) => {
            const n = i++;
            return (
              <span key={w} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                <motion.span
                  className="inline-block"
                  variants={{
                    hidden: { y: "110%", rotate: 4 },
                    show: { y: "0%", rotate: 0, transition: { ...softSpring, delay: delay + n * 0.07 } },
                  }}
                >
                  {word}
                </motion.span>
                {" "}
              </span>
            );
          })}
        </span>
      ))}
    </Comp>
  );
}

/** Trophy + ring that draw themselves (same crest as the Hall intro). */
export function DrawnCrest({ className = "h-16 w-16", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <span className={`relative inline-block text-accent ${className}`} aria-hidden="true">
      <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" fill="none">
        <motion.circle
          cx="40"
          cy="40"
          r="38"
          stroke="currentColor"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-[45%] w-[45%]" fill="none">
        {[
          "M7 4h10v3.5a5 5 0 0 1-10 0V4Z",
          "M7 5.5H4.5v1.25A3.25 3.25 0 0 0 7.6 10M17 5.5h2.5v1.25A3.25 3.25 0 0 1 16.4 10",
          "M12 12.5v3.5M9.5 16h5l.75 4h-6.5l.75-4Z",
        ].map((d, i) => (
          <motion.path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: delay + 0.15 + i * 0.12, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </span>
  );
}

/** Highlight that glides between items sharing the same `id` (shared layout). */
export function ActiveMarker({ id, className }: { id: string; className?: string }) {
  return <motion.span layoutId={id} aria-hidden="true" className={className} transition={spring} />;
}
