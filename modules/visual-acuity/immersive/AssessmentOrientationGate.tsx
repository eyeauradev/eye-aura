"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Smartphone } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentOrientationGateProps {
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Duration for gate fade-out animation in seconds. */
const FADE_DURATION_S = 0.4;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Overlays a fullscreen gate when the viewport is in portrait orientation,
 * while keeping children mounted in the background. This prevents assessment
 * state from being lost during rotation.
 *
 * When portrait: Shows rotation instruction overlay, children remain mounted but hidden.
 * When landscape: Removes overlay, children become visible and interactive.
 *
 * Only relevant on compact viewports (< 1024px) in immersive mode.
 */
export function AssessmentOrientationGate({
  children,
}: AssessmentOrientationGateProps) {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(orientation: portrait)").matches;
  });

  const prefersReducedMotion = useReducedMotion();

  // ── Orientation listener ──────────────────────────────────────────────────

  const handleOrientationChange = useCallback(
    (event: MediaQueryListEvent) => {
      setIsPortrait(event.matches);
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(orientation: portrait)");
    // Sync initial state in case SSR value differs.
    setIsPortrait(mql.matches);

    mql.addEventListener("change", handleOrientationChange);
    return () => {
      mql.removeEventListener("change", handleOrientationChange);
    };
  }, [handleOrientationChange]);

  // ── Keyboard dismiss (Escape key) ────────────────────────────────────────

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        setIsPortrait(false);
      }
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  // CRITICAL: Children are ALWAYS rendered to prevent state loss.
  // The portrait overlay is layered on top when needed.

  return (
    <div data-testid="assessment-orientation-gate" className="relative">
      {/* Children — always mounted, hidden when portrait */}
      <div 
        className={isPortrait ? "invisible pointer-events-none" : "visible"}
        aria-hidden={isPortrait}
      >
        {children}
      </div>

      {/* Portrait overlay — shown on top when needed */}
      <AnimatePresence>
        {isPortrait && (
          <motion.div
            key="orientation-gate-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="orientation-gate-title"
            aria-describedby="orientation-gate-description"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-50"
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : FADE_DURATION_S,
            }}
          >
            {/* Accessible live region for orientation change announcements */}
            <div
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              Please rotate your device back to landscape to continue your assessment.
            </div>

            <div className="flex flex-col items-center gap-6 px-8 py-12 text-center max-w-sm">
              {/* Rotate device icon */}
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-[#0f4f4b]/5">
                <Smartphone
                  className="h-12 w-12 text-[#0f4f4b]"
                  style={{ transform: "rotate(90deg)" }}
                  aria-hidden="true"
                />
                {/* Subtle rotation indicator arrow */}
                <motion.div
                  className="absolute -right-1 top-1/2 -translate-y-1/2"
                  animate={
                    prefersReducedMotion
                      ? {}
                      : { rotate: [0, 15, 0] }
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  aria-hidden="true"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="text-[#0f4f4b]/60"
                  >
                    <path
                      d="M10 4 L16 10 L10 16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </div>

              {/* Instruction text */}
              <div className="space-y-2">
                <h2
                  id="orientation-gate-title"
                  className="text-lg font-semibold text-[#0f4f4b] tracking-tight"
                >
                  Assessment Paused
                </h2>
                <p
                  id="orientation-gate-description"
                  className="text-sm text-slate-600 leading-relaxed"
                >
                  Please rotate your device back to landscape to continue.
                </p>
                <div className="text-xs text-slate-500 space-y-1 pt-2">
                  <p>✓ Your progress has been saved</p>
                  <p>✓ The timer is currently paused</p>
                </div>
              </div>

              {/* Visual hint - subtle landscape indicator */}
              <div
                className="w-16 h-10 rounded-lg border-2 border-dashed border-[#0f4f4b]/20"
                aria-hidden="true"
              />

              {/* Keyboard dismiss hint */}
              <p className="text-xs text-slate-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-[10px]">Esc</kbd> to dismiss
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
