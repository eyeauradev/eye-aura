"use client";

import { useEffect, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentFullscreenControllerProps {
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Compact viewport threshold in pixels. */
const COMPACT_VIEWPORT_THRESHOLD = 1024;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Utility component that attempts to enter fullscreen mode on compact viewports
 * (< 1024px) when mounted, and exits fullscreen on unmount.
 *
 * Gracefully handles all failure cases:
 * - Browser does not support Fullscreen API
 * - User denies the fullscreen request
 * - Permission policy blocks fullscreen
 *
 * No user-facing error UI is shown — failures are logged as warnings.
 * Children are rendered unchanged regardless of fullscreen state.
 */
export function AssessmentFullscreenController({
  children,
}: AssessmentFullscreenControllerProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isCompactViewport = window.innerWidth < COMPACT_VIEWPORT_THRESHOLD;

    if (!isCompactViewport) return;

    // Attempt to enter fullscreen on compact viewports.
    let didRequestFullscreen = false;

    async function requestFullscreen() {
      try {
        if (!document.documentElement.requestFullscreen) {
          console.warn(
            "[AssessmentFullscreenController] Fullscreen API not supported by this browser.",
          );
          return;
        }

        await document.documentElement.requestFullscreen();
        didRequestFullscreen = true;
      } catch (error) {
        console.warn(
          "[AssessmentFullscreenController] Fullscreen request failed:",
          error,
        );
      }
    }

    requestFullscreen();

    // Exit fullscreen on unmount if we are currently in fullscreen.
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((error) => {
          console.warn(
            "[AssessmentFullscreenController] Failed to exit fullscreen:",
            error,
          );
        });
      }
    };
  }, []);

  return <>{children}</>;
}
