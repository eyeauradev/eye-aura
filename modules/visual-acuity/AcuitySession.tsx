"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TestTypeSelector } from "./TestTypeSelector";
import { InstructionsStep } from "./steps/InstructionsStep";
import { CalibrationStep } from "./steps/CalibrationStep";
import { DurationSelector } from "./DurationSelector";
import { EyeSelectionStep } from "./steps/EyeSelectionStep";
import { TestingStep } from "./steps/TestingStep";
import { NearTestingStep } from "./steps/NearTestingStep";
import { ResultsStep } from "./steps/ResultsStep";
import { AssessmentImmersiveShell, AssessmentOrientationGate } from "./immersive";
import { useAssessmentStorage } from "./hooks/useAssessmentStorage";
import { useNavigationProtection } from "./hooks/useNavigationProtection";
import { useScreenWakeLock } from "./hooks/useScreenWakeLock";
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
  eye_selection:   "Eye Selection",
  testing:         "Testing",
  results:         "Results",
};

const PHASE_ORDER: TestPhase[] = [
  "type_select",
  "instructions",
  "calibration",
  "duration_select",
  "eye_selection",
  "testing",
  "results",
];

interface AcuitySessionProps {
  assessmentId?: string;
  assessmentTypes?: import("@/types/firestore").VisionAssessmentType[];
  nextAssessmentHref?: string;
  nextAssessmentLabel?: string;
}

