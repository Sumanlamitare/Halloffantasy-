import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CountUp } from "./motion";

/* Icons ---------------------------------------------------------------- */

export function TrophyIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M7 4h10v3.5a5 5 0 0 1-10 0V4Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 5.5H4.5v1.25A3.25 3.25 0 0 0 7.6 10M17 5.5h2.5v1.25A3.25 3.25 0 0 1 16.4 10M12 12.5v3.5M8.5 20h7M9.5 16h5l.75 4h-6.5l.75-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Typography ------------------------------------------------------------ */

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] text-subtle ${className}`}>{children}</p>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
      <h1 className="gold-text font-display text-3xl font-bold uppercase leading-tight tracking-[0.06em] sm:text-5xl">{title}</h1>
      <div aria-hidden="true" className="mt-4 h-px w-24 bg-gradient-to-r from-accent to-transparent" />
      {children && <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{children}</div>}
    </header>
  );
}

/* Surfaces -------------------------------------------------------------- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`marble rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({ value, label, accent = false, delay = 0 }: { value: number; label: string; accent?: boolean; delay?: number }) {
  return (
    <div className="marble rounded-xl px-3 py-5 text-center">
      <div className={`font-display text-4xl font-bold leading-none sm:text-5xl ${accent ? "gold-text" : "text-fg"}`}>
        <CountUp value={value} delay={delay / 1000} />
      </div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{label}</div>
    </div>
  );
}

export function Unavailable({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-subtle">{children}</p>;
}

/* Buttons --------------------------------------------------------------- */

const base =
  "ripple inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-wide transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-emphasized)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";
const variants = {
  // Polished gold
  primary:
    "bg-gradient-to-b from-[#f3d68f] via-[#d4ad57] to-[#a77e2e] text-[#1f1607] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_24px_-10px_rgba(212,173,87,0.7)] hover:brightness-110",
  secondary: "border border-accent/50 bg-transparent text-accent hover:bg-accent/10",
  ghost: "text-muted hover:text-fg",
};

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return <button {...props} className={`${base} ${variants[variant]} ${className}`} />;
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-fg">
      <TrophyIcon className="h-5 w-5 text-accent" />
      <span className="font-display text-sm font-semibold uppercase tracking-[0.22em]">Hall of Fantasy</span>
    </Link>
  );
}

/** Interactive card surface with ripple + press feedback. */
export const pressable =
  "ripple marble block rounded-xl transition-[transform,border-color] duration-200 ease-[var(--ease-emphasized)] hover:border-accent/50 active:scale-[0.985]";
