"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  appointmentsService,
  usersService,
} from "@/services/firestore";
import type {
  AppointmentDocument,
  AppointmentStatus,
  UserDocument,
} from "@/types/firestore";
import { useToast } from "@/components/ui/toast-provider";
import {
  Calendar,
  Clock,
  Video,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Play,
  Monitor,
} from "lucide-react";
import {
  GlassPanel,
  PremiumButton,
  StatusBadge,
  SectionHeader,
} from "@/components/premium";
import type { StatusVariant } from "@/components/premium";
import { TYPOGRAPHY, SPACING } from "@/lib/design-tokens";
import { statusTransition } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * Maps appointment status to StatusBadge variant.
 */
function getStatusVariant(status: AppointmentStatus): StatusVariant {
  switch (status) {
    case "pending":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "cancellation_requested":
      return "requested";
    default:
      return "pending";
  }
}

/**
 * Doctor Consultation Interface
 *
 * A focused, distraction-free consultation view that:
 * - Hides the main sidebar during active consultations
 * - Shows patient details in a compact sidebar
 * - Provides action buttons for consultation workflow
 * - Animates status transitions
 * - Collapses to top summary bar on mobile
 */
export default function DoctorConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentDocument | null>(
    null
  );
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");

  const isActiveConsultation = appointment?.status === "in_progress";

  useEffect(() => {
    async function loadConsultation() {
      if (!params.id) return;

      try {
        setLoading(true);
        const apt = await appointmentsService.getById(params.id as string);
        setAppointment(apt);

        if (apt) {
          setNotes(apt.notes || "");
          const patientData = await usersService.getById(apt.patientId);
          setPatient(patientData);
        }
      } catch (error) {
        console.error("Error loading consultation:", error);
      } finally {
        setLoading(false);
      }
    }

    loadConsultation();
  }, [params.id]);

  const handleUpdateStatus = useCallback(
    async (status: AppointmentStatus) => {
      if (!appointment) return;

      try {
        setUpdating(true);
        await appointmentsService.update(appointment.id, { status });
        setAppointment({ ...appointment, status });
        toastSuccess(
          `Consultation ${status === "in_progress" ? "started" : status}`
        );
      } catch (error) {
        console.error("Error updating status:", error);
        toastError("Failed to update consultation status");
      } finally {
        setUpdating(false);
      }
    },
    [appointment, toastSuccess, toastError]
  );

  const handleSaveNotes = useCallback(async () => {
    if (!appointment) return;

    try {
      setUpdating(true);
      await appointmentsService.update(appointment.id, { notes });
      setAppointment({ ...appointment, notes });
      toastSuccess("Notes saved");
    } catch (error) {
      console.error("Error saving notes:", error);
      toastError("Failed to save notes");
    } finally {
      setUpdating(false);
    }
  }, [appointment, notes, toastSuccess, toastError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassPanel padding="lg" className="text-center max-w-md">
          <p className={cn(TYPOGRAPHY.body, "mb-4")}>
            Consultation not found
          </p>
          <PremiumButton
            variant="outline"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/doctor/appointments")}
          >
            Back to Appointments
          </PremiumButton>
        </GlassPanel>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.scheduledFor);

  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row",
        SPACING.cardGap,
        isActiveConsultation && "consultation-active"
      )}
    >
      {/* Mobile: Top summary bar (visible <1024px) */}
      <div className="lg:hidden">
        <GlassPanel padding="sm" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PremiumButton
              variant="ghost"
              size="icon"
              onClick={() => router.push("/doctor/appointments")}
            >
              <ArrowLeft className="h-4 w-4" />
            </PremiumButton>
            <div>
              <p className={cn(TYPOGRAPHY.subheading, "text-base")}>
                {patient?.displayName || "Patient"}
              </p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={appointment.status}
              variants={shouldReduceMotion ? undefined : statusTransition}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              exit={shouldReduceMotion ? undefined : "exit"}
            >
              <StatusBadge variant={getStatusVariant(appointment.status)}>
                {appointment.status.replace("_", " ")}
              </StatusBadge>
            </motion.div>
          </AnimatePresence>
        </GlassPanel>
      </div>

      {/* Patient Details Sidebar (visible ≥1024px) */}
      <aside className="hidden lg:block lg:w-80 lg:shrink-0">
        <GlassPanel padding="md" className="sticky top-24 space-y-5">
          {/* Back navigation */}
          <PremiumButton
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/doctor/appointments")}
          >
            Back
          </PremiumButton>

          {/* Patient name and status */}
          <div className={SPACING.cardGap}>
            <h2 className={TYPOGRAPHY.subheading}>
              {patient?.displayName || "Patient"}
            </h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={appointment.status}
                variants={shouldReduceMotion ? undefined : statusTransition}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
                exit={shouldReduceMotion ? undefined : "exit"}
                className="mt-2"
              >
                <StatusBadge
                  variant={getStatusVariant(appointment.status)}
                  size="md"
                >
                  {appointment.status.replace("_", " ")}
                </StatusBadge>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Metadata */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className={TYPOGRAPHY.label}>
                {appointmentDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={TYPOGRAPHY.label}>
                {appointmentDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {appointment.consultationPlatform && (
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className={cn(TYPOGRAPHY.label, "capitalize")}>
                  {appointment.consultationPlatform.replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            {appointment.status === "confirmed" && (
              <PremiumButton
                fullWidth
                icon={<Play className="h-4 w-4" />}
                onClick={() => handleUpdateStatus("in_progress")}
                loading={updating}
              >
                Start Consultation
              </PremiumButton>
            )}

            {appointment.status === "in_progress" && (
              <>
                {appointment.consultationLink && (
                  <PremiumButton
                    fullWidth
                    asChild
                  >
                    <a
                      href={appointment.consultationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <Video className="h-4 w-4" />
                      Join Call
                    </a>
                  </PremiumButton>
                )}

                <PremiumButton
                  fullWidth
                  variant="outline"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    router.push(
                      `/doctor/prescriptions/create/${appointment.id}`
                    )
                  }
                >
                  Write Prescription
                </PremiumButton>

                <PremiumButton
                  fullWidth
                  variant="outline"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => handleUpdateStatus("completed")}
                  loading={updating}
                >
                  Complete
                </PremiumButton>
              </>
            )}

            {appointment.status === "completed" &&
              !appointment.prescriptionId && (
                <PremiumButton
                  fullWidth
                  variant="outline"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    router.push(
                      `/doctor/prescriptions/create/${appointment.id}`
                    )
                  }
                >
                  Create Prescription
                </PremiumButton>
              )}
          </div>
        </GlassPanel>
      </aside>

      {/* Main Content Area */}
      <main className={cn("flex-1 min-w-0 space-y-6 pt-0")}>
        {/* Mobile action buttons */}
        <div className="lg:hidden">
          <GlassPanel padding="sm">
            <div className="flex gap-3 overflow-x-auto">
              {appointment.status === "confirmed" && (
                <PremiumButton
                  size="sm"
                  icon={<Play className="h-4 w-4" />}
                  onClick={() => handleUpdateStatus("in_progress")}
                  loading={updating}
                >
                  Start
                </PremiumButton>
              )}

              {appointment.status === "in_progress" && (
                <>
                  {appointment.consultationLink && (
                    <PremiumButton size="sm" asChild>
                      <a
                        href={appointment.consultationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <Video className="h-4 w-4" />
                        Join
                      </a>
                    </PremiumButton>
                  )}
                  <PremiumButton
                    size="sm"
                    variant="outline"
                    icon={<FileText className="h-4 w-4" />}
                    onClick={() =>
                      router.push(
                        `/doctor/prescriptions/create/${appointment.id}`
                      )
                    }
                  >
                    Prescribe
                  </PremiumButton>
                  <PremiumButton
                    size="sm"
                    variant="outline"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => handleUpdateStatus("completed")}
                    loading={updating}
                  >
                    Complete
                  </PremiumButton>
                </>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Consultation Notes */}
        <GlassPanel padding="md">
          <SectionHeader title="Consultation Notes" className="mt-0 mb-4" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add consultation notes, symptoms, or observations..."
            className={cn(
              "w-full min-h-[200px] p-4 border border-border rounded-2xl",
              "bg-background/50 text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring",
              "resize-none transition-all duration-200",
              "placeholder:text-muted-foreground"
            )}
          />
          <div className="flex justify-end mt-4">
            <PremiumButton
              variant="outline"
              onClick={handleSaveNotes}
              loading={updating}
            >
              Save Notes
            </PremiumButton>
          </div>
        </GlassPanel>

        {/* Consultation Details */}
        <GlassPanel padding="md">
          <SectionHeader title="Appointment Details" className="mt-0 mb-4" />
          <div className={cn("grid gap-4 sm:grid-cols-2", SPACING.cardGap)}>
            <div className="space-y-1">
              <span className={TYPOGRAPHY.label}>Date</span>
              <p className={TYPOGRAPHY.body}>
                {appointmentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="space-y-1">
              <span className={TYPOGRAPHY.label}>Time</span>
              <p className={TYPOGRAPHY.body}>
                {appointmentDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {appointment.consultationPlatform && (
              <div className="space-y-1">
                <span className={TYPOGRAPHY.label}>Platform</span>
                <p className={cn(TYPOGRAPHY.body, "capitalize")}>
                  {appointment.consultationPlatform.replace("_", " ")}
                </p>
              </div>
            )}
            {appointment.followUpRequired && appointment.followUpDate && (
              <div className="space-y-1">
                <span className={TYPOGRAPHY.label}>Follow-up</span>
                <p className={TYPOGRAPHY.body}>
                  {new Date(appointment.followUpDate).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>
            )}
          </div>
        </GlassPanel>

        {/* Prescription link if exists */}
        {appointment.prescriptionId && (
          <GlassPanel padding="md">
            <SectionHeader title="Prescription" className="mt-0 mb-4" />
            <div className="flex items-center justify-between">
              <p className={TYPOGRAPHY.body}>
                Prescription has been created for this consultation.
              </p>
              <PremiumButton
                variant="outline"
                size="sm"
                icon={<FileText className="h-4 w-4" />}
                onClick={() =>
                  router.push(
                    `/doctor/prescriptions/${appointment.prescriptionId}`
                  )
                }
              >
                View
              </PremiumButton>
            </div>
          </GlassPanel>
        )}
      </main>
    </div>
  );
}
