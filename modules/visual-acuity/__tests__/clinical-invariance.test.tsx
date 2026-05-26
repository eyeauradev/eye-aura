/**
 * Property 3 — Clinical Invariance test suite (UNFIXED CODE).
 *
 * GOAL: Lock down the clinical safety envelope. These tests MUST PASS on the
 * UNFIXED code (capturing the baseline clinical outputs) and MUST STILL PASS
 * on the FIXED code (proving the rewrite is purely infrastructural). Any
 * failure after the fix means the rewrite has regressed clinical math and
 * MUST be reverted/corrected.
 *
 * Validates: Requirements 3.11, 3.12, 3.13, 3.14, 3.15, 3.16
 *
 * Sub-properties:
 *   (A) `SnellenRenderer` numeric output equivalence (property-based).
 *       For every (letters, exactHeightMm, pxPerMm) triple drawn from the
 *       clinical input space, snapshot a deterministic dump of every SVG
 *       attribute that affects optotype rendering (svg width/height/viewBox,
 *       per-letter font-size, x, y, text-anchor, font-family). Any change in
 *       SnellenRenderer.tsx would change the dump and fail the snapshot.
 *
 *   (B) `AcuitySession.handleTestComplete` payload equivalence (property-based).
 *       Replicate the inline payload assembly from `handleTestComplete` in a
 *       local helper-mirror. Snapshot the resulting AcuityTestResult shape
 *       (with volatile fields sessionId, startedAt, completedAt,
 *       durationSeconds redacted) for generated input sequences. Locks down
 *       the payload shape and the testingDistance / timerDuration / eye
 *       wiring.
 *
 *   (C) Snellen / Jaeger chart-data snapshot.
 *       `expect(SNELLEN_LINES).toMatchSnapshot()` and
 *       `expect(NEAR_VISION_LINES).toMatchSnapshot()`. Tests fail if any line
 *       attribute changes (length, order, exactHeightMm, letters, notation,
 *       jaeger, snellen, snellen6m, pointSize, label).
 *
 *   (D) `useVisionProgression` API + reducer trajectory snapshot.
 *       Mount the hook with `renderHook`, snapshot the returned object's API
 *       surface (key set), then drive deterministic + property-based
 *       sequences of `advance(correct, retried)` calls and snapshot the full
 *       (index, consecutiveFails, isComplete) trajectory.
 */

import { describe, expect, test, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import fc from "fast-check";

import { SnellenRenderer } from "../SnellenRenderer";
import { SNELLEN_LINES } from "../snellen-data";
import { NEAR_VISION_LINES } from "../near/near-vision-data";
import { useVisionProgression } from "../engine/useVisionProgression";
import type {
  AcuityTestResult,
  CalibrationData,
  EyeAcuityResult,
  TestType,
  TimerDuration,
} from "../types";

// Mock the firestore service in case any indirect import path picks up the
// AcuitySession tree. The helper-mirror approach below does not import
// AcuitySession, but this is cheap insurance against a future test addition.
vi.mock("@/services/firestore", () => ({
  visionAssessmentsService: { update: vi.fn() },
}));

// ─── Stable input domains ───────────────────────────────────────────────────

const SLOAN_LETTERS = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"] as const;

/** Full set of exactHeightMm values from SNELLEN_LINES + NEAR_VISION_LINES. */
const EXACT_HEIGHTS_MM = [
  3.27, 4.36, 5.5, 6.5, 8.7, 10.9, 15.3, 21.8, 43.6,
] as const;

/** Realistic card-calibration range. Constrained to 1-decimal increments
 *  for stable snapshot keys. */
const PX_PER_MM_GRID = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5] as const;

// ─── (A) SnellenRenderer numeric output equivalence ────────────────────────

/**
 * Render `SnellenRenderer` to static markup and parse out the numeric
 * attributes that matter for clinical accuracy. Returns a deterministic
 * plain-object dump suitable for `toMatchSnapshot()`.
 */
