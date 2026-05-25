"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Eye, EyeOff, Pause, Play, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SnellenRenderer } from "../SnellenRenderer";
import { NEAR_VISION_LINES } from "../near/near-vision-data";
import { useAssessmentTimer } from "../engine/useAssessmentTimer";
import type { CalibrationData, Eye as EyeType, EyeAcuityResult, TimerDuration } from "../types";

// Near vision testing distance — 35 cm per clinical standard
const NEAR_DISTANCE_M = 0.35;

interface NearTestingStepProps {
  calibration: CalibrationData;
  timerDuration: TimerDuration;
  onComplete: (results: { right: EyeAcuityResult; left: EyeAcuityResult }) => void;
}

type EyePhase = "eye_intro" | "reading" | "self_report";

const ARC_R = 36;
const ARC_C = 2 * Math.PI * ARC_R;

function buildSessionChart() {
  return NEAR_VISION_LINES.map((line) => ({
    jaeger: line.jaeger,
    snellen: line.snellen,
    snellen6m: line.snellen6m,
    label: line.label,
    exactHeightMm: line.exactHeightMm,
    letters: line.letters,
  }));
}

export function NearTestingStep({ calibration, timerDuration, onComplete }: NearTestingStepProps) {
  const [chart] = useState(buildSessionChart);
  const [currentEye, setCurrentEye] = useState<EyeType>("right");
  const [eyePhase, setEyePhase] = useState<EyePhase>("eye_intro");
  const [lineIndex, setLineIndex] = useState(0);
  const [rightBest, setRightBest] = useState<string | null>(null);

  const lineIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Timer for countdown display only (line advancement handled by interval)
  const timer = useAssessmentTimer(timerDuration);

  const handleEyeBegin = useCallback(() => {
    lineIndexRef.current = 0;
    setLineIndex(0);
    startTimeRef.current = Date.now();
    setEyePhase("reading");
    timer.start(timerDuration * chart.length); // Total duration for all lines

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Advance line every timerDuration seconds
    intervalRef.current = setInterval(() => {
      const current = lineIndexRef.current;
      if (current >= chart.length - 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setEyePhase("self_report");
      } else {
        const next = current + 1;
        lineIndexRef.current = next;
        setLineIndex(next);
      }
    }, timerDuration * 1000);
  }, [timer, timerDuration, chart.length]);

  const handlePause = useCallback(() => {
    if (timer.isPaused) timer.resume(); else timer.pause();
  }, [timer]);

  const handleSelfReport = useCallback((notation: string | null) => {
    // Clear interval when switching eyes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (currentEye === "right") {
      setRightBest(notation);
      lineIndexRef.current = 0;
      setLineIndex(0);
      setCurrentEye("left");
      setEyePhase("eye_intro");
      timer.reset();
    } else {
      onComplete({
        right: { eye: "right", bestNotation: rightBest, lineResults: [] },
        left:  { eye: "left",  bestNotation: notation,  lineResults: [] },
      });
    }
  }, [currentEye, rightBest, timer, onComplete]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentLine = chart[Math.min(lineIndex, chart.length - 1)];
  const isRight = currentEye === "right";

  // ── Eye intro ─────────────────────────────────────────────────────────────
  if (eyePhase === "eye_intro") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 py-4">
        <div className="space-y-3">
          <div className={`mx-auto h-24 w-24 rounded-3xl flex items-center justify-center shadow-xl ${isRight ? "bg-[#b5964d]" : "bg-[#0f4f4b]"}`}>
            <Eye className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-black text-[#0f4f4b]">
            Testing {isRight ? "Right" : "Left"} Eye
          </h2>
          <p className="text-sm text-[#0f4f4b]/60 max-w-xs mx-auto leading-relaxed">
            Cover your <strong>{isRight ? "left" : "right"}</strong> eye with your palm.
            Hold the device at <strong>35 cm</strong> (arm&apos;s length).
          </p>
        </div>

        <div className="rounded-2xl bg-white/80 border border-[#0f4f4b]/12 p-6 space-y-4">
          <div className="flex items-center justify-center gap-10">
            {(["left", "right"] as EyeType[]).map((e) => {
              const isTesting = e === currentEye;
              return (
                <div key={e} className="text-center">
                  <div className={`h-14 w-14 rounded-2xl mx-auto flex items-center justify-center mb-2 ${isTesting ? "bg-[#b5964d]" : "bg-[#0f4f4b]/8"}`}>
                    <Eye className={`h-7 w-7 ${isTesting ? "text-white" : "text-[#0f4f4b]/35"}`} />
                  </div>
                  <p className={`text-xs font-bold capitalize ${isTesting ? "text-[#b5964d]" : "text-[#0f4f4b]/35"}`}>{e}</p>
                  {isTesting && <p className="text-[10px] text-[#0f4f4b]/45 mt-0.5">TESTING</p>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 bg-[#b5964d]/8 rounded-xl p-3 text-xs text-[#0f4f4b]/70">
            <EyeOff className="h-4 w-4 shrink-0 text-[#b5964d]/60" />
            <span>
              Cover your <strong>{isRight ? "left" : "right"}</strong> eye firmly.
              Hold device at 35 cm. Each line shows for {timerDuration}s then advances.
            </span>
          </div>
        </div>

        <Button
          onClick={handleEyeBegin}
          size="lg"
          className="w-full h-14 text-base rounded-2xl bg-[#b5964d] hover:bg-[#9f833f] shadow-[0_8px_32px_rgba(181,150,77,0.28)]"
        >
          Ready — Start Near Test
        </Button>
      </div>
    );
  }

  // ── Self-report screen ────────────────────────────────────────────────────
  if (eyePhase === "self_report") {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-2">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#b5964d]/12 flex items-center justify-center">
            <Eye className="h-7 w-7 text-[#b5964d]" />
          </div>
          <h2 className="text-xl font-black text-[#0f4f4b]">
            {isRight ? "Right" : "Left"} Eye — Report
          </h2>
          <p className="text-sm text-[#0f4f4b]/60 max-w-xs mx-auto leading-relaxed">
            Select the <strong>smallest line</strong> you were able to read clearly.
          </p>
        </div>

        <div className="space-y-2">
          {chart.map((line, i) => (
            <button
              key={line.snellen}
              onClick={() => handleSelfReport(line.snellen)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white border border-[#0f4f4b]/12 hover:border-[#b5964d]/50 hover:bg-[#b5964d]/4 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-[#0f4f4b] min-w-[2rem]">{i + 1}</span>
                  <span className="text-base font-black text-[#0f4f4b] min-w-[4rem]">{line.snellen}</span>
                </div>
                <span className="text-xs text-[#0f4f4b]/45">{line.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#0f4f4b]/25 group-hover:text-[#b5964d]/70 transition-colors" />
            </button>
          ))}

          <button
            onClick={() => handleSelfReport(null)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white border border-red-200 hover:border-red-400 hover:bg-red-50 active:scale-[0.99] transition-all group"
          >
            <span className="text-sm font-semibold text-red-600">Could not read any line</span>
            <ChevronRight className="h-4 w-4 text-red-300 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    );
  }

  // ── Reading phase ─────────────────────────────────────────────────────────
  const dashOffset = ARC_C * (1 - timer.elapsed);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Always-visible level number and Snellen fraction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#b5964d] flex items-center justify-center">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#0f4f4b] capitalize">{currentEye} eye</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#0f4f4b]/40">Level</span>
              <span className="text-4xl font-black text-[#0f4f4b] leading-none">{lineIndex + 1}</span>
              <span className="text-xs text-[#0f4f4b]/40">/ {chart.length}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#0f4f4b]/40 block mb-0.5">Snellen</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-[#0f4f4b] leading-none">{currentLine.snellen}</span>
            <span className="text-lg font-bold text-[#0f4f4b]/60 leading-none">({currentLine.snellen6m})</span>
          </div>
        </div>
      </div>

      <div className="h-1.5 bg-[#b5964d]/15 rounded-full overflow-hidden">
        <div className="h-full bg-[#b5964d] rounded-full transition-all duration-700"
          style={{ width: `${(lineIndex / chart.length) * 100}%` }} />
      </div>

      <div className="rounded-3xl bg-white border border-[#0f4f4b]/10 overflow-hidden">
        <div className="bg-[#b5964d]/6 border-b border-[#b5964d]/12 px-5 py-2.5 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-[#b5964d]/60 shrink-0" />
          <p className="text-xs text-[#0f4f4b]/55">
            {timer.isPaused ? "Test paused — resume when ready." : "Read the letters aloud. Lines advance automatically."}
          </p>
        </div>

        <div className="p-6 min-h-[200px] flex flex-col items-center justify-center gap-5">
          <SnellenRenderer
            key={`${currentEye}-${lineIndex}`}
            letters={currentLine.letters}
            exactHeightMm={currentLine.exactHeightMm}
            calibration={calibration}
            animate
          />

          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={ARC_R} fill="none" stroke="rgba(181,150,77,0.12)" strokeWidth="5" />
            <circle cx="44" cy="44" r={ARC_R} fill="none"
              stroke={timer.isPaused ? "#b5964d" : "#0f4f4b"} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={ARC_C} strokeDashoffset={dashOffset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s linear" }}
            />
            <text x="44" y="49" textAnchor="middle" fontSize="22" fontWeight="900"
              fill={timer.isPaused ? "#b5964d" : "#0f4f4b"}>
              {timer.remaining}
            </text>
          </svg>
        </div>

        <div className="border-t border-[#0f4f4b]/8 p-4">
          <button onClick={handlePause}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors ${
              timer.isPaused
                ? "border-[#b5964d]/30 bg-[#b5964d]/8 text-[#b5964d]"
                : "border-[#0f4f4b]/15 text-[#0f4f4b]/65 hover:bg-[#0f4f4b]/5"
            }`}>
            {timer.isPaused ? <><Play className="h-4 w-4" /> Resume</> : <><Pause className="h-4 w-4" /> Pause</>}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-[#0f4f4b]/4 border border-[#0f4f4b]/10 px-4 py-3 flex items-start gap-2">
        <Eye className="h-4 w-4 text-[#0f4f4b]/40 shrink-0 mt-0.5" />
        <p className="text-xs text-[#0f4f4b]/55 leading-relaxed">
          <strong>Doctor note:</strong> Patient is covering the <strong>{isRight ? "left" : "right"}</strong> eye at 35 cm.
          Each line auto-advances after {timerDuration}s.
        </p>
      </div>
    </div>
  );
}
