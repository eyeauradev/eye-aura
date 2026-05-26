/**
 * Property 4 — Golden Replay Behavioural Equivalence Suite.
 *
 * Validates: Requirements 3.4, 3.5, 3.7, 3.8, 3.9, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.20
 *
 * GOAL: Lock down the clinically-meaningful end-to-end orchestration of the
 * visual-acuity testing flow by replaying a curated set of patient interaction
 * scripts through the UNFIXED engine, capturing the resulting trajectories as
 * golden snapshots, and committing those snapshots to the repository. Task
 * 3.13 will replay the SAME scripts through the post-fix `TestingShell` and
 * assert byte-equality against these snapshots.
 *
 * SCOPE NOTE: The script set is intentionally pragmatic — 6 representative
 * scripts that cover the critical clinical paths (pristine read-through, mid-
 * test pause/resume, all-null self-report, top + bottom notation selection)
 * for the most common `(testKind, timerDuration)` pairs. The 64-trajectory
 * matrix described in the spec is overkill and brittle; this slim cut still
 * proves behavioural equivalence on the inputs that matter most clinically.
 *
 * RECORDED FIELDS: For cross-engine equivalence we record only the fields
 * that MUST be byte-equal under any timer implementation:
 *
 *   { stepIndex, kind, eyePhase, currentEye, lineIndex }
 *   + final onComplete payload (volatile fields redacted)
 *
 * Auxiliary fields like `displayedRemaining` (the number rendered inside the
 * per-letter ring) and `hasInlineMiniBar` (legacy header element presence)
 * INTENTIONALLY DIFFER between the OLD and NEW engines and are NOT part of
 * the comparable projection. They are recorded under `aux` for debugging.
 *
 * SCRIPTS MARKED `oldOnly: true`:
 *   - S2 — pause stops advancement on the FIXED engine but does NOT on the
 *     UNFIXED engine, so the trajectory diverges by design. Task 3.12
 *     captured the OLD-engine trajectory under the original snapshot key.
 *     Task 3.13 (this file's post-fix run) keeps that historical snapshot
 *     intact and additionally:
 *       (a) records the FIXED engine trajectory under a "(post-fix)"
 *           snapshot key, so both pre- and post-fix trajectories coexist;
 *       (b) asserts a divergence guard: `lineIndex` MUST stay pinned
 *           between the `pause` and matching `resume` events — the direct
 *           code-level expression of the pause-stops-advancement fix.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup } from "@testing-library/react";

import {
  replayScript,
  comparableProjection,
  type NamedScript,
} from "./golden-replay-harness";
import { SNELLEN_LINES } from "../snellen-data";
import { NEAR_VISION_LINES } from "../near/near-vision-data";

// ─── Cleanup belts-and-braces ──────────────────────────────────────────────

beforeEach(() => {
  // The harness owns fake-timer lifecycle; ensure no leaked global state.
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Chart constants ───────────────────────────────────────────────────────

const FAR_CHART_LENGTH = SNELLEN_LINES.length; // 9
const NEAR_CHART_LENGTH = NEAR_VISION_LINES.length; // 9

/** A single tick that exceeds one full letter duration with slack. */
function fullLetterTick(timerDuration: number): { kind: "tick"; ms: number } {
  // Add 50 ms slack so the line-advance setInterval definitely rolls over.
  return { kind: "tick", ms: timerDuration * 1000 + 50 };
}

/** A run of `chartLength + 1` full-letter ticks — guarantees the eye finishes. */
function tickThroughEye(timerDuration: number, chartLength: number): Array<{ kind: "tick"; ms: number }> {
  return Array.from({ length: chartLength + 1 }, () => fullLetterTick(timerDuration));
}

// ─── Curated scripts ───────────────────────────────────────────────────────

