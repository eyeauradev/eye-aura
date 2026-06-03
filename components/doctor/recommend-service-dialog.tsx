"use client";

import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/services/firebase/client";
import { appointmentsService, servicesService } from "@/services/firestore";
import { PremiumModal } from "@/components/premium/premium-modal";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { GlassPanel } from "@/components/premium/glass-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { TYPOGRAPHY, RADIUS } from "@/lib/design-tokens";
import { Loader2, Send, X, Calendar, CheckSquare } from "lucide-react";
import type { AppointmentDocument, ServiceDocument } from "@/types/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecommendServiceDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecommendServiceDialog({
  open,
  onClose,
  patientId,
  doctorId,
  appointmentId,
}: RecommendServiceDialogProps) {
  // Guard: do not render if required props are missing
  if (!patientId || !doctorId) {
    if (typeof window !== "undefined") {
      console.error(
        "[RecommendServiceDialog] Missing required props: patientId or doctorId"
      );
    }
    return null;
  }

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title="Recommend Service"
      subtitle="Recommend a service to the patient with scheduling options"
      maxWidth="560px"
    >
      <RecommendServiceInnerForm
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

interface RecommendServiceInnerFormProps {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function RecommendServiceInnerForm({
  patientId,
  doctorId,
  appointmentId,
  onSuccess,
  onCancel,
}: RecommendServiceInnerFormProps) {
  const { success: showSuccess } = useToast();

  // Appointment data
  const [appointment, setAppointment] = useState<AppointmentDocument | null>(
    null
  );
  const [loadingAppointment, setLoadingAppointment] = useState(
    !!appointmentId
  );

  // Form state
  const [serviceId, setServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [recommendationNote, setRecommendationNote] = useState("");
  const [useAppointmentSchedule, setUseAppointmentSchedule] = useState(
    !!appointmentId
  );

  // Services state
  const [services, setServices] = useState<ServiceDocument[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Derived: selected service for duration calculation
  const selectedService = services.find((s) => s.id === serviceId);

  // Get today's date for min date validation
  const today = new Date().toISOString().split("T")[0];

  // ─── Fetch appointment data ───────────────────────────────────────────────

  useEffect(() => {
    if (!appointmentId) {
      setLoadingAppointment(false);
      return;
    }

    async function fetchAppointment() {
      try {
        setLoadingAppointment(true);
        const appt = await appointmentsService.getById(appointmentId!);
        if (appt) {
          setAppointment(appt);
          // Pre-fill date/time from appointment's scheduledFor
          const scheduledDate = appt.scheduledFor;
          setSelectedDate(formatDateForInput(scheduledDate));
          setSelectedTime(formatTimeForInput(scheduledDate));
        }
      } catch {
        setError("Failed to load appointment data");
      } finally {
        setLoadingAppointment(false);
      }
    }

    fetchAppointment();
  }, [appointmentId]);

  // ─── Fetch doctor's assigned services ─────────────────────────────────────

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoadingServices(true);
        const allServices = await servicesService.getActiveServices();
        const doctorServices = allServices.filter(
          (s) => s.doctorIds.includes(doctorId) && s.isActive
        );
        setServices(doctorServices);
      } catch {
        setError("Failed to load services");
      } finally {
        setLoadingServices(false);
      }
    }
    fetchServices();
  }, [doctorId]);

  // ─── Handle "Perform During Current Appointment" checkbox toggle ────────

  function handleSameAppointmentSlotChange(checked: boolean) {
    setUseAppointmentSchedule(checked);

    if (checked && appointment) {
      // Pre-fill from appointment
      setSelectedDate(formatDateForInput(appointment.scheduledFor));
      setSelectedTime(formatTimeForInput(appointment.scheduledFor));
      // Clear field errors for date/time since they're auto-filled
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.selectedDate;
        delete next.selectedTime;
        return next;
      });
    } else if (!checked) {
      // Clear date/time so user can pick manually
      setSelectedDate("");
      setSelectedTime("");
    }
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!serviceId) {
      errors.serviceId = "Please select a service";
    }

    // Skip date/time validation when performing during current appointment
    if (!useAppointmentSchedule) {
      if (!selectedDate) {
        errors.selectedDate = "Suggested date is required";
      } else {
        const selected = new Date(selectedDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (selected < now) {
          errors.selectedDate = "Date must be today or later";
        }
      }

      if (!selectedTime) {
        errors.selectedTime = "Suggested time is required";
      }

      // If date and time are both provided, check combined datetime is in the future
      if (selectedDate && selectedTime && !errors.selectedDate) {
        const slotStart = new Date(`${selectedDate}T${selectedTime}:00`);
        if (slotStart <= new Date()) {
          errors.selectedDate = "Selected time must be in the future";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Submit handler ───────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    if (!selectedService) {
      setError("Selected service not found");
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

      const body: Record<string, unknown> = {
        patientId,
        doctorId,
        serviceId,
        recommendationNote: recommendationNote.trim() || undefined,
      };

      if (appointmentId) {
        body.sourceAppointmentId = appointmentId;
      }

      if (useAppointmentSchedule && appointment) {
        // Doctor override: perform during current appointment
        body.sameAppointmentSlot = true;
        body.recommendedSlotStart = appointment.scheduledFor.toISOString();
        body.recommendedSlotEnd = new Date(
          appointment.scheduledFor.getTime() + selectedService.duration * 60 * 1000
        ).toISOString();
      } else {
        // Standard scheduling: build slot times from selected date/time
        const slotStart = new Date(`${selectedDate}T${selectedTime}:00`);
        const slotEnd = new Date(
          slotStart.getTime() + selectedService.duration * 60 * 1000
        );
        body.recommendedSlotStart = slotStart.toISOString();
        body.recommendedSlotEnd = slotEnd.toISOString();
      }

      const response = await fetch("/api/recommendations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setError(
            "This slot is no longer available. Please choose a different time."
          );
          return;
        }
        if (response.status === 429) {
          setError(
            "Maximum recommendations reached. Please try again later."
          );
          return;
        }
        const errorData = await response.json().catch(() => null);
        setError(
          errorData?.message ||
            "Could not complete recommendation. Please check your connection."
        );
        return;
      }

      // Success: close dialog and show toast
      showSuccess("Service recommendation sent successfully");
      onSuccess();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Calculate end time ───────────────────────────────────────────────────

  const endTime = calculateEndTime(selectedTime, selectedService?.duration);

  // ─── Render ───────────────────────────────────────────────────────────────

  const isLoading = loadingAppointment || loadingServices;

  return (
    <GlassPanel padding="lg" className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Loading state for appointment data */}
        {loadingAppointment && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading appointment data...
          </div>
        )}

        {/* Service Selector */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>Service</Label>
          {loadingServices ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading services...
            </div>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No active services available. Please configure services first.
            </p>
          ) : (
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.serviceId;
                  return next;
                });
              }}
              className={`w-full border bg-transparent px-4 py-3 text-foreground border-border placeholder:text-muted-foreground transition-all duration-200 ease-in-out focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 ${RADIUS.interactive} ${
                fieldErrors.serviceId
                  ? "border-destructive/50 focus:border-destructive focus:ring-destructive/20"
                  : ""
              }`}
              disabled={isSubmitting}
            >
              <option value="">Select a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title} ({service.duration} min — ₹{service.price})
                </option>
              ))}
            </select>
          )}
          {fieldErrors.serviceId && (
            <p className="text-xs text-destructive mt-1">
              {fieldErrors.serviceId}
            </p>
          )}
          {selectedService && (
            <p className="text-xs text-muted-foreground">
              Duration: {selectedService.duration} minutes
            </p>
          )}
        </div>

        {/* Perform During Current Appointment Checkbox */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="same-appointment-slot"
              checked={useAppointmentSchedule}
              disabled={!appointmentId || isSubmitting}
              onChange={(e) =>
                handleSameAppointmentSlotChange(e.target.checked)
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Label
              htmlFor="same-appointment-slot"
              className={`${TYPOGRAPHY.label} cursor-pointer ${
                !appointmentId ? "opacity-50" : ""
              }`}
            >
              <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
              Perform during current appointment
            </Label>
          </div>
          {useAppointmentSchedule && appointmentId && (
            <p className="text-xs text-muted-foreground ml-7">
              This service will be accommodated within the current appointment. No additional scheduling or availability checks will be performed.
            </p>
          )}
          {!appointmentId && (
            <p className="text-xs text-muted-foreground ml-7">
              No appointment context — select date and time manually
            </p>
          )}
        </div>

        {/* Date & Time Pickers — hidden when performing during current appointment */}
        {!useAppointmentSchedule && (
          <>
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className={TYPOGRAPHY.label}>Suggested Date</Label>
              <PremiumInput
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.selectedDate;
                    return next;
                  });
                }}
                min={today}
                disabled={isSubmitting}
                error={fieldErrors.selectedDate}
              />
            </div>

            {/* Time Slot Picker */}
            <div className="space-y-2">
              <Label className={TYPOGRAPHY.label}>Suggested Time</Label>
              <PremiumInput
                type="time"
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.selectedTime;
                    return next;
                  });
                }}
                disabled={isSubmitting}
                error={fieldErrors.selectedTime}
              />
              {endTime && (
                <p className="text-xs text-muted-foreground">
                  End time (auto-calculated): {endTime}
                </p>
              )}
            </div>
          </>
        )}

        {/* Recommendation Note */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>
            Clinical Recommendation Note
          </Label>
          <textarea
            value={recommendationNote}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setRecommendationNote(e.target.value);
              }
            }}
            placeholder="Add a clinical note for the patient (optional)"
            rows={3}
            disabled={isSubmitting}
            className={`w-full border bg-transparent px-4 py-3 text-foreground border-border placeholder:text-muted-foreground transition-all duration-200 ease-in-out focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 resize-none ${RADIUS.interactive}`}
          />
          <p className="text-xs text-muted-foreground text-right">
            {recommendationNote.length}/500
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
            disabled={isSubmitting || isLoading}
          >
            Send Recommendation
          </PremiumButton>
        </div>
      </form>
    </GlassPanel>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function calculateEndTime(
  startTime: string,
  durationMinutes?: number
): string | null {
  if (!startTime || !durationMinutes) return null;
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
}
