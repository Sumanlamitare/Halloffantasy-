"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps an auto-updating Hall fresh while it's open: re-reads the latest data
 * from the server (MongoDB, not ESPN) every few minutes, and shortly after
 * load when a background refresh from ESPN was just started.
 */
export function LiveRefresh({ syncStarted }: { syncStarted: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const first = syncStarted ? setTimeout(refresh, 15_000) : undefined;
    const interval = setInterval(refresh, 5 * 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [router, syncStarted]);

  return null;
}
