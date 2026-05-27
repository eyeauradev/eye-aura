"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { visionAssessmentsService, usersService } from "@/services/firestore";
import type { VisionAssessmentDocument, UserDocument } from "@/types/firestore";
import { Eye, BookOpen, ArrowRight, Clock, Lock, CheckCircle2, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
} from "@/components/patient-portal";

const TYPE_LABELS: Record<string, { label: string; icon: typeof Eye; desc: string }> = {
  far:  { label: "Far Vision",  icon: Eye,      desc: "3-metre Snellen chart" },
  near: { label: "Near Vision", icon: BookOpen, desc: "40 cm near reading chart" },
};

// Expand each assessment into one entry per type so every type gets its own card + action
type DisplayEntry = { assessment: VisionAssessmentDocument; type: string };
function getEntries(list: VisionAssessmentDocument[]): DisplayEntry[] {
  return list.flatMap((a) => a.assessmentTypes.map((type) => ({ assessment: a, type })));
}

const STATUS_VARIANT_MAP: Record<string, "confirmed" | "pending" | "completed" | "inactive"> = {
  assigned: "confirmed",
  in_progress: "pending",
  completed: "completed",
  expired: "inactive",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  assigned: "Ready",
  in_progress: "In Progress",
  completed: "Completed",
  expired: "Expired",
};

export default function AssessmentHubPage() {
  const { user } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [assessments, setAssessments] = useState<VisionAssessmentDocument[]>([]);
  const [doctorCache, setDoctorCache] = useState<Record<string, UserDocument>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const list = await visionAssessmentsService.getByPatientId(user.id);
        setAssessments(list);

        const doctorIds = [...new Set(list.map((a) => a.doctorId).filter(Boolean) as string[])];
        const entries = await Promise.all(doctorIds.map(async (id) => {
          const d = await usersService.getById(id);
          return [id, d] as [string, UserDocument | null];
        }));
        const cache: Record<string, UserDocument> = {};
        entries.forEach(([id, d]) => { if (d) cache[id] = d; });
        setDoctorCache(cache);
      } catch (err) {
        console.error("Failed to load assessments:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const active    = assessments.filter((a) => a.status === "assigned" || a.status === "in_progress");
  const completed = assessments.filter((a) => a.status === "completed");
  const expired   = assessments.filter((a) => a.status === "expired");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <RefreshCw className="h-6 w-6 text-primary/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1">My Assessments</h1>
        <p className="text-sm text-muted-foreground">
          Assessments assigned by your doctor will appear here.
        </p>
      </div>

      {/* Active / Ready */}
      {active.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Ready to Start" className="mt-0 mb-3" />
          {getEntries(active).map(({ assessment, type }, i) => (
            <AssessmentCard
              key={`${assessment.id}-${type}`}
              assessment={assessment}
              type={type}
              doctor={assessment.doctorId ? doctorCache[assessment.doctorId] : undefined}
              index={i}
            />
          ))}
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Completed" className="mt-0 mb-3" />
          {getEntries(completed).map(({ assessment, type }, i) => (
            <AssessmentCard
              key={`${assessment.id}-${type}`}
              assessment={assessment}
              type={type}
              doctor={assessment.doctorId ? doctorCache[assessment.doctorId] : undefined}
              index={i}
            />
          ))}
        </section>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Expired" className="mt-0 mb-3" />
          {getEntries(expired).map(({ assessment, type }, i) => (
            <AssessmentCard
              key={`${assessment.id}-${type}`}
              assessment={assessment}
              type={type}
              doctor={assessment.doctorId ? doctorCache[assessment.doctorId] : undefined}
              index={i}
            />
          ))}
        </section>
      )}

      {/* Empty state */}
      {assessments.length === 0 && (
        <GlassPanel padding="lg" className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/6 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary/30" />
          </div>
          <p className="font-bold text-foreground mb-1">No assessments assigned yet</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Your doctor will assign vision assessments when needed. Book a consultation to get started.
          </p>
        </GlassPanel>
      )}

      {/* Info note */}
      <GlassPanel padding="sm" className="bg-secondary/6 border-secondary/20">
        <p className="text-xs font-bold text-secondary mb-1">Doctor-controlled assessments</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Visual acuity assessments are assigned by your doctor during a consultation.
          You cannot self-start an assessment.
        </p>
      </GlassPanel>
    </div>
  );
}

function AssessmentCard({
  assessment,
  type,
  doctor,
  index,
}: {
  assessment: VisionAssessmentDocument;
  type: string;
  doctor?: UserDocument;
  index: number;
}) {
  const t = TYPE_LABELS[type];
  const Icon = t?.icon ?? Eye;

  const withinExpiry = !assessment.expiresAt || new Date(assessment.expiresAt) > new Date();
  const canStart = (assessment.status === "assigned" || assessment.status === "in_progress") && withinExpiry;
  const canRetry = assessment.status === "completed" && withinExpiry;

  // For old combined docs (multiple types in one doc) pass ?type= so the session
  // knows which test to run. Single-type docs don't need it (cleaner URL).
  const typeParam = assessment.assessmentTypes.length > 1 ? `&type=${type}` : "";
  const href = `/patient/assessment/visual-acuity?id=${assessment.id}${typeParam}`;

  return (
    <DashboardCard
      staggerIndex={index}
      className={`flex flex-col sm:flex-row sm:items-center gap-4 ${
        !(canStart || canRetry) ? "opacity-60" : ""
      }`}
    >
      {/* Type icon + label */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-none mb-0.5">{t?.label ?? type}</p>
          <p className="text-[11px] text-muted-foreground">{t?.desc}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground shrink-0">
        {doctor && (
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Dr. {doctor.displayName ?? "Doctor"}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(assessment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
        <StatusBadge variant={STATUS_VARIANT_MAP[assessment.status] || "inactive"} size="sm">
          {STATUS_LABEL_MAP[assessment.status] || assessment.status}
        </StatusBadge>
      </div>

      {/* Action */}
      {canStart && (
        <Link href={href}>
          <PremiumButton size="sm" trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}>
            Begin
          </PremiumButton>
        </Link>
      )}
      {canRetry && (
        <Link href={href}>
          <PremiumButton variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Retry
          </PremiumButton>
        </Link>
      )}
    </DashboardCard>
  );
}