export function AcuitySession({ assessmentId: _assessmentId, assessmentTypes, nextAssessmentHref, nextAssessmentLabel }: AcuitySessionProps = {}) {
  // Initialize storage hooks
  const { saveState, restoreState, clearState } = useAssessmentStorage();
  const router = useRouter();

  // Attempt to restore state from unified storage
  const restored = restoreState();

  // If assessment types are pre-determined by assignment, skip type_select
  const initialPhase: TestPhase = restored?.phase ?? (assessmentTypes?.length ? "instructions" : "type_select");
  const initialType: TestType   = restored?.testType ?? (assessmentTypes?.includes("far") ? "far" : "near");

  const [phase, setPhase]             = useState<TestPhase>(initialPhase);
  const [testType, setTestType]       = useState<TestType>(initialType);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(restored?.timerDuration ?? 5);
  const [calibration, setCalibration] = useState<CalibrationData | null>(restored?.calibration ?? null);
  const [result, setResult]           = useState<AcuityTestResult | null>(null);
  const [isPaused, setIsPaused]       = useState(false);
  const [levelDisplay, setLevelDisplay] = useState<string>("");
  const [timerCountdown, setTimerCountdown] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const sessionId  = useRef(restored?.sessionId ?? uuidv4());
  const startedAt  = useRef<number>(restored?.startedAt ?? 0);

  // Navigation protection - enabled during active assessment (not during results)
  const isAssessmentActive = phase !== "type_select" && phase !== "results";
  useNavigationProtection(isAssessmentActive);

  // Screen wake lock - enabled during testing phase only
  const { isSupported: wakeLockSupported, isActive: wakeLockActive } = useScreenWakeLock(
    phase === "testing"
  );

  // Persist state changes to unified storage
  useEffect(() => {
    // Don't persist if we're at results or initial phase
    if (phase === "results" || phase === "type_select") return;

    saveState({
      sessionId: sessionId.current,
      assessmentId: _assessmentId,
      phase,
      testType,
      timerDuration,
      calibration,
      currentEye: "right", // Will be updated by TestingShell
      currentLetterIndex: 0, // Will be updated by TestingShell
      eyePhase: "eye_intro", // Will be updated by TestingShell
      rightEyeBest: null, // Will be updated by TestingShell
      leftEyeBest: null, // Will be updated by TestingShell
      startedAt: startedAt.current,
      lastUpdated: Date.now(),
    });
  }, [phase, testType, timerDuration, calibration, _assessmentId, saveState]);

  useEffect(() => {
    if (phase === "testing") startedAt.current = Date.now();
  }, [phase]);

  const typeIsFixed = !!assessmentTypes?.length;
  const currentIdx = PHASE_ORDER.indexOf(phase);

  // Compute the stage index relative to the displayed stages
  const displayedPhases = typeIsFixed
    ? PHASE_ORDER.filter((p) => p !== "type_select")
    : PHASE_ORDER;
  const currentStageIdx = displayedPhases.indexOf(phase);
  const totalStages = displayedPhases.length;

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

  const handleDurationContinue = () => {
    if (testType === "far") {
      setPhase("eye_selection");
    } else {
      setPhase("testing");
    }
  };

  const handleEyeSelected = () => {
    setPhase("testing");
  };

  const handleTestComplete = async (eyeResults: { right: EyeAcuityResult; left: EyeAcuityResult }) => {
    if (!calibration) return;
    const completedAt = Date.now();
    const testResult: AcuityTestResult = {
      sessionId:       sessionId.current,
      testType,
      rightEye:        eyeResults.right,
      leftEye:         eyeResults.left,
      timerDuration,
      testingDistance: testType === "far" ? 3 : 0.40,
      calibration,
      startedAt:       startedAt.current,
      completedAt,
      durationSeconds: (completedAt - startedAt.current) / 1000,
    };
    setResult(testResult);
    setPhase("results");

    // Clean up unified session storage on successful completion
    clearState();

    // Persist result to Firestore if this session is linked to an assessment
    if (_assessmentId) {
      try {
        const resultPayload = {
          rightEye: eyeResults.right.bestNotation ?? "—",
          leftEye:  eyeResults.left.bestNotation  ?? "—",
          completedAt: new Date(completedAt),
        };
        
        // Fetch current assessment to check if both tests are done
        const currentAssessment = await visionAssessmentsService.getById(_assessmentId);
        if (!currentAssessment) {
          console.error("[AcuitySession] assessment not found:", _assessmentId);
          return;
        }

        // Determine if assessment is fully completed
        const hasFar = assessmentTypes?.includes("far");
        const hasNear = assessmentTypes?.includes("near");
        const isSavingFar = testType === "far";
        
        let newStatus: "in_progress" | "completed" = "in_progress";
        
        if (hasFar && hasNear) {
          // Both tests required - only complete when both have results
          const willHaveBothResults = isSavingFar 
            ? (currentAssessment.resultNear !== undefined)
            : (currentAssessment.resultFar !== undefined);
          newStatus = willHaveBothResults ? "completed" : "in_progress";
        } else {
          // Only one test required - mark complete immediately
          newStatus = "completed";
        }

        await visionAssessmentsService.update(
          _assessmentId,
          testType === "far"
            ? { resultFar: resultPayload, status: newStatus }
            : { resultNear: resultPayload, status: newStatus }
        );
      } catch (err) {
        console.error("[AcuitySession] failed to save result to Firestore:", err);
      }
    }
  };

  const handleRetake = () => {
    sessionId.current = uuidv4();
    setResult(null);
    clearState();
    setPhase("type_select");
  };

  // ── Immersive shell display values ──────────────────────────────────────

  // Timer display: live countdown during active reading, empty otherwise
  const timerDisplay = phase === "testing" && levelDisplay
    ? `${timerCountdown}s`
    : "";

  // Progress display: stage-level progress (e.g. "3 of 5")
  const progressDisplay = `${currentStageIdx + 1} of ${totalStages}`;

  // ── Navigation callbacks for overflow menu ─────────────────────────────

  const handlePause = useCallback(() => setIsPaused(true), []);
  const handleResume = useCallback(() => setIsPaused(false), []);

  const handleReturnToDetails = useCallback(() => {
    if (phase !== "results") {
      setPendingNavigation("/patient/assessment");
      setShowExitConfirm(true);
      setIsPaused(true);
    } else {
      router.push("/patient/assessment");
    }
  }, [router, phase]);

  const handleReturnToDashboard = useCallback(() => {
    if (phase !== "results") {
      setPendingNavigation("/patient/dashboard");
      setShowExitConfirm(true);
      setIsPaused(true);
    } else {
      router.push("/patient/dashboard");
    }
  }, [router, phase]);

  const handleExit = useCallback(() => {
    if (phase !== "results") {
      setPendingNavigation("/patient/assessment");
      setShowExitConfirm(true);
      setIsPaused(true);
    } else {
      router.push("/patient/assessment");
    }
  }, [router, phase]);

  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  }, [router, pendingNavigation]);

  const handleCancelExit = useCallback(() => {
    setShowExitConfirm(false);
    setPendingNavigation(null);
    setIsPaused(false);
  }, []);

  const handleLevelChange = useCallback((info: { notation: string; lineIndex: number; totalLines: number; eye: string }) => {
    if (info.lineIndex < 0 || !info.notation) {
      setLevelDisplay("");
    } else {
      setLevelDisplay(`${info.eye === "right" ? "R" : "L"} · ${info.lineIndex + 1}/${info.totalLines}`);
    }
  }, []);

  const handleTimerUpdate = useCallback((remainingSeconds: number) => {
    setTimerCountdown(remainingSeconds);
    // If timer is counting down, it means it's running — clear any stale pause state
    if (isPaused && remainingSeconds > 0) {
      setIsPaused(false);
    }
  }, [isPaused]);

  return (
    <>
      <AssessmentImmersiveShell
        timerDisplay={timerDisplay}
        progressDisplay={progressDisplay}
        levelDisplay={phase === "testing" ? levelDisplay : undefined}
        phase={phase}
        isPaused={isPaused}
        onPause={handlePause}
        onResume={handleResume}
        onReturnToDetails={handleReturnToDetails}
        onReturnToDashboard={handleReturnToDashboard}
        onExit={handleExit}
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
          <AssessmentOrientationGate>
            <CalibrationStep
              onCalibrated={handleCalibrated}
              existingCalibration={calibration}
            />
          </AssessmentOrientationGate>
        )}

        {phase === "duration_select" && (
          <AssessmentOrientationGate>
            <DurationSelector
              testType={testType}
              selected={timerDuration}
              onSelect={setTimerDuration}
              onContinue={handleDurationContinue}
            />
          </AssessmentOrientationGate>
        )}

        {phase === "eye_selection" && (
          <AssessmentOrientationGate>
            <EyeSelectionStep onContinue={handleEyeSelected} />
          </AssessmentOrientationGate>
        )}

        {phase === "testing" && calibration && testType === "far" && (
          <AssessmentOrientationGate>
            <TestingStep
              assessmentId={_assessmentId}
              calibration={calibration}
              timerDuration={timerDuration}
              onComplete={handleTestComplete}
              onLevelChange={handleLevelChange}
              onTimerUpdate={handleTimerUpdate}
              pauseRequested={isPaused}
            />
          </AssessmentOrientationGate>
        )}

        {phase === "testing" && calibration && testType === "near" && (
          <AssessmentOrientationGate>
            <NearTestingStep
              assessmentId={_assessmentId}
              calibration={calibration}
              timerDuration={timerDuration}
              onComplete={handleTestComplete}
              onLevelChange={handleLevelChange}
              onTimerUpdate={handleTimerUpdate}
              pauseRequested={isPaused}
            />
          </AssessmentOrientationGate>
        )}

        {phase === "results" && result && (
          <ResultsStep
            result={result}
            onRetake={handleRetake}
            nextAssessmentHref={nextAssessmentHref}
            nextAssessmentLabel={nextAssessmentLabel}
          />
        )}

        {/* Exit confirmation dialog */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-[#0f4f4b]">Leave Assessment?</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your assessment is still in progress. If you leave now, your current progress may be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelExit}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#0f4f4b]/20 text-sm font-semibold text-[#0f4f4b] hover:bg-[#0f4f4b]/5 transition-colors"
                >
                  Continue Test
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </AssessmentImmersiveShell>
    </>
  );
}
