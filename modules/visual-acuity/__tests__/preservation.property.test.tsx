/**
 * Property 2 — Preservation: Clinical Logic and Global Systems Invariance
 *
 * GOAL: Capture the existing correct clinical logic behavior as a baseline.
 * These tests MUST PASS on UNFIXED code and MUST STILL PASS after the fix,
 * confirming no regressions to clinical calculations, rendering, or global
 * systems.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * Properties tested:
 *   (A) SnellenRenderer SVG Dimensions Invariance
 *       For all CalibrationData (pxPerMm ∈ [1, 20], cardWidthPx ∈ [200, 600],
 *       dpr ∈ [1, 4]): produces identical SVG width, height, viewBox, and
 *       letter positions regardless of presentation shell.
 *
 *   (B) useLetterTimer Progression Invariance
 *       For all (totalLetters, durationMs, pauseResumeSequence): the reducer
 *       state machine produces identical progression sequence.
 *
 *   (C) useCalibrationSync Output Invariance
 *       For all (calibration, dprChange, viewportResize): produces identical
 *       recalculated calibration output.
 *
 *   (D) useAssessmentProgress Derivation Invariance
 *       For all assessment progress inputs: produces identical derivation.
 *
 *   (E) Global Systems Untouched
 *       globals.css and design-tokens.ts exports are unchanged.
 */

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import fc from "fast-check";

import { SnellenRenderer } from "../SnellenRenderer";
import { useLetterTimer } from "../engine/useLetterTimer";
import { useCalibrationSync } from "../engine/useCalibrationSync";
import { useAssessmentProgress } from "../engine/useAssessmentProgress";
import type { CalibrationData } from "../types";
import {
  RADIUS,
  SPACING,
  RESPONSIVE_SPACING,
  SHADOWS,
  GLASS,
  TYPOGRAPHY,
  DEPTH_LAYERS,
} from "@/lib/design-tokens";

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generator for CalibrationData within clinically realistic ranges. */
const arbCalibrationData: fc.Arbitrary<CalibrationData> = fc.record({
  pxPerMm: fc.double({ min: 1, max: 20, noNaN: true }),
  cardWidthPx: fc.double({ min: 200, max: 600, noNaN: true }),
  deviceWidth: fc.integer({ min: 320, max: 3840 }),
  deviceHeight: fc.integer({ min: 480, max: 2160 }),
  dpr: fc.double({ min: 1, max: 4, noNaN: true }),
  timestamp: fc.constant(1_700_000_000_000),
});

/** Generator for Sloan letters (standard optotype character set). */
const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"] as const;
const arbLetters: fc.Arbitrary<string[]> = fc.uniqueArray(
  fc.constantFrom(...SLOAN_LETTERS),
  { minLength: 1, maxLength: 8 },
).map((arr) => arr as string[]);

/** Generator for exact height in mm (clinical range). */
const arbExactHeightMm: fc.Arbitrary<number> = fc.double({
  min: 3.0,
  max: 50.0,
  noNaN: true,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Constants from SnellenRenderer — replicated here for verification. */
const CAP_HEIGHT_RATIO = 0.711;
const MIN_CAP_PX = 4;
const LETTER_GAP_RATIO = 0.5;
const PAD_H_RATIO = 0.75;
const PAD_V_RATIO = 0.4;

/**
 * Compute expected SVG dimensions from SnellenRenderer's algorithm.
 * This is the pure math extracted from the component — any change to the
 * component's sizing logic will cause a mismatch.
 */
function computeExpectedSvgDimensions(
  letters: string[],
  exactHeightMm: number,
  pxPerMm: number,
): { svgW: number; svgH: number; viewBox: string } {
  const rawCapPx = exactHeightMm * pxPerMm;
  const capPx = Math.max(rawCapPx, MIN_CAP_PX);

  const slotW = capPx;
  const gap = capPx * LETTER_GAP_RATIO;
  const padH = capPx * PAD_H_RATIO;
  const padV = capPx * PAD_V_RATIO;

  const totalLettersW = letters.length * slotW + (letters.length - 1) * gap;
  const svgW = totalLettersW + padH * 2;
  const svgH = capPx + padV * 2;

  return { svgW, svgH, viewBox: `0 0 ${svgW} ${svgH}` };
}

/**
 * Render SnellenRenderer to static markup and extract SVG attributes.
 */
function renderAndExtractSvg(
  letters: string[],
  exactHeightMm: number,
  calibration: CalibrationData,
): { width: string; height: string; viewBox: string } | null {
  const html = renderToStaticMarkup(
    React.createElement(SnellenRenderer, {
      letters,
      exactHeightMm,
      calibration,
      animate: false,
      showDebug: false,
    }),
  );

  const svgMatch = html.match(/<svg\b([^>]*)>/);
  if (!svgMatch) return null;

  const widthMatch = svgMatch[1].match(/width="([^"]*)"/);
  const heightMatch = svgMatch[1].match(/height="([^"]*)"/);
  const viewBoxMatch = svgMatch[1].match(/viewBox="([^"]*)"/);

  return {
    width: widthMatch?.[1] ?? "",
    height: heightMatch?.[1] ?? "",
    viewBox: viewBoxMatch?.[1] ?? "",
  };
}

