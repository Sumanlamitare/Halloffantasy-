"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "", label: "Home", icon: "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" },
  { href: "/hall-of-fame", label: "Hall of Fame", short: "Fame", icon: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3Z" },
  { href: "/champions", label: "Champions", icon: "M7 4h10v3.5a5 5 0 0 1-10 0V4Zm5 8.5V16m-3.5 4h7m-6-4h5l.75 4h-6.5l.75-4Z" },
  { href: "/seasons", label: "Seasons", icon: "M4 6h16M4 12h16M4 18h16" },
  { href: "/records", label: "Records", icon: "M5 20V10m7 10V4m7 16v-7" },
];

function useActive(code: string) {
  const pathname = usePathname();
  const base = `/hall/${code}`;
  const isActive = (href: string) => (href === "" ? pathname === base : pathname.startsWith(base + href));
  return { base, isActive };
}

/** Tablet / desktop: inline in the header. */
export function HallNav({ code }: { code: string }) {
  const { base, isActive } = useActive(code);
  return (
    <nav aria-label="Hall sections" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {ITEMS.map((item) => (
          <li key={item.label}>
            <Link
              href={base + item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`ripple inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors duration-200 ${
                isActive(item.href) ? "bg-fg text-surface" : "text-muted hover:bg-sunken hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Phone: Material 3 style navigation bar. Rendered outside the header so
 * `position: fixed` is relative to the viewport.
 */
export function HallTabBar({ code }: { code: string }) {
  const { base, isActive } = useActive(code);
  return (
    <nav
      aria-label="Hall sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.label}>
              <Link
                href={base + item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 ${active ? "text-fg" : "text-muted"}`}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  <span
                    className={`absolute inset-0 rounded-full bg-sunken transition-transform duration-300 ease-[var(--ease-emphasized)] ${active ? "scale-100" : "scale-x-0"}`}
                  />
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                </span>
                <span className={`text-[11px] tracking-wide ${active ? "font-semibold" : "font-medium"}`}>{item.short ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
