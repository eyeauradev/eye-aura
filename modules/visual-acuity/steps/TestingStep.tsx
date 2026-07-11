"use client";

import { TestingShell, type TestingShellChartLine } from "./TestingShell";
import { SNELLEN_LINES } from "../snellen-data";
import type { CalibrationData, EyeAcuityResult, TimerDuration } from "../types";

interface TestingStepProps {
  assessmentId?: string;
  calibration: CalibrationData;
  timerDuration: TimerDuration;
  onComplete: (results: { right: EyeAcuityResult; left: EyeAcuityResult }) => void;
  onLevelChange?: (info: { notation: string; lineIndex: number; totalLines: number; eye: string }) => void;
  onTimerUpdate?: (remainingSeconds: number) => void;
  pauseRequested?: boolean;
}

const FAR_CHART: TestingShellChartLine[] = SNELLEN_LINES.map((line) => ({
  notation: line.notation,
  notation6m: line.notation6m,
  letters: line.letters,
  exactHeightMm: line.exactHeightMm,
  label: line.label,
}));

export function TestingStep(props: TestingStepProps) {
  return (
    <TestingShell
      {...props}
      chart={FAR_CHART}
      accent={{ primary: "#0f4f4b", primaryHover: "#0a3a36", ringPaused: "#b5964d" }}
      distanceLabel="3 metres"
      testKind="far"
    />
  );
}
