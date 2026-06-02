/**
 * Resize/Reflow & Animation Isolation Integration Test (Task 3.11).
 *
 * GOAL: Prove the rewritten `TestingShell` is robust to viewport resize and
 * uses compositor-friendly animation primitives. All assertions MUST pass on
 * the FIXED code.
 *
 * Validates: Requirements 3.17, 3.18, 3.19, 3.20
 *
 * Sub-properties:
 *
 *   (A) Resize does not perturb timer state. Mounting `TestingShell`,
 *       advancing fake timers to mid-letter 2, and dispatching a
 *       `window.resize` MUST NOT alter the active line index. The SnellenRenderer
 *       SVG node must remain the same (same key = same letter index).
 *
 *   (B) Layout change does not change `SnellenRenderer` SVG dimensions.
 *       Mutating the wrapper element's inline `width` style MUST NOT alter
 *       the rendered SVG's numeric `width` / `height` attributes
 *       (calibrated optotype size is independent of layout box).
 *
 *   (C) [REMOVED] Global progress bar and timer ring chrome have moved to
 *       ImmersiveTopBar (parent shell). These sub-properties are no longer
 *       testable within TestingShell in isolation.
 *
 *   (D) `SnellenRenderer` is not remounted on resize. The DOM node
 *       reference for the chart `<svg>` MUST be byte-identical (`===`)
 *       before and after a `window.resize` event — React MUST NOT
 *       unmount/remount the renderer.
 */

import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";

import { TestingShell, type TestingShellChartLine } from "../steps/TestingShell";
import { SNELLEN_LINES } from "../snellen-data";
import type { CalibrationData, TimerDuration } from "../types";

// ─── Shared fixtures ────────────────────────────────────────────────────────

const STUB_CALIBRATION: CalibrationData = {
  pxPerMm: 4,
  cardWidthPx: 342.4,
  deviceWidth: 1440,
  deviceHeight: 900,
  dpr: 2,
  timestamp: 1_700_000_000_000,
};

const FAR_ACCENT = {
  primary: "#0f4f4b",
  primaryHover: "#0a3a36",
  ringActive: "#0f4f4b",
  ringPaused: "#b5964d",
};

/** First five lines of SNELLEN_LINES, mapped to the `TestingShellChartLine` shape. */
const FIVE_LINE_CHART: TestingShellChartLine[] = SNELLEN_LINES.slice(0, 5).map(
  (line) => ({
    notation: line.notation,
    notation6m: line.notation6m,
    letters: line.letters,
    exactHeightMm: line.exactHeightMm,
    label: line.label,
  }),
);

interface MountResult {
  onComplete: ReturnType<typeof vi.fn>;
  unmount: () => void;
}

