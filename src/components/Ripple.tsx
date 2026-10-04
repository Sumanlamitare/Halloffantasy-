"use client";

import { useEffect } from "react";

/**
 * Material-style ink ripple for any element with the `ripple` class.
 * One delegated listener for the whole app; no per-element wiring.
 */
export function Ripple() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function onDown(e: PointerEvent) {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(".ripple");
      if (!target || (target as HTMLButtonElement).disabled) return;
      const rect = target.getBoundingClientRect();
      const size = Math.hypot(rect.width, rect.height) * 2;
      const ink = document.createElement("span");
      ink.className = "ripple-ink";
      ink.style.width = ink.style.height = `${size}px`;
      ink.style.left = `${e.clientX - rect.left - size / 2}px`;
      ink.style.top = `${e.clientY - rect.top - size / 2}px`;
      target.appendChild(ink);
      ink.addEventListener("animationend", () => ink.remove(), { once: true });
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
