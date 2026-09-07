"use client";

import { useRouter } from "next/navigation";
import React from "react";

/** Keeps a live docket current during an event without a manual reload. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
