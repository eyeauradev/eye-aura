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
 *       `window.resize` MUST NOT alter the active line index. The displayed
 *       remaining time MUST stay within ±1 second (one render-tick of slop)
 *       of its pre-resize value.
 *
 *   (B) Layout change does not change `SnellenRenderer` SVG dimensions.
 *       Mutating the wrapper element's inline `width` style MUST NOT alter
 *       the rendered SVG's numeric `width` / `height` attributes
 *       (calibrated optotype size is independent of layout box).
 *
 *   (C) Global progress bar uses compositor-friendly properties. The fill
 *       inside `[data-testid="va-global-progress"]` MUST animate with
 *       `transform: scaleX(...)` (NOT animated `width: …%`). The per-letter
 *       ring's animated `<circle>` MUST use `stroke-dashoffset` for its
 *       transition.
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
function readLineIndex(): number {
  const allSpans = Array.from(document.querySelectorAll("span"));
  for (const span of allSpans) {
    if ((span.textContent ?? "").trim() === "Level") {
      const sibling = span.parentElement?.querySelector(
        "span.text-4xl",
      ) as HTMLSpanElement | null;
      if (sibling) {
        const n = Number((sibling.textContent ?? "").trim());
        if (Number.isFinite(n)) return n - 1;
      }
    }
  }
  throw new Error("Level number span not found in DOM");
}

/** Read the integer rendered inside the per-letter ring's `<text>` element. */
function readDisplayedRemaining(): number {
  const texts = document.querySelectorAll("svg text");
  for (const node of Array.from(texts)) {
    const raw = (node.textContent ?? "").trim();
    if (/^\d+$/.test(raw)) return Number(raw);
  }
  throw new Error("countdown <text> not found in DOM");
}

/**
 * Find the SnellenRenderer's `<svg>`. The reading phase contains exactly two
 * SVGs: (1) the chart (calibration-driven `width` / `height`), and (2) the
 * 88×88 timer ring. Filter the timer ring out by its exact dimensions.
 */
function findChartSvg(): SVGSVGElement {
  const svgs = Array.from(document.querySelectorAll("svg"));
  const chart = svgs.find(
    (s) =>
      s.getAttribute("width") !== "88" || s.getAttribute("height") !== "88",
  );
  if (!chart) throw new Error("SnellenRenderer chart <svg> not found");
  return chart as SVGSVGElement;
}

/** Find the timer ring SVG (88×88). */
function findRingSvg(): SVGSVGElement {
  const svgs = Array.from(document.querySelectorAll("svg"));
  const ring = svgs.find(
    (s) =>
      s.getAttribute("width") === "88" && s.getAttribute("height") === "88",
  );
  if (!ring) throw new Error("Timer ring <svg> not found");
  return ring as SVGSVGElement;
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
  test("lineIndex is preserved and remaining drifts ≤ 1s across a window.resize", () => {
    mountShell(5);
    act(() => clickReady());

    // Advance to mid-letter 2: with timerDuration = 5s, letter 1 covers
    // 0..5000ms; 7500ms lands the loop in the middle of letter 2 (index 1)
    // with ~2.5s remaining.
    act(() => {
      vi.advanceTimersByTime(7_500);
    });

    const indexBefore = readLineIndex();
    const remainingBefore = readDisplayedRemaining();

    // Sanity: we ARE on letter 2.
    expect(indexBefore).toBe(1);

    act(() => {
      dispatchResize(768);
    });

    const indexAfter = readLineIndex();
    const remainingAfter = readDisplayedRemaining();

    // lineIndex must be unchanged: a viewport change MUST NOT advance the
    // assessment.
    expect(indexAfter).toBe(indexBefore);

    // Allow ±1s drift (one ceil-rounded render tick) — the resize itself
    // does not advance fake timers, but the pre/post-snapshot reads bracket
    // the resize call so a single second boundary may be crossed.
    expect(Math.abs(remainingAfter - remainingBefore)).toBeLessThanOrEqual(1);
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

// ─── (C) Global progress bar uses compositor-friendly properties ───────────

describe("(C) Global progress bar uses compositor-friendly properties", () => {
  test("global bar fill animates with transform: scaleX, not width", () => {
    mountShell(5);
    act(() => clickReady());

    const bar = document.querySelector(
      '[data-testid="va-global-progress"]',
    ) as HTMLElement | null;
    expect(bar).not.toBeNull();

    // The fill is the (only) child div of the progress bar.
    const fill = bar!.querySelector("div") as HTMLElement | null;
    expect(fill).not.toBeNull();

    const transform = fill!.style.transform ?? "";
    const styleAttr = fill!.getAttribute("style") ?? "";

    // Either the parsed inline style or the raw style attribute MUST contain
    // a scaleX transform. We do NOT assert anything about width — width may
    // be set to "100%" as a static value, but it MUST NOT be the animated
    // dimension.
    const usesScaleX =
      transform.startsWith("scaleX(") || /scaleX\(/.test(styleAttr);
    expect(usesScaleX).toBe(true);
  });

  test("per-letter ring uses stroke-dashoffset for its animation", () => {
    mountShell(5);
    act(() => clickReady());

    const ring = findRingSvg();
    // The ring contains two <circle>s: the static track and the animated
    // arc (which has strokeLinecap="round"). The animated one is the
    // SECOND circle in source order.
    const circles = Array.from(ring.querySelectorAll("circle"));
    expect(circles.length).toBeGreaterThanOrEqual(2);

    const animated = circles[1] as SVGCircleElement;
    const styleAttr = animated.getAttribute("style") ?? "";

    // The transition declaration MUST mention stroke-dashoffset. We do NOT
    // assert anything about animated `r`, `cx`, or `cy` — those would
    // trigger layout / paint, defeating compositor-friendliness.
    expect(/stroke-dashoffset/.test(styleAttr)).toBe(true);
  });
});

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
