"use client";

import { Eye, Shield, Ruler, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onBegin: () => void;
}

const highlights = [
  {
    icon: Ruler,
    title: "Calibration-based accuracy",
    body: "Your screen is calibrated to physical card dimensions before testing begins.",
  },
  {
    icon: Shield,
    title: "Clinical-grade letter sizing",
    body: "Each Snellen optotype is rendered at mathematically exact physical sizes.",
  },
  {
    icon: Video,
    title: "Doctor-guided testing",
    body: "Perform this assessment while connected to your doctor on any call platform.",
  },
  {
    icon: Eye,
    title: "Each eye tested separately",
    body: "Right and left eyes are assessed independently for precise results.",
  },
];

export function WelcomeStep({ onBegin }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-xl mx-auto gap-8 py-4">
      {/* Icon badge */}
      <div className="relative">
        <div className="h-20 w-20 rounded-3xl bg-[#0f4f4b] flex items-center justify-center shadow-[0_12px_40px_rgba(15,79,75,0.28)]">
          <Eye className="h-10 w-10 text-white" />
        </div>
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#b5964d] border-2 border-white" />
      </div>

      {/* Heading */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0f4f4b]/20 bg-[#0f4f4b]/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1a9e98] animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#0f4f4b]">
            Visual Acuity Assessment
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#0f4f4b] leading-tight">
          Let&apos;s test your<br />
          <span className="bg-gradient-to-r from-[#0f4f4b] to-[#1a9e98] bg-clip-text text-transparent">
            vision clarity
          </span>
        </h1>
        <p className="text-[#0f4f4b]/65 text-base leading-relaxed max-w-sm mx-auto">
          A calibrated digital Snellen chart test. Takes about 5–8 minutes.
          Your doctor will guide you through verbally.
        </p>
      </div>

      {/* Highlights grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {highlights.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl bg-white/70 border border-[#0f4f4b]/10 p-4"
          >
            <div className="h-9 w-9 shrink-0 rounded-xl bg-[#0f4f4b]/8 flex items-center justify-center">
              <Icon className="h-4.5 w-4.5 text-[#0f4f4b]" />
            </div>
            <div>
              <p className="font-bold text-[#0f4f4b] text-sm">{title}</p>
              <p className="text-xs text-[#0f4f4b]/55 mt-0.5 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Button
        onClick={onBegin}
        size="lg"
        className="w-full sm:w-auto px-12 h-14 text-base rounded-2xl bg-[#0f4f4b] hover:bg-[#0a3a36] shadow-[0_8px_32px_rgba(15,79,75,0.3)] transition-all"
      >
        Begin Assessment
      </Button>

      <p className="text-xs text-[#0f4f4b]/40 max-w-xs">
        Ensure your doctor is already connected on your call platform before proceeding.
      </p>
    </div>
  );
}
