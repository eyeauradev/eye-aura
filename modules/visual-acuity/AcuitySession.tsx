"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TestTypeSelector } from "./TestTypeSelector";
import { InstructionsStep } from "./steps/InstructionsStep";
import { CalibrationStep } from "./steps/CalibrationStep";
import { DurationSelector } from "./DurationSelector";
import { TestingStep } from "./steps/TestingStep";
import { NearTestingStep } from "./steps/NearTestingStep";
import { ResultsStep } from "./steps/ResultsStep";
import { AssessmentImmersiveShell, AssessmentOrientationGate } from "./immersive";
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
  nextAssessmentHref?: string;
  nextAssessmentLabel?: string;
}

export function AcuitySession({ assessmentId: _assessmentId, assessmentTypes, nextAssessmentHref, nextAssessmentLabel }: AcuitySessionProps = {}) {
  // If assessment types are pre-determined by assignment, skip type_select
  const initialPhase: TestPhase = assessmentTypes?.length ? "instructions" : "type_select";
  const initialType: TestType   = assessmentTypes?.includes("far") ? "far" : "near";

  // ── State persistence key (Issue 5: survive orientation changes) ─────────
  const storageKey = `ea_session_${_assessmentId ?? "local"}`;

  // Attempt to restore state from sessionStorage
  const getRestoredState = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as {
        phase: TestPhase;
        testType: TestType;
        timerDuration: TimerDuration;
        calibration: CalibrationData | null;
        sessionId: string;
        startedAt: number;
      };
    } catch { return null; }
  };

  const restored = getRestoredState();

  const [phase, setPhase]             = useState<TestPhase>(restored?.phase ?? initialPhase);
  const [testType, setTestType]       = useState<TestType>(restored?.testType ?? initialType);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(restored?.timerDuration ?? 5);
  const [calibration, setCalibration] = useState<CalibrationData | null>(restored?.calibration ?? null);
  const [result, setResult]           = useState<AcuityTestResult | null>(null);
  const [isPaused, setIsPaused]       = useState(false);
  const [levelDisplay, setLevelDisplay] = useState<string>("");
  const [timerCountdown, setTimerCountdown] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const router = useRouter();
  const sessionId  = useRef(restored?.sessionId ?? uuidv4());
  const startedAt  = useRef<number>(restored?.startedAt ?? 0);

  // Persist state to sessionStorage on changes (Issue 5)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        phase,
        testType,
        timerDuration,
        calibration,
        sessionId: sessionId.current,
        startedAt: startedAt.current,
      }));
    } catch { /* storage full — ignore */ }
  }, [phase, testType, timerDuration, calibration, storageKey]);

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

      {phase === "testing" && calibration && testType === "far" && (
        <AssessmentOrientationGate>
          <TestingStep
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
  );
}
