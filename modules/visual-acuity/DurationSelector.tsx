"use client";

import { Timer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#0f4f4b]/8 flex items-center justify-center">
          <Timer className="h-7 w-7 text-[#0f4f4b]" />
        </div>
        <h2 className="text-2xl font-black text-[#0f4f4b]">Reading Duration</h2>
        <p className="text-sm text-[#0f4f4b]/60 max-w-xs mx-auto leading-relaxed">
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
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border text-center transition-all ${
                isSelected
                  ? "bg-[#0f4f4b] border-[#0f4f4b] text-white"
                  : "bg-white border-[#0f4f4b]/12 hover:border-[#0f4f4b]/30 hover:bg-[#0f4f4b]/3"
              }`}
            >
              {/* Circular timer visual */}
              <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="19" fill="none"
                  stroke={isSelected ? "rgba(255,255,255,0.25)" : "rgba(15,79,75,0.12)"}
                  strokeWidth="3.5"
                />
                <circle cx="24" cy="24" r="19" fill="none"
                  stroke={isSelected ? "white" : "#0f4f4b"}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={119.4}
                  strokeDashoffset={119.4 * (1 - value / 10)}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                />
                <text x="24" y="28" textAnchor="middle" fontSize="13" fontWeight="900"
                  fill={isSelected ? "white" : "#0f4f4b"}
                >
                  {value}s
                </text>
              </svg>
              <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-[#0f4f4b]"}`}>
                {lbl}
              </p>
              <p className={`text-xs leading-snug ${isSelected ? "text-white/70" : "text-[#0f4f4b]/50"}`}>
                {detail}
              </p>
            </button>
          );
        })}
      </div>

      {/* Context note */}
      <div className="rounded-xl bg-[#0f4f4b]/4 border border-[#0f4f4b]/10 p-4 flex items-start gap-3">
        <Timer className="h-4 w-4 text-[#0f4f4b]/40 shrink-0 mt-0.5" />
        <p className="text-xs text-[#0f4f4b]/60 leading-relaxed">
          The timer starts automatically as soon as each line appears. Press
          <strong className="text-[#0f4f4b]"> Unable to Read</strong> if you cannot read
          the {label} before the timer expires. You can also pause at any time.
        </p>
      </div>

      <Button
        onClick={onContinue}
        size="lg"
        className="w-full h-14 text-base rounded-2xl bg-[#0f4f4b] hover:bg-[#0a3a36] shadow-[0_8px_32px_rgba(15,79,75,0.25)]"
      >
        Begin Test
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
