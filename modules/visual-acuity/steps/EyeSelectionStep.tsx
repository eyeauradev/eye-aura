"use client";

import { useState } from "react";
import { Eye, CheckCircle2, ArrowRight } from "lucide-react";
import { AssessmentActionButton } from "@/components/premium/assessment-wrapper";
import { cn } from "@/lib/utils";
import type { Eye as EyeType } from "../types";

interface EyeSelectionStepProps {
  /** Called when user selects an eye and confirms readiness */
  onContinue: (selectedEye: EyeType) => void;
}

/**
 * EyeSelectionStep allows the user to choose which eye to test first
 * during the far vision assessment. It displays two selection buttons,
 * instructions for covering the opposite eye, and a continue button
 * to proceed to the countdown timer.
 */
export function EyeSelectionStep({ onContinue }: EyeSelectionStepProps) {
  const [selectedEye, setSelectedEye] = useState<EyeType | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleEyeSelect = (eye: EyeType) => {
    setSelectedEye(eye);
    setConfirmed(false);
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  const handleContinue = () => {
    if (selectedEye) {
      onContinue(selectedEye);
    }
  };

  const oppositeEye = selectedEye === "right" ? "left" : "right";

  return (
    <div className="max-w-lg mx-auto w-full space-y-4 landscape:space-y-2 py-2">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="mx-auto h-10 w-10 landscape:h-8 landscape:w-8 rounded-xl bg-primary flex items-center justify-center">
          <Eye className="h-5 w-5 landscape:h-4 landscape:w-4 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Select Testing Eye</h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Choose which eye you want to test first
        </p>
      </div>

      {/* Eye selection buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleEyeSelect("right")}
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all h-[160px]",
            selectedEye === "right"
              ? "border-primary bg-primary/8 shadow-lg"
              : "border-border bg-card/50 hover:border-primary/50 hover:bg-card"
          )}
        >
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
              selectedEye === "right" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            <Eye className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-foreground">Right Eye</span>
          <span className="text-xs text-muted-foreground mt-1">Test first</span>
          <div className="h-5 mt-2">
            {selectedEye === "right" && (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>
        </button>

        <button
          onClick={() => handleEyeSelect("left")}
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all h-[160px]",
            selectedEye === "left"
              ? "border-primary bg-primary/8 shadow-lg"
              : "border-border bg-card/50 hover:border-primary/50 hover:bg-card"
          )}
        >
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
              selectedEye === "left" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            <Eye className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-foreground">Left Eye</span>
          <span className="text-xs text-muted-foreground mt-1">Test first</span>
          <div className="h-5 mt-2">
            {selectedEye === "left" && (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>
        </button>
      </div>

      {/* Instructions for covering the opposite eye */}
      {selectedEye && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-lg">👋</span>
            </div>
            <p className="font-semibold text-sm text-foreground">
              Cover your {oppositeEye} eye
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-10">
            Place your palm firmly over your <span className="font-semibold text-foreground">{oppositeEye} eye</span> without pressing on it. Keep your <span className="font-semibold text-foreground">{selectedEye} eye</span> open and ready for testing.
          </p>
        </div>
      )}

      {/* Confirmation checkbox */}
      {selectedEye && !confirmed && (
        <button
          onClick={handleConfirm}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card/80 hover:bg-card transition-colors text-left"
        >
          <div className="h-5 w-5 rounded border-2 border-muted-foreground flex items-center justify-center shrink-0" />
          <span className="text-sm text-muted-foreground">
            I have covered my {oppositeEye} eye and I'm ready to begin
          </span>
        </button>
      )}

      {selectedEye && confirmed && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/8 animate-in fade-in-50 duration-200">
          <div className="h-5 w-5 rounded bg-primary flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Ready to proceed to countdown
          </span>
        </div>
      )}

      {/* Continue button */}
      <AssessmentActionButton
        onClick={handleContinue}
        disabled={!confirmed}
        trailingIcon={<ArrowRight className="h-4 w-4" />}
      >
        Continue to Countdown
      </AssessmentActionButton>
    </div>
  );
}
