"use client";

import { useEffect, useCallback } from "react";
import type { CalibrationData, TestType, TestPhase, TimerDuration, Eye } from "../types";

/**
 * Unified assessment state interface.
 * All assessment state is stored in a single sessionStorage object.
 */
export interface AssessmentState {
  // Session identification
  sessionId: string;
  assessmentId?: string;
  
  // Assessment configuration
  phase: TestPhase;
  testType: TestType;
  timerDuration: TimerDuration;
  calibration: CalibrationData | null;
  
  // Testing state
  currentEye: Eye;
  currentLetterIndex: number;
  eyePhase: "eye_intro" | "countdown" | "reading" | "self_report";
  
  // Results
  rightEyeBest: string | null;
  leftEyeBest: string | null;
  
  // Metadata
  startedAt: number;
  lastUpdated: number;
}

const STORAGE_KEY = "ea_assessment_state";

/**
 * Hook for managing unified assessment state in sessionStorage.
 * Provides save, restore, and clear operations.
 * 
 * This serves as a recovery mechanism for:
 * - Accidental page refresh
 * - Browser crash
 * - Safari tab reload
 * - Unexpected browser process kill
 */
export function useAssessmentStorage() {
  /**
   * Save complete assessment state to sessionStorage.
   * This is the single source for recovery.
   */
  const saveState = useCallback((state: Partial<AssessmentState>) => {
    if (typeof window === "undefined") return;
    
    try {
      // Get existing state or create new
      const existing = restoreState();
      const merged: AssessmentState = {
        ...existing,
        ...state,
        lastUpdated: Date.now(),
      } as AssessmentState;
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (err) {
      // Storage full or disabled - fail silently
      console.warn("[AssessmentStorage] Failed to save state:", err);
    }
  }, []);

  /**
   * Restore complete assessment state from sessionStorage.
   * Returns null if no state exists or if parsing fails.
   */
  const restoreState = useCallback((): AssessmentState | null => {
    if (typeof window === "undefined") return null;
    
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      
      const parsed = JSON.parse(raw) as AssessmentState;
      return parsed;
    } catch (err) {
      console.warn("[AssessmentStorage] Failed to restore state:", err);
      return null;
    }
  }, []);

  /**
   * Clear assessment state from sessionStorage.
   * Called when assessment completes or is cancelled.
   */
  const clearState = useCallback(() => {
    if (typeof window === "undefined") return;
    
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }, []);

  /**
   * Check if there is a recoverable assessment state.
   */
  const hasRecoverableState = useCallback((): boolean => {
    const state = restoreState();
    return state !== null && state.phase !== "results";
  }, [restoreState]);

  return {
    saveState,
    restoreState,
    clearState,
    hasRecoverableState,
  };
}
