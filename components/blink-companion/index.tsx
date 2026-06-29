"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Lazy-loaded Blink Companion wrapper.
 * - Dynamically imports the widget (client-side only)
 * - Loads only after the page becomes interactive (requestIdleCallback)
 * - Zero impact on initial page load / LCP / FID
 */
const LazyBlinkCompanion = dynamic(
  () =>
    import("./BlinkCompanion").then((mod) => ({
      default: mod.BlinkCompanion,
    })),
  { ssr: false }
);

export function BlinkCompanionLoader() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Use requestIdleCallback to defer loading until browser is idle
    const load = () => setShouldLoad(true);

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    } else {
      // Fallback: load after 2 seconds
      const timeout = setTimeout(load, 2000);
      return () => clearTimeout(timeout);
    }
  }, []);

  if (!shouldLoad) return null;
  return <LazyBlinkCompanion />;
}
