"use client";

import { useState, useCallback, useRef } from "react";
import type { Eye, LineResult, TimerDuration } from "../types";

interface ProgressionConfig {
  totalLines: number;
  /** Stop after this many consecutive failures (default 2) */
  stopAfterFails?: number;
}

export interface UseVisionProgressionReturn {
  index: number;
  consecutiveFails: number;
  isComplete: boolean;
  /**
   * Advance to the next line.
   * Always reads the latest index/fails via refs — no stale closure risk.
   * @returns true when the eye's test sequence is complete
   */
  advance: (correct: boolean, retried?: boolean) => boolean;
  goBack: () => void;
  reset: () => void;
}

/**
 * Generic line-progression engine shared by far and near vision tests.
 *
 * Uses mutable refs for `index` and `consecutiveFails` so that `advance()`
 * always operates on the latest values even when called from inside a
 * stale async callback (e.g. a setTimeout-deferred timer completion).
 */
export function useVisionProgression({
  totalLines,
  stopAfterFails = 2,
}: ProgressionConfig): UseVisionProgressionReturn {
  const [index, setIndex] = useState(0);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Mutable refs — always hold the latest values, no stale closures
  const indexRef = useRef(0);
  const failsRef = useRef(0);

  const advance = useCallback(
    (correct: boolean, _retried = false): boolean => {
      const currentIndex = indexRef.current;
      const newFails = correct ? 0 : failsRef.current + 1;

      failsRef.current = newFails;
      setConsecutiveFails(newFails);

      const atLastLine = currentIndex >= totalLines - 1;
      const shouldStop = newFails >= stopAfterFails;

      if (atLastLine || shouldStop) {
        setIsComplete(true);
        return true;
      }

      const next = currentIndex + 1;
      indexRef.current = next;
      setIndex(next);
      return false;
    },
    [totalLines, stopAfterFails]
  );

  const goBack = useCallback(() => {
    if (indexRef.current > 0) {
      const prev = indexRef.current - 1;
      indexRef.current = prev;
      failsRef.current = 0;
      setIndex(prev);
      setConsecutiveFails(0);
      setIsComplete(false);
    }
  }, []);

  const reset = useCallback(() => {
    indexRef.current = 0;
    failsRef.current = 0;
    setIndex(0);
    setConsecutiveFails(0);
    setIsComplete(false);
  }, []);

  return { index, consecutiveFails, isComplete, advance, goBack, reset };
}

// ─── Shared result builder ────────────────────────────────────────────────────

/** Build a LineResult record — used by both far and near testing steps */
export function buildLineResult(
  notation: string,
  correct: boolean,
  skipped: boolean,
  retried: boolean,
  eye: Eye,
  timerDuration: TimerDuration,
  extra?: { letters?: string[]; content?: string }
): LineResult {
  return {
    notation,
    correct,
    skipped,
    retried,
    eye,
    timestamp: Date.now(),
    timerDuration,
    ...extra,
  };
}
