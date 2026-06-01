"use client";

import { useCallback, useState, type JSX } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Pause,
  Play,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SnellenRenderer } from "../SnellenRenderer";
import { useAssessmentProgress } from "../engine/useAssessmentProgress";
import { useCalibrationSync } from "../engine/useCalibrationSync";
import { useLetterTimer } from "../engine/useLetterTimer";
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
}

// ─── Internal ──────────────────────────────────────────────────────────────

type EyePhase = "eye_intro" | "reading" | "self_report";

// Timer ring geometry — fixed 80×80 px, never resizes.
const RING_SIZE = 80;
const ARC_R = 32;
const ARC_C = 2 * Math.PI * ARC_R;
const DEFAULT_RING_PAUSED = "#b5964d";

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
}: TestingShellProps): JSX.Element {
  // Recalculate calibration when DPR/resize/orientation changes.
  // useCalibrationSync accepts CalibrationData | null but TestingShell always
  // receives a non-null CalibrationData, so fall back to the original prop if
  // the hook hasn't emitted a value yet (initial render race).
  const effectiveCalibration = useCalibrationSync(calibration) ?? calibration;

  const [currentEye, setCurrentEye] = useState<EyeType>("right");
  const [eyePhase, setEyePhase] = useState<EyePhase>("eye_intro");
  const [rightBest, setRightBest] = useState<string | null>(null);

  const ringActive = accent.ringActive ?? accent.primary;
  const ringPaused = accent.ringPaused ?? DEFAULT_RING_PAUSED;

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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEyeBegin = useCallback(() => {
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

  const isPaused = timer.userPaused;
  const ringColor = isPaused ? ringPaused : ringActive;
  const dashOffset = ARC_C * (1 - timer.elapsedFraction);

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* ── Snellen notation — top center ─────────────────────────────── */}
      <div className="text-center">
        <div className="inline-flex items-baseline gap-1.5">
          <span className="text-4xl font-black text-[#0f4f4b] leading-none tracking-tight">
            {currentLine.notation}
          </span>
          <span className="text-xl font-bold text-[#0f4f4b]/50 leading-none">
            ({currentLine.notation6m})
          </span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#0f4f4b]/35 mt-0.5">
          Snellen
        </p>
      </div>

      {/* ── Global progress bar ───────────────────────────────────────── */}
      <div
        data-testid="va-global-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={progress.globalPercent}
        aria-valuetext={`${progress.currentLevel} of ${progress.totalLevels}`}
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: withAlpha(accent.primary, 0.1) }}
      >
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: accent.primary,
            width: "100%",
            transform: `scaleX(${progress.globalPercent})`,
            transformOrigin: "left",
            transition: "transform 600ms ease-out",
            willChange: "transform",
          }}
        />
      </div>

      {/* ── White card ────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white border border-[#0f4f4b]/10 overflow-hidden">

        {/* Pause banner */}
        {isPaused && (
          <div
            className="px-5 py-2.5 flex items-center gap-2 border-b border-[#b5964d]/20"
            style={{ backgroundColor: "rgba(181,150,77,0.06)" }}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-[#b5964d] animate-pulse" />
            <p className="text-xs font-semibold text-[#b5964d]">
              Test paused — resume when ready.
            </p>
          </div>
        )}

        {/* ── Responsive content area ─────────────────────────────── */}
        {/*
         * Desktop (md+): 3-column layout
         *   LEFT  (w-28 fixed)  — Eye icon + eye name + Level X/Y
         *   CENTER (flex-1)     — Snellen letters (primary focus)
         *   RIGHT (w-28 fixed)  — Circular countdown timer
         *
         * Mobile (<md): 2-row layout
         *   ROW 1 — Eye info (left) + Timer/distance (right) compact bar
         *   ROW 2 — Snellen chart at full container width
         */}

        {/* ── Mobile-only top row: eye info + timer side-by-side ───── */}
        <div className="flex md:hidden items-center justify-between px-4 py-3">
          {/* Eye info — compact */}
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: accent.primary }}
            >
              <Eye className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0f4f4b] capitalize leading-tight">
                {currentEye} Eye
              </p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] text-[#0f4f4b]/40">Lv</span>
                <span
                  className="text-sm font-black leading-none"
                  style={{ color: accent.primary }}
                >
                  {progress.currentLevel}
                </span>
                <span className="text-[10px] text-[#0f4f4b]/40">
                  /{progress.totalLevels}
                </span>
              </div>
            </div>
          </div>

          {/* Timer — compact */}
          <div className="flex items-center gap-2">
            <svg
              width={48}
              height={48}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              style={{ flexShrink: 0 }}
            >
              {/* Track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={ARC_R}
                fill="none"
                stroke={withAlpha(accent.primary, 0.1)}
                strokeWidth="5"
              />
              {/* Progress arc */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={ARC_R}
                fill="none"
                stroke={ringColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={ARC_C}
                strokeDashoffset={dashOffset}
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                  transition: isPaused
                    ? "none"
                    : "stroke-dashoffset 0.25s linear",
                  willChange: "stroke-dashoffset",
                }}
              />
              {/* Countdown number */}
              <text
                x={RING_SIZE / 2}
                y={RING_SIZE / 2 + 7}
                textAnchor="middle"
                fontSize="22"
                fontWeight="900"
                fill={ringColor}
                style={{ userSelect: "none" }}
              >
                {timer.remainingSeconds}
              </text>
            </svg>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: withAlpha(accent.primary, 0.4) }}
            >
              {isPaused ? "paused" : "sec"}
            </p>
          </div>
        </div>

        {/* ── Desktop 3-column layout (hidden on mobile) ───────────── */}
        <div className="hidden md:flex items-center gap-4 px-5 py-6 min-h-[180px]">

          {/* LEFT — Eye / Level */}
          <div className="w-28 md:flex-shrink-0 flex flex-col items-center gap-2">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: accent.primary }}
            >
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-[#0f4f4b] capitalize leading-tight">
                {currentEye} Eye
              </p>
              <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                <span className="text-xs text-[#0f4f4b]/40">Lv</span>
                <span
                  className="text-2xl font-black leading-none"
                  style={{ color: accent.primary }}
                >
                  {progress.currentLevel}
                </span>
                <span className="text-xs text-[#0f4f4b]/40">
                  /{progress.totalLevels}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER — Test letters (primary focus, never compressed) */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <SnellenRenderer
              key={`${currentEye}-${timer.letterIndex}-desktop`}
              letters={currentLine.letters}
              exactHeightMm={currentLine.exactHeightMm}
              calibration={effectiveCalibration}
              animate
            />
          </div>

          {/* RIGHT — Circular countdown timer */}
          <div className="w-28 md:flex-shrink-0 flex flex-col items-center justify-center gap-1">
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              style={{ flexShrink: 0 }}
            >
              {/* Track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={ARC_R}
                fill="none"
                stroke={withAlpha(accent.primary, 0.1)}
                strokeWidth="4"
              />
              {/* Progress arc */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={ARC_R}
                fill="none"
                stroke={ringColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={ARC_C}
                strokeDashoffset={dashOffset}
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                  transition: isPaused
                    ? "none"
                    : "stroke-dashoffset 0.25s linear",
                  willChange: "stroke-dashoffset",
                }}
              />
              {/* Countdown number */}
              <text
                x={RING_SIZE / 2}
                y={RING_SIZE / 2 + 7}
                textAnchor="middle"
                fontSize="20"
                fontWeight="900"
                fill={ringColor}
                style={{ userSelect: "none" }}
              >
                {timer.remainingSeconds}
              </text>
            </svg>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: withAlpha(accent.primary, 0.4) }}
            >
              {isPaused ? "paused" : "sec left"}
            </p>
          </div>
        </div>

        {/* ── Mobile chart row: full-width Snellen (hidden on desktop) */}
        <div className="flex md:hidden items-center justify-center w-full px-3 py-4 min-h-[140px]">
          <SnellenRenderer
            key={`${currentEye}-${timer.letterIndex}-mobile`}
            letters={currentLine.letters}
            exactHeightMm={currentLine.exactHeightMm}
            calibration={effectiveCalibration}
            animate
          />
        </div>

        {/* ── Pause / Resume button ─────────────────────────────────── */}
        <div className="border-t border-[#0f4f4b]/8 px-5 py-3.5">
          <button
            onClick={handlePause}
            className={[
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl",
              "border text-sm font-semibold transition-colors",
              isPaused
                ? "border-[#b5964d]/30 bg-[#b5964d]/8 text-[#b5964d] hover:bg-[#b5964d]/12"
                : "border-[#0f4f4b]/15 text-[#0f4f4b]/60 hover:bg-[#0f4f4b]/5",
            ].join(" ")}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Doctor note ───────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#0f4f4b]/4 border border-[#0f4f4b]/10 px-4 py-3 flex items-start gap-2">
        <Eye className="h-4 w-4 text-[#0f4f4b]/40 shrink-0 mt-0.5" />
        <p className="text-xs text-[#0f4f4b]/55 leading-relaxed">
          <strong>Doctor note:</strong> Patient is covering the{" "}
          <strong>{isRight ? "left" : "right"}</strong> eye at {distanceLabel}.
          Each line auto-advances after {timerDuration}s.
          {testKind === "far" ? " Self-report screen follows." : ""}
        </p>
      </div>
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
      ? "w-full h-14 text-base rounded-2xl bg-[#0f4f4b] hover:bg-[#0a3a36]"
      : "w-full h-14 text-base rounded-2xl bg-[#b5964d] hover:bg-[#9f833f] shadow-[0_8px_32px_rgba(181,150,77,0.28)]";

  const ctaLabel =
    testKind === "far" ? "Ready — Start Test" : "Ready — Start Near Test";

  return (
    <div className="max-w-lg mx-auto text-center space-y-8 py-4">
      <div className="space-y-3">
        <div
          className="mx-auto h-24 w-24 rounded-3xl flex items-center justify-center shadow-xl"
          style={{ backgroundColor: introIconBg }}
        >
          <Eye className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-black text-[#0f4f4b]">
          Testing {isRight ? "Right" : "Left"} Eye
        </h2>
        <p className="text-sm text-[#0f4f4b]/60 max-w-xs mx-auto leading-relaxed">
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

      <div className="rounded-2xl bg-white/80 border border-[#0f4f4b]/12 p-6 space-y-4">
        <div className="flex items-center justify-center gap-10">
          {(["left", "right"] as EyeType[]).map((e) => {
            const isTesting = e === currentEye;
            return (
              <div key={e} className="text-center">
                <div
                  className="h-14 w-14 rounded-2xl mx-auto flex items-center justify-center mb-2"
                  style={
                    isTesting
                      ? { backgroundColor: activePairBg }
                      : { backgroundColor: "rgba(15,79,75,0.08)" }
                  }
                >
                  <Eye
                    className={`h-7 w-7 ${
                      isTesting ? "text-white" : "text-[#0f4f4b]/35"
                    }`}
                  />
                </div>
                <p
                  className={`text-xs font-bold capitalize ${
                    isTesting ? activePairTextClass : "text-[#0f4f4b]/35"
                  }`}
                >
                  {e}
                </p>
                {isTesting && (
                  <p className="text-[10px] text-[#0f4f4b]/45 mt-0.5">
                    TESTING
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div
          className={`flex items-center gap-2 ${blurbBg} rounded-xl p-3 text-xs text-[#0f4f4b]/70`}
        >
          <EyeOff className={`h-4 w-4 shrink-0 ${blurbIconClass}`} />
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

function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith("#")) return hex;
  let r: number, g: number, b: number;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return hex;
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
