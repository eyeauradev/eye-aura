"use client";

import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/services/firebase/client";
import { servicesService } from "@/services/firestore";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { GlassPanel } from "@/components/premium/glass-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TYPOGRAPHY, RADIUS } from "@/lib/design-tokens";
import { Loader2, Send, X } from "lucide-react";
import type { ServiceRecommendation } from "@/types/recommendations";
import type { ServiceDocument } from "@/types/firestore";

interface RecommendServiceFormProps {
  patientId: string;
  doctorId: string;
  existingRecommendation?: ServiceRecommendation;
  onSuccess: (recommendation: any) => void;
  onCancel: () => void;
}

export function RecommendServiceForm({
  patientId,
  doctorId,
  existingRecommendation,
  onSuccess,
  onCancel,
}: RecommendServiceFormProps) {
  const isEditMode = !!existingRecommendation;

  // Form state
  const [serviceId, setServiceId] = useState(existingRecommendation?.serviceId || "");
  const [selectedDate, setSelectedDate] = useState(() => {
    if (existingRecommendation?.recommendedSlotStart) {
      const d = new Date(existingRecommendation.recommendedSlotStart);
      return d.toISOString().split("T")[0];
    }
    return "";
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    if (existingRecommendation?.recommendedSlotStart) {
      const d = new Date(existingRecommendation.recommendedSlotStart);
      return d.toTimeString().slice(0, 5);
    }
    return "";
  });
  const [recommendationNote, setRecommendationNote] = useState(
    existingRecommendation?.recommendationNote || ""
  );

  // UI state
  const [services, setServices] = useState<ServiceDocument[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived: selected service for duration calculation
  const selectedService = services.find((s) => s.id === serviceId);
  const endTime = calculateEndTime(selectedTime, selectedService?.duration);

  // Fetch doctor's assigned services
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

  // Get minimum date (tomorrow)
  const minDate = getMinDate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!serviceId) {
      setError("Please select a service");
      return;
    }
    if (!selectedDate) {
      setError("Please select a date");
      return;
    }
    if (!selectedTime) {
      setError("Please select a time");
      return;
    }
    if (!selectedService) {
      setError("Selected service not found");
      return;
    }

    // Build slot times
    const slotStart = new Date(`${selectedDate}T${selectedTime}:00`);
    const slotEnd = new Date(slotStart.getTime() + selectedService.duration * 60 * 1000);

    // Verify slot is in the future
    if (slotStart <= new Date()) {
      setError("Selected time must be in the future");
      return;
    }

    try {
      setIsSubmitting(true);

      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("Authentication required");
        return;
      }
      const idToken = await currentUser.getIdToken();

      const body = {
        patientId,
        doctorId,
        serviceId,
        recommendedSlotStart: slotStart.toISOString(),
        recommendedSlotEnd: slotEnd.toISOString(),
        recommendationNote: recommendationNote.trim() || undefined,
      };

      let response: Response;

      if (isEditMode && existingRecommendation) {
        response = await fetch(`/api/recommendations/${existingRecommendation.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch("/api/recommendations/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        if (response.status === 409) {
          setError("This slot is no longer available. Please choose a different time.");
          return;
        }
        if (response.status === 429) {
          setError("Maximum recommendations reached. Please try again later.");
          return;
        }
        const errorData = await response.json().catch(() => null);
        setError(errorData?.message || "Failed to submit recommendation");
        return;
      }

      const data = await response.json();
      onSuccess(data);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GlassPanel padding="lg" className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className={TYPOGRAPHY.subheading}>
            {isEditMode ? "Edit Recommendation" : "Recommend a Service"}
          </h2>
          <PremiumButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            icon={<X className="h-4 w-4" />}
          />
        </div>

        {/* Service Selector */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>Service</Label>
          {loadingServices ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading services...
            </div>
          ) : (
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={`w-full border bg-transparent px-4 py-3 text-foreground border-border placeholder:text-muted-foreground transition-all duration-200 ease-in-out focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 ${RADIUS.interactive}`}
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
          {selectedService && (
            <p className="text-xs text-muted-foreground">
              Duration: {selectedService.duration} minutes
            </p>
          )}
        </div>

        {/* Date Picker */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>Appointment Date</Label>
          <PremiumInput
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={minDate}
            disabled={isSubmitting}
          />
        </div>

        {/* Time Slot Selector */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>Start Time</Label>
          <PremiumInput
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            disabled={isSubmitting}
          />
          {endTime && (
            <p className="text-xs text-muted-foreground">
              End time (auto-calculated): {endTime}
            </p>
          )}
        </div>

        {/* Recommendation Note */}
        <div className="space-y-2">
          <Label className={TYPOGRAPHY.label}>Clinical Note</Label>
          <textarea
            value={recommendationNote}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setRecommendationNote(e.target.value);
              }
            }}
            placeholder="Add a clinical note for the patient (optional)"
            rows={4}
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
          >
            Cancel
          </PremiumButton>
          <PremiumButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            icon={<Send className="h-4 w-4" />}
            disabled={isSubmitting || !serviceId || !selectedDate || !selectedTime}
          >
            {isEditMode ? "Update Recommendation" : "Send Recommendation"}
          </PremiumButton>
        </div>
      </form>
    </GlassPanel>
  );
}

// Helper: calculate end time string based on start time and duration
function calculateEndTime(startTime: string, durationMinutes?: number): string | null {
  if (!startTime || !durationMinutes) return null;
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
}

// Helper: get tomorrow's date as YYYY-MM-DD for min date
function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}