function mountShell(timerDuration: TimerDuration = 5): MountResult {
  // RAF polyfill driven by fake timers. Identical pattern to
  // `bug-condition.exploration.test.tsx` and `golden-replay-harness.ts`.
  const rafSpy = vi.fn((cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
  const cafSpy = vi.fn((handle: number) => {
    clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  });
  vi.stubGlobal("requestAnimationFrame", rafSpy);
  vi.stubGlobal("cancelAnimationFrame", cafSpy);

  const onComplete = vi.fn();

  const utils = render(
    <TestingShell
      calibration={STUB_CALIBRATION}
      timerDuration={timerDuration}
      chart={FIVE_LINE_CHART}
      accent={FAR_ACCENT}
      distanceLabel="3 metres"
      testKind="far"
      onComplete={onComplete}
    />,
  );

  return { onComplete, unmount: utils.unmount };
}

/** Click "Ready — Start Test" to enter the reading phase. */
function clickReady() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const ready = buttons.find((b) =>
    /Ready\s*—\s*Start Test/i.test(b.textContent ?? ""),
  );
  if (!ready) throw new Error('Ready — Start Test button not found');
  fireEvent.click(ready);
}

/** Read "Level X / N" → return the 0-based line index (X - 1). */
// NOTE: Level display has been removed from TestingShell reading phase (moved
// to ImmersiveTopBar). Timer state preservation is now verified by SVG node
// stability (same key = same letterIndex).

/** Read the integer rendered inside the per-letter ring's `<text>` element. */
// NOTE: Timer ring has been removed from TestingShell reading phase (moved to
// ImmersiveTopBar). No countdown <text> exists in the reading phase DOM.

/**
 * Find the SnellenRenderer's `<svg>`. After chrome removal, the reading phase
 * contains only ONE SVG — the chart (calibration-driven `width` / `height`).
 */
function findChartSvg(): SVGSVGElement {
  const svgs = Array.from(document.querySelectorAll("svg"));
  if (svgs.length === 0) throw new Error("SnellenRenderer chart <svg> not found");
  // After chrome removal, the only SVG in the reading phase IS the chart.
  return svgs[0] as SVGSVGElement;
}

/** Dispatch a `window.resize` to a target inner width. */
function dispatchResize(width: number) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── (A) Resize does not perturb timer state ───────────────────────────────

describe("(A) Resize does not perturb timer state", () => {
  test("SnellenRenderer SVG node is stable across a window.resize (same letterIndex = same key = same node)", () => {
    mountShell(5);
    act(() => clickReady());

    // Advance to mid-letter 2: with timerDuration = 5s, letter 1 covers
    // 0..5000ms; 7500ms lands the loop in the middle of letter 2 (index 1)
    // with ~2.5s remaining.
    act(() => {
      vi.advanceTimersByTime(7_500);
    });

    // After chrome removal, we verify timer state preservation by checking
    // that the SnellenRenderer SVG node reference is stable (same key means
    // same letterIndex — React's reconciler won't replace the node).
    const svgBefore = findChartSvg();
    const widthBefore = svgBefore.getAttribute("width");
    const heightBefore = svgBefore.getAttribute("height");

    act(() => {
      dispatchResize(768);
    });

    const svgAfter = findChartSvg();

    // Strict reference equality: the SVG node did not change, meaning
    // the letterIndex (part of the key) was not perturbed by resize.
    expect(svgAfter).toBe(svgBefore);
    // Dimensions also stable (calibration unchanged by viewport).
    expect(svgAfter.getAttribute("width")).toBe(widthBefore);
    expect(svgAfter.getAttribute("height")).toBe(heightBefore);
  });
});

// ─── (B) Layout change does not change SnellenRenderer SVG dimensions ──────

describe("(B) Layout change does not change SnellenRenderer SVG dimensions", () => {
  test("svg numeric width/height attributes are stable across body width mutation", () => {
    mountShell(5);
    act(() => clickReady());

    // Advance into the FIRST letter (mid-letter 1 ≈ 1500ms).
    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    const svgBefore = findChartSvg();
    const widthBefore = svgBefore.getAttribute("width");
    const heightBefore = svgBefore.getAttribute("height");

    // Both attributes are calibrated numeric pixel values, never null.
    expect(widthBefore).not.toBeNull();
    expect(heightBefore).not.toBeNull();

    // Mutate the wrapper's inline style — the layout box now wants to be
    // 50vw rather than full-width. SnellenRenderer's SVG dimensions are
    // derived from `pxPerMm * exactHeightMm`, NOT from layout width, so
    // they MUST remain unchanged.
    act(() => {
      document.body.style.width = "50vw";
      // Also fire a resize event to be thorough — some implementations
      // could plausibly listen for it and recompute.
      dispatchResize(720);
    });

    const svgAfter = findChartSvg();
    expect(svgAfter.getAttribute("width")).toBe(widthBefore);
    expect(svgAfter.getAttribute("height")).toBe(heightBefore);
  });
});

// ─── (C) [REMOVED] Chrome animation tests ─────────────────────────────────
// Progress bar and timer ring have moved from TestingShell to ImmersiveTopBar.
// These sub-properties are no longer testable within TestingShell in isolation.
// They should be tested as part of AssessmentImmersiveShell / ImmersiveTopBar
// integration tests instead.

// ─── (D) SnellenRenderer is not remounted on resize ────────────────────────

describe("(D) SnellenRenderer is not remounted on resize", () => {
  test("the chart svg DOM node reference is stable across a resize event", () => {
    mountShell(5);
    act(() => clickReady());

    // Advance to mid-letter 2 to match (A)'s state.
    act(() => {
      vi.advanceTimersByTime(7_500);
    });

    const node1 = findChartSvg();

    act(() => {
      dispatchResize(768);
    });

    const node2 = findChartSvg();

    // Strict reference equality: React's reconciler did not replace the
    // node. (`SnellenRenderer`'s `key={...}` is keyed on
    // `${currentEye}-${letterIndex}`, both of which are unaffected by a
    // resize event.)
    expect(node2).toBe(node1);
  });
});
