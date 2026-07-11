"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if the app is running as a Progressive Web App (standalone mode).
 * Returns true when the app is installed and running in standalone mode.
 * 
 * This can be used to provide different UX for PWA vs browser contexts.
 */
export function usePWAStatus() {
  const [isPWA, setIsPWA] = useState<boolean>(false);
  const [isIOSSafari, setIsIOSSafari] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (PWA installed)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true; // iOS Safari specific

    setIsPWA(isStandalone);

    // Detect iOS Safari (for install prompt suggestion)
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setIsIOSSafari(isIOS && isSafari && !isStandalone);
  }, []);

  return { isPWA, isIOSSafari };
}
