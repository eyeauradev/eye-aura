"use client";

import { useState, useRef, useEffect } from "react";
import { TestTypeSelector } from "./TestTypeSelector";
import { InstructionsStep } from "./steps/InstructionsStep";
import { CalibrationStep } from "./steps/CalibrationStep";
import { DurationSelector } from "./DurationSelector";
import { TestingStep } from "./steps/TestingStep";
import { NearTestingStep } from "./steps/NearTestingStep";
import { ResultsStep } from "./steps/ResultsStep";
import { AssessmentWrapper } from "@/components/premium/assessment-wrapper";
import type {
  TestPhase,
  TestType,
  TimerDuration,
  CalibrationData,
  AcuityTestResult,
  EyeAcuityResult,
} from "./types";
import type { AssessmentStage } from "@/components/premium/assessment-wrapper";
import { v4 as uuidv4 } from "uuid";
import { visionAssessmentsService } from "@/services/firestore";

const PHASE_LABELS: Record<TestPhase, string> = {
  type_select:     "Select Test",
  instructions:    "Preparation",
  calibration:     "Calibration",
  duration_select: "Duration",
  testing:         "Testing",
  results:         "Results",
};

const PHASE_ORDER: TestPhase[] = [
  "type_select",
  "instructions",
  "calibration",
  "duration_select",
  "testing",
  "results",
];

/** Map phases to AssessmentStage objects for the progress indicator */
function buildStages(typeIsFixed: boolean): AssessmentStage[] {
  const phases = typeIsFixed
    ? PHASE_ORDER.filter((p) => p !== "type_select")
    : PHASE_ORDER;
  return phases.map((p) => ({ id: p, label: PHASE_LABELS[p] }));
}

interface AcuitySessionProps {
  assessmentId?: string;
  assessmentTypes?: import("@/types/firestore").VisionAssessmentType[];
  nextAssessmentHref?: string;
  nextAssessmentLabel?: string;
}

export function AcuitySession({ assessmentId: _assessmentId, assessmentTypes, nextAssessmentHref, nextAssessmentLabel }: AcuitySessionProps = {}) {
  // If assessment types are pre-determined by assignment, skip type_select
  const initialPhase: TestPhase = assessmentTypes?.length ? "instructions" : "type_select";
  const initialType: TestType   = assessmentTypes?.includes("far") ? "far" : "near";

  const [phase, setPhase]             = useState<TestPhase>(initialPhase);
  const [testType, setTestType]       = useState<TestType>(initialType);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(5);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [result, setResult]           = useState<AcuityTestResult | null>(null);

  const sessionId  = useRef(uuidv4());
  const startedAt  = useRef<number>(0);

  useEffect(() => {
    if (phase === "testing") startedAt.current = Date.now();
  }, [phase]);

  const typeIsFixed = !!assessmentTypes?.length;
  const stages = buildStages(typeIsFixed);
  const currentIdx = PHASE_ORDER.indexOf(phase);

  // Compute the stage index relative to the displayed stages
  const displayedPhases = typeIsFixed
    ? PHASE_ORDER.filter((p) => p !== "type_select")
    : PHASE_ORDER;
  const currentStageIdx = displayedPhases.indexOf(phase);

  const canGoBack =
    currentIdx > 0 &&
    phase !== "testing" &&
    phase !== "results" &&
    !(typeIsFixed && PHASE_ORDER[currentIdx - 1] === "type_select");

  const goBack = () => {
    if (canGoBack) setPhase(PHASE_ORDER[currentIdx - 1]);
  };

  const handleTypeSelect = (type: TestType) => {
    setTestType(type);
    setPhase("instructions");
  };

  const handleCalibrated = (data: CalibrationData) => {
    setCalibration(data);
    setPhase("duration_select");
  };

  const handleDurationContinue = () => setPhase("testing");

  const handleTestComplete = async (eyeResults: { right: EyeAcuityResult; left: EyeAcuityResult }) => {
    if (!calibration) return;
    const completedAt = Date.now();
    const testResult: AcuityTestResult = {
      sessionId:       sessionId.current,
      testType,
      rightEye:        eyeResults.right,
      leftEye:         eyeResults.left,
      timerDuration,
      testingDistance: testType === "far" ? 3 : 0.35,
      calibration,
      startedAt:       startedAt.current,
      completedAt,
      durationSeconds: (completedAt - startedAt.current) / 1000,
    };
    setResult(testResult);
    setPhase("results");

    // Persist result to Firestore if this session is linked to an assessment
    if (_assessmentId) {
      try {
        const resultPayload = {
          rightEye: eyeResults.right.bestNotation ?? "—",
          leftEye:  eyeResults.left.bestNotation  ?? "—",
          completedAt: new Date(completedAt),
        };
        await visionAssessmentsService.update(
          _assessmentId,
          testType === "far"
            ? { resultFar: resultPayload,  status: "completed" }
            : { resultNear: resultPayload, status: "completed" }
        );
      } catch (err) {
        console.error("[AcuitySession] failed to save result to Firestore:", err);
      }
    }
  };

  const handleRetake = () => {
    sessionId.current = uuidv4();
    setResult(null);
    setPhase("type_select");
  };

  // Build title and subtitle based on current phase
  const title =
    phase === "type_select"
      ? "Visual Acuity Assessment"
      : `${testType === "far" ? "Far" : "Near"} Vision Assessment`;

  const subtitle = PHASE_LABELS[phase];

  return (
    <AssessmentWrapper
      title={title}
      subtitle={subtitle}
      stages={stages}
      currentStage={currentStageIdx}
      canGoBack={canGoBack}
      onBack={goBack}
      stageKey={phase}
    >
      {phase === "type_select" && (
        <TestTypeSelector onSelect={handleTypeSelect} />
      )}

      {phase === "instructions" && (
        <InstructionsStep
          testType={testType}
          onContinue={() => setPhase("calibration")}
        />
      )}

      {phase === "calibration" && (
        <CalibrationStep
          onCalibrated={handleCalibrated}
          existingCalibration={calibration}
        />
      )}

      {phase === "duration_select" && (
        <DurationSelector
          testType={testType}
          selected={timerDuration}
          onSelect={setTimerDuration}
          onContinue={handleDurationContinue}
        />
      )}

      {phase === "testing" && calibration && testType === "far" && (
        <TestingStep
          calibration={calibration}
          timerDuration={timerDuration}
          onComplete={handleTestComplete}
        />
      )}

      {phase === "testing" && calibration && testType === "near" && (
        <NearTestingStep
          calibration={calibration}
          timerDuration={timerDuration}
          onComplete={handleTestComplete}
        />
      )}

      {phase === "results" && result && (
        <ResultsStep
          result={result}
          onRetake={handleRetake}
          nextAssessmentHref={nextAssessmentHref}
          nextAssessmentLabel={nextAssessmentLabel}
        />
      )}
    </AssessmentWrapper>
  );
}
