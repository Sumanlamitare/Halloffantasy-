"use client";

import { useState } from "react";

export function CopyCodeButton({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for browsers without async clipboard access.
      const el = document.createElement("textarea");
      el.value = code;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`ripple inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-fg px-6 text-[15px] font-semibold tracking-wide text-surface shadow-[0_2px_8px_rgba(28,27,25,0.18)] transition-transform duration-200 active:scale-[0.97] ${className}`}
      aria-live="polite"
    >
      <span key={String(copied)} className="page-enter">{copied ? "Copied!" : "Copy Code"}</span>
    </button>
  );
}
