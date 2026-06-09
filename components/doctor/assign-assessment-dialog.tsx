"use client";

import { useState } from "react";
import { getFirebaseAuth } from "@/services/firebase/client";
import { PremiumModal } from "@/components/premium/premium-modal";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { GlassPanel } from "@/components/premium/glass-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TYPOGRAPHY, RADIUS } from "@/lib/design-tokens";
import {
  AVAILABLE_ASSESSMENT_TYPES,
} from "@/lib/assessment-type-mapping";
import type { VisionAssessmentType } from "@/types/firestore";
import {
  ClipboardCheck,
  Calendar,
  Clock,
  Send,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssignmentTiming = "now" | "schedule_later";

interface AssignAssessmentDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignAssessmentDialog({
  open,
  onClose,
  patientId,
  doctorId,
  appointmentId,
}: AssignAssessmentDialogProps) {
  // Guard: do not render if required props are missing
  if (!patientId || !doctorId) {
    if (typeof window !== "undefined") {
      console.error(
        "[AssignAssessmentDialog] Missing required props: patientId or doctorId"
      );
    }
    return null;
  }

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title="Assign Assessment"
      subtitle="Assign a clinical assessment to the patient"
      maxWidth="560px"
    >
      <AssignAssessmentForm
        patientId={patientId}
        doctorId={doctorId}
        appointmentId={appointmentId}
        onSuccess={onClose}
        onCancel={onClose}
      />
    </PremiumModal>
  );
}

// ─── Inner Form Component ─────────────────────────────────────────────────────

interface AssignAssessmentFormProps {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function AssignAssessmentForm({
  patientId,
  doctorId,
  appointmentId,
  onSuccess,
  onCancel,
}: AssignAssessmentFormProps) {
  // Form state
  const [assessmentType, setAssessmentType] =
    useState<VisionAssessmentType | "">("");
  const [timing, setTiming] = useState<AssignmentTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [instructions, setInstructions] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Get today's date for min date validation
  const today = new Date().toISOString().split("T")[0];

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!assessmentType) {
      errors.assessmentType = "Assessment type is required";
    }

    if (timing === "schedule_later") {
      if (!scheduledDate) {
        errors.scheduledDate = "Scheduled date is required";
      } else {
        const selected = new Date(scheduledDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (selected < now) {
          errors.scheduledDate = "Scheduled date must be a future date";
        }
      }

      if (!scheduledTime) {
        errors.scheduledTime = "Scheduled time is required";
      }

      // Additional check: if both date and time are provided, ensure the combined datetime is in the future
      if (scheduledDate && scheduledTime && !errors.scheduledDate) {
        const scheduledDateTime = new Date(
          `${scheduledDate}T${scheduledTime}:00`
        );
        if (scheduledDateTime <= new Date()) {
          errors.scheduledDate = "Scheduled date and time must be in the future";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("Authentication required. Please sign in again.");
        return;
      }
      const idToken = await currentUser.getIdToken();

      // Build the request body
      const body: Record<string, unknown> = {
        patientId,
        doctorId,
        assessmentTypes: [assessmentType],
        assignmentTiming: timing,
        instructions: instructions.trim() || undefined,
      };

      if (appointmentId) {
        body.appointmentId = appointmentId;
      }

      if (timing === "schedule_later" && scheduledDate && scheduledTime) {
        body.scheduledFor = new Date(
          `${scheduledDate}T${scheduledTime}:00`
        ).toISOString();
      }

      const response = await fetch("/api/assessments/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setError(
          errorData?.message ||
            "Could not assign assessment. Please check your connection and try again."
        );
        return;
      }

      onSuccess();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GlassPanel padding="lg" className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assessment Type Selector */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>
            <ClipboardCheck className="mr-1 inline h-3.5 w-3.5" />
            Assessment Type
          </Label>
          <div className="grid gap-2">
            {AVAILABLE_ASSESSMENT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setAssessmentType(option.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.assessmentType;
                    return next;
                  });
                }}
                className={`w-full text-left px-4 py-3 border transition-all duration-200 ${RADIUS.interactive} ${
                  assessmentType === option.value
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-border bg-transparent hover:border-ring/50 hover:bg-muted/30"
                } ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}
              >
                <span className="block text-sm font-medium text-foreground">
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
          {fieldErrors.assessmentType && (
            <p className="text-xs text-destructive mt-1">
              {fieldErrors.assessmentType}
            </p>
          )}
        </div>

        {/* Assignment Timing */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            Assignment Timing
          </Label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setTiming("now")}
              className={`flex-1 px-4 py-3 border text-sm font-medium transition-all duration-200 ${RADIUS.interactive} ${
                timing === "now"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:border-ring/50"
              } ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}
            >
              Assign Now
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setTiming("schedule_later")}
              className={`flex-1 px-4 py-3 border text-sm font-medium transition-all duration-200 ${RADIUS.interactive} ${
                timing === "schedule_later"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:border-ring/50"
              } ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}
            >
              <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
              Schedule Later
            </button>
          </div>
        </div>

        {/* Schedule Later: Date & Time Pickers */}
        {timing === "schedule_later" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <Label className={TYPOGRAPHY.label}>Scheduled Date</Label>
              <PremiumInput
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.scheduledDate;
                    return next;
                  });
                }}
                min={today}
                disabled={isSubmitting}
                error={fieldErrors.scheduledDate}
              />
            </div>
            <div className="space-y-2">
              <Label className={TYPOGRAPHY.label}>Scheduled Time</Label>
              <PremiumInput
                type="time"
                value={scheduledTime}
                onChange={(e) => {
                  setScheduledTime(e.target.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.scheduledTime;
                    return next;
                  });
                }}
                disabled={isSubmitting}
                error={fieldErrors.scheduledTime}
              />
            </div>
          </div>
        )}

        {/* Instructions Textarea */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>
            Instructions (optional)
          </Label>
          <textarea
            value={instructions}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setInstructions(e.target.value);
              }
            }}
            placeholder="Provide guidance for the patient (optional)"
            rows={3}
            disabled={isSubmitting}
            className={`w-full border bg-transparent px-4 py-3 text-foreground border-border placeholder:text-muted-foreground transition-all duration-200 ease-in-out focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 resize-none ${RADIUS.interactive}`}
          />
          <p className="text-xs text-muted-foreground text-right">
            {instructions.length}/500
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-3">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <PremiumButton
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            icon={<X className="h-4 w-4" />}
          >
            Cancel
          </PremiumButton>
          <PremiumButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            icon={<Send className="h-4 w-4" />}
            disabled={isSubmitting}
          >
            Assign Assessment
          </PremiumButton>
        </div>
      </form>
    </GlassPanel>
  );
}
