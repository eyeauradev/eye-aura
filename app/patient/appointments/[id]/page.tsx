"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { getDisplayError, logError, formatDisplayError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { bookingService } from "@/services/booking/booking.service";
import { Calendar, Clock, FileText, Video, ArrowLeft, Calendar as CalendarIcon, X } from "lucide-react";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
  InfoRow,
} from "@/components/patient-portal";


export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAppointment() {
      if (!params.id || !user) return;

      try {
        const appointmentData = await appointmentsService.getById(params.id as string);
        if (!appointmentData || appointmentData.patientId !== user.id) {
          router.push("/patient/appointments");
          return;
        }

        setAppointment(appointmentData);

        const serviceData = await servicesService.getById(appointmentData.serviceId);
        setService(serviceData);

        const doctorData = await usersService.getById(appointmentData.doctorId);
        setDoctor(doctorData);
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.APPOINTMENT.LOAD_FAILED);
        logError(appError.code, error, "AppointmentDetailPage");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [params.id, user, router]);

  const handleCancel = async () => {
    if (!appointment || !cancellationReason.trim()) return;

    setCancelling(true);
    setError("");

    try {
      await bookingService.cancelBooking(appointment.id, cancellationReason);
      router.push("/patient/appointments");
    } catch (err: any) {
      const appError = getDisplayError(err, ERROR_CODES.APPOINTMENT.CANCEL_FAILED);
      logError(appError.code, err, "AppointmentDetailPage");
      setError(formatDisplayError(appError));
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = () => {
    router.push(`/booking/reschedule/${appointment.id}`);
  };

  const getStatusVariant = (status: string) => {
    const map: Record<string, "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"> = {
      pending: "pending",
      confirmed: "confirmed",
      in_progress: "in_progress",
      completed: "completed",
      cancelled: "cancelled",
      cancellation_requested: "pending",
    };
    return map[status] || "pending";
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      cancellation_requested: "Cancellation Requested",
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment || !service) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-5">
        <GlassPanel padding="lg" className="max-w-md w-full text-center">
          <p className="text-base text-muted-foreground">Appointment not found</p>
          <Link href="/patient/appointments" className="inline-block mt-4">
            <PremiumButton>View Appointments</PremiumButton>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  const isUpcoming = new Date(appointment.scheduledFor) > new Date();
  const canCancel = isUpcoming && appointment.status !== "cancelled" && appointment.status !== "cancellation_requested";
  const canReschedule = isUpcoming && (appointment.status === "pending" || appointment.status === "confirmed");
  const canJoin = appointment.status === "confirmed" && new Date(appointment.scheduledFor) <= new Date(new Date().getTime() + 15 * 60000) && new Date(appointment.scheduledFor) > new Date(new Date().getTime() - service.duration * 60000);

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/patient/appointments"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Appointments
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cancellation Requested Banner */}
          {appointment.status === "cancellation_requested" && (
            <GlassPanel padding="md" className="border-secondary/30 bg-secondary/5">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-secondary mt-2 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Cancellation Requested</p>
                  {appointment.cancellationReason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {appointment.cancellationReason}
                    </p>
                  )}
                  {appointment.cancellationRequestedAt && (
                    <p className="text-xs text-muted-foreground">
                      Requested on{" "}
                      {new Date(appointment.cancellationRequestedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Your cancellation request is pending approval from the doctor.
                  </p>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* Cancellation Rejection Notification */}
          {appointment.cancellationRejectionReason && appointment.status !== "cancellation_requested" && appointment.status !== "cancelled" && (
            <GlassPanel padding="md" className="border-ring/30 bg-ring/5">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-ring mt-2 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Cancellation Request Rejected</p>
                  <p className="text-sm text-muted-foreground">
                    Reason: {appointment.cancellationRejectionReason}
                  </p>
                  {appointment.cancellationRejectedAt && (
                    <p className="text-xs text-muted-foreground">
                      Rejected on{" "}
                      {new Date(appointment.cancellationRejectedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                  {appointment.cancellationRejectedByRole && (
                    <p className="text-xs text-muted-foreground">
                      Rejected by: {appointment.cancellationRejectedByRole === "doctor" ? "Doctor" : "Admin"}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Your appointment has been restored to its previous status.
                  </p>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* Status Card */}
          <DashboardCard disableHover>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{service.title}</h2>
                <p className="mt-2 text-base text-muted-foreground">{service.description}</p>
              </div>
              <StatusBadge variant={getStatusVariant(appointment.status)} size="md">
                {getStatusLabel(appointment.status)}
              </StatusBadge>
            </div>

            <div className="space-y-6">
              {/* Date & Time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow
                  icon={CalendarIcon}
                  label="Date"
                  value={appointment.scheduledFor.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
                <InfoRow
                  icon={Clock}
                  label="Time"
                  value={appointment.scheduledFor.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </div>

              {/* Duration */}
              <InfoRow
                icon={FileText}
                label="Duration"
                value={`${service.duration} minutes`}
              />

              {/* Meeting Type */}
              <InfoRow
                icon={Video}
                label="Consultation Type"
                value="Online Video Consultation"
              />

              {/* Notes */}
              {appointment.notes && (
                <div className="pt-4 border-t border-border/50">
                  <InfoRow label="Your Notes" value={appointment.notes} />
                </div>
              )}

              {/* Cancellation Reason */}
              {appointment.cancellationReason && (
                <div className="pt-4 border-t border-border/50">
                  <InfoRow label="Cancellation Reason" value={appointment.cancellationReason} />
                </div>
              )}
            </div>
          </DashboardCard>

          {/* Doctor Card */}
          {doctor && (
            <DashboardCard disableHover staggerIndex={1}>
              <SectionHeader title="Consultation With" className="mt-0 mb-4" />
              <div className="flex items-center gap-4">
                {doctor.photoURL ? (
                  <img
                    src={doctor.photoURL}
                    alt={doctor.displayName || "Doctor"}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {doctor.displayName?.charAt(0) || "D"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-foreground text-lg">{doctor.displayName || "Doctor"}</p>
                  <p className="text-base text-muted-foreground">Eye Wellness Specialist</p>
                </div>
              </div>
            </DashboardCard>
          )}

          {/* Timeline */}
          <DashboardCard disableHover staggerIndex={2}>
            <SectionHeader title="Appointment Timeline" className="mt-0 mb-4" />
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-2 w-2 rounded-full bg-secondary mt-2 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">Booking Created</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {appointment.status === "confirmed" && (
                <div className="flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-secondary mt-2 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">Confirmed</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {appointment.completedAt && (
                <div className="flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-secondary mt-2 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.completedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {appointment.cancelledAt && (
                <div className="flex items-start gap-4">
                  <div className="h-2 w-2 rounded-full bg-ring mt-2 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">Cancelled</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.cancelledAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <DashboardCard disableHover staggerIndex={3}>
            <SectionHeader title="Actions" className="mt-0 mb-4" />
            <div className="space-y-3">
              {appointment.consultationLink && (
                <div className="p-3 rounded-2xl border border-border bg-muted/30">
                  <p className={`${TYPOGRAPHY.label} mb-1`}>Consultation Link</p>
                  <a
                    href={appointment.consultationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline break-all"
                  >
                    {appointment.consultationLink}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your doctor will share the meeting link before the consultation.
                  </p>
                </div>
              )}
              {!appointment.consultationLink && appointment.status === "confirmed" && (
                <div className="p-3 rounded-2xl border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Your doctor will share the consultation link (Google Meet/Zoom) before your appointment.
                  </p>
                </div>
              )}
              {canReschedule && (
                <PremiumButton
                  variant="outline"
                  size="lg"
                  fullWidth
                  disabled
                  icon={<CalendarIcon className="h-5 w-5" />}
                >
                  Reschedule (Coming Soon)
                </PremiumButton>
              )}
              {canCancel && (
                <PremiumButton
                  variant="outline"
                  size="lg"
                  fullWidth
                  icon={<X className="h-5 w-5" />}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Appointment
                </PremiumButton>
              )}
              {!isUpcoming && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  This appointment has {appointment.status === "completed" ? "been completed" : "passed"}
                </p>
              )}
            </div>
          </DashboardCard>

          {/* Prescription Card */}
          {appointment.prescriptionId && (
            <DashboardCard disableHover staggerIndex={4}>
              <SectionHeader title="Prescription" className="mt-0 mb-4" />
              <Link href={`/patient/prescriptions/${appointment.prescriptionId}`}>
                <PremiumButton variant="outline" size="lg" fullWidth icon={<FileText className="h-5 w-5" />}>
                  View Prescription
                </PremiumButton>
              </Link>
            </DashboardCard>
          )}

          {/* Support Card */}
          <GlassPanel padding="md">
            <p className="text-sm font-bold text-muted-foreground mb-2">Need Help?</p>
            <Link href="/patient/support">
              <PremiumButton variant="outline" size="lg" fullWidth>
                Contact Support
              </PremiumButton>
            </Link>
          </GlassPanel>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-foreground/50 backdrop-blur-sm">
          <GlassPanel padding="lg" className="max-w-md w-full bg-card/95">
            <h3 className="text-xl font-semibold text-foreground mb-4">Cancel Appointment</h3>
            <div className="space-y-4">
              <p className="text-base text-muted-foreground">
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </p>
              <div>
                <label className="text-sm font-bold text-muted-foreground mb-2 block">
                  Reason for cancellation
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please let us know why you're cancelling..."
                  className="w-full h-24 rounded-2xl border border-border bg-card/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  maxLength={500}
                />
              </div>
              {error && (
                <p className="text-sm text-ring">{error}</p>
              )}
              <div className="flex gap-3 pt-4">
                <PremiumButton
                  variant="outline"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason("");
                    setError("");
                  }}
                  disabled={cancelling}
                  fullWidth
                >
                  Keep Appointment
                </PremiumButton>
                <PremiumButton
                  onClick={handleCancel}
                  disabled={cancelling || !cancellationReason.trim()}
                  fullWidth
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </PremiumButton>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
