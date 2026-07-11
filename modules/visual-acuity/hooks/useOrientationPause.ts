"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Hook to detect portrait orientation and request pause.
 * Returns true when the device is in portrait mode.
 * 
 * This hook is used by TestingShell to automatically pause the timer
 * when the device rotates to portrait, preventing progression while
 * the user cannot see the content properly.
 */
export function useOrientationPause() {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(orientation: portrait)").matches;
  });

  const handleOrientationChange = useCallback(
    (event: MediaQueryListEvent) => {
      setIsPortrait(event.matches);
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(orientation: portrait)");
    setIsPortrait(mql.matches);

    mql.addEventListener("change", handleOrientationChange);
    return () => {
      mql.removeEventListener("change", handleOrientationChange);
    };
  }, [handleOrientationChange]);

  return isPortrait;
}
