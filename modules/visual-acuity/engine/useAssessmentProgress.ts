"use client";

import { useMemo } from "react";

/**
 * Input shape for the {@link useAssessmentProgress} hook.
 *
 * Describes the cross-eye position of the assessment so the hook can derive a
 * monotonic global progress value across both eyes.
 */
export interface UseAssessmentProgressInput {
  /** Eye currently being tested. */
  currentEye: "right" | "left";
  /** 0-based index of the active line within the current eye. */
  letterIndex: number;
  /** Number of lines per eye for the current chart. */
  totalLinesPerEye: number;
  /** Optional override if right and left charts diverge in length. */
  rightLines?: number;
  /** Optional override if right and left charts diverge in length. */
  leftLines?: number;
}

/**
 * Pure derivation of cross-eye assessment progress.
 */
export interface AssessmentProgress {
  /** Total letters completed across both eyes since the assessment started. */
  completedLetters: number;
  /** Total letters across both eyes (rightLines + leftLines). */
  totalLetters: number;
  /** completedLetters / totalLetters, clamped to [0, 1]. NaN-safe. */
  globalPercent: number;
  /** 1-based level number for header display (e.g. "Level 6/9"). */
  currentLevel: number;
  /** Total levels for the current eye, equal to totalLinesPerEye. */
  totalLevels: number;
}

/**
 * Pure derivation hook that converts the current per-eye letter index into a
 * single global progress value spanning both eyes.
 *
 * - No `useState`, no `useEffect` — `useMemo` only, for referential stability.
 * - NaN-safe: `globalPercent = 0` when `totalLetters = 0`.
 * - Clamps `completedLetters` to `[0, totalLetters]`.
 */
export function useAssessmentProgress({
  currentEye,
  letterIndex,
  totalLinesPerEye,
  rightLines,
  leftLines,
}: UseAssessmentProgressInput): AssessmentProgress {
  return useMemo(() => {
    const right = rightLines ?? totalLinesPerEye;
    const left = leftLines ?? totalLinesPerEye;
    const totalLetters = Math.max(0, right) + Math.max(0, left);

    const rawCompleted =
      currentEye === "right" ? letterIndex : Math.max(0, right) + letterIndex;
    const completedLetters = Math.max(0, Math.min(totalLetters, rawCompleted));

    const globalPercent =
      totalLetters > 0
        ? Math.max(0, Math.min(1, completedLetters / totalLetters))
        : 0;

    return {
      completedLetters,
      totalLetters,
      globalPercent,
      currentLevel: letterIndex + 1,
      totalLevels: totalLinesPerEye,
    };
  }, [currentEye, letterIndex, totalLinesPerEye, rightLines, leftLines]);
}