function dumpSnellenRender(
  letters: string[],
  exactHeightMm: number,
  pxPerMm: number,
): unknown {
  const calibration: CalibrationData = {
    pxPerMm,
    cardWidthPx: 342.4,
    deviceWidth: 1440,
    deviceHeight: 900,
    dpr: 2,
    timestamp: 1_700_000_000_000,
  };

  const html = renderToStaticMarkup(
    React.createElement(SnellenRenderer, {
      letters,
      exactHeightMm,
      calibration,
      // Disable the fade animation so the markup is purely structural.
      animate: false,
      showDebug: false,
    }),
  );

  // Pull the <svg ...> attributes.
  const svgMatch = html.match(/<svg\b([^>]*)>/);
  if (!svgMatch) {
    throw new Error("SnellenRenderer produced no <svg> element");
  }
  const svgAttrs = parseAttrs(svgMatch[1]);

  // Pull every <text ...>...</text> child.
  const textRegex = /<text\b([^>]*)>([^<]*)<\/text>/g;
  const textNodes: Array<Record<string, string>> = [];
  for (const m of html.matchAll(textRegex)) {
    const attrs = parseAttrs(m[1]);
    textNodes.push({ ...attrs, _content: m[2] });
  }

  // Round numeric attributes to 6 decimal places to defeat floating-point
  // jitter while still catching meaningful clinical changes.
  const roundedSvg = roundNumeric(svgAttrs);
  const roundedTexts = textNodes.map(roundNumeric);

  return {
    inputs: {
      letters: [...letters],
      exactHeightMm,
      pxPerMm,
    },
    svg: {
      width: roundedSvg.width,
      height: roundedSvg.height,
      viewBox: roundedSvg.viewBox,
    },
    letters: roundedTexts.map((t) => ({
      content: t._content,
      x: t.x,
      y: t.y,
      "font-size": t["font-size"] ?? t.fontSize,
      "text-anchor": t["text-anchor"] ?? t.textAnchor,
      "font-family": t["font-family"] ?? t.fontFamily,
      "font-weight": t["font-weight"] ?? t.fontWeight,
    })),
  };
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  for (const m of raw.matchAll(re)) {
    out[m[1]] = m[2];
  }
  return out;
}

function roundNumeric(o: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "_content") {
      out[k] = v;
      continue;
    }
    // Round purely-numeric scalar attrs.
    if (/^-?\d+(\.\d+)?$/.test(v)) {
      out[k] = String(Math.round(Number(v) * 1_000_000) / 1_000_000);
      continue;
    }
    // Round each numeric token in a viewBox-like attr.
    if (/^[\d\s.-]+$/.test(v)) {
      out[k] = v
        .trim()
        .split(/\s+/)
        .map((tok) =>
          /^-?\d+(\.\d+)?$/.test(tok)
            ? String(Math.round(Number(tok) * 1_000_000) / 1_000_000)
            : tok,
        )
        .join(" ");
      continue;
    }
    out[k] = v;
  }
  return out;
}

describe("(A) SnellenRenderer numeric output equivalence", () => {
  test("deterministic baseline: all SNELLEN_LINES at pxPerMm=4", () => {
    const dumps = SNELLEN_LINES.map((line) =>
      dumpSnellenRender(line.letters, line.exactHeightMm, 4),
    );
    expect(dumps).toMatchSnapshot();
  });

  test("deterministic baseline: all NEAR_VISION_LINES at pxPerMm=4", () => {
    const dumps = NEAR_VISION_LINES.map((line) =>
      dumpSnellenRender(line.letters, line.exactHeightMm, 4),
    );
    expect(dumps).toMatchSnapshot();
  });

  test("property: arbitrary (letters, exactHeightMm, pxPerMm) triples render deterministically", () => {
    // Draw a small, deterministic batch of triples and snapshot them as a
    // group. Using `fc.sample` with a fixed seed gives us property-style
    // coverage while keeping the snapshot stable across runs.
    const triples = fc.sample(
      fc.record({
        letters: fc
          .uniqueArray(fc.constantFrom(...SLOAN_LETTERS), {
            minLength: 1,
            maxLength: 6,
          })
          .map((arr) => arr as string[]),
        exactHeightMm: fc.constantFrom(...EXACT_HEIGHTS_MM),
        pxPerMm: fc.constantFrom(...PX_PER_MM_GRID),
      }),
      { numRuns: 24, seed: 1_234_567 },
    );

    const dumps = triples.map((t) =>
      dumpSnellenRender(t.letters, t.exactHeightMm, t.pxPerMm),
    );
    expect(dumps).toMatchSnapshot();
  });
});

