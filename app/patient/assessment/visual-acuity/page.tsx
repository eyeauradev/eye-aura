"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { visionAssessmentsService } from "@/services/firestore";
import type { VisionAssessmentDocument } from "@/types/firestore";
import { AcuitySession } from "@/modules/visual-acuity/AcuitySession";
import { Lock, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

const TYPE_LABEL: Record<string, string> = {
  far:  "Far Vision Assessment",
  near: "Near Vision Assessment",
};

export default function VisualAcuityPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("id");

  // ?type= lets the hub force a specific test for legacy combined-type docs
  const typeParam = searchParams.get("type") as "far" | "near" | null;

  const [checking, setChecking]           = useState(true);
  const [assessment, setAssessment]       = useState<VisionAssessmentDocument | null>(null);
  const [denied, setDenied]               = useState(false);
  const [deniedReason, setDeniedReason]   = useState<"expired" | "unauthorized" | "none">("none");
  const [nextHref, setNextHref]           = useState<string | undefined>(undefined);
  const [nextLabel, setNextLabel]         = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    if (!assessmentId) { setDenied(true); setDeniedReason("unauthorized"); setChecking(false); return; }

    (async () => {
      try {
        const doc = await visionAssessmentsService.getById(assessmentId);

        // Ownership check
        if (!doc || doc.patientId !== user.id) {
          setDenied(true); setDeniedReason("unauthorized");
          return;
        }

        // Expired — hard block
        if (doc.status === "expired") {
          setDenied(true); setDeniedReason("expired");
          return;
        }

        // Allow retry: completed but within expiresAt window
        const withinExpiry = !doc.expiresAt || new Date(doc.expiresAt) > new Date();
        if (!withinExpiry && doc.status === "completed") {
          setDenied(true); setDeniedReason("expired");
          return;
        }

        // Mark in_progress
        if (doc.status === "assigned" || doc.status === "completed") {
          await visionAssessmentsService.updateStatus(assessmentId, "in_progress");
        }
        setAssessment(doc);

        // Find the next pending sibling (same appointment, different doc, not yet completed)
        if (doc.appointmentId) {
          try {
            const all = await visionAssessmentsService.getByPatientId(user.id);
            const pending = all.find(
              (a) =>
                a.appointmentId === doc.appointmentId &&
                a.id !== assessmentId &&
                (a.status === "assigned" || a.status === "in_progress") &&
                (!a.expiresAt || new Date(a.expiresAt) > new Date())
            );
            if (pending) {
              setNextHref(`/patient/assessment/visual-acuity?id=${pending.id}`);
              setNextLabel(TYPE_LABEL[pending.assessmentTypes[0]] ?? "Next Assessment");
            }
          } catch {
            // non-fatal
          }
        }
      } catch (err) {
        console.error("[VisualAcuityPage] access check failed:", err);
        setDenied(true); setDeniedReason("unauthorized");
      } finally {
        setChecking(false);
      }
    })();
  }, [user, assessmentId]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 text-[#0f4f4b]/40 animate-spin" />
      </div>
    );
  }

  if (denied || !assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="h-16 w-16 rounded-2xl bg-[#0f4f4b]/6 flex items-center justify-center">
          <Lock className="h-7 w-7 text-[#0f4f4b]/30" />
        </div>
        <div>
          <p className="font-bold text-[#0f4f4b] text-lg mb-1">
            {deniedReason === "expired" ? "Assessment window closed" : "Assessment not available"}
          </p>
          <p className="text-sm text-[#0f4f4b]/55 max-w-xs">
            {deniedReason === "expired"
              ? "The retry window for this assessment has passed. Contact your doctor if you need a new assignment."
              : "This assessment was not assigned to you. Please contact your doctor."}
          </p>
        </div>
        <Link
          href="/patient/assessment"
          className="flex items-center gap-2 text-sm font-medium text-[#0f4f4b] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Assessments
        </Link>
      </div>
    );
  }

  // If ?type= is in the URL (legacy combined docs), use that type only
  const effectiveTypes = typeParam ? [typeParam] : assessment.assessmentTypes;

  return (
    <AcuitySession
      key={`${assessment.id}-${typeParam ?? "auto"}`}
      assessmentId={assessment.id}
      assessmentTypes={effectiveTypes}
      nextAssessmentHref={nextHref}
      nextAssessmentLabel={nextLabel}
    />
  );
}
