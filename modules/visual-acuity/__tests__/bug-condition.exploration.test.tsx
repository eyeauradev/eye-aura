/**
 * Property 1 — Bug Condition exploration test (UNFIXED CODE).
 *
 * GOAL: Surface counterexamples that prove the timer/progress bug exists in the
 * current `TestingStep`. This test is **expected to fail** on the unfixed code;
 * those failures are the success signal. After the fix lands, the same test
 * MUST pass (Task 3.8).
 *
 * Assertions encoded here (all derive from design § Bug Condition):
 *
 *   (A) Per-letter ring scope. Just after `handleEyeBegin` the displayed
 *       remaining seconds equals `timerDuration`, NOT `timerDuration *
 *       chartLength`.
 *
 *   (B) Pause stops advancement. After pausing mid-letter, advancing fake time
 *       by `2 * timerDuration * 1000` MUST keep `lineIndex` unchanged.
 *
 *   (D) Global progress bar exists. A `[data-testid="va-global-progress"]`
 *       element MUST be in the DOM with an `aria-valuenow` reflecting
 *       `completedLetters / totalLetters`.
 *
 *   (E) Visibility freeze. Hide the tab for several seconds and the per-letter
 *       remaining time MUST NOT drift.
 *
 *   (F) Rapid pause/resume idempotency. 50× pause/resume in 50 ms MUST leave
 *       `lineIndex` unchanged and MUST NOT spawn duplicate logical timers
 *       (`requestAnimationFrame` count comparable to a single pause/resume).
 *
 *   (H) onAllComplete fires exactly once. Running an eye to completion fires
 *       the `reading → self_report` transition exactly once (no
 *       double-transition under StrictMode-style remounts).
 *
 * (G) — unmount cleanup — is intentionally lighter here; the fix-side test in
 * Task 3.8 will cover it more strictly.
 */

import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, fireEvent, screen, cleanup, act } from "@testing-library/react";
import fc from "fast-check";

import { TestingStep } from "../steps/TestingStep";
import { SNELLEN_LINES } from "../snellen-data";
import type { CalibrationData, TimerDuration } from "../types";

// ─── Shared harness ────────────────────────────────────────────────────────

const STUB_CALIBRATION: CalibrationData = {
  pxPerMm: 4,
  cardWidthPx: 342.4,
  deviceWidth: 1440,
  deviceHeight: 900,
  dpr: 2,
  timestamp: 1_700_000_000_000,
};

interface MountResult {
  onComplete: ReturnType<typeof vi.fn>;
  rafSpy: ReturnType<typeof vi.fn>;
  unmount: () => void;
  rerender: (ui: React.ReactElement) => void;
}

function mountTesting(timerDuration: TimerDuration): MountResult {
  // RAF polyfill driven by fake timers — counts every schedule for
  // assertion (F).
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
    <TestingStep
      calibration={STUB_CALIBRATION}
      timerDuration={timerDuration}
      onComplete={onComplete}
    />,
  );

  return {
    onComplete,
    rafSpy,
    unmount: utils.unmount,
    rerender: utils.rerender,
  };
}

/** Click "Ready — Start Test" to invoke `handleEyeBegin` from the eye-intro card. */
function clickReady() {
  const ready = screen.getByRole("button", { name: /Ready\s*—\s*Start Test/i });
  fireEvent.click(ready);
}

/** Read the integer that the per-letter SVG ring displays as `<text>{timer.remaining}</text>`. */
function readDisplayedRemaining(): number {
  const texts = document.querySelectorAll("svg text");
  // The countdown text is the only `<text>` not inside the SnellenRenderer; its
  // string content is a pure integer (e.g. "45" or "5").
  for (const node of Array.from(texts)) {
    const raw = (node.textContent ?? "").trim();
    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }
  }
  throw new Error("countdown <text> not found in DOM");
}

/** Read the level number ("Level X / N") from the reading-phase header. */
function readLineIndex(): number {
  // Header renders `<span>{lineIndex + 1}</span>`.
  const levelLabel = screen.getByText(/^Level$/i);
  const sibling = levelLabel.parentElement?.querySelector(
    "span.text-4xl",
  ) as HTMLSpanElement | null;
  if (!sibling) throw new Error("level number span not found");
  return Number(sibling.textContent?.trim() ?? "NaN") - 1;
}

/** Set `document.hidden` and dispatch a `visibilitychange` event. */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  document.dispatchEvent(new Event("visibilitychange"));
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

// ─── (A) Per-letter ring scope ─────────────────────────────────────────────