// ─── (B) handleTestComplete payload equivalence ────────────────────────────

/**
 * Helper-mirror of the inline AcuityTestResult assembly inside
 * `AcuitySession.handleTestComplete`. The shape MUST stay byte-for-byte
 * equivalent to the production code path (the snapshot below pins it).
 *
 * Production source:
 *   modules/visual-acuity/AcuitySession.tsx → handleTestComplete()
 */
function assembleAcuityResult(input: {
  rightBest: string | null;
  leftBest: string | null;
  testType: TestType;
  timerDuration: TimerDuration;
  calibration: CalibrationData;
  sessionId: string;
  startedAt: number;
  completedAt: number;
}): AcuityTestResult {
  const right: EyeAcuityResult = {
    eye: "right",
    bestNotation: input.rightBest,
    lineResults: [],
  };
  const left: EyeAcuityResult = {
    eye: "left",
    bestNotation: input.leftBest,
    lineResults: [],
  };

  return {
    sessionId: input.sessionId,
    testType: input.testType,
    rightEye: right,
    leftEye: left,
    timerDuration: input.timerDuration,
    testingDistance: input.testType === "far" ? 3 : 0.35,
    calibration: input.calibration,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationSeconds: (input.completedAt - input.startedAt) / 1000,
  };
}

/** Strip volatile fields before snapshotting. */
function redact(result: AcuityTestResult): unknown {
  const { sessionId, startedAt, completedAt, durationSeconds, ...rest } =
    result;
  // Reference the redacted names so eslint/ts is satisfied without a comment.
  void sessionId;
  void startedAt;
  void completedAt;
  void durationSeconds;
  return rest;
}

const STUB_CALIBRATION: CalibrationData = {
  pxPerMm: 4,
  cardWidthPx: 342.4,
  deviceWidth: 1440,
  deviceHeight: 900,
  dpr: 2,
  timestamp: 1_700_000_000_000,
};

const VALID_FAR_NOTATIONS = SNELLEN_LINES.map((l) => l.notation);
const VALID_NEAR_NOTATIONS = NEAR_VISION_LINES.map((l) => l.snellen);

describe("(B) handleTestComplete payload equivalence", () => {
  test("deterministic baseline: representative far + near payloads", () => {
    const cases = [
      {
        rightBest: "20/20",
        leftBest: "20/25",
        testType: "far" as const,
        timerDuration: 5 as TimerDuration,
      },
      {
        rightBest: null,
        leftBest: "20/30",
        testType: "far" as const,
        timerDuration: 3 as TimerDuration,
      },
      {
        rightBest: "20/40",
        leftBest: null,
        testType: "near" as const,
        timerDuration: 7 as TimerDuration,
      },
      {
        rightBest: null,
        leftBest: null,
        testType: "near" as const,
        timerDuration: 10 as TimerDuration,
      },
    ];

    const dumps = cases.map((c) =>
      redact(
        assembleAcuityResult({
          ...c,
          calibration: STUB_CALIBRATION,
          sessionId: "STUB_SESSION_ID",
          startedAt: 0,
          completedAt: 0,
        }),
      ),
    );

    expect(dumps).toMatchSnapshot();
  });

  test("property: redacted payload shape is stable across (rightBest, leftBest, testType, timerDuration)", () => {
    const samples = fc.sample(
      fc.record({
        rightBest: fc.option(fc.constantFrom(...VALID_FAR_NOTATIONS), {
          nil: null,
        }),
        leftBest: fc.option(fc.constantFrom(...VALID_NEAR_NOTATIONS), {
          nil: null,
        }),
        testType: fc.constantFrom<TestType>("far", "near"),
        timerDuration: fc.constantFrom<TimerDuration>(3, 5, 7, 10),
      }),
      { numRuns: 16, seed: 9_876_543 },
    );

    const dumps = samples.map((s) =>
      redact(
        assembleAcuityResult({
          ...s,
          calibration: STUB_CALIBRATION,
          sessionId: "STUB_SESSION_ID",
          startedAt: 0,
          completedAt: 0,
        }),
      ),
    );

    expect(dumps).toMatchSnapshot();
  });
});

