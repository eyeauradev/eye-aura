"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LetterTimerStatus = "idle" | "running" | "paused" | "done";

export interface UseLetterTimerOptions {
  /** Total letters to run before firing onAllComplete. */
  totalLetters: number;
  /** Per-letter duration in milliseconds. */
  durationMs: number;
  /**
   * Fired when a single letter's timer reaches zero. Receives the letter
   * index that just completed (0-based). The hook then auto-advances to
   * letterIndex + 1.
   */
  onLetterComplete?: (completedIndex: number) => void;
  /**
   * Fired exactly once when the last letter completes. The hook then
   * settles in `done`.
   */
  onAllComplete?: () => void;
}

export interface UseLetterTimerReturn {
  status: LetterTimerStatus;
  /** 0-based index of the currently-active letter. */
  letterIndex: number;
  /** Configured duration of the current letter, in ms. */
  durationMs: number;
  /** Time remaining on the current letter, in ms. Always 0 ≤ remainingMs ≤ durationMs. */
  remainingMs: number;
  /** Math.ceil(remainingMs / 1000), clamped to >= 0. */
  remainingSeconds: number;
  /** 1 - remainingMs / durationMs, clamped to [0, 1]. */
  elapsedFraction: number;
  /**
   * Whether the timer is currently paused by the user.
   * Exposed so consumers don't need to mirror this state themselves.
   */
  userPaused: boolean;

  /** Begin a fresh assessment. Idempotent: cancels any prior RAF first. */
  start: (durationMs?: number) => void;
  /** User-visible pause (sticky). Idempotent. */
  pause: () => void;
  /** User-visible resume. Idempotent. Re-anchors the tick clock. */
  resume: () => void;
  /** Toggle pause/resume. Convenience wrapper. */
  togglePause: () => void;
  /** Manually force the next letter (e.g. on user action). */
  nextLetter: (durationMs?: number) => void;
  /** Reset to idle, letterIndex 0, remainingMs = durationMs. Cancels any pending RAF. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Internal state machine
// ---------------------------------------------------------------------------

interface State {
  status: LetterTimerStatus;
  letterIndex: number;
  durationMs: number;
  remainingMs: number;
  /** Sticky user pause. Distinct from visibility pause. */
  userPaused: boolean;
  /** True while document.hidden === true. */
  visibilityPaused: boolean;
}

type Action =
  | { type: "START"; durationMs: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "VISIBILITY_HIDE" }
  | { type: "VISIBILITY_SHOW" }
  | { type: "TICK"; deltaMs: number; totalLetters: number }
  | { type: "NEXT_LETTER"; durationMs?: number; totalLetters: number }
  | { type: "RESET"; durationMs: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START": {
      return {
        status: "running",
        letterIndex: 0,
        durationMs: action.durationMs,
        remainingMs: action.durationMs,
        userPaused: false,
        // Preserve visibility state — don't unhide a hidden tab on start.
        visibilityPaused: state.visibilityPaused,
      };
    }

    case "PAUSE": {
      // Idempotent.
      if (state.userPaused) return state;
      return { ...state, userPaused: true };
    }

    case "RESUME": {
      // Idempotent. RAF loop re-anchors lastTickAt on next frame.
      if (!state.userPaused) return state;
      return { ...state, userPaused: false };
    }

    case "VISIBILITY_HIDE": {
      if (state.visibilityPaused) return state;
      return { ...state, visibilityPaused: true };
    }

    case "VISIBILITY_SHOW": {
      if (!state.visibilityPaused) return state;
      return { ...state, visibilityPaused: false };
    }

    case "TICK": {
      if (state.status !== "running") return state;
      const newRemaining = Math.max(0, state.remainingMs - action.deltaMs);
      if (newRemaining > 0) {
        return { ...state, remainingMs: newRemaining };
      }
      // Letter just completed — advance or finish.
      if (state.letterIndex < action.totalLetters - 1) {
        return {
          ...state,
          letterIndex: state.letterIndex + 1,
          remainingMs: state.durationMs,
        };
      }
      // Final letter — settle in done.
      return { ...state, status: "done", remainingMs: 0 };
    }

    case "NEXT_LETTER": {
      const total = action.totalLetters;
      if (total <= 0) return state;
      const nextIndex = Math.min(Math.max(0, state.letterIndex + 1), total - 1);
      const nextDuration = action.durationMs ?? state.durationMs;
      return {
        ...state,
        letterIndex: nextIndex,
        durationMs: nextDuration,
        remainingMs: nextDuration,
      };
    }

    case "RESET": {
      return {
        status: "idle",
        letterIndex: 0,
        durationMs: action.durationMs,
        remainingMs: action.durationMs,
        userPaused: false,
        visibilityPaused: state.visibilityPaused,
      };
    }

    default:
      return state;
  }
}

