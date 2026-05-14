"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { bookingService } from "@/services/booking/booking.service";
import { Calendar, Clock, FileText, Video, ArrowLeft, ArrowRight, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
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
        console.error("Error loading appointment:", error);
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
      setError(err.message || "Failed to cancel appointment");
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = () => {
    router.push(`/booking/reschedule/${appointment.id}`);
  };

  const isUpcoming = appointment && new Date(appointment.scheduledFor) > new Date();
  const canCancel = isUpcoming && appointment.status !== "cancelled" && appointment.status !== "cancellation_requested";
  const canReschedule = isUpcoming && appointment.status === "pending" || appointment.status === "confirmed";
  const canJoin = appointment.status === "confirmed" && new Date(appointment.scheduledFor) <= new Date(new Date().getTime() + 15 * 60000) && new Date(appointment.scheduledFor) > new Date(new Date().getTime() - service?.duration * 60000);

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800 border-green-200" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-200" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
    cancellation_requested: { label: "Cancellation Requested", color: "bg-orange-100 text-orange-800 border-orange-200" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF] px-5">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-base text-muted-foreground">Appointment not found</p>
            <Link href="/patient/appointments" className="inline-block mt-4">
              <Button>View Appointments</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <Link
            href="/patient/appointments"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </Link>
          <h1 className="font-display text-3xl text-primary sm:text-4xl">Appointment Details</h1>
        </div>
      </div>

      <SectionContainer>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Card */}
              <Card className="border-primary/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{service.title}</CardTitle>
                      <p className="mt-2 text-base text-muted-foreground">{service.description}</p>
                    </div>
                    <Badge className={statusConfig[appointment.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                      {statusConfig[appointment.status as keyof typeof statusConfig]?.label || appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Date & Time */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-secondary mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-muted-foreground">Date</p>
                        <p className="text-base font-bold text-primary">
                          {appointment.scheduledFor.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-secondary mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-muted-foreground">Time</p>
                        <p className="text-base font-bold text-primary">
                          {appointment.scheduledFor.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-secondary mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-muted-foreground">Duration</p>
                      <p className="text-base text-primary">{service.duration} minutes</p>
                    </div>
                  </div>

                  {/* Meeting Type */}
                  <div className="flex items-start gap-3">
                    <Video className="h-5 w-5 text-secondary mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-muted-foreground">Consultation Type</p>
                      <p className="text-base text-primary">Online Video Consultation</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {appointment.notes && (
                    <div className="pt-4 border-t border-primary/10">
                      <p className="text-sm font-bold text-muted-foreground mb-2">Your Notes</p>
                      <p className="text-base text-primary">{appointment.notes}</p>
                    </div>
                  )}

                  {/* Cancellation Reason */}
                  {appointment.cancellationReason && (
                    <div className="pt-4 border-t border-primary/10">
                      <p className="text-sm font-bold text-muted-foreground mb-2">Cancellation Reason</p>
                      <p className="text-base text-primary">{appointment.cancellationReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Doctor Card */}
              {doctor && (
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle>Consultation With</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                        <p className="font-bold text-primary text-lg">{doctor.displayName || "Doctor"}</p>
                        <p className="text-base text-muted-foreground">Eye Wellness Specialist</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Appointment Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="h-2 w-2 rounded-full bg-secondary mt-2 shrink-0" />
                      <div>
                        <p className="font-bold text-primary">Booking Created</p>
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
                          <p className="font-bold text-primary">Confirmed</p>
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
                          <p className="font-bold text-primary">Completed</p>
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
                        <div className="h-2 w-2 rounded-full bg-red-400 mt-2 shrink-0" />
                        <div>
                          <p className="font-bold text-primary">Cancelled</p>
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
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions Card */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canJoin && (
                    <Button size="lg" className="w-full">
                      <Video className="h-5 w-5 mr-2" />
                      Join Consultation
                    </Button>
                  )}
                  {canReschedule && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={handleReschedule}
                    >
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Reschedule
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => setShowCancelModal(true)}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel Appointment
                    </Button>
                  )}
                  {!isUpcoming && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      This appointment has {appointment.status === "completed" ? "been completed" : "passed"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Prescription Card */}
              {appointment.prescriptionId && (
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle>Prescription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/patient/prescriptions/${appointment.prescriptionId}`}>
                      <Button variant="outline" size="lg" className="w-full">
                        <FileText className="h-5 w-5 mr-2" />
                        View Prescription
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Support Card */}
              <Card className="border-primary/10 bg-primary/5">
                <CardContent className="p-6">
                  <p className="text-sm font-bold text-muted-foreground mb-2">Need Help?</p>
                  <Link href="/patient/support">
                    <Button variant="outline" size="lg" className="w-full">
                      Contact Support
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SectionContainer>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Cancel Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  className="w-full h-24 rounded-2xl border border-primary/20 bg-white/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary/50"
                  maxLength={500}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason("");
                    setError("");
                  }}
                  disabled={cancelling}
                  className="flex-1"
                >
                  Keep Appointment
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={cancelling || !cancellationReason.trim()}
                  className="flex-1"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
