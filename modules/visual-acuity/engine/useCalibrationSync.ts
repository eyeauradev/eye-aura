"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CalibrationData } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ISO/IEC 7810 ID-1 standard credit card width in millimeters. */
const CARD_WIDTH_MM = 85.60;

/** Debounce interval (ms) to avoid excessive re-renders on rapid changes. */
const DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Recalculates `pxPerMm` when the device environment changes (DPR change,
 * resize, or orientation change). Returns the current effective calibration
 * data — either the original or a recalculated version.
 *
 * When DPR changes: recalculates pxPerMm using the DPR ratio.
 * When only viewport size changes (no DPR change): updates deviceWidth/
 * deviceHeight but keeps pxPerMm unchanged (physical pixel density hasn't
 * changed).
 *
 * All recalculations are debounced at 300ms.
 */
export function useCalibrationSync(
  calibration: CalibrationData | null,
): CalibrationData | null {
  const [effective, setEffective] = useState<CalibrationData | null>(calibration);

  // Keep a ref to the latest calibration input so the listener closures
  // always see the freshest value without re-subscribing.
  const calibrationRef = useRef(calibration);
  calibrationRef.current = calibration;

  // Debounce timer handle.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the DPR media query list so we can remove the listener on cleanup.
  const mqlRef = useRef<MediaQueryList | null>(null);

  // Sync effective state when the input calibration reference changes
  // (e.g., user re-calibrates).
  useEffect(() => {
    setEffective(calibration);
  }, [calibration]);

  // ── Recalculation logic ─────────────────────────────────────────────────

  const recalculate = useCallback(() => {
    const cal = calibrationRef.current;
    if (!cal) return;

    const currentDpr = typeof window !== "undefined" ? window.devicePixelRatio : cal.dpr;
    const currentWidth = typeof window !== "undefined" ? window.innerWidth : cal.deviceWidth;
    const currentHeight = typeof window !== "undefined" ? window.innerHeight : cal.deviceHeight;

    const dprChanged = currentDpr !== cal.dpr;

    if (!dprChanged && currentWidth === cal.deviceWidth && currentHeight === cal.deviceHeight) {
      // Nothing changed — keep original calibration as-is.
      return;
    }

    let newPxPerMm: number;

    if (dprChanged) {
      // DPR changed: recalculate pxPerMm using the DPR ratio.
      // newPxPerMm = cardWidthPx / CARD_WIDTH_MM adjusted for DPR ratio change.
      newPxPerMm = (cal.cardWidthPx / CARD_WIDTH_MM) * (currentDpr / cal.dpr);
    } else {
      // Only viewport size changed — physical pixel density hasn't changed,
      // so pxPerMm stays the same.
      newPxPerMm = cal.pxPerMm;
    }

    setEffective({
      pxPerMm: newPxPerMm,
      cardWidthPx: cal.cardWidthPx,
      deviceWidth: currentWidth,
      deviceHeight: currentHeight,
      dpr: currentDpr,
      timestamp: Date.now(),
    });
  }, []);

  // ── Debounced handler ───────────────────────────────────────────────────

  const debouncedRecalculate = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      recalculate();
    }, DEBOUNCE_MS);
  }, [recalculate]);

  // ── Event subscriptions ─────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!calibration) return;

    // Resize listener.
    window.addEventListener("resize", debouncedRecalculate);

    // Orientation change listener.
    window.addEventListener("orientationchange", debouncedRecalculate);

    // DPR change listener via matchMedia.
    // matchMedia with a resolution query fires when DPR changes (e.g.,
    // moving window between monitors, pinch-zoom).
    const dpr = window.devicePixelRatio;
    const mql = window.matchMedia(`(resolution: ${dpr}dppx)`);
    mqlRef.current = mql;

    const handleDprChange = () => {
      debouncedRecalculate();

      // Re-subscribe with the new DPR value since the old query no longer
      // matches. We do this by cleaning up and letting the next effect run
      // pick up the new DPR. However, since we're inside the listener, we
      // just trigger recalculation — the effect will re-run if calibration
      // changes via setEffective.
    };

    mql.addEventListener("change", handleDprChange);

    // ── Cleanup ─────────────────────────────────────────────────────────
    return () => {
      window.removeEventListener("resize", debouncedRecalculate);
      window.removeEventListener("orientationchange", debouncedRecalculate);

      if (mqlRef.current) {
        mqlRef.current.removeEventListener("change", handleDprChange);
        mqlRef.current = null;
      }

      // Clear any pending debounce timer.
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [calibration, debouncedRecalculate]);

  return effective;
}