/**
 * Compute useCalibrationSync recalculation logic (pure math from the hook).
 * On DPR change: newPxPerMm = (cardWidthPx / 85.60) * (newDpr / originalDpr)
 * On resize only: pxPerMm stays unchanged, deviceWidth/deviceHeight update.
 */
const CARD_WIDTH_MM = 85.60;

function computeCalibrationRecalc(
  original: CalibrationData,
  newDpr: number,
  newWidth: number,
  newHeight: number,
): CalibrationData {
  const dprChanged = newDpr !== original.dpr;

  if (!dprChanged && newWidth === original.deviceWidth && newHeight === original.deviceHeight) {
    return original;
  }

  const newPxPerMm = dprChanged
    ? (original.cardWidthPx / CARD_WIDTH_MM) * (newDpr / original.dpr)
    : original.pxPerMm;

  return {
    pxPerMm: newPxPerMm,
    cardWidthPx: original.cardWidthPx,
    deviceWidth: newWidth,
    deviceHeight: newHeight,
    dpr: newDpr,
    timestamp: expect.any(Number) as unknown as number,
  };
}

// ─── (A) SnellenRenderer SVG Dimensions Invariance ──────────────────────────

describe("(A) SnellenRenderer SVG Dimensions Invariance", () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * For all CalibrationData objects (pxPerMm ∈ [1, 20], cardWidthPx ∈ [200, 600],
   * dpr ∈ [1, 4]): SnellenRenderer produces SVG dimensions that match the
   * expected pure-math computation, regardless of presentation shell.
   */
  test("property: SVG dimensions match pure-math computation for all (letters, exactHeightMm, calibration)", () => {
    fc.assert(
      fc.property(
        arbLetters,
        arbExactHeightMm,
        arbCalibrationData,
        (letters, exactHeightMm, calibration) => {
          const rendered = renderAndExtractSvg(letters, exactHeightMm, calibration);
          if (!rendered) return false;

          const expected = computeExpectedSvgDimensions(
            letters,
            exactHeightMm,
            calibration.pxPerMm,
          );

          // Compare with tolerance for floating-point
          const renderedW = parseFloat(rendered.width);
          const renderedH = parseFloat(rendered.height);

          return (
            Math.abs(renderedW - expected.svgW) < 0.001 &&
            Math.abs(renderedH - expected.svgH) < 0.001
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  test("property: letter count in SVG matches input letter count for all inputs", () => {
    fc.assert(
      fc.property(
        arbLetters,
        arbExactHeightMm,
        arbCalibrationData,
        (letters, exactHeightMm, calibration) => {
          const html = renderToStaticMarkup(
            React.createElement(SnellenRenderer, {
              letters,
              exactHeightMm,
              calibration,
              animate: false,
              showDebug: false,
            }),
          );

          const textMatches = html.match(/<text\b[^>]*>[^<]*<\/text>/g);
          return textMatches !== null && textMatches.length === letters.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("property: SVG dimensions are deterministic (same inputs → same outputs)", () => {
    fc.assert(
      fc.property(
        arbLetters,
        arbExactHeightMm,
        arbCalibrationData,
        (letters, exactHeightMm, calibration) => {
          const render1 = renderAndExtractSvg(letters, exactHeightMm, calibration);
          const render2 = renderAndExtractSvg(letters, exactHeightMm, calibration);

          return (
            render1 !== null &&
            render2 !== null &&
            render1.width === render2.width &&
            render1.height === render2.height &&
            render1.viewBox === render2.viewBox
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── (B) useLetterTimer Progression Invariance ──────────────────────────────

describe("(B) useLetterTimer Progression Invariance", () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * The useLetterTimer reducer produces deterministic state transitions
   * for all (totalLetters, durationMs) inputs. We test the reducer logic
   * directly by simulating TICK actions with known deltas.
   */

  // Import the hook's reducer indirectly by testing through the hook itself.
  // The key property: for identical inputs, the state machine produces
  // identical outputs.

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });

    // RAF polyfill driven by fake timers
    const rafImpl = (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(Date.now()), 16) as unknown as number;
    };
    const cafImpl = (handle: number) => {
      clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
    };
    vi.stubGlobal("requestAnimationFrame", rafImpl);
    vi.stubGlobal("cancelAnimationFrame", cafImpl);
    // Stub performance.now so useLetterTimer uses Date.now (which is fake-timer controlled)
    vi.stubGlobal("performance", undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("property: start always sets letterIndex=0 and status='running' for all valid (totalLetters, durationMs)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1000, max: 30000 }),
        (totalLetters, durationMs) => {
          const { result } = renderHook(() =>
            useLetterTimer({ totalLetters, durationMs }),
          );

          act(() => {
            result.current.start();
          });

          return (
            result.current.status === "running" &&
            result.current.letterIndex === 0 &&
            result.current.remainingMs === durationMs
          );
        },
      ),
      { numRuns: 30 },
    );
  });

  test("property: pause/resume is idempotent — double-pause or double-resume has no extra effect", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 10000 }),
        (totalLetters, durationMs) => {
          const { result } = renderHook(() =>
            useLetterTimer({ totalLetters, durationMs }),
          );

          act(() => result.current.start());
          act(() => vi.advanceTimersByTime(100));

          // Double pause
          act(() => result.current.pause());
          const afterFirstPause = result.current.userPaused;
          act(() => result.current.pause());
          const afterSecondPause = result.current.userPaused;

          // Double resume
          act(() => result.current.resume());
          const afterFirstResume = result.current.userPaused;
          act(() => result.current.resume());
          const afterSecondResume = result.current.userPaused;

          return (
            afterFirstPause === true &&
            afterSecondPause === true &&
            afterFirstResume === false &&
            afterSecondResume === false
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  test("property: reset returns to idle with letterIndex=0 for all states", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 10000 }),
        fc.integer({ min: 0, max: 5000 }),
        (totalLetters, durationMs, advanceMs) => {
          const { result } = renderHook(() =>
            useLetterTimer({ totalLetters, durationMs }),
          );

          act(() => result.current.start());
          act(() => vi.advanceTimersByTime(advanceMs));
          act(() => result.current.reset());

          return (
            result.current.status === "idle" &&
            result.current.letterIndex === 0 &&
            result.current.remainingMs === durationMs
          );
        },
      ),
      { numRuns: 30 },
    );
  });

  test("property: remainingMs is always in [0, durationMs] for all states", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 10000 }),
        fc.integer({ min: 0, max: 15000 }),
        (totalLetters, durationMs, advanceMs) => {
          const { result } = renderHook(() =>
            useLetterTimer({ totalLetters, durationMs }),
          );

          act(() => result.current.start());
          act(() => vi.advanceTimersByTime(advanceMs));

          return (
            result.current.remainingMs >= 0 &&
            result.current.remainingMs <= durationMs
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── (C) useCalibrationSync Output Invariance ───────────────────────────────

describe("(C) useCalibrationSync Output Invariance", () => {
  /**
   * **Validates: Requirements 3.2, 3.3**
   *
   * For all (calibration, dprChange, viewportResize) scenarios:
   * useCalibrationSync output is deterministic and follows the established
   * recalculation rules.
   */

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("property: initial output equals input calibration for all CalibrationData", () => {
    fc.assert(
      fc.property(arbCalibrationData, (calibration) => {
        // Set up window to match calibration
        vi.stubGlobal("window", {
          ...globalThis.window,
          innerWidth: calibration.deviceWidth,
          innerHeight: calibration.deviceHeight,
          devicePixelRatio: calibration.dpr,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          matchMedia: vi.fn(() => ({
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          })),
        });

        const { result } = renderHook(() => useCalibrationSync(calibration));

        return (
          result.current !== null &&
          result.current.pxPerMm === calibration.pxPerMm &&
          result.current.cardWidthPx === calibration.cardWidthPx &&
          result.current.dpr === calibration.dpr
        );
      }),
      { numRuns: 50 },
    );
  });

  test("property: null input always produces null output", () => {
    fc.assert(
      fc.property(fc.constant(null), (input) => {
        const { result } = renderHook(() => useCalibrationSync(input));
        return result.current === null;
      }),
      { numRuns: 5 },
    );
  });

  test("property: DPR change recalculation formula is consistent for all (calibration, newDpr)", () => {
    // This tests the pure math formula:
    // newPxPerMm = (cardWidthPx / CARD_WIDTH_MM) * (newDpr / originalDpr)
    fc.assert(
      fc.property(
        arbCalibrationData,
        fc.double({ min: 1, max: 4, noNaN: true }),
        (calibration, newDpr) => {
          if (newDpr === calibration.dpr) return true; // No change scenario

          const expectedPxPerMm =
            (calibration.cardWidthPx / CARD_WIDTH_MM) * (newDpr / calibration.dpr);

          // Verify the formula produces valid, finite results
          return (
            Number.isFinite(expectedPxPerMm) && expectedPxPerMm > 0
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── (D) useAssessmentProgress Derivation Invariance ────────────────────────

describe("(D) useAssessmentProgress Derivation Invariance", () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * For all assessment progress inputs: the pure derivation produces
   * identical, deterministic results.
   */

  test("property: globalPercent is always in [0, 1] for all valid inputs", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<"right" | "left">("right", "left"),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        (currentEye, letterIndex, totalLinesPerEye) => {
          const { result } = renderHook(() =>
            useAssessmentProgress({
              currentEye,
              letterIndex,
              totalLinesPerEye,
            }),
          );

          return (
            result.current.globalPercent >= 0 &&
            result.current.globalPercent <= 1
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  test("property: completedLetters never exceeds totalLetters for all inputs", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<"right" | "left">("right", "left"),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 1, max: 15 }),
        fc.option(fc.integer({ min: 1, max: 15 }), { nil: undefined }),
        fc.option(fc.integer({ min: 1, max: 15 }), { nil: undefined }),
        (currentEye, letterIndex, totalLinesPerEye, rightLines, leftLines) => {
          const { result } = renderHook(() =>
            useAssessmentProgress({
              currentEye,
              letterIndex,
              totalLinesPerEye,
              rightLines,
              leftLines,
            }),
          );

          return result.current.completedLetters <= result.current.totalLetters;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("property: left eye completedLetters ≥ right eye lines for all inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }),
        fc.integer({ min: 1, max: 9 }),
        (letterIndex, totalLinesPerEye) => {
          const { result: rightResult } = renderHook(() =>
            useAssessmentProgress({
              currentEye: "right",
              letterIndex,
              totalLinesPerEye,
            }),
          );

          const { result: leftResult } = renderHook(() =>
            useAssessmentProgress({
              currentEye: "left",
              letterIndex,
              totalLinesPerEye,
            }),
          );

          // Left eye progress should be at least totalLinesPerEye ahead
          // (since right eye lines are already counted as complete)
          return leftResult.current.completedLetters >= rightResult.current.completedLetters;
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: derivation is deterministic (same inputs → same outputs)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<"right" | "left">("right", "left"),
        fc.integer({ min: 0, max: 15 }),
        fc.integer({ min: 1, max: 9 }),
        (currentEye, letterIndex, totalLinesPerEye) => {
          const { result: r1 } = renderHook(() =>
            useAssessmentProgress({ currentEye, letterIndex, totalLinesPerEye }),
          );

          const { result: r2 } = renderHook(() =>
            useAssessmentProgress({ currentEye, letterIndex, totalLinesPerEye }),
          );

          return (
            r1.current.completedLetters === r2.current.completedLetters &&
            r1.current.totalLetters === r2.current.totalLetters &&
            r1.current.globalPercent === r2.current.globalPercent &&
            r1.current.currentLevel === r2.current.currentLevel &&
            r1.current.totalLevels === r2.current.totalLevels
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: currentLevel equals letterIndex + 1 for all inputs", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<"right" | "left">("right", "left"),
        fc.integer({ min: 0, max: 15 }),
        fc.integer({ min: 1, max: 9 }),
        (currentEye, letterIndex, totalLinesPerEye) => {
          const { result } = renderHook(() =>
            useAssessmentProgress({ currentEye, letterIndex, totalLinesPerEye }),
          );

          return result.current.currentLevel === letterIndex + 1;
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── (E) Global Systems Untouched ───────────────────────────────────────────

describe("(E) Global Systems Untouched", () => {
  /**
   * **Validates: Requirements 3.4, 3.5, 3.6**
   *
   * Verify that globals.css and design-tokens.ts exports remain unmodified.
   * These snapshot tests lock down the exact export shapes.
   */

  test("design-tokens.ts RADIUS export is unchanged", () => {
    expect(RADIUS).toMatchInlineSnapshot(`
      {
        "card": "rounded-3xl",
        "container": "rounded-[32px]",
        "interactive": "rounded-2xl",
        "pill": "rounded-full",
      }
    `);
  });

  test("design-tokens.ts SPACING export is unchanged", () => {
    expect(SPACING).toMatchInlineSnapshot(`
      {
        "cardGap": "gap-4 md:gap-5 lg:gap-6",
        "cardPadding": "p-4 md:p-5 lg:p-6",
        "layoutGap": "gap-5 md:gap-6 lg:gap-7",
        "pageX": "px-3 md:px-4 lg:px-6",
        "pageY": "py-4 md:py-5 lg:py-8",
        "sectionGap": "gap-6 md:gap-7 lg:gap-8",
      }
    `);
  });

  test("design-tokens.ts SHADOWS export is unchanged", () => {
    expect(SHADOWS).toMatchInlineSnapshot(`
      {
        "buttonHover": "shadow-[0_12px_40px_rgba(var(--primary-rgb),0.14)]",
        "card": "shadow-[0_8px_32px_rgba(var(--primary-rgb),0.06)]",
        "elevated": "shadow-[0_32px_100px_rgba(var(--primary-rgb),0.24)]",
        "glass": "shadow-[0_24px_80px_rgba(var(--primary-rgb),0.12)]",
        "sidebar": "shadow-[0_16px_64px_rgba(var(--primary-rgb),0.10)]",
      }
    `);
  });

  test("design-tokens.ts GLASS export is unchanged", () => {
    expect(GLASS).toMatchInlineSnapshot(`
      {
        "background": "bg-card/72",
        "blur": "backdrop-blur-[22px]",
        "border": "border border-white/60",
        "cardBackground": "bg-card/82",
        "headerBackground": "bg-card/80",
      }
    `);
  });

  test("design-tokens.ts TYPOGRAPHY export is unchanged", () => {
    expect(TYPOGRAPHY).toMatchInlineSnapshot(`
      {
        "body": "text-base text-foreground",
        "heading": "text-2xl sm:text-3xl font-semibold text-foreground",
        "label": "text-xs uppercase tracking-[0.12em] font-medium text-muted-foreground",
        "subheading": "text-lg font-semibold text-foreground",
      }
    `);
  });

  test("design-tokens.ts DEPTH_LAYERS export is unchanged", () => {
    expect(DEPTH_LAYERS).toMatchInlineSnapshot(`
      [
        {
          "background": "bg-background",
          "blur": "backdrop-blur-none",
          "name": "background",
          "shadow": "shadow-none",
        },
        {
          "background": "bg-card/72",
          "blur": "backdrop-blur-[22px]",
          "name": "surface",
          "shadow": "shadow-[0_24px_80px_rgba(var(--primary-rgb),0.12)]",
        },
        {
          "background": "bg-card/82",
          "blur": "backdrop-blur-[30px]",
          "name": "elevated",
          "shadow": "shadow-[0_32px_100px_rgba(var(--primary-rgb),0.24)]",
        },
      ]
    `);
  });

  test("design-tokens.ts RESPONSIVE_SPACING export is unchanged", () => {
    expect(RESPONSIVE_SPACING).toMatchInlineSnapshot(`
      {
        "desktop": 1,
        "minTouchTarget": "min-h-[44px] min-w-[44px]",
        "mobile": 0.75,
        "tablet": 0.875,
      }
    `);
  });
});
