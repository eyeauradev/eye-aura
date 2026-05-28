"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ArrowRight, Ruler, BookOpen } from "lucide-react";
import { AssessmentActionButton } from "@/components/premium/assessment-wrapper";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { TestType } from "../types";

interface InstructionsStepProps {
  testType: TestType;
  onContinue: () => void;
}

const FAR_INSTRUCTIONS = [
  "Stand in a well-lit room. Avoid glare on your screen.",
  "Stand exactly 3 metres away from the device — measure if needed.",
  "Prop or hold your device completely still at eye level.",
  "Wear your existing glasses or contacts if your doctor instructed you to.",
  "Cover one eye firmly with your palm. Do not press on the eye.",
  "Read each set of letters aloud clearly so your doctor can hear you.",
  "Do not tilt forward or move closer to the screen during the test.",
];

const NEAR_INSTRUCTIONS = [
  "Sit in a well-lit room. Avoid reflections or glare on your screen.",
  "Hold the device at approximately 35–40 cm from your eyes (arm's length).",
  "Keep the device stable — do not tilt or move it during a reading.",
  "Wear your existing reading glasses or contacts if instructed.",
  "Cover one eye firmly with your palm. Do not press on the eye.",
  "Read each line of text aloud clearly so your doctor can hear you.",
  "Maintain the same distance throughout — do not bring the screen closer.",
];

export function InstructionsStep({ testType, onContinue }: InstructionsStepProps) {
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set());

  const isFar = testType === "far";
  const instructions = isFar ? FAR_INSTRUCTIONS : NEAR_INSTRUCTIONS;

  const toggle = (i: number) => {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const allDone = acknowledged.size === instructions.length;

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
          {isFar
            ? <Ruler className="h-7 w-7 text-primary-foreground" />
            : <BookOpen className="h-7 w-7 text-primary-foreground" />
          }
        </div>
        <h2 className={cn(TYPOGRAPHY.heading)}>Before We Begin</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isFar
            ? "Far vision test at 3 metres. Please confirm each preparation step."
            : "Near vision test at 35–40 cm. Please confirm each preparation step."}
        </p>
      </div>

      {/* Distance callout */}
      <div className="rounded-2xl border border-border bg-primary/5 p-4 flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 font-black text-primary-foreground text-lg">
          {isFar ? "3m" : "40cm"}
        </div>
        <div>
          <p className={cn(TYPOGRAPHY.body, "font-semibold text-sm")}>
            {isFar ? "Testing distance: 3 metres" : "Viewing distance: ~40 cm"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {isFar
              ? "Stand 3 metres from your screen. This is fixed for clinical accuracy."
              : "Hold device at comfortable reading distance — roughly arm's length."}
          </p>
        </div>
      </div>

      {/* Instruction checklist */}
      <div className="rounded-2xl bg-card/80 border border-border p-5 space-y-3">
        <p className={cn(TYPOGRAPHY.label)}>
          Preparation Checklist
        </p>
        <div className="space-y-2">
          {instructions.map((text, i) => {
            const done = acknowledged.has(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                  done
                    ? "bg-primary/6 border-primary/20"
                    : "bg-transparent border-border hover:bg-muted/50"
                )}
              >
                {done
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  : <Circle className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                }
                <span className={cn(
                  "text-sm leading-relaxed",
                  done ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {text}
                </span>
              </button>
            );
          })}
        </div>
        {!allDone && (
          <p className="text-xs text-accent-foreground font-medium pl-1">
            Tap each item to confirm you have read it.
          </p>
        )}
      </div>

      <AssessmentActionButton
        onClick={onContinue}
        disabled={!allDone}
        trailingIcon={<ArrowRight className="h-4 w-4" />}
      >
        Proceed to Calibration
      </AssessmentActionButton>
    </div>
  );
}
