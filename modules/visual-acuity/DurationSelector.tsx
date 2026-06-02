"use client";

import { Timer, ArrowRight } from "lucide-react";
import { AssessmentActionButton } from "@/components/premium/assessment-wrapper";
import { cn } from "@/lib/utils";
import type { TimerDuration, TestType } from "./types";

interface DurationSelectorProps {
  testType: TestType;
  selected: TimerDuration;
  onSelect: (d: TimerDuration) => void;
  onContinue: () => void;
}

const OPTIONS: { value: TimerDuration; label: string; detail: string }[] = [
  { value: 3,  label: "3 seconds", detail: "Quick — confident readers" },
  { value: 5,  label: "5 seconds", detail: "Standard — most patients" },
  { value: 7,  label: "7 seconds", detail: "Relaxed — take your time" },
  { value: 10, label: "10 seconds", detail: "Extended — low vision or elderly" },
];

export function DurationSelector({
  testType,
  selected,
  onSelect,
  onContinue,
}: DurationSelectorProps) {
  const label = testType === "far" ? "letters" : "text";

  return (
    <div className="max-w-lg mx-auto w-full space-y-4 landscape:space-y-2 py-2">
      {/* Header — compact */}
      <div className="text-center space-y-1">
        <div className="mx-auto h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
          <Timer className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Reading Duration</h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-tight">
          Each set of {label} will be visible for this long before advancing.
        </p>
      </div>

      {/* Options — compact grid */}
      <div className="grid grid-cols-4 landscape:grid-cols-4 gap-2">
        {OPTIONS.map(({ value, label: lbl, detail }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 landscape:p-2 rounded-xl border text-center transition-all",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border hover:border-primary/30 hover:bg-primary/3"
              )}
            >
              {/* Circular timer visual */}
              <svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="19" fill="none"
                  className={isSelected ? "stroke-primary-foreground/25" : "stroke-border"}
                  strokeWidth="3.5"
                />
                <circle cx="24" cy="24" r="19" fill="none"
                  className={isSelected ? "stroke-primary-foreground" : "stroke-primary"}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={119.4}
                  strokeDashoffset={119.4 * (1 - value / 10)}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                />
                <text x="24" y="28" textAnchor="middle" fontSize="13" fontWeight="900"
                  className={isSelected ? "fill-primary-foreground" : "fill-foreground"}
                >
                  {value}s
                </text>
              </svg>
              <p className={cn(
                "text-xs font-bold",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {lbl}
              </p>
              <p className={cn(
                "text-[10px] leading-snug hidden landscape:hidden sm:block",
                isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {detail}
              </p>
            </button>
          );
        })}
      </div>

      {/* Context note — compact */}
      <div className="rounded-lg bg-primary/4 border border-border p-3 flex items-start gap-2">
        <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-snug">
          Timer starts automatically. Press <strong className="text-foreground">Unable to Read</strong> if needed. You can pause at any time.
        </p>
      </div>

      <AssessmentActionButton
        onClick={onContinue}
        trailingIcon={<ArrowRight className="h-4 w-4" />}
      >
        Begin Test
      </AssessmentActionButton>
    </div>
  );
}
