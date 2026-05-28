"use client";

import { Timer, ArrowRight } from "lucide-react";
import { AssessmentActionButton } from "@/components/premium/assessment-wrapper";
import { TYPOGRAPHY } from "@/lib/design-tokens";
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
    <div className="max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center">
          <Timer className="h-7 w-7 text-primary" />
        </div>
        <h2 className={cn(TYPOGRAPHY.heading)}>Reading Duration</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Each set of {label} will be visible for this long before automatically
          advancing to the next level. Your doctor can advise the best setting.
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ value, label: lbl, detail }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={cn(
                "flex flex-col items-center gap-2 p-5 rounded-2xl border text-center transition-all",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border hover:border-primary/30 hover:bg-primary/3"
              )}
            >
              {/* Circular timer visual */}
              <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
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
                "text-sm font-bold",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {lbl}
              </p>
              <p className={cn(
                "text-xs leading-snug",
                isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {detail}
              </p>
            </button>
          );
        })}
      </div>

      {/* Context note */}
      <div className="rounded-xl bg-primary/4 border border-border p-4 flex items-start gap-3">
        <Timer className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          The timer starts automatically as soon as each line appears. Press
          <strong className="text-foreground"> Unable to Read</strong> if you cannot read
          the {label} before the timer expires. You can also pause at any time.
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