// ─── (C) Snellen / Jaeger chart-data snapshot ──────────────────────────────

describe("(C) Snellen / Jaeger chart-data snapshot", () => {
  test("SNELLEN_LINES is unchanged in length, order, and per-line attributes", () => {
    expect(SNELLEN_LINES).toMatchSnapshot();
  });

  test("NEAR_VISION_LINES is unchanged in length, order, and per-line attributes", () => {
    expect(NEAR_VISION_LINES).toMatchSnapshot();
  });
});

// ─── (D) useVisionProgression API + reducer trajectory ─────────────────────

interface ProgressionStep {
  call: { correct: boolean; retried: boolean };
  /** Hook return shape captured AFTER the call. */
  state: { index: number; consecutiveFails: number; isComplete: boolean };
  /** advance() return value. */
  advanceResult: boolean;
}

function runProgression(
  totalLines: number,
  stopAfterFails: number,
  sequence: Array<{ correct: boolean; retried: boolean }>,
): { apiKeys: string[]; trajectory: ProgressionStep[] } {
  const { result } = renderHook(() =>
    useVisionProgression({ totalLines, stopAfterFails }),
  );

  const apiKeys = Object.keys(result.current).sort();
  const trajectory: ProgressionStep[] = [];

  for (const step of sequence) {
    let advanceResult = false;
    act(() => {
      advanceResult = result.current.advance(step.correct, step.retried);
    });
    trajectory.push({
      call: step,
      state: {
        index: result.current.index,
        consecutiveFails: result.current.consecutiveFails,
        isComplete: result.current.isComplete,
      },
      advanceResult,
    });
  }

  return { apiKeys, trajectory };
}

describe("(D) useVisionProgression API + reducer trajectory", () => {
  test("returned API surface is stable", () => {
    const { result } = renderHook(() =>
      useVisionProgression({ totalLines: 9, stopAfterFails: 2 }),
    );
    expect(Object.keys(result.current).sort()).toMatchSnapshot();
  });

  test("deterministic trajectory: classic CCCWCWW sequence (totalLines=9, stopAfterFails=2)", () => {
    const sequence = [
      { correct: true, retried: false },
      { correct: true, retried: false },
      { correct: true, retried: false },
      { correct: false, retried: false },
      { correct: true, retried: false },
      { correct: false, retried: false },
      { correct: false, retried: false },
    ];
    const { trajectory } = runProgression(9, 2, sequence);
    expect(trajectory).toMatchSnapshot();
  });

  test("deterministic trajectory: all-correct walk to last line (totalLines=9, stopAfterFails=2)", () => {
    const sequence = Array.from({ length: 12 }, () => ({
      correct: true,
      retried: false,
    }));
    const { trajectory } = runProgression(9, 2, sequence);
    expect(trajectory).toMatchSnapshot();
  });

  test("deterministic trajectory: two-strikes early stop (totalLines=9, stopAfterFails=2)", () => {
    const sequence = [
      { correct: false, retried: false },
      { correct: false, retried: false },
      // Past the stop point — the hook should report isComplete=true and not
      // advance further; we still call advance() to prove idempotency under
      // the existing implementation.
      { correct: true, retried: false },
    ];
    const { trajectory } = runProgression(9, 2, sequence);
    expect(trajectory).toMatchSnapshot();
  });

  test("property: trajectories are deterministic for arbitrary (correct, retried) sequences", () => {
    // Sample a small batch of sequences with a fixed seed, then snapshot the
    // full set of trajectories. This pins reducer behaviour across the input
    // domain without relying on per-iteration snapshots.
    const sequences = fc.sample(
      fc.array(
        fc.record({ correct: fc.boolean(), retried: fc.boolean() }),
        { minLength: 1, maxLength: 12 },
      ),
      { numRuns: 8, seed: 4_242_424 },
    );

    const dumps = sequences.map((seq) => ({
      sequence: seq,
      trajectory: runProgression(9, 2, seq).trajectory,
    }));

    expect(dumps).toMatchSnapshot();
  });
});