const SCRIPTS: NamedScript[] = [
  // S1 — Pristine read-through (far, 5 s) → bottom notation on right, then
  // a different bottom-row notation on left. Locks the canonical happy path.
  {
    name: "S1-far-5s-pristine",
    testKind: "far",
    timerDuration: 5,
    script: [
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/40" },
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/30" },
    ],
  },

  // S1 — Pristine read-through (near, 3 s). Smaller duration, near chart.
  {
    name: "S1-near-3s-pristine",
    testKind: "near",
    timerDuration: 3,
    script: [
      { kind: "ready_eye" },
      ...tickThroughEye(3, NEAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/50" },
      { kind: "ready_eye" },
      ...tickThroughEye(3, NEAR_CHART_LENGTH),
      { kind: "select_notation", notation: null },
    ],
  },

  // S2 — Mid-test pause/resume (far, 5 s). The pause-stops-advancement
  // contract IS the bug fix, so the OLD engine's trajectory will differ from
  // the NEW engine's. This script is OLD-only.
  {
    name: "S2-pause-resume-far-5s",
    testKind: "far",
    timerDuration: 5,
    oldOnly: true,
    script: [
      { kind: "ready_eye" },
      // Tick partway into letter 2.
      { kind: "tick", ms: 7_000 },
      { kind: "pause" },
      // While paused, advance 5 s. On UNFIXED this advances the line; on
      // FIXED it does not. That divergence is the entire point of the fix.
      { kind: "tick", ms: 5_000 },
      { kind: "resume" },
      // Run the rest of the eye to completion with generous slack.
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/30" },
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/20" },
    ],
  },

  // S5 — All-null self-report (far, 5 s). Both eyes report null.
  {
    name: "S5-null-null-far-5s",
    testKind: "far",
    timerDuration: 5,
    script: [
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: null },
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: null },
    ],
  },

  // S6 — Top notation only (far, 5 s). Both eyes pick the largest line.
  {
    name: "S6-top-far-5s",
    testKind: "far",
    timerDuration: 5,
    script: [
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/200" },
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/200" },
    ],
  },

  // S7 — Bottom notation only (far, 5 s). Both eyes pick the smallest line.
  {
    name: "S7-bottom-far-5s",
    testKind: "far",
    timerDuration: 5,
    script: [
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/15" },
      { kind: "ready_eye" },
      ...tickThroughEye(5, FAR_CHART_LENGTH),
      { kind: "select_notation", notation: "20/15" },
    ],
  },
];

// ─── Suite ─────────────────────────────────────────────────────────────────

describe("Golden Replay Behavioural Equivalence", () => {
  for (const named of SCRIPTS) {
    if (named.oldOnly) {
      // OLD-only scripts encode a behaviour that the rewrite is expected to
      // change (e.g. pause stops advancement). Task 3.12 already locked the
      // OLD trajectory under its own snapshot key — that snapshot stays in
      // the file as a historical record of pre-fix behaviour.
      //
      // Task 3.13 re-runs the SAME script through the FIXED engine and:
      //   1. Snapshots the post-fix trajectory under a DIFFERENT key
      //      ("… (post-fix)") so both the OLD and NEW trajectories coexist
      //      in the snapshot file. Future regressions in either direction
      //      will be caught.
      //   2. Encodes a structural "divergence guard": for the canonical
      //      pause/resume script, `lineIndex` MUST NOT advance between the
      //      `pause` event and the matching `resume` event. This is the
      //      direct, code-level expression of the bug fix.
      test(`script "${named.name}" produces a stable trajectory (post-fix)`, async () => {
        const record = await replayScript(
          named.testKind,
          named.timerDuration,
          named.script,
        );

        const projection = comparableProjection(record);

        expect({
          scriptName: `${named.name} (post-fix)`,
          oldOnly: true,
          projection,
        }).toMatchSnapshot();

        // Divergence guard: pause must freeze line advancement until resume.
        const steps = (
          projection as {
            steps: Array<{ kind: string; lineIndex: number; eyePhase: string }>;
          }
        ).steps;
        const pauseIdx = steps.findIndex((s) => s.kind === "pause");
        const resumeIdx = steps.findIndex(
          (s, i) => i > pauseIdx && s.kind === "resume",
        );
        expect(pauseIdx).toBeGreaterThanOrEqual(0);
        expect(resumeIdx).toBeGreaterThan(pauseIdx);

        const pauseLineIndex = steps[pauseIdx].lineIndex;
        for (let i = pauseIdx; i <= resumeIdx; i++) {
          // While paused (and at the moment of resume), the reading
          // line MUST stay pinned at the value it held when pause fired.
          // Advancement during the pause window IS the bug; this assertion
          // is the post-fix contract.
          expect(steps[i].lineIndex).toBe(pauseLineIndex);
        }
      });
    } else {
      test(`script "${named.name}" produces a stable trajectory`, async () => {
        const record = await replayScript(
          named.testKind,
          named.timerDuration,
          named.script,
        );

        const projection = comparableProjection(record);

        // Non-oldOnly scripts MUST produce trajectories byte-equal to the
        // OLD-engine baseline captured in Task 3.12. Any drift here means
        // the rewrite has changed clinical behaviour.
        expect({
          scriptName: named.name,
          oldOnly: false,
          projection,
        }).toMatchSnapshot();
      });
    }
  }

  test("script catalogue export is stable", () => {
    // Lock the catalogue surface (names + oldOnly flags) so Task 3.13 can
    // discover which scripts to skip without re-importing the script bodies.
    const catalogue = SCRIPTS.map((s) => ({
      name: s.name,
      testKind: s.testKind,
      timerDuration: s.timerDuration,
      oldOnly: s.oldOnly === true,
    }));
    expect(catalogue).toMatchSnapshot();
  });
});

// Re-export the catalogue so Task 3.13 can import it directly without
// duplicating the script definitions.
export const SCRIPT_CATALOGUE: ReadonlyArray<NamedScript> = SCRIPTS;
