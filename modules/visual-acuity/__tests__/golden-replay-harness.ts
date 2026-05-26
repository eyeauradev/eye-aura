/**
 * Golden Replay Harness — Property 4 (Behavioural Equivalence).
 *
 * This module exposes `replayScript(testKind, timerDuration, script)` which
 * mounts the visual-acuity testing step (either `TestingStep` for "far" or
 * `NearTestingStep` for "near") under fake timers + a fake `requestAnimationFrame`
 * polyfill, drives a deterministic sequence of high-level events through it,
 * and records a clinical trajectory plus the final `onComplete` payload.
 *
 * The trajectory is intentionally trimmed to fields that MUST be byte-equal
 * across the OLD (setInterval-based) and NEW (RAF-based) engines:
 *
 *   { stepIndex, kind, eyePhase, currentEye, lineIndex }
 *
 * Auxiliary debugging info (`displayedRemaining`, presence of legacy mini-bar,
 * etc.) is captured separately under `aux` and is NOT used for cross-engine
 * equivalence — those values are exactly what the rewrite is expected to
 * change.
 *
 * The harness is tool-agnostic between the OLD setInterval-driven timer and
 * the future RAF-driven `useLetterTimer`: both `setInterval` ticks and `RAF`
 * callbacks are driven by `vi.advanceTimersByTime` because the RAF polyfill
 * below is implemented on top of `setTimeout`.
 */

import * as React from "react";
import {
  render,
  fireEvent,
  screen,
  cleanup,
  act,
  type RenderResult,
} from "@testing-library/react";
import { vi } from "vitest";

import { TestingStep } from "../steps/TestingStep";
import { NearTestingStep } from "../steps/NearTestingStep";
import type {
  CalibrationData,
  Eye as EyeType,
  EyeAcuityResult,
  TimerDuration,
} from "../types";

// ─── Public types ──────────────────────────────────────────────────────────

export type TestKind = "far" | "near";

export type EyePhase = "eye_intro" | "reading" | "self_report";

/** Single high-level interaction event. */
export type ScriptStep =
  | { kind: "tick"; ms: number }
  | { kind: "pause" }
  | { kind: "resume" }
  | { kind: "select_notation"; notation: string | null }
  | { kind: "ready_eye" };

export type Script = ScriptStep[];

/** A single step's contribution to the trajectory. */
export interface TrajectoryStep {
  stepIndex: number;
  /** Verbatim event kind from the script. */
  kind: ScriptStep["kind"];
  eyePhase: EyePhase;
  currentEye: EyeType;
  /** Only meaningful in `eyePhase === "reading"`; -1 otherwise. */
  lineIndex: number;
  /** Auxiliary, NOT used for cross-engine equivalence. */
  aux: {
    /** Integer rendered inside the per-letter ring; -1 if not visible. */
    displayedRemaining: number;
    /** Whether the new global progress bar is present. */
    hasGlobalProgressBar: boolean;
    /** Whether the legacy inline mini-bar is present (lineIndex / chart). */
    hasInlineMiniBar: boolean;
  };
}

/** Final, clinically-comparable record. Strip volatile fields before snapshotting. */
export interface TrajectoryRecord {
  testKind: TestKind;
  timerDuration: TimerDuration;
  steps: TrajectoryStep[];
  /** Set when the script triggered both eyes' self-report → onComplete fired. */
  onCompletePayload: {
    right: { eye: "right"; bestNotation: string | null };
    left: { eye: "left"; bestNotation: string | null };
  } | null;
  /** Set if the final eye stayed unresolved (script ended early). */
  endedNaturally: boolean;
}

