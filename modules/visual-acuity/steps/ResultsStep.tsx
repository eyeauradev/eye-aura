"use client";

import { Eye, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VA_DESCRIPTIONS, vaCategory, VA_LEVEL } from "../snellen-data";
import { NEAR_LEVEL } from "../near/near-vision-data";
import type { AcuityTestResult, SnellenNotation } from "../types";

interface ResultsStepProps {
  result: AcuityTestResult;
  onRetake: () => void;
  nextAssessmentHref?: string;   // URL for the next pending sibling assessment
  nextAssessmentLabel?: string;  // e.g. "Near Vision Assessment"
}

const CATEGORY_CONFIG = {
  excellent: { icon: CheckCircle2, label: "Excellent",           color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",      badge: "bg-emerald-100 text-emerald-800" },
  normal:    { icon: CheckCircle2, label: "Normal",              color: "text-[#0f4f4b]",   bg: "bg-[#0f4f4b]/5 border-[#0f4f4b]/15",  badge: "bg-[#0f4f4b]/10 text-[#0f4f4b]" },
  reduced:   { icon: AlertTriangle, label: "Below Normal",       color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",          badge: "bg-amber-100 text-amber-800" },
  poor:      { icon: XCircle,       label: "Significantly Reduced", color: "text-red-700",  bg: "bg-red-50 border-red-200",             badge: "bg-red-100 text-red-800" },
  unknown:   { icon: AlertTriangle, label: "Incomplete",         color: "text-[#0f4f4b]/50", bg: "bg-[#0f4f4b]/5 border-[#0f4f4b]/10", badge: "bg-[#0f4f4b]/8 text-[#0f4f4b]/60" },
};

function EyeCard({
  label,
  notation,
  isFar,
}: {
  label: string;
  notation: string | null;
  isFar: boolean;
}) {
  const cat = vaCategory(notation as SnellenNotation | null);
  const config = CATEGORY_CONFIG[cat];
  const Icon = config.icon;
  const description = notation ? VA_DESCRIPTIONS[notation as SnellenNotation] : null;
  const notationLabel = isFar ? "Snellen" : "Near Snellen";
  const level = notation ? VA_LEVEL[notation as SnellenNotation] : null;

  // For near vision, also show Jaeger equivalent
  const jaegerEquivalent = !isFar && notation ? getJaegerEquivalent(notation as SnellenNotation) : null;

  return (
    <div className={`rounded-2xl border p-5 space-y-3 ${config.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#0f4f4b]" />
          <span className="text-sm font-bold text-[#0f4f4b]">{label}</span>
        </div>
        <Badge className={`text-xs font-bold border-0 ${config.badge}`}>{config.label}</Badge>
      </div>

      {notation ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black ${config.color}`}>{notation}</span>
              <span className="text-sm text-[#0f4f4b]/50">{notationLabel}</span>
              {jaegerEquivalent && (
                <span className="text-sm font-bold text-[#0f4f4b]/60">({jaegerEquivalent})</span>
              )}
            </div>
            {level !== null && (
              <div className="text-right">
                <span className="text-xs text-[#0f4f4b]/40 block mb-0.5">Level</span>
                <span className={`text-3xl font-black ${config.color} leading-none`}>{level}</span>
              </div>
            )}
          </div>
          {description && (
            <p className="text-xs text-[#0f4f4b]/60 leading-relaxed">{description}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-[#0f4f4b]/50 italic">No readable line recorded</p>
      )}

      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        <span className={`text-xs font-semibold ${config.color}`}>{config.label} visual acuity</span>
      </div>
    </div>
  );
}

// Helper to get Jaeger equivalent from Snellen notation for near vision
function getJaegerEquivalent(snellen: SnellenNotation): string | null {
  const mapping: Record<SnellenNotation, string> = {
    "20/200": "J16",
    "20/100": "J11",
    "20/70":  "J9",
    "20/50":  "J5",
    "20/40":  "J3",
    "20/30":  "J2",
    "20/25":  "J1",
    "20/20":  "J1+",
    "20/15":  "—",
  };
  return mapping[snellen] || null;
}

export function ResultsStep({ result, onRetake, nextAssessmentHref, nextAssessmentLabel }: ResultsStepProps) {
  const isFar = result.testType === "far";

  const rightBest = result.rightEye.bestNotation;
  const leftBest  = result.leftEye.bestNotation;

  const duration = Math.round(result.durationSeconds);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  const distanceLabel = isFar
    ? `${result.testingDistance} metres`
    : `${result.testingDistance} cm`;

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg ${isFar ? "bg-[#0f4f4b]" : "bg-[#b5964d]"}`}>
          <Eye className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-black text-[#0f4f4b]">
          {isFar ? "Far Vision" : "Near Vision"} Assessment Complete
        </h2>
        <p className="text-sm text-[#0f4f4b]/60">
          Share these results with your doctor. Duration:{" "}
          <strong className="text-[#0f4f4b]">{mins > 0 ? `${mins}m ` : ""}{secs}s</strong>
        </p>
      </div>

      {/* Eye result cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <EyeCard label="Right Eye" notation={rightBest} isFar={isFar} />
        <EyeCard label="Left Eye"  notation={leftBest}  isFar={isFar} />
      </div>

      {/* Session details */}
      <div className="rounded-2xl bg-white/80 border border-[#0f4f4b]/12 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0f4f4b]/40">
          Session Details
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-[#0f4f4b]/55">Test type</span>
          <span className="font-bold text-[#0f4f4b] capitalize">{result.testType} vision</span>
          <span className="text-[#0f4f4b]/55">Distance</span>
          <span className="font-bold text-[#0f4f4b]">{distanceLabel}</span>
          <span className="text-[#0f4f4b]/55">Timer per line</span>
          <span className="font-bold text-[#0f4f4b]">{result.timerDuration} seconds</span>
          <span className="text-[#0f4f4b]/55">Calibration</span>
          <span className="font-bold text-[#0f4f4b]">{result.calibration.pxPerMm.toFixed(3)} px/mm</span>
          <span className="text-[#0f4f4b]/55">Lines (R / L)</span>
          <span className="font-bold text-[#0f4f4b]">
            {result.rightEye.lineResults.length} / {result.leftEye.lineResults.length}
          </span>
          <span className="text-[#0f4f4b]/55">Completed at</span>
          <span className="font-bold text-[#0f4f4b]">
            {new Date(result.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-[#b5964d]/6 border border-[#b5964d]/20 p-4">
        <p className="text-xs font-bold text-[#b5964d] mb-1">Important Clinical Note</p>
        <p className="text-xs text-[#0f4f4b]/60 leading-relaxed">
          This digital assessment provides a clinical estimate to assist your doctor&apos;s
          consultation. It does not replace a comprehensive in-person eye examination. Results
          must be interpreted by a qualified optometrist or ophthalmologist.
        </p>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Primary: go to next assessment if one is pending */}
        {nextAssessmentHref && (
          <Link
            href={nextAssessmentHref}
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-[#0f4f4b] text-white font-bold text-sm hover:bg-[#0a3a36] transition-colors"
          >
            <Eye className="h-4 w-4" />
            Start {nextAssessmentLabel ?? "Next Assessment"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        {/* Done — marks this assessment finished and returns to hub */}
        <Link
          href="/patient/assessment"
          className={`flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-bold text-sm transition-colors ${
            nextAssessmentHref
              ? "border border-[#0f4f4b]/25 text-[#0f4f4b] hover:bg-[#0f4f4b]/5"
              : "bg-[#0f4f4b] text-white hover:bg-[#0a3a36]"
          }`}
        >
          <Home className="h-4 w-4" />
          {nextAssessmentHref ? "Done — Back to Assessments" : "Mark Complete & Return"}
        </Link>

        {/* Retake — restart from instructions */}
        <Button
          onClick={onRetake}
          variant="ghost"
          size="lg"
          className="w-full h-12 rounded-2xl text-[#0f4f4b]/60 hover:text-[#0f4f4b] hover:bg-[#0f4f4b]/5 text-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Retake This Assessment
        </Button>
      </div>
    </div>
  );
}
