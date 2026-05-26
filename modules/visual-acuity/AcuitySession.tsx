"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { TestTypeSelector } from "./TestTypeSelector";
import { InstructionsStep } from "./steps/InstructionsStep";
import { CalibrationStep } from "./steps/CalibrationStep";
import { DurationSelector } from "./DurationSelector";
import { TestingStep } from "./steps/TestingStep";
import { NearTestingStep } from "./steps/NearTestingStep";
import { ResultsStep } from "./steps/ResultsStep";
import type {
  TestPhase,
  TestType,
  TimerDuration,
  CalibrationData,
  AcuityTestResult,
  EyeAcuityResult,
} from "./types";
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

interface AcuitySessionProps {
  assessmentId?: string;
  assessmentTypes?: import("@/types/firestore").VisionAssessmentType[];
  nextAssessmentHref?: string;   // shown in Results: "Start next assessment" button
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

  const currentIdx = PHASE_ORDER.indexOf(phase);
  // Don't allow back-to-type-select when the test type is fixed by a doctor assignment
  const typeIsFixed = !!assessmentTypes?.length;
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

  const accentColor = testType === "far" ? "#0f4f4b" : "#b5964d";

  return (
    <div className="min-h-screen bg-[#F0EDE8]">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#0f4f4b]/8">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-4">
          {canGoBack && (
            <button
              onClick={goBack}
              className="h-8 w-8 rounded-xl border border-[#0f4f4b]/15 flex items-center justify-center text-[#0f4f4b]/60 hover:text-[#0f4f4b] hover:bg-[#0f4f4b]/5 transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#0f4f4b]/50 uppercase tracking-widest truncate">
              {phase === "type_select"
                ? "Visual Acuity Assessment"
                : `${testType === "far" ? "Far" : "Near"} Vision Assessment`}
            </p>
            <p className="text-sm font-bold text-[#0f4f4b] leading-tight">
              {PHASE_LABELS[phase]}
            </p>
          </div>

          {/* Step progress pills (hidden during type_select) */}
          {phase !== "type_select" && (
            <div className="hidden sm:flex items-center gap-1">
              {PHASE_ORDER.filter((p) => p !== "type_select").map((p, i) => {
                const idx = PHASE_ORDER.indexOf(p);
                const isActive = idx === currentIdx;
                const isDone   = idx < currentIdx;
                return (
                  <div
                    key={p}
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: isActive ? 32 : isDone ? 24 : 8,
                      backgroundColor: isDone || isActive ? accentColor : `${accentColor}30`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
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
      </div>
    </div>
  );
}
