"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { visionAssessmentsService, usersService } from "@/services/firestore";
import type { VisionAssessmentDocument, UserDocument } from "@/types/firestore";
import { Eye, BookOpen, ArrowRight, Clock, Lock, CheckCircle2, Activity, RefreshCw, Smartphone, X, Share } from "lucide-react";
import Link from "next/link";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
} from "@/components/patient-portal";
import { usePWAStatus } from "@/modules/visual-acuity/hooks/usePWAStatus";

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

// ---------------------------------------------------------------------------
// PWA Install Banner
// ---------------------------------------------------------------------------

/**
 * Smart, mobile-only PWA install banner.
 *
 * - Android + beforeinstallprompt: shows native "Install App" button.
 * - iOS Safari: shows "Add to Home Screen" step-by-step instructions.
 * - Desktop (Windows / macOS / Linux / ChromeOS): never shown.
 * - Already installed: never shown.
 * - Dismissal persists in localStorage.
 */
function PWAInstallBanner() {
  const { isInstalled, isMobile, isIOS, isAndroid, canInstall, isDismissed, install, dismiss } =
    usePWAStatus();
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  // Guard: desktop, already installed, dismissed, or no viable install path
  if (!isMobile) return null;
  if (isInstalled) return null;
  if (isDismissed) return null;
  // Android must have a deferred prompt; iOS must be Safari (canInstall stays false on iOS)
  if (isAndroid && !canInstall) return null;
  if (!isAndroid && !isIOS) return null;

  // ── Android banner ────────────────────────────────────────────────────────
  if (isAndroid) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-none mb-1">Install Eye Aura</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              Install Eye Aura for the best assessment experience.
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
              {["Fullscreen assessments", "Better performance", "Faster loading", "Home screen shortcut"].map(
                (b) => (
                  <li key={b} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    {b}
                  </li>
                )
              )}
            </ul>
            <button
              onClick={install}
              className="h-8 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Install App
            </button>
          </div>
          <button
            onClick={dismiss}
            className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-muted/60 transition-colors shrink-0"
            aria-label="Dismiss install banner"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  // ── iOS banner ────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-none mb-1">Install Eye Aura</p>
          {!showIOSSteps ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                Add to your Home Screen for the best fullscreen assessment experience.
              </p>
              <button
                onClick={() => setShowIOSSteps(true)}
                className="h-8 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                How to Install
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">To install:</p>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Tap the{" "}
                  <Share className="inline h-3 w-3 mx-0.5 align-middle" />
                  <strong> Share</strong> button at the bottom of Safari.
                </li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                <li>Tap <strong>Add</strong> in the top right.</li>
                <li>Open Eye Aura from your Home Screen.</li>
              </ol>
              <button
                onClick={dismiss}
                className="mt-1 text-xs text-primary font-semibold hover:underline"
              >
                Got it
              </button>
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-muted/60 transition-colors shrink-0"
          aria-label="Dismiss install banner"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
    <div className="space-y-8 w-full lg:max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1">My Assessments</h1>
        <p className="text-sm text-muted-foreground">
          Assessments assigned by your doctor will appear here.
        </p>
      </div>

      {/* PWA install banner — non-blocking, dismissible */}
      <PWAInstallBanner />

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
  const isExpired = !withinExpiry && (assessment.status === "assigned" || assessment.status === "in_progress");
  const canStart = (assessment.status === "assigned" || assessment.status === "in_progress") && !isExpired;
  const canRetry = assessment.status === "completed" && withinExpiry;

  // For old combined docs (multiple types in one doc) pass ?type= so the session
  // knows which test to run. Single-type docs don't need it (cleaner URL).
  const typeParam = assessment.assessmentTypes.length > 1 ? `&type=${type}` : "";
  const href = `/patient/assessment/visual-acuity?id=${assessment.id}${typeParam}`;

  return (
    <DashboardCard
      staggerIndex={index}
      className={`${!(canStart || canRetry) ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3 w-full">
        {/* Type icon */}
        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>

        {/* Label + desc */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-none mb-0.5">{t?.label ?? type}</p>
          <p className="text-[11px] text-muted-foreground">{t?.desc}</p>
        </div>

        {/* Right side: meta + action stacked */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Doctor + date */}
          <div className="flex flex-col items-end gap-0.5 text-[11px] text-muted-foreground">
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
          </div>

          {/* Status badge */}
          <StatusBadge variant={STATUS_VARIANT_MAP[assessment.status] || "inactive"} size="sm">
            {STATUS_LABEL_MAP[assessment.status] || assessment.status}
          </StatusBadge>

          {/* Action */}
          {canStart && (
            <Link
              href={href}
              className="inline-flex items-center justify-center gap-1.5 font-medium h-8 px-3 text-xs rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow duration-200 mt-0.5"
            >
              {assessment.status === "in_progress" ? "Continue" : "Start"}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {canRetry && (
            <Link
              href={href}
              className="inline-flex items-center justify-center gap-1.5 font-medium h-8 px-3 text-xs rounded-xl border border-border bg-transparent text-foreground hover:shadow-md transition-shadow duration-200 mt-0.5"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Link>
          )}
          {isExpired && (
            <div className="flex flex-col items-end gap-0 mt-0.5">
              <span className="text-xs font-semibold text-destructive">Expired</span>
              <span className="text-[10px] text-muted-foreground leading-tight text-right">
                Ask your doctor to reassign
              </span>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
