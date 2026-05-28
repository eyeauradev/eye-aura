"use client";

import { Eye, BookOpen, ArrowRight, Clock, Ruler, Smartphone } from "lucide-react";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { TestType } from "./types";

interface TestTypeSelectorProps {
  onSelect: (type: TestType) => void;
}

const CARDS = [
  {
    type: "far" as TestType,
    icon: Ruler,
    title: "Far Vision Test",
    subtitle: "Distance visual acuity",
    description:
      "Assess how clearly you can read letters at a distance of 3 metres. Tests the quality of your long-range focus using a calibrated Snellen chart.",
    duration: "4–6 min",
    prep: "Stand 3 m from device",
    notation: "Snellen (6/6)",
    bullets: [
      "Calibrated optotype sizing",
      "Right & left eye separately",
      "Auto-progresses by timer",
      "Doctor-guided via call",
    ],
  },
  {
    type: "near" as TestType,
    icon: BookOpen,
    title: "Near Vision Test",
    subtitle: "Reading visual acuity",
    description:
      "Assess how clearly you can read text at reading distance (~40 cm). Evaluates near focus, presbyopia, and digital reading comfort.",
    duration: "4–6 min",
    prep: "Hold device at arm's length (~40 cm)",
    notation: "N-point (N5–N24)",
    bullets: [
      "Progressively smaller text",
      "Right & left eye separately",
      "Auto-progresses by timer",
      "Doctor-guided via call",
    ],
  },
];

export function TestTypeSelector({ onSelect }: TestTypeSelectorProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className={cn(TYPOGRAPHY.label)}>
            Visual Acuity Assessment
          </span>
        </div>
        <h1 className={cn(TYPOGRAPHY.heading, "text-3xl leading-tight")}>
          Which test would you like?
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Your doctor will guide you through the selected test via your active call.
        </p>
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        {CARDS.map(
          ({ type, icon: Icon, title, subtitle, description, duration, prep, notation, bullets }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="group text-left rounded-3xl bg-card border border-border p-6 space-y-5 hover:border-primary/25 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
            >
              {/* Icon + badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg">
                  <Icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mt-1 text-primary bg-primary/10">
                  {notation}
                </span>
              </div>

              {/* Title */}
              <div>
                <p className={cn(TYPOGRAPHY.label, "mb-0.5")}>
                  {subtitle}
                </p>
                <h3 className={cn(TYPOGRAPHY.subheading, "text-xl")}>{title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
              </div>

              {/* Bullets */}
              <ul className="space-y-1.5">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Smartphone className="h-3 w-3" />
                    <span>{prep}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                  Select <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>
          )
        )}
      </div>

      {/* Advisory */}
      <div className="rounded-2xl bg-accent/6 border border-accent/20 p-4">
        <p className="text-xs font-bold text-accent-foreground mb-1">Doctor supervision required</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ensure you are already connected to your doctor on Google Meet, Zoom, or phone before
          beginning any assessment. Your doctor will confirm results in real-time.
        </p>
      </div>
    </div>
  );
}
