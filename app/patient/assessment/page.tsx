"use client";

import Link from "next/link";
import { Eye, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ASSESSMENTS = [
  {
    href: "/patient/assessment/visual-acuity",
    icon: Eye,
    title: "Visual Acuity Test",
    description:
      "Calibrated Snellen chart assessment. Tests distance vision in each eye with clinical-grade accuracy.",
    duration: "5–8 min",
    badge: "Available",
    badgeColor: "bg-[#0f4f4b]/8 text-[#0f4f4b]",
    available: true,
  },
];

const COMING_SOON = [
  { title: "Colour Vision Test", description: "Ishihara plates for colour deficiency screening." },
  { title: "Contrast Sensitivity", description: "Pelli-Robson contrast sensitivity assessment." },
  { title: "Near Vision (ADD)", description: "Reading vision and near add power estimation." },
];

export default function AssessmentHubPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-primary mb-1">
          Eye Assessments
        </h1>
        <p className="text-sm text-muted-foreground">
          Doctor-guided digital assessments. Perform during your consultation.
        </p>
      </div>

      {/* Available assessments */}
      <div className="grid gap-4 sm:grid-cols-2">
        {ASSESSMENTS.map(({ href, icon: Icon, title, description, duration, badge, badgeColor }) => (
          <Link key={href} href={href} className="block group">
            <Card className="border-[#0f4f4b]/10 hover:border-[#0f4f4b]/25 hover:shadow-lg transition-all h-full cursor-pointer">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-[#0f4f4b] flex items-center justify-center shadow-[0_6px_20px_rgba(15,79,75,0.22)] shrink-0">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${badgeColor}`}>
                    {badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-[#0f4f4b] mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{duration}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#0f4f4b] group-hover:gap-2 transition-all">
                    Begin <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Coming soon */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Coming Soon
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {COMING_SOON.map(({ title, description }) => (
            <div
              key={title}
              className="rounded-2xl bg-white/50 border border-[#0f4f4b]/8 p-4 opacity-60"
            >
              <p className="font-bold text-sm text-[#0f4f4b] mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Guidance */}
      <div className="rounded-2xl bg-[#b5964d]/6 border border-[#b5964d]/20 p-4">
        <p className="text-xs font-bold text-[#b5964d] mb-1">
          These assessments require doctor supervision
        </p>
        <p className="text-xs text-[#0f4f4b]/60 leading-relaxed">
          Start your consultation first and connect with your doctor via Google Meet, Zoom, or
          phone. Your doctor will guide you through each test in real-time.
        </p>
      </div>
    </div>
  );
}
