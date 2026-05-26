"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { visionAssessmentsService, usersService } from "@/services/firestore";
import type { VisionAssessmentDocument, UserDocument } from "@/types/firestore";
import { Eye, BookOpen, ArrowRight, Clock, Lock, CheckCircle2, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";

const TYPE_LABELS: Record<string, { label: string; icon: typeof Eye; desc: string }> = {
  far:  { label: "Far Vision",  icon: Eye,      desc: "3-metre Snellen chart" },
  near: { label: "Near Vision", icon: BookOpen, desc: "40 cm near reading chart" },
};

// Expand each assessment into one entry per type so every type gets its own card + action
type DisplayEntry = { assessment: VisionAssessmentDocument; type: string };
function getEntries(list: VisionAssessmentDocument[]): DisplayEntry[] {
  return list.flatMap((a) => a.assessmentTypes.map((type) => ({ assessment: a, type })));
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  assigned:    { label: "Ready",       color: "text-[#0f4f4b]",   bg: "bg-[#0f4f4b]/8 border-[#0f4f4b]/15" },
  in_progress: { label: "In Progress", color: "text-[#b5964d]",   bg: "bg-[#b5964d]/8 border-[#b5964d]/20" },
  completed:   { label: "Completed",   color: "text-green-700",   bg: "bg-green-50 border-green-200" },
  expired:     { label: "Expired",     color: "text-gray-500",    bg: "bg-gray-50 border-gray-200" },
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
        <RefreshCw className="h-6 w-6 text-[#0f4f4b]/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-[#0f4f4b] mb-1">My Assessments</h1>
        <p className="text-sm text-[#0f4f4b]/55">
          Assessments assigned by your doctor will appear here.
        </p>
      </div>

      {/* Active / Ready */}
      {active.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f4f4b]/40">
            Ready to Start
          </p>
          {getEntries(active).map(({ assessment, type }) => (
            <AssessmentCard
              key={`${assessment.id}-${type}`}
              assessment={assessment}
              type={type}
              doctor={assessment.doctorId ? doctorCache[assessment.doctorId] : undefined}
            />
          ))}
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f4f4b]/40">
            Completed
          </p>
          {getEntries(completed).map(({ assessment, type }) => (
            <AssessmentCard
              key={`${assessment.id}-${type}`}
              assessment={assessment}
              type={type}
              doctor={assessment.doctorId ? doctorCache[assessment.doctorId] : undefined}
            />
          ))}
        </section>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f4f4b]/40">
            Expired
          </p>
          {getEntries(expired).map(({ assessment, type }) => (
            <AssessmentCard
              key={`${assessment.id}-${type}`}
              assessment={assessment}
              type={type}
              doctor={assessment.doctorId ? doctorCache[assessment.doctorId] : undefined}
            />
          ))}
        </section>
      )}

      {/* Empty state */}
      {assessments.length === 0 && (
        <div className="rounded-3xl border border-[#0f4f4b]/10 bg-white/60 p-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#0f4f4b]/6 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-[#0f4f4b]/30" />
          </div>
          <p className="font-bold text-[#0f4f4b] mb-1">No assessments assigned yet</p>
          <p className="text-sm text-[#0f4f4b]/50 leading-relaxed max-w-xs mx-auto">
            Your doctor will assign vision assessments when needed. Book a consultation to get started.
          </p>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-2xl bg-[#b5964d]/6 border border-[#b5964d]/20 p-4">
        <p className="text-xs font-bold text-[#b5964d] mb-1">Doctor-controlled assessments</p>
        <p className="text-xs text-[#0f4f4b]/60 leading-relaxed">
          Visual acuity assessments are assigned by your doctor during a consultation.
          You cannot self-start an assessment.
        </p>
      </div>
    </div>
  );
}

function AssessmentCard({
  assessment,
  type,
  doctor,
}: {
  assessment: VisionAssessmentDocument;
  type: string;
  doctor?: UserDocument;
}) {
  const t = TYPE_LABELS[type];
  const Icon = t?.icon ?? Eye;

  const status = STATUS_CONFIG[assessment.status] ?? STATUS_CONFIG.expired;
  const withinExpiry = !assessment.expiresAt || new Date(assessment.expiresAt) > new Date();
  const canStart = (assessment.status === "assigned" || assessment.status === "in_progress") && withinExpiry;
  const canRetry = assessment.status === "completed" && withinExpiry;

  // For old combined docs (multiple types in one doc) pass ?type= so the session
  // knows which test to run. Single-type docs don't need it (cleaner URL).
  const typeParam = assessment.assessmentTypes.length > 1 ? `&type=${type}` : "";
  const href = `/patient/assessment/visual-acuity?id=${assessment.id}${typeParam}`;

  return (
    <div className={`rounded-2xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
      (canStart || canRetry) ? "shadow-sm hover:shadow-md transition-shadow" : "opacity-60"
    }`}>
      {/* Type icon + label */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-[#0f4f4b]/8 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-[#0f4f4b]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#0f4f4b] leading-none mb-0.5">{t?.label ?? type}</p>
          <p className="text-[11px] text-[#0f4f4b]/50">{t?.desc}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 text-xs text-[#0f4f4b]/50 shrink-0">
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${status.bg} ${status.color}`}>
          {assessment.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
          {status.label}
        </span>
      </div>

      {/* Action */}
      {canStart && (
        <Link
          href={href}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#0f4f4b] text-white text-xs font-bold hover:bg-[#0a3a36] transition-colors shrink-0"
        >
          Begin <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {canRetry && (
        <Link
          href={href}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-bold hover:bg-[#0f4f4b]/5 transition-colors shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Link>
      )}
    </div>
  );
}