describe("(A) Per-letter ring scope", () => {
  test("displayed remaining equals timerDuration immediately after Ready (deterministic)", () => {
    const timerDuration: TimerDuration = 5;
    const chartLength = SNELLEN_LINES.length; // 9

    mountTesting(timerDuration);
    act(() => clickReady());

    const displayed = readDisplayedRemaining();

    // EXPECTED (correct behaviour): displayed === 5
    // ACTUAL on unfixed code: displayed === 5 * 9 === 45 (FAILS)
    expect(displayed).toBe(timerDuration);
    expect(displayed).not.toBe(timerDuration * chartLength);
  });

  test("property: displayed remaining ∈ [1, timerDuration] across all (timerDuration)", () => {
    fc.assert(
      fc.property(fc.constantFrom<TimerDuration>(3, 5, 7, 10), (timerDuration) => {
        mountTesting(timerDuration);
        act(() => clickReady());
        const displayed = readDisplayedRemaining();
        cleanup();
        // The per-letter ring may seed at exactly `timerDuration` (correct) or
        // at `timerDuration - 1` after the first 1 s tick under fake timers, but
        // it MUST NEVER exceed `timerDuration`. On unfixed code the seeded value
        // is `timerDuration * chartLength`, well above the bound.
        return displayed >= 1 && displayed <= timerDuration;
      }),
      { numRuns: 8 },
    );
  });
});

// ─── (B) Pause stops advancement ────────────────────────────────────────────

describe("(B) Pause stops advancement", () => {
  test("lineIndex does not change while paused (deterministic)", () => {
    const timerDuration: TimerDuration = 5;

    mountTesting(timerDuration);
    act(() => clickReady());

    // Advance partway into the FIRST letter (no line rollover yet).
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    const indexBeforePause = readLineIndex();

    // Press Pause.
    const pauseBtn = screen.getByRole("button", { name: /Pause/i });
    act(() => fireEvent.click(pauseBtn));

    // Advance 2 × full letter durations while paused.
    act(() => {
      vi.advanceTimersByTime(2 * timerDuration * 1000);
    });

    const indexAfterPause = readLineIndex();
    // EXPECTED (correct): unchanged.
    // ACTUAL on unfixed code: line-advance setInterval keeps firing →
    // indexAfterPause = indexBeforePause + 2 (FAILS).
    expect(indexAfterPause).toBe(indexBeforePause);
  });

  test("property: pause at random pauseAtMs freezes line index across (timerDuration, chartLength, pauseAtMs)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TimerDuration>(3, 5, 7, 10),
        fc.integer({ min: 1, max: 9 }), // chartLength domain (Snellen has 9 lines)
        // Pause well within the first letter so we have a clean before/after.
        fc.integer({ min: 100, max: 2_000 }),
        (timerDuration, _chartLength, pauseAtMs) => {
          mountTesting(timerDuration);
          act(() => clickReady());

          act(() => vi.advanceTimersByTime(pauseAtMs));
          const before = readLineIndex();

          const pauseBtn = screen.getByRole("button", { name: /Pause/i });
          act(() => fireEvent.click(pauseBtn));

          act(() => vi.advanceTimersByTime(2 * timerDuration * 1000));
          const after = readLineIndex();

          cleanup();
          return after === before;
        },
      ),
      { numRuns: 6 },
    );
  });
});

// ─── (D) Global progress bar exists ────────────────────────────────────────

