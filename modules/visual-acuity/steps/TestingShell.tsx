"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SnellenRenderer } from "../SnellenRenderer";
import { useAssessmentProgress } from "../engine/useAssessmentProgress";
import { useCalibrationSync } from "../engine/useCalibrationSync";
import { useLetterTimer } from "../engine/useLetterTimer";
import { CountdownStep } from "./CountdownStep";
// Note: Timer ring constants (RING_SIZE, ARC_R, ARC_C) removed — timer UI
// now rendered by parent ImmersiveTopBar via AssessmentImmersiveShell.
import type {
  CalibrationData,
  Eye as EyeType,
  EyeAcuityResult,
  TimerDuration,
} from "../types";

// ─── Public types ──────────────────────────────────────────────────────────

export interface TestingShellChartLine {
  notation: string;
  notation6m: string;
  letters: string[];
  exactHeightMm: number;
  label: string;
}

export type TestingShellAccent = {
  primary: string;
  primaryHover?: string;
  ringActive?: string;
  ringPaused?: string;
};

export interface TestingShellProps {
  calibration: CalibrationData;
  timerDuration: TimerDuration;
  chart: TestingShellChartLine[];
  accent: TestingShellAccent;
  distanceLabel: string;
  testKind: "far" | "near";
  onComplete: (results: { right: EyeAcuityResult; left: EyeAcuityResult }) => void;
  /** Reports current line info for the immersive top bar display. */
  onLevelChange?: (info: { notation: string; lineIndex: number; totalLines: number; eye: string }) => void;
  /** Reports live remaining seconds for the immersive timer display. */
  onTimerUpdate?: (remainingSeconds: number) => void;
  /** External pause request from the overflow menu. When true, timer pauses. */
  pauseRequested?: boolean;
}

// ─── Internal ──────────────────────────────────────────────────────────────

type EyePhase = "eye_intro" | "countdown" | "reading" | "self_report";

