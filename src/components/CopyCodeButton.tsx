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
      className={`ripple inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#f3d68f] via-[#d4ad57] to-[#a77e2e] px-6 text-[15px] font-semibold tracking-wide text-[#1f1607] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_24px_-10px_rgba(212,173,87,0.7)] transition-transform duration-200 active:scale-[0.97] ${className}`}
      aria-live="polite"
    >
      <span key={String(copied)} className="page-enter">{copied ? "Copied!" : "Copy Code"}</span>
    </button>
  );
}