function initialState(durationMs: number): State {
  return {
    status: "idle",
    letterIndex: 0,
    durationMs,
    remainingMs: durationMs,
    userPaused: false,
    visibilityPaused: false,
  };
}

// ---------------------------------------------------------------------------
// Time source
// ---------------------------------------------------------------------------

/**
 * Returns the current time in milliseconds.
 *
 * Uses `performance.now()` in production for sub-millisecond accuracy and
 * immunity to system-clock adjustments. Falls back to `Date.now()` in
 * environments where `performance` is unavailable (SSR, some test runners).
 *
 * Note: `vi.useFakeTimers()` in Vitest 2 does NOT mock `performance.now()`,
 * so tests that need fake-time control should either:
 *   (a) use the `Date.now()` fallback path by stubbing `performance`, or
 *   (b) drive the harness via `vi.advanceTimersByTime` which advances the
 *       RAF polyfill's `setTimeout` callbacks — the delta between consecutive
 *       frames is what matters, not the absolute timestamp.
 */
function now(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLetterTimer(opts: UseLetterTimerOptions): UseLetterTimerReturn {
  const { totalLetters, durationMs, onLetterComplete, onAllComplete } = opts;

  const [state, dispatch] = useReducer(reducer, durationMs, initialState);

  // Always-fresh callback refs — never stale, never cause effect re-runs.
  const onLetterCompleteRef = useRef(onLetterComplete);
  const onAllCompleteRef = useRef(onAllComplete);
  onLetterCompleteRef.current = onLetterComplete;
  onAllCompleteRef.current = onAllComplete;

  // RAF handle — null when no loop is scheduled.
  const rafHandleRef = useRef<number | null>(null);

  // Fire-once guard for onAllComplete. Reset on start() and reset().
  const hasFiredAllCompleteRef = useRef(false);

  // Live state mirror for the RAF closure. Updated every render AND
  // predictively inside the loop so rapid frames see consistent values
  // before React commits.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Always-fresh totalLetters for the RAF closure.
  const totalLettersRef = useRef(totalLetters);
  totalLettersRef.current = totalLetters;

  // Tick anchor — lives outside React state (pure timing detail).
  // null = re-anchor on the next frame (used after start/resume/visibility-show).
  const lastTickAtRef = useRef<number | null>(null);

  // ── Cancel helper ─────────────────────────────────────────────────────────

  const cancelRaf = useCallback(() => {
    if (rafHandleRef.current !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(rafHandleRef.current);
      }
      rafHandleRef.current = null;
    }
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  //
  // Design goals:
  //   1. Single source of truth — no parallel setIntervals.
  //   2. Deterministic under rapid React batching: predict the reducer's next
  //      state and mirror it onto stateRef immediately so subsequent frames
  //      in the same task see consistent values.
  //   3. Self-stop on terminal transitions (done) so the loop never runs
  //      after the assessment ends.
  //   4. Frozen when userPaused OR visibilityPaused — re-anchors lastTickAt
  //      so resume credits only post-resume time.
  //   5. Uses performance.now() for sub-ms accuracy in production.

  const rafLoop = useCallback((_rafTimestamp: number) => {
    const s = stateRef.current;

    // Stop if not running (idle, paused-by-status, done).
    if (s.status !== "running") {
      rafHandleRef.current = null;
      return;
    }

    const t = now();

    if (s.userPaused || s.visibilityPaused) {
      // Frozen — re-anchor so resume doesn't credit hidden time.
      lastTickAtRef.current = t;
      rafHandleRef.current = requestAnimationFrame(rafLoop);
      return;
    }

    const anchor = lastTickAtRef.current ?? t;
    const delta = t - anchor;
    lastTickAtRef.current = t;

    // Predict the reducer's next state so subsequent rapid frames in the
    // same task see consistent values even before React commits.
    const total = totalLettersRef.current;
    const newRemaining = Math.max(0, s.remainingMs - delta);
    let nextStatus: LetterTimerStatus = s.status;
    let nextIndex = s.letterIndex;
    let nextRemaining = newRemaining;

    if (newRemaining <= 0) {
      if (s.letterIndex < total - 1) {
        nextIndex = s.letterIndex + 1;
        nextRemaining = s.durationMs;
      } else {
        nextStatus = "done";
        nextRemaining = 0;
      }
    }

    // Mirror predicted state immediately.
    stateRef.current = {
      ...s,
      letterIndex: nextIndex,
      remainingMs: nextRemaining,
      status: nextStatus,
    };

    dispatch({ type: "TICK", deltaMs: delta, totalLetters: total });

    // Self-stop on terminal transition.
    if (nextStatus !== "running") {
      rafHandleRef.current = null;
      return;
    }

    rafHandleRef.current = requestAnimationFrame(rafLoop);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // (1) Start/stop the RAF loop based on status.
  useEffect(() => {
    if (state.status === "running") {
      if (
        rafHandleRef.current === null &&
        typeof requestAnimationFrame !== "undefined"
      ) {
        rafHandleRef.current = requestAnimationFrame(rafLoop);
      }
    } else {
      cancelRaf();
    }
  }, [state.status, rafLoop, cancelRaf]);

  // (2) Page Visibility API — single subscription on mount.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = () => {
      if (document.hidden) {
        dispatch({ type: "VISIBILITY_HIDE" });
      } else {
        lastTickAtRef.current = null; // re-anchor on return
        dispatch({ type: "VISIBILITY_SHOW" });
      }
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // (3a) Letter rollover callback.
  const prevLetterIndexRef = useRef(state.letterIndex);
  useEffect(() => {
    const prev = prevLetterIndexRef.current;
    prevLetterIndexRef.current = state.letterIndex;

    // Only fire when running or just-done (final letter rollover).
    if (state.status !== "running" && state.status !== "done") return;
    if (state.letterIndex > prev) {
      onLetterCompleteRef.current?.(state.letterIndex - 1);
    }
  }, [state.letterIndex, state.status]);

  // (3b) onAllComplete — fires exactly once per start().
  useEffect(() => {
    if (state.status === "done" && !hasFiredAllCompleteRef.current) {
      hasFiredAllCompleteRef.current = true;
      onAllCompleteRef.current?.();
    }
  }, [state.status]);

  // (4) Unmount cleanup.
  useEffect(() => {
    return () => {
      cancelRaf();
    };
  }, [cancelRaf]);

  // ── Public actions ────────────────────────────────────────────────────────

  const start = useCallback(
    (overrideDurationMs?: number) => {
      if (totalLettersRef.current <= 0) return;
      cancelRaf();
      hasFiredAllCompleteRef.current = false;
      lastTickAtRef.current = null;
      dispatch({
        type: "START",
        durationMs: overrideDurationMs ?? durationMs,
      });
    },
    [cancelRaf, durationMs],
  );

  const pause = useCallback(() => {
    if (stateRef.current.userPaused) return;
    dispatch({ type: "PAUSE" });
  }, []);

  const resume = useCallback(() => {
    if (!stateRef.current.userPaused) return;
    lastTickAtRef.current = null; // re-anchor
    dispatch({ type: "RESUME" });
  }, []);

  const togglePause = useCallback(() => {
    if (stateRef.current.userPaused) {
      lastTickAtRef.current = null;
      dispatch({ type: "RESUME" });
    } else {
      dispatch({ type: "PAUSE" });
    }
  }, []);

  const nextLetter = useCallback((overrideDurationMs?: number) => {
    dispatch({
      type: "NEXT_LETTER",
      durationMs: overrideDurationMs,
      totalLetters: totalLettersRef.current,
    });
  }, []);

  const reset = useCallback(() => {
    cancelRaf();
    hasFiredAllCompleteRef.current = false;
    lastTickAtRef.current = null;
    dispatch({ type: "RESET", durationMs });
  }, [cancelRaf, durationMs]);

  // ── Derived fields ────────────────────────────────────────────────────────

  const remainingSeconds = Math.max(0, Math.ceil(state.remainingMs / 1000));
  const elapsedFraction =
    state.durationMs > 0
      ? Math.min(1, Math.max(0, 1 - state.remainingMs / state.durationMs))
      : 0;

  return useMemo<UseLetterTimerReturn>(
    () => ({
      status: state.status,
      letterIndex: state.letterIndex,
      durationMs: state.durationMs,
      remainingMs: state.remainingMs,
      remainingSeconds,
      elapsedFraction,
      userPaused: state.userPaused,
      start,
      pause,
      resume,
      togglePause,
      nextLetter,
      reset,
    }),
    [
      state.status,
      state.letterIndex,
      state.durationMs,
      state.remainingMs,
      state.userPaused,
      remainingSeconds,
      elapsedFraction,
      start,
      pause,
      resume,
      togglePause,
      nextLetter,
      reset,
    ],
  );
}