// Timer ring geometry removed — timer display now handled by ImmersiveTopBar.
// Hook outputs (timer.remainingSeconds, timer.elapsedFraction, etc.) still
// available for parent shell consumption via props/context.

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TestingShell({
  calibration,
  timerDuration,
  chart,
  accent,
  distanceLabel,
  testKind,
  onComplete,
  onLevelChange,
  onTimerUpdate,
  pauseRequested,
}: TestingShellProps): JSX.Element {
  // Recalculate calibration when DPR/resize/orientation changes.
  // useCalibrationSync accepts CalibrationData | null but TestingShell always
  // receives a non-null CalibrationData, so fall back to the original prop if
  // the hook hasn't emitted a value yet (initial render race).
  const effectiveCalibration = useCalibrationSync(calibration) ?? calibration;

  const [currentEye, setCurrentEye] = useState<EyeType>("right");
  const [eyePhase, setEyePhase] = useState<EyePhase>("eye_intro");
  const [rightBest, setRightBest] = useState<string | null>(null);

  // ── Timer engine ──────────────────────────────────────────────────────────
  // Single source of truth. userPaused is now exposed directly from the hook
  // so there's no separate mirror state that can desync.
  const timer = useLetterTimer({
    totalLetters: chart.length,
    durationMs: timerDuration * 1000,
    onAllComplete: () => setEyePhase("self_report"),
  });

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = useAssessmentProgress({
    currentEye,
    letterIndex: timer.letterIndex,
    totalLinesPerEye: chart.length,
  });

  const isRight = currentEye === "right";
  const safeIndex = Math.max(0, Math.min(timer.letterIndex, chart.length - 1));
  const currentLine = chart[safeIndex];

  // ── Report current level to parent shell ──────────────────────────────────
  // Only report during reading phase; clear when not reading.
  useEffect(() => {
    if (eyePhase === "reading") {
      onLevelChange?.({
        notation: currentLine.notation,
        lineIndex: safeIndex,
        totalLines: chart.length,
        eye: currentEye,
      });
    } else {
      // Clear level display when not in active reading
      onLevelChange?.({ notation: "", lineIndex: -1, totalLines: chart.length, eye: currentEye });
    }
  }, [safeIndex, currentEye, eyePhase, currentLine.notation, chart.length, onLevelChange]);

  // ── Report live timer countdown to parent shell ───────────────────────────
  useEffect(() => {
    if (eyePhase === "reading") {
      onTimerUpdate?.(timer.remainingSeconds);
    }
  }, [timer.remainingSeconds, eyePhase, onTimerUpdate]);

  // ── Sync external pause request with internal timer ───────────────────────
  // Track previous pauseRequested to only react to changes (not re-enforce)
  const prevPauseRef = useRef(pauseRequested);
  useEffect(() => {
    if (pauseRequested !== prevPauseRef.current) {
      prevPauseRef.current = pauseRequested;
      if (pauseRequested && !timer.userPaused) {
        timer.pause();
      } else if (!pauseRequested && timer.userPaused) {
        timer.resume();
      }
    }
  }, [pauseRequested, timer]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEyeBegin = useCallback(() => {
    setEyePhase("countdown");
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setEyePhase("reading");
    timer.start();
  }, [timer]);

  // Use togglePause — single call, no desync possible.
  const handlePause = useCallback(() => {
    timer.togglePause();
  }, [timer]);

  const handleSelfReport = useCallback(
    (notation: string | null) => {
      if (currentEye === "right") {
        setRightBest(notation);
        setCurrentEye("left");
        setEyePhase("eye_intro");
        timer.reset();
        return;
      }
      onComplete({
        right: { eye: "right", bestNotation: rightBest, lineResults: [] },
        left: { eye: "left", bestNotation: notation, lineResults: [] },
      });
    },
    [currentEye, rightBest, timer, onComplete],
  );

  // ── Phase routing ─────────────────────────────────────────────────────────

  if (eyePhase === "eye_intro") {
    return (
      <EyeIntroScreen
        isRight={isRight}
        currentEye={currentEye}
        testKind={testKind}
        timerDuration={timerDuration}
        accent={accent}
        onBegin={handleEyeBegin}
      />
    );
  }

  if (eyePhase === "countdown") {
    return (
      <CountdownStep seconds={10} onComplete={handleCountdownComplete} />
    );
  }

  if (eyePhase === "self_report") {
    return (
      <SelfReportScreen
        isRight={isRight}
        chart={chart}
        accent={accent}
        onSelect={handleSelfReport}
      />
    );
  }

  // ── Reading phase ─────────────────────────────────────────────────────────
  // Chrome (progress bar, timer ring, pause button, doctor note, eye icons)
  // has been removed. These UI elements now live in the parent
  // AssessmentImmersiveShell (ImmersiveTopBar + AssessmentOverflowMenu).
  // SnellenRenderer is rendered as the hero element occupying full available space.

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Pause overlay — full screen tap-to-resume */}
      {timer.userPaused && (
        <button
          onClick={() => {
            timer.resume();
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0f4f4b]/80 backdrop-blur-sm cursor-pointer"
          aria-label="Tap to resume assessment"
        >
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <div className="h-0 w-0 border-l-[18px] border-l-white border-y-[11px] border-y-transparent ml-1" />
          </div>
          <p className="text-white font-semibold text-lg">Paused</p>
          <p className="text-white/70 text-sm mt-1">Tap anywhere to resume</p>
        </button>
      )}

      {/* ── Snellen Renderer — hero element, centered ──── */}
      <SnellenRenderer
        key={`${currentEye}-${timer.letterIndex}`}
        letters={currentLine.letters}
        exactHeightMm={currentLine.exactHeightMm}
        calibration={effectiveCalibration}
        animate
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eye intro screen
// ---------------------------------------------------------------------------

interface EyeIntroScreenProps {
  isRight: boolean;
  currentEye: EyeType;
  testKind: "far" | "near";
  timerDuration: TimerDuration;
  accent: TestingShellAccent;
  onBegin: () => void;
}

function EyeIntroScreen({
  isRight,
  currentEye,
  testKind,
  timerDuration,
  accent,
  onBegin,
}: EyeIntroScreenProps): JSX.Element {
  const introIconBg =
    testKind === "far" ? (isRight ? "#0f4f4b" : "#b5964d") : accent.primary;

  const activePairBg =
    testKind === "near" ? "#b5964d" : isRight ? "#0f4f4b" : "#b5964d";

  const activePairTextClass =
    testKind === "near" ? "text-[#b5964d]" : "text-[#0f4f4b]";

  const blurbBg = testKind === "near" ? "bg-[#b5964d]/8" : "bg-[#0f4f4b]/5";
  const blurbIconClass =
    testKind === "near" ? "text-[#b5964d]/60" : "text-[#0f4f4b]/40";

  const ctaClass =
    testKind === "far"
      ? "w-full h-12 text-sm rounded-xl bg-[#0f4f4b] hover:bg-[#0a3a36]"
      : "w-full h-12 text-sm rounded-xl bg-[#b5964d] hover:bg-[#9f833f] shadow-[0_8px_32px_rgba(181,150,77,0.28)]";

  const ctaLabel =
    testKind === "far" ? "Ready — Start Test" : "Ready — Start Near Test";

  return (
    <div className="max-w-lg mx-auto w-full text-center space-y-4 landscape:space-y-2 py-2">
      <div className="space-y-2 landscape:space-y-1">
        <div
          className="mx-auto h-16 w-16 landscape:h-12 landscape:w-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: introIconBg }}
        >
          <Eye className="h-8 w-8 landscape:h-6 landscape:w-6 text-white" />
        </div>
        <h2 className="text-xl landscape:text-lg font-black text-[#0f4f4b]">
          Testing {isRight ? "Right" : "Left"} Eye
        </h2>
        <p className="text-xs text-[#0f4f4b]/60 max-w-xs mx-auto leading-tight">
          {testKind === "far" ? (
            <>
              Cover your <strong>{isRight ? "left" : "right"}</strong> eye
              completely. Stand exactly <strong>3 metres</strong> from the
              screen.
            </>
          ) : (
            <>
              Cover your <strong>{isRight ? "left" : "right"}</strong> eye with
              your palm. Hold the device at <strong>35 cm</strong>{" "}
              (arm&apos;s length).
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl bg-white/80 border border-[#0f4f4b]/12 p-4 landscape:p-3 space-y-3 landscape:space-y-2">
        <div className="flex items-center justify-center gap-8">
          {(["left", "right"] as EyeType[]).map((e) => {
            const isTesting = e === currentEye;
            return (
              <div key={e} className="text-center">
                <div
                  className="h-10 w-10 rounded-xl mx-auto flex items-center justify-center mb-1"
                  style={
                    isTesting
                      ? { backgroundColor: activePairBg }
                      : { backgroundColor: "rgba(15,79,75,0.08)" }
                  }
                >
                  <Eye
                    className={`h-5 w-5 ${
                      isTesting ? "text-white" : "text-[#0f4f4b]/35"
                    }`}
                  />
                </div>
                <p
                  className={`text-[10px] font-bold capitalize ${
                    isTesting ? activePairTextClass : "text-[#0f4f4b]/35"
                  }`}
                >
                  {e}
                </p>
              </div>
            );
          })}
        </div>
        <div
          className={`flex items-center gap-2 ${blurbBg} rounded-lg p-2 text-[10px] text-[#0f4f4b]/70`}
        >
          <EyeOff className={`h-3.5 w-3.5 shrink-0 ${blurbIconClass}`} />
          <span>
            {testKind === "far" ? (
              <>
                Cover your <strong>{isRight ? "left" : "right"}</strong> eye
                firmly. Each line shows for {timerDuration}s then advances
                automatically.
              </>
            ) : (
              <>
                Cover your <strong>{isRight ? "left" : "right"}</strong> eye
                firmly. Hold device at 35 cm. Each line shows for {timerDuration}
                s then advances.
              </>
            )}
          </span>
        </div>
      </div>

      <Button onClick={onBegin} size="lg" className={ctaClass}>
        {ctaLabel}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Self-report screen
// ---------------------------------------------------------------------------

interface SelfReportScreenProps {
  isRight: boolean;
  chart: TestingShellChartLine[];
  accent: TestingShellAccent;
  onSelect: (notation: string | null) => void;
}

function SelfReportScreen({
  isRight,
  chart,
  accent,
  onSelect,
}: SelfReportScreenProps): JSX.Element {
  const isNear = accent.primary === "#b5964d";

  return (
    <div className="max-w-lg mx-auto space-y-6 py-2">
      <div className="text-center space-y-2">
        <div
          className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center"
          style={{
            backgroundColor: isNear
              ? "rgba(181,150,77,0.12)"
              : "rgba(15,79,75,0.08)",
          }}
        >
          <Eye
            className="h-7 w-7"
            style={{ color: accent.primary }}
          />
        </div>
        <h2 className="text-xl font-black text-[#0f4f4b]">
          {isRight ? "Right" : "Left"} Eye — Report
        </h2>
        <p className="text-sm text-[#0f4f4b]/60 max-w-xs mx-auto leading-relaxed">
          Select the <strong>smallest line</strong> you were able to read
          clearly.
        </p>
      </div>

      <div className="space-y-2">
        {chart.map((line, i) => (
          <button
            key={line.notation}
            onClick={() => onSelect(line.notation)}
            className={[
              "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl",
              "bg-white border border-[#0f4f4b]/12 active:scale-[0.99] transition-all group",
              isNear
                ? "hover:border-[#b5964d]/50 hover:bg-[#b5964d]/4"
                : "hover:border-[#0f4f4b]/35 hover:bg-[#0f4f4b]/3",
            ].join(" ")}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-[#0f4f4b] min-w-[2rem]">
                  {i + 1}
                </span>
                <span className="text-base font-black text-[#0f4f4b] min-w-[4rem]">
                  {line.notation}
                </span>
              </div>
              <span className="text-xs text-[#0f4f4b]/45">{line.label}</span>
            </div>
            <ChevronRight
              className={[
                "h-4 w-4 transition-colors",
                isNear
                  ? "text-[#0f4f4b]/25 group-hover:text-[#b5964d]/70"
                  : "text-[#0f4f4b]/25 group-hover:text-[#0f4f4b]/55",
              ].join(" ")}
            />
          </button>
        ))}

        <button
          onClick={() => onSelect(null)}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white border border-red-200 hover:border-red-400 hover:bg-red-50 active:scale-[0.99] transition-all group"
        >
          <span className="text-sm font-semibold text-red-600">
            Could not read any line
          </span>
          <ChevronRight className="h-4 w-4 text-red-300 group-hover:text-red-500 transition-colors" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// withAlpha helper removed — no longer needed since timer ring, progress bar,
// and other decorative chrome that used it have moved to ImmersiveTopBar.