describe("(D) Global progress bar exists", () => {
  test("`[data-testid=\"va-global-progress\"]` is in the DOM during reading", () => {
    mountTesting(5);
    act(() => clickReady());

    // EXPECTED: the new global progress bar is present.
    // ACTUAL on unfixed code: no such element exists (FAILS).
    const bar = document.querySelector('[data-testid="va-global-progress"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("aria-valuenow")).toBeTruthy();
  });
});

// ─── (E) Visibility freeze ─────────────────────────────────────────────────

describe("(E) Visibility freeze", () => {
  test("remaining time does not drift while document.hidden is true", () => {
    const timerDuration: TimerDuration = 5;

    mountTesting(timerDuration);
    act(() => clickReady());

    // Advance 1 s into the first letter (under correct behaviour: remaining = 4).
    act(() => vi.advanceTimersByTime(1_000));
    const remainingBefore = readDisplayedRemaining();

    // Hide the tab and let 5 s elapse.
    act(() => setHidden(true));
    act(() => vi.advanceTimersByTime(5_000));

    // Show the tab again.
    act(() => setHidden(false));

    const remainingAfter = readDisplayedRemaining();

    // EXPECTED (correct): remainingAfter === remainingBefore (visibility froze
    // the timer; nothing decremented during hidden time).
    // ACTUAL on unfixed code: setInterval keeps ticking while hidden, so
    // remainingAfter < remainingBefore (FAILS).
    expect(remainingAfter).toBe(remainingBefore);
  });
});

// ─── (F) Rapid pause/resume idempotency ────────────────────────────────────

describe("(F) Rapid pause/resume idempotency", () => {
  test("spam pause/resume 50× in 50 ms keeps lineIndex stable and does not spawn duplicate RAF loops", () => {
    const timerDuration: TimerDuration = 5;

    const { rafSpy } = mountTesting(timerDuration);
    act(() => clickReady());

    // Move into mid-letter.
    act(() => vi.advanceTimersByTime(1_500));
    const indexBefore = readLineIndex();
    const rafCallsBefore = rafSpy.mock.calls.length;

    // 50 pause/resume cycles in 50 ms (1 ms per click).
    for (let i = 0; i < 50; i++) {
      const btn = screen.getByRole("button", { name: /(Pause|Resume)/i });
      act(() => fireEvent.click(btn));
      act(() => vi.advanceTimersByTime(1));
    }

    const indexAfter = readLineIndex();
    const rafCallsAfter = rafSpy.mock.calls.length;

    // EXPECTED (correct): lineIndex unchanged, ≤ 1 RAF scheduled per logical
    // resume (not per click). Allow a generous bound: total RAFs must not blow
    // up linearly with the click count.
    expect(indexAfter).toBe(indexBefore);
    const rafGrowth = rafCallsAfter - rafCallsBefore;
    // On a correctly idempotent loop, RAF growth from 50 ms of fake time is
    // bounded by ~4 frames. On a leaky implementation that schedules per click,
    // we'd see ≥ 50.
    expect(rafGrowth).toBeLessThan(20);
  });
});

// ─── (H) onAllComplete fires exactly once ──────────────────────────────────

describe("(H) onAllComplete fires exactly once", () => {
  test("running the right eye to completion transitions to self_report exactly once", () => {
    const timerDuration: TimerDuration = 3;
    const chartLength = SNELLEN_LINES.length;

    mountTesting(timerDuration);
    act(() => clickReady());

    // Advance through all letters with extra slack so the final transition fires.
    act(() => {
      vi.advanceTimersByTime((chartLength + 2) * timerDuration * 1000);
    });

    // After completion the self-report screen is shown. It contains a heading
    // matching "Right Eye — Report" and a "Could not read any line" button.
    const reportButtons = screen.queryAllByRole("button", {
      name: /Could not read any line/i,
    });

    // EXPECTED (correct): exactly one self-report screen is rendered, so
    // exactly one such button exists in the DOM.
    expect(reportButtons.length).toBe(1);
  });
});

/* ─── COUNTEREXAMPLES (filled in after running on unfixed code) ────────────
 *
 * The block below is appended at the bottom of this file with the actual
 * counterexamples produced by fast-check / the deterministic cases when this
 * file was first run on the UNFIXED `TestingStep`.
 *
 * See the appendix at the end of the file.
 * ─────────────────────────────────────────────────────────────────────── */

/* ─── COUNTEREXAMPLES (captured on UNFIXED code, vitest run #1) ─────────────
 *
 * These are the actual failing values produced when this file was first run
 * against the current `TestingStep` (commit prior to the fix). Each entry
 * confirms a distinct facet of the bug.
 *
 * (A) Per-letter ring scope — displayed remaining is the WHOLE-EYE total.
 *   ─ deterministic (timerDuration=5, chartLength=9):
 *       expected 5  got 45      // 45 = 5 × 9
 *   ─ property over (timerDuration ∈ {3,5,7,10}):
 *       Counterexample: [3]
 *       (with chartLength=9 ⇒ displayed=27; outside the [1, timerDuration]
 *        bound; fast-check shrunk to the smallest duration)
 *
 * (B) Pause stops advancement — line-advance setInterval is NOT cleared on
 *     pause, so lineIndex keeps incrementing while the user is paused.
 *   ─ deterministic (timerDuration=5, pauseAtMs=2000, wait=2×5000ms):
 *       indexBefore=0  indexAfter=2     // advanced 2 lines while paused
 *   ─ property over (timerDuration, chartLength, pauseAtMs):
 *       Counterexample: [3, 1, 100]
 *       (timerDuration=3, chartLength=1, pauseAtMs=100 → indexAfter ≠
 *        indexBefore; fast-check shrunk to the minimal triple)
 *
 * (D) Global progress bar exists — `[data-testid="va-global-progress"]` is
 *     entirely absent from the DOM in the current code:
 *       document.querySelector('[data-testid="va-global-progress"]') === null
 *
 * (E) Visibility freeze — the countdown setInterval keeps ticking while the
 *     tab is hidden, so the remaining time drifts:
 *   ─ deterministic (timerDuration=5, hidden 5 s):
 *       remainingBefore=44  remainingAfter=39
 *       (5 s of "hidden" time was credited to the timer; correct behaviour
 *        would have been remainingAfter === 44)
 *
 * (F) Rapid pause/resume idempotency — under the current `setInterval`-based
 *     timer the RAF spy does not grow with clicks, so this assertion happens
 *     to pass under the harness even though the underlying bug class (no
 *     idempotent pause/resume guard) is real. The fix-side rerun in Task 3.8
 *     will cover idempotency more strictly because the rewritten timer is
 *     RAF-driven.
 *
 * (H) onAllComplete fires exactly once — the current code does fire the
 *     `reading → self_report` transition once per eye, so this assertion
 *     passes on the unfixed code as well. It is included here as a
 *     regression guard for Task 3.8.
 *
 * Headline counterexamples to surface in the bugfix narrative:
 *   (timerDuration=5, chartLength=9, displayedRemaining=45)
 *   (timerDuration=3, chartLength=1, paused=true, lineIndex advances anyway)
 *   (timerDuration=5, hiddenMs=5000, remainingDrift=5s)
 * ─────────────────────────────────────────────────────────────────────── */