/** A Script plus metadata describing whether it is replay-comparable across engines. */
export interface NamedScript {
  name: string;
  testKind: TestKind;
  timerDuration: TimerDuration;
  script: Script;
  /**
   * If true, this script's golden trajectory is captured ONLY against the OLD
   * (UNFIXED) engine. The post-fix replay (Task 3.13) MUST skip it because the
   * fix is expected to change the trajectory (e.g. pause-stops-advancement
   * scripts will diverge when the bug is fixed).
   */
  oldOnly?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const STUB_CALIBRATION: CalibrationData = {
  pxPerMm: 4,
  cardWidthPx: 342.4,
  deviceWidth: 1440,
  deviceHeight: 900,
  dpr: 2,
  timestamp: 1_700_000_000_000,
};

// ─── DOM readers ───────────────────────────────────────────────────────────

/** Detect the current eye-phase by looking for distinguishing DOM markers. */
function readEyePhase(): EyePhase {
  // eye_intro shows a "Ready — Start ..." button.
  const readyBtn = screen.queryByRole("button", { name: /Ready\s*—\s*Start/i });
  if (readyBtn) return "eye_intro";

  // self_report shows the "Could not read any line" button.
  const noReadBtn = screen.queryByRole("button", { name: /Could not read any line/i });
  if (noReadBtn) return "self_report";

  return "reading";
}

/** Detect which eye is currently active by inspecting the heading text. */
function readCurrentEye(phase: EyePhase): EyeType {
  // eye_intro and self_report both show "Testing {Right|Left} Eye" or
  // "{Right|Left} Eye — Report" headings.
  const headings = Array.from(document.querySelectorAll("h2"));
  for (const h of headings) {
    const txt = (h.textContent ?? "").toLowerCase();
    if (txt.includes("right")) return "right";
    if (txt.includes("left")) return "left";
  }

  if (phase === "reading") {
    // Reading phase shows a "<span>{currentEye} eye</span>" label.
    const labels = Array.from(document.querySelectorAll("span"));
    for (const span of labels) {
      const txt = (span.textContent ?? "").toLowerCase().trim();
      if (txt === "right eye") return "right";
      if (txt === "left eye") return "left";
    }
  }

  // Fallback: assume right (initial state).
  return "right";
}

/**
 * Read the current `lineIndex` from the reading-phase header, where the
 * production tree renders `<span class="text-4xl ...">{lineIndex + 1}</span>`
 * next to a "Level" label. Returns -1 outside the reading phase.
 */
function readLineIndex(phase: EyePhase): number {
  if (phase !== "reading") return -1;
  // The "Level" label is rendered as `<span class="text-xs ...">Level</span>`.
  const allSpans = Array.from(document.querySelectorAll("span"));
  for (const span of allSpans) {
    if ((span.textContent ?? "").trim() === "Level") {
      // The big number sibling has class `text-4xl` and pure-integer text.
      const sibling = span.parentElement?.querySelector(
        "span.text-4xl",
      ) as HTMLSpanElement | null;
      if (sibling) {
        const n = Number((sibling.textContent ?? "").trim());
        if (Number.isFinite(n)) return n - 1;
      }
    }
  }
  return -1;
}

/** Read the integer the per-letter ring's `<text>` element displays. */
function readDisplayedRemaining(phase: EyePhase): number {
  if (phase !== "reading") return -1;
  const texts = document.querySelectorAll("svg text");
  for (const node of Array.from(texts)) {
    const raw = (node.textContent ?? "").trim();
    if (/^\d+$/.test(raw)) return Number(raw);
  }
  return -1;
}

/** Whether the new global progress bar is present (NEW engine signal). */
function readHasGlobalProgressBar(): boolean {
  return document.querySelector('[data-testid="va-global-progress"]') !== null;
}

/**
 * Whether a legacy inline mini-bar is rendered. The OLD engine renders a
 * `<div ... style="width: X%">` immediately under the header. We detect any
 * element whose `style.width` is a percentage string (heuristic, but stable
 * for the trajectory's `aux` field which is debug-only).
 */
function readHasInlineMiniBar(): boolean {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("div[style]"));
  return candidates.some((el) => /width:\s*\d+(\.\d+)?%/.test(el.getAttribute("style") ?? ""));
}

// ─── Action helpers ────────────────────────────────────────────────────────

function clickReady() {
  const ready = screen.getByRole("button", { name: /Ready\s*—\s*Start/i });
  fireEvent.click(ready);
}

function clickPauseOrResume() {
  // The button alternates between "Pause" and "Resume" labels.
  const btn = screen.getByRole("button", { name: /(Pause|Resume)/i });
  fireEvent.click(btn);
}

function clickSelectNotation(notation: string | null) {
  if (notation === null) {
    const btn = screen.getByRole("button", { name: /Could not read any line/i });
    fireEvent.click(btn);
    return;
  }

  // Self-report rows are rendered as <button> with the notation text inside a
  // `<span class="text-base font-black ...">`. Match by text content.
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  );
  const target = buttons.find((b) => {
    const spans = b.querySelectorAll("span");
    for (const s of Array.from(spans)) {
      if ((s.textContent ?? "").trim() === notation) return true;
    }
    return false;
  });
  if (!target) {
    throw new Error(
      `replayScript: no self-report button found for notation "${notation}"`,
    );
  }
  fireEvent.click(target);
}

// ─── Recording ─────────────────────────────────────────────────────────────

