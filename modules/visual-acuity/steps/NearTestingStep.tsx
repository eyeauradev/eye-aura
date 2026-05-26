"use client";

import { TestingShell, type TestingShellChartLine } from "./TestingShell";
import { NEAR_VISION_LINES } from "../near/near-vision-data";
import type { CalibrationData, EyeAcuityResult, TimerDuration } from "../types";

interface NearTestingStepProps {
  calibration: CalibrationData;
  timerDuration: TimerDuration;
  onComplete: (results: { right: EyeAcuityResult; left: EyeAcuityResult }) => void;
}

const NEAR_CHART: TestingShellChartLine[] = NEAR_VISION_LINES.map((line) => ({
  notation: line.snellen,
  notation6m: line.snellen6m,
  letters: line.letters,
  exactHeightMm: line.exactHeightMm,
  label: line.label,
}));

export function NearTestingStep(props: NearTestingStepProps) {
  return (
    <TestingShell
      {...props}
      chart={NEAR_CHART}
      accent={{ primary: "#b5964d", primaryHover: "#9f833f", ringPaused: "#b5964d" }}
      distanceLabel="35 cm"
      testKind="near"
    />
  );
}
