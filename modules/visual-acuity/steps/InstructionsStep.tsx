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
    <div className="max-w-lg mx-auto w-full space-y-4 landscape:space-y-2 py-2">
      {/* Header — compact in landscape */}
      <div className="text-center space-y-1">
        <div className="mx-auto h-10 w-10 landscape:h-8 landscape:w-8 rounded-xl bg-primary flex items-center justify-center">
          {isFar
            ? <Ruler className="h-5 w-5 landscape:h-4 landscape:w-4 text-primary-foreground" />
            : <BookOpen className="h-5 w-5 landscape:h-4 landscape:w-4 text-primary-foreground" />
          }
        </div>
        <h2 className="text-lg font-bold text-foreground">Before We Begin</h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {isFar
            ? "Far vision test at 3 metres. Confirm each step."
            : "Near vision test at 35–40 cm. Confirm each step."}
        </p>
      </div>

      {/* Distance callout — compact */}
      <div className="rounded-xl border border-border bg-primary/5 p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 font-black text-primary-foreground text-sm">
          {isFar ? "3m" : "40cm"}
        </div>
        <div>
          <p className="font-semibold text-xs text-foreground">
            {isFar ? "Testing distance: 3 metres" : "Viewing distance: ~40 cm"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
            {isFar
              ? "Stand 3 metres from your screen."
              : "Hold device at comfortable reading distance."}
          </p>
        </div>
      </div>

      {/* Instruction checklist — compact items */}
      <div className="rounded-xl bg-card/80 border border-border p-3 space-y-1.5">
        <p className={cn(TYPOGRAPHY.label)}>
          Preparation Checklist
        </p>
        <div className="space-y-1">
          {instructions.map((text, i) => {
            const done = acknowledged.has(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={cn(
                  "w-full flex items-start gap-2 p-2 rounded-lg border text-left transition-all",
                  done
                    ? "bg-primary/6 border-primary/20"
                    : "bg-transparent border-border hover:bg-muted/50"
                )}
              >
                {done
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  : <Circle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                }
                <span className={cn(
                  "text-xs leading-snug",
                  done ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {text}
                </span>
              </button>
            );
          })}
        </div>
        {!allDone && (
          <p className="text-[10px] text-accent-foreground font-medium pl-1">
            Tap each item to confirm.
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
