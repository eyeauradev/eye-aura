"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { visionAssessmentsService } from "@/services/firestore";
import type { VisionAssessmentDocument, VisionAssessmentStatus } from "@/types/firestore";
import {
  ArrowLeft,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { StatusBadge, type StatusVariant } from "@/components/premium/status-badge";
import { DashboardCard } from "@/components/premium/dashboard-card";
import { Card, CardContent } from "@/components/ui/card";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import Link from "next/link";

// Map assessment status to StatusBadge variant
function getStatusVariant(status: VisionAssessmentStatus): StatusVariant {
  switch (status) {
    case "assigned":
      return "pending";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "expired":
      return "inactive";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

// Human-readable status label
function getStatusLabel(status: VisionAssessmentStatus): string {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

// Human-readable assessment type label
function getTypeLabel(type: string): string {
  switch (type) {
    case "far":
      return "Far Vision";
    case "near":
      return "Near Vision";
    case "color_vision":
      return "Color Vision";
    case "contrast_sensitivity":
      return "Contrast Sensitivity";
    case "custom":
      return "Custom";
    default:
      return type;
  }
}

// Group assessments by month/year, preserving descending order
function groupByMonthYear(
  assessments: VisionAssessmentDocument[]
): Array<{ label: string; items: VisionAssessmentDocument[] }> {
  const groups = new Map<string, VisionAssessmentDocument[]>();

  for (const assessment of assessments) {
    const date = new Date(assessment.createdAt);
    const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(assessment);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function AssessmentHistoryPage() {
  const params = useParams();
  const { user } = useAuth();
  const patientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<VisionAssessmentDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssessments() {
      if (!patientId || !user) return;

      try {
        setLoading(true);
        setError(null);
        const results = await visionAssessmentsService.getAllForPatientByDoctor(
          patientId,
          user.id
        );
        setAssessments(results);
      } catch (err) {
        console.error("Error loading assessment history:", err);
        setError("Failed to load assessment history. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadAssessments();
  }, [patientId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment history...</p>
        </div>
      </div>
    );
  }

  const grouped = groupByMonthYear(assessments);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href={`/doctor/patients/${patientId}`}>
          <PremiumButton
            variant="ghost"
            className="mb-4"
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Patient Profile
          </PremiumButton>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={TYPOGRAPHY.heading}>Assessment History</h1>
            <p className="text-base text-muted-foreground mt-1">
              All vision assessments assigned to this patient
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            <span>
              {assessments.length} assessment{assessments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!error && assessments.length === 0 && (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-8 sm:p-12 text-center">
            <Eye className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium text-foreground">
              No assessments yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Vision assessments you assign to this patient will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grouped assessment cards */}
      {!error && grouped.map(({ label, items }) => (
        <div key={label} className="space-y-4">
          {/* Month/year divider */}
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Assessment cards for this month */}
          {items.map((assessment, index) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              staggerIndex={index}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Individual Assessment Card ───────────────────────────────────────────────

interface AssessmentCardProps {
  assessment: VisionAssessmentDocument;
  staggerIndex?: number;
}

function AssessmentCard({ assessment, staggerIndex = 0 }: AssessmentCardProps) {
  const typeLabels = assessment.assessmentTypes.map(getTypeLabel).join(", ");
  const createdDate = new Date(assessment.createdAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const createdTime = new Date(assessment.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <DashboardCard staggerIndex={staggerIndex}>
      {/* Card header: type + status + date */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{typeLabels}</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{createdDate}</span>
              <span className="text-muted-foreground/50">·</span>
              <Clock className="h-3.5 w-3.5" />
              <span>{createdTime}</span>
            </div>
          </div>
        </div>
        <StatusBadge variant={getStatusVariant(assessment.status)}>
          {getStatusLabel(assessment.status)}
        </StatusBadge>
      </div>

      {/* Results section */}
      {assessment.status === "completed" &&
        (assessment.resultFar || assessment.resultNear) && (
          <div className="mb-4 p-3 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patient Results
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assessment.resultFar && (
                <ResultBlock
                  label="Far Vision"
                  rightEye={assessment.resultFar.rightEye}
                  leftEye={assessment.resultFar.leftEye}
                  completedAt={assessment.resultFar.completedAt}
                />
              )}
              {assessment.resultNear && (
                <ResultBlock
                  label="Near Vision"
                  rightEye={assessment.resultNear.rightEye}
                  leftEye={assessment.resultNear.leftEye}
                  completedAt={assessment.resultNear.completedAt}
                />
              )}
            </div>
          </div>
        )}

      {/* Doctor overrides */}
      {(assessment.doctorCorrectedFar || assessment.doctorCorrectedNear) && (
        <div className="mb-4 p-3 rounded-2xl bg-secondary/8 border border-secondary/15 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Doctor Corrections
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assessment.doctorCorrectedFar && (
              <ResultBlock
                label="Corrected Far Vision"
                rightEye={assessment.doctorCorrectedFar.rightEye}
                leftEye={assessment.doctorCorrectedFar.leftEye}
              />
            )}
            {assessment.doctorCorrectedNear && (
              <ResultBlock
                label="Corrected Near Vision"
                rightEye={assessment.doctorCorrectedNear.rightEye}
                leftEye={assessment.doctorCorrectedNear.leftEye}
              />
            )}
          </div>
        </div>
      )}

      {/* Clinical remarks */}
      {assessment.doctorRemarks && (
        <div className="mb-4 flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Clinical Remarks
            </p>
            <p className="text-sm text-foreground">{assessment.doctorRemarks}</p>
          </div>
        </div>
      )}

      {/* Instructions (if set) */}
      {assessment.instructions && (
        <div className="mb-4 flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Instructions
            </p>
            <p className="text-sm text-muted-foreground">{assessment.instructions}</p>
          </div>
        </div>
      )}

      {/* Footer: reviewed indicator + appointment link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 pt-3 border-t border-border/50">
        {/* Review status */}
        <div className="flex items-center gap-2">
          {assessment.reviewedAt ? (
            <span className="flex items-center gap-1.5 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Reviewed by Doctor
              <span className="text-muted-foreground text-xs">
                ·{" "}
                {new Date(assessment.reviewedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Not yet reviewed</span>
          )}
        </div>

        {/* Open appointment link */}
        {assessment.appointmentId && (
          <Link href={`/doctor/appointments/${assessment.appointmentId}`}>
            <PremiumButton
              variant="ghost"
              size="sm"
              icon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Open Appointment
            </PremiumButton>
          </Link>
        )}
      </div>
    </DashboardCard>
  );
}

// ─── Result Block helper ──────────────────────────────────────────────────────

interface ResultBlockProps {
  label: string;
  rightEye: string;
  leftEye: string;
  completedAt?: Date;
}

function ResultBlock({ label, rightEye, leftEye, completedAt }: ResultBlockProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Right Eye</span>
          <p className="font-semibold text-foreground">{rightEye || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Left Eye</span>
          <p className="font-semibold text-foreground">{leftEye || "—"}</p>
        </div>
      </div>
      {completedAt && (
        <p className="text-xs text-muted-foreground">
          Completed{" "}
          {new Date(completedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
