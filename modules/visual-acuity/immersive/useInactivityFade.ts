"use client";

import { useState, useEffect, useRef, useCallback, type RefObject } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default inactivity timeout in milliseconds before fade activates. */
const DEFAULT_TIMEOUT_MS = 1500;

/** Events that constitute user interaction and reset the idle timer. */
const INTERACTION_EVENTS = ["mousemove", "touchstart", "keydown"] as const;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Detects user inactivity on a container element and exposes an `isIdle` flag.
 *
 * After `timeoutMs` milliseconds without a `mousemove`, `touchstart`, or
 * `keydown` event on the container, `isIdle` flips to `true`. Any subsequent
 * interaction resets the timer and sets `isIdle` back to `false`.
 *
 * Respects `prefers-reduced-motion`: when the user prefers reduced motion,
 * `isIdle` is always `false` (no opacity fade).
 */
export function useInactivityFade(
  containerRef: RefObject<HTMLElement | null>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): { isIdle: boolean } {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotionRef = useRef(false);

  // ── Reduced motion detection ──────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mql.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
      if (e.matches) {
        // If reduced motion becomes active, cancel any pending idle state.
        setIsIdle(false);
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    mql.addEventListener("change", handleChange);
    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, []);

  // ── Interaction handler ───────────────────────────────────────────────────

  const resetTimer = useCallback(() => {
    // Never go idle when reduced motion is preferred.
    if (prefersReducedMotionRef.current) return;

    setIsIdle(false);

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsIdle(true);
    }, timeoutMs);
  }, [timeoutMs]);

  // ── Event listener setup ──────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Don't set up idle detection if reduced motion is preferred.
    if (prefersReducedMotionRef.current) return;

    // Start the initial idle timer.
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsIdle(true);
    }, timeoutMs);

    // Attach interaction listeners.
    for (const event of INTERACTION_EVENTS) {
      container.addEventListener(event, resetTimer);
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      for (const event of INTERACTION_EVENTS) {
        container.removeEventListener(event, resetTimer);
      }

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [containerRef, timeoutMs, resetTimer]);

  return { isIdle };
}