function snapshotState(stepIndex: number, kind: ScriptStep["kind"]): TrajectoryStep {
  const phase = readEyePhase();
  const currentEye = readCurrentEye(phase);
  return {
    stepIndex,
    kind,
    eyePhase: phase,
    currentEye,
    lineIndex: readLineIndex(phase),
    aux: {
      displayedRemaining: readDisplayedRemaining(phase),
      hasGlobalProgressBar: readHasGlobalProgressBar(),
      hasInlineMiniBar: readHasInlineMiniBar(),
    },
  };
}

// ─── RAF polyfill on top of fake timers ────────────────────────────────────

interface RafState {
  raf: ReturnType<typeof vi.fn>;
  caf: ReturnType<typeof vi.fn>;
}

function installFakeRaf(): RafState {
  const raf = vi.fn((cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
  const caf = vi.fn((handle: number) => {
    clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  });
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", caf);
  return { raf, caf };
}

// ─── Mount ─────────────────────────────────────────────────────────────────

interface MountResult {
  utils: RenderResult;
  onCompletePayload: { current: TrajectoryRecord["onCompletePayload"] };
}

function mount(testKind: TestKind, timerDuration: TimerDuration): MountResult {
  const onCompletePayload: MountResult["onCompletePayload"] = { current: null };

  const onComplete = (results: { right: EyeAcuityResult; left: EyeAcuityResult }) => {
    onCompletePayload.current = {
      right: { eye: "right", bestNotation: results.right.bestNotation },
      left: { eye: "left", bestNotation: results.left.bestNotation },
    };
  };

  const utils =
    testKind === "far"
      ? render(
          React.createElement(TestingStep, {
            calibration: STUB_CALIBRATION,
            timerDuration,
            onComplete,
          }),
        )
      : render(
          React.createElement(NearTestingStep, {
            calibration: STUB_CALIBRATION,
            timerDuration,
            onComplete,
          }),
        );

  return { utils, onCompletePayload };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Replay a script through the visual-acuity testing step and return a
 * trajectory record.
 *
 * IMPORTANT: The caller MUST NOT have `vi.useFakeTimers()` active when this
 * function returns; the harness sets up and tears down fake timers internally.
 */
export async function replayScript(
  testKind: TestKind,
  timerDuration: TimerDuration,
  script: Script,
): Promise<TrajectoryRecord> {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  installFakeRaf();

  const { utils, onCompletePayload } = mount(testKind, timerDuration);

  const steps: TrajectoryStep[] = [];

  try {
    // Initial snapshot before any script step runs (stepIndex = -1 marker).
    // We use a synthetic kind ("ready_eye"-like marker) but keep stepIndex = -1
    // to indicate it's the pre-script baseline.
    steps.push({
      ...snapshotState(-1, "ready_eye"),
      kind: "ready_eye",
      stepIndex: -1,
    });

    for (let i = 0; i < script.length; i++) {
      const step = script[i];

      switch (step.kind) {
        case "tick":
          act(() => {
            vi.advanceTimersByTime(step.ms);
          });
          break;

        case "pause":
        case "resume":
          // Both map to the same toggle button; the script author is expected
          // to pair them correctly.
          act(() => {
            clickPauseOrResume();
          });
          break;

        case "select_notation":
          act(() => {
            clickSelectNotation(step.notation);
          });
          break;

        case "ready_eye":
          act(() => {
            clickReady();
          });
          break;
      }

      steps.push(snapshotState(i, step.kind));

      // If onComplete fired, the script has run to completion; subsequent
      // events would target an unmounted tree.
      if (onCompletePayload.current !== null) {
        break;
      }
    }
  } finally {
    utils.unmount();
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }

  return {
    testKind,
    timerDuration,
    steps,
    onCompletePayload: onCompletePayload.current,
    endedNaturally: onCompletePayload.current !== null,
  };
}

/**
 * Project a `TrajectoryRecord` down to the byte-equal-comparable subset.
 * Strips `aux` (volatile across engines) and keeps only clinical fields.
 */
export function comparableProjection(record: TrajectoryRecord): unknown {
  return {
    testKind: record.testKind,
    timerDuration: record.timerDuration,
    steps: record.steps.map((s) => ({
      stepIndex: s.stepIndex,
      kind: s.kind,
      eyePhase: s.eyePhase,
      currentEye: s.currentEye,
      lineIndex: s.lineIndex,
    })),
    onCompletePayload: record.onCompletePayload,
    endedNaturally: record.endedNaturally,
  };
}
