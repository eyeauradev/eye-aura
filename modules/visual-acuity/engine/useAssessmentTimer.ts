"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type TimerState = "idle" | "running" | "paused" | "done";

export interface UseAssessmentTimerReturn {
  remaining: number;
  /** 0 = full, 1 = elapsed — use for SVG arc drain */
  elapsed: number;
  state: TimerState;
  isRunning: boolean;
  isPaused: boolean;
  isDone: boolean;
  /** Start (or restart) the timer, optionally overriding duration */
  start: (overrideDuration?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

/**
 * Shared countdown timer for all assessment types.
 *
 * @param defaultDuration  Initial seconds
 * @param onComplete       Called once when timer reaches zero
 */
export function useAssessmentTimer(
  defaultDuration: number,
  onComplete?: () => void
): UseAssessmentTimerReturn {
  const [duration, setDuration] = useState(defaultDuration);
  const [remaining, setRemaining] = useState(defaultDuration);
  const [state, setState] = useState<TimerState>("idle");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFiredRef = useRef(false); // Prevent multiple onComplete calls
  // Synchronous update — always holds the latest callback, no effect lag
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Drive the countdown tick
  useEffect(() => {
    if (state !== "running") {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTimer();
          setState("done");
          // Prevent multiple onComplete calls
          if (!hasFiredRef.current) {
            hasFiredRef.current = true;
            // Defer to avoid setState-during-render
            setTimeout(() => onCompleteRef.current?.(), 0);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return clearTimer;
  }, [state, clearTimer]);

  const start = useCallback(
    (overrideDuration?: number) => {
      clearTimer(); // Clear any existing interval before starting
      hasFiredRef.current = false; // Reset fire flag
      const d = overrideDuration ?? defaultDuration;
      setDuration(d);
      setRemaining(d);
      setState("running");
    },
    [defaultDuration, clearTimer]
  );

  const pause = useCallback(() => {
    if (state === "running") setState("paused");
  }, [state]);

  const resume = useCallback(() => {
    if (state === "paused") setState("running");
  }, [state]);

  const reset = useCallback(() => {
    clearTimer();
    setRemaining(duration);
    setState("idle");
  }, [duration, clearTimer]);

  return {
    remaining,
    elapsed: duration > 0 ? 1 - remaining / duration : 0,
    state,
    isRunning: state === "running",
    isPaused: state === "paused",
    isDone: state === "done",
    start,
    pause,
    resume,
    reset,
  };
}
