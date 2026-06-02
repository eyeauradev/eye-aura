"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { visionAssessmentsService } from "@/services/firestore";
import type { VisionAssessmentDocument } from "@/types/firestore";
import { AcuitySession } from "@/modules/visual-acuity/AcuitySession";
import {
  AssessmentFullscreenController,
} from "@/modules/visual-acuity/immersive";
import { Lock, ArrowLeft, RefreshCw, Eye } from "lucide-react";
import Link from "next/link";
import { ERROR_CODES, ERROR_MESSAGES, logError } from "@/lib/errors";
import type { AppError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Viewport width threshold for compact/immersive launch mode. */
const COMPACT_VIEWPORT_BREAKPOINT = 1024;

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

  // Detect immersive mode from URL param (set when compact viewport opens new tab)
  const isImmersiveMode = searchParams.get("immersive") === "1";

  const [checking, setChecking]           = useState(true);
  const [assessment, setAssessment]       = useState<VisionAssessmentDocument | null>(null);
  const [pageError, setPageError]         = useState<AppError | null>(null);
  const [nextHref, setNextHref]           = useState<string | undefined>(undefined);
  const [nextLabel, setNextLabel]         = useState<string | undefined>(undefined);
  const [launchedNewTab, setLaunchedNewTab] = useState(false);

  // ── Compact viewport: open new tab with ?immersive=1 ────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isImmersiveMode) return; // Already in immersive new tab

    const isCompactViewport = window.innerWidth < COMPACT_VIEWPORT_BREAKPOINT;
    if (isCompactViewport) {
      const url = new URL(window.location.href);
      url.searchParams.set("immersive", "1");
      window.open(url.toString(), "_blank");
      setLaunchedNewTab(true);
    }
  }, [isImmersiveMode]);

  useEffect(() => {
    if (!user) return;

    // Task 9.3 — invalid/missing ID parameter
    if (!assessmentId) {
      const appError: AppError = {
        code: ERROR_CODES.ASSESSMENT.INVALID_LINK,
        ...ERROR_MESSAGES[ERROR_CODES.ASSESSMENT.INVALID_LINK],
      };
      logError(appError.code, new Error("Missing assessment ID in URL"), "AssessmentPage");
      setPageError(appError);
      setChecking(false);
      return;
    }

    (async () => {
      try {
        const doc = await visionAssessmentsService.getById(assessmentId);

        // Ownership check — no valid assignment for this user
        if (!doc || doc.patientId !== user.id) {
          // Task 9.2 — unassigned assessment
          const appError: AppError = {
            code: ERROR_CODES.ASSESSMENT.NOT_ASSIGNED,
            ...ERROR_MESSAGES[ERROR_CODES.ASSESSMENT.NOT_ASSIGNED],
          };
          logError(appError.code, new Error("Assessment not assigned to user"), "AssessmentPage");
          setPageError(appError);
          return;
        }

        // Task 9.1 — expired assessment (hard block)
        if (doc.status === "expired") {
          const appError: AppError = {
            code: ERROR_CODES.ASSESSMENT.EXPIRED,
            ...ERROR_MESSAGES[ERROR_CODES.ASSESSMENT.EXPIRED],
          };
          logError(appError.code, new Error("Assessment expired"), "AssessmentPage");
          setPageError(appError);
          return;
        }

        // Allow retry: completed but within expiresAt window
        const withinExpiry = !doc.expiresAt || new Date(doc.expiresAt) > new Date();
        if (!withinExpiry && doc.status === "completed") {
          // Task 9.1 — expired retry window
          const appError: AppError = {
            code: ERROR_CODES.ASSESSMENT.EXPIRED,
            ...ERROR_MESSAGES[ERROR_CODES.ASSESSMENT.EXPIRED],
          };
          logError(appError.code, new Error("Assessment retry window expired"), "AssessmentPage");
          setPageError(appError);
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
        // Task 9.2 — fallback for unexpected access errors
        const appError: AppError = {
          code: ERROR_CODES.ASSESSMENT.NOT_ASSIGNED,
          ...ERROR_MESSAGES[ERROR_CODES.ASSESSMENT.NOT_ASSIGNED],
        };
        logError(appError.code, err, "AssessmentPage");
        setPageError(appError);
      } finally {
        setChecking(false);
      }
    })();
  }, [user, assessmentId]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // ── Original tab after launching immersive new tab ────────────────────────
  if (launchedNewTab) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Eye className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-bold text-foreground text-lg mb-1">Assessment Opened</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your assessment has been opened in a new window for the best immersive experience.
          </p>
        </div>
        <Link
          href="/patient/assessment"
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Assessments
        </Link>
      </div>
    );
  }

  if (pageError || !assessment) {
    const displayError = pageError ?? {
      code: ERROR_CODES.ASSESSMENT.NOT_ASSIGNED,
      ...ERROR_MESSAGES[ERROR_CODES.ASSESSMENT.NOT_ASSIGNED],
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-bold text-foreground text-lg mb-1">{displayError.title}</p>
          <p className="text-sm text-muted-foreground max-w-xs">{displayError.message}</p>
          {displayError.suggestion && (
            <p className="text-xs text-muted-foreground/70 max-w-xs mt-1">{displayError.suggestion}</p>
          )}
          <p className="text-[10px] text-muted-foreground/40 mt-2 font-mono">{displayError.code}</p>
        </div>
        <Link
          href="/patient/assessment"
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Assessments
        </Link>
      </div>
    );
  }

  // If ?type= is in the URL (legacy combined docs), use that type only
  const effectiveTypes = typeParam ? [typeParam] : assessment.assessmentTypes;

  const sessionElement = (
    <AcuitySession
      key={`${assessment.id}-${typeParam ?? "auto"}`}
      assessmentId={assessment.id}
      assessmentTypes={effectiveTypes}
      nextAssessmentHref={nextHref}
      nextAssessmentLabel={nextLabel}
    />
  );

  // ── Immersive mode (new tab on compact viewport): no PatientLayout chrome ─
  if (isImmersiveMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#f8f9fa]" style={{ height: "100dvh" }}>
        <AssessmentFullscreenController>
          {sessionElement}
        </AssessmentFullscreenController>
      </div>
    );
  }

  // ── Large viewport (≥ 1024px): render in-place; AssessmentImmersiveShell ─
  // handles the z-50 fixed overlay internally within AcuitySession
  return sessionElement;
}
