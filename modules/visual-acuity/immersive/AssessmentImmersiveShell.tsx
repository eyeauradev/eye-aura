"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { useInactivityFade } from "./useInactivityFade";
import { AssessmentOverflowMenu } from "./AssessmentOverflowMenu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssessmentImmersiveShellProps {
  /** Formatted timer value, e.g. "4s". */
  timerDisplay: string;
  /** Formatted progress value, e.g. "3 of 9" or "20/40". */
  progressDisplay: string;
  /** Optional acuity level display shown during testing (e.g. "20/40" or "Line 3 of 9"). Overrides progressDisplay when set. */
  levelDisplay?: string;
  /** Current assessment phase. Overflow menu shown only during 'testing'. */
  phase: string;
  /** Whether the assessment is currently paused. */
  isPaused: boolean;
  /** Called when the user selects "Pause" from the overflow menu. */
  onPause: () => void;
  /** Called when the user selects "Resume" from the overflow menu. */
  onResume: () => void;
  /** Called when the user selects "Return to Details". */
  onReturnToDetails: () => void;
  /** Called when the user selects "Return to Dashboard". */
  onReturnToDashboard: () => void;
  /** Called when the user selects "Exit Assessment". */
  onExit: () => void;
  /** Assessment step content — rendered unchanged. */
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Viewport width threshold for compact/immersive launch mode. */
const COMPACT_VIEWPORT_BREAKPOINT = 1024;

// ---------------------------------------------------------------------------
// ImmersiveTopBar (internal sub-component)
// ---------------------------------------------------------------------------

interface ImmersiveTopBarProps {
  timerDisplay: string;
  progressDisplay: string;
  isIdle: boolean;
}

/**
 * Minimal top bar displaying timer (left) and progress (right).
 * Opacity transitions based on user inactivity state.
 * Uses shrink-0 so it never gets compressed by flex children.
 * Minimal padding to maximize chart space.
 */
function ImmersiveTopBar({ timerDisplay, progressDisplay, isIdle }: ImmersiveTopBarProps) {
  return (
    <div
      data-testid="immersive-top-bar"
      className="flex w-full shrink-0 items-center justify-between px-3 py-1.5"
      style={{
        opacity: isIdle ? 0.3 : 1,
        transition: "opacity 300ms ease",
      }}
    >
      {/* Timer — left side */}
      <div
        className="text-[18px] font-semibold text-slate-700 tabular-nums"
        aria-label={`Timer: ${timerDisplay}`}
      >
        {timerDisplay}
      </div>

      {/* Progress — right side */}
      <div
        className="text-sm font-semibold text-slate-500"
        aria-label={`Progress: ${progressDisplay}`}
      >
        {progressDisplay}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssessmentImmersiveShell
// ---------------------------------------------------------------------------

/**
 * Full-viewport immersive wrapper for the visual acuity assessment.
 *
 * Replaces dashboard chrome with a clean, medical-grade environment that
 * dedicates 90–95% of viewport area to assessment content. Includes a
 * minimal auto-fading top bar and an overflow menu during the testing phase.
 *
 * On compact viewports (< 1024px), triggers a new-tab launch with
 * `?immersive=1`. On large viewports (≥ 1024px), renders in-place as a
 * fixed overlay.
 *
 * Children (clinical components) are rendered identically without any
 * prop modification.
 */
export function AssessmentImmersiveShell({
  timerDisplay,
  progressDisplay,
  levelDisplay,
  phase,
  isPaused,
  onPause,
  onResume,
  onReturnToDetails,
  onReturnToDashboard,
  onExit,
  children,
}: AssessmentImmersiveShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const { isIdle } = useInactivityFade(shellRef);
  const [shouldRender, setShouldRender] = useState(true);

  // ── Viewport-aware launch logic ───────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isImmersiveTab = new URLSearchParams(window.location.search).has("immersive");
    const isCompactViewport = window.innerWidth < COMPACT_VIEWPORT_BREAKPOINT;

    if (isCompactViewport && !isImmersiveTab) {
      // On compact viewport in original tab context, launch new tab.
      const url = new URL(window.location.href);
      url.searchParams.set("immersive", "1");
      window.open(url.toString(), "_blank");
      setShouldRender(false);
    }
  }, []);

  // ── Don't render shell in original tab if new tab was launched ─────────────

  if (!shouldRender) {
    return null;
  }

  // ── Determine if overflow menu should show ────────────────────────────────

  const showOverflowMenu = phase === "testing";

  return (
    <div
      ref={shellRef}
      data-testid="assessment-immersive-shell"
      className="fixed inset-0 z-[100] flex flex-col bg-[#f8f9fa]"
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {/* Top bar — timer and progress, auto-fades on inactivity */}
      <ImmersiveTopBar
        timerDisplay={timerDisplay}
        progressDisplay={levelDisplay || progressDisplay}
        isIdle={isIdle}
      />

      {/* Content area — fills remaining viewport height.
          Uses minimal padding to maximize screen space for the chart.
          Always allows overflow-y-auto so content is always scrollable/reachable.
          The optotype reading phase naturally centers without needing overflow-hidden. */}
      <div
        className="relative flex min-h-0 flex-1 items-start justify-center px-2 pb-1 overflow-y-auto"
      >
        {children}
      </div>

      {/* Overflow menu — only during testing phase */}
      {showOverflowMenu && (
        <AssessmentOverflowMenu
          isPaused={isPaused}
          onPause={onPause}
          onResume={onResume}
          onReturnToDetails={onReturnToDetails}
          onReturnToDashboard={onReturnToDashboard}
          onExit={onExit}
        />
      )}
    </div>
  );
}
