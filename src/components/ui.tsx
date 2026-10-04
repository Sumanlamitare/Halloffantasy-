import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CountUp } from "./CountUp";

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
      <h1 className="font-display text-3xl font-semibold uppercase leading-tight tracking-wide sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{children}</div>}
    </header>
  );
}

/* Surfaces -------------------------------------------------------------- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,25,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({ value, label, accent = false, delay = 0 }: { value: number; label: string; accent?: boolean; delay?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-5 text-center shadow-[0_1px_2px_rgba(28,27,25,0.04)]">
      <div className={`font-display text-4xl font-semibold leading-none sm:text-5xl ${accent ? "text-accent" : "text-fg"}`}>
        <CountUp value={value} delay={delay} />
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
  primary: "bg-fg text-surface shadow-[0_2px_8px_rgba(28,27,25,0.18)] hover:bg-[#33312d]",
  secondary: "border border-line bg-surface text-fg hover:bg-sunken",
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
      <span className="font-serif text-lg italic">Hall of Fantasy</span>
    </Link>
  );
}

/** Interactive card surface with ripple + press feedback. */
export const pressable =
  "ripple block rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(28,27,25,0.04)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-emphasized)] hover:shadow-[0_6px_20px_rgba(28,27,25,0.07)] active:scale-[0.985]";
