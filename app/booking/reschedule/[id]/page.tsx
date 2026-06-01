"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, doctorSlotsService, usersService } from "@/services/firestore";
import { getDisplayError, formatDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { transactionService } from "@/services/booking/transaction.service";
import { bookingService } from "@/services/booking/booking.service";
import { Calendar, Clock, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


export default function ReschedulePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"select" | "confirm">("select");

  useEffect(() => {
    async function loadAppointment() {
      if (!params.id || !user) return;

      try {
        const appointmentData = await appointmentsService.getById(params.id as string);
        if (!appointmentData || appointmentData.patientId !== user.id) {
          router.push("/patient/appointments");
          return;
        }

        if (appointmentData.status === "cancelled" || appointmentData.status === "completed") {
          router.push(`/patient/appointments/${appointmentData.id}`);
          return;
        }

        setAppointment(appointmentData);

        const serviceData = await servicesService.getById(appointmentData.serviceId);
        setService(serviceData);

        const doctorData = await usersService.getById(appointmentData.doctorId);
        setDoctor(doctorData);

        // Load available slots for next 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const slots = await doctorSlotsService.getAvailableSlots(
          appointmentData.doctorId,
          startDate,
          endDate
        );

        // Filter out current slot
        const availableSlots = slots.filter((slot) => slot.id !== appointmentData.slotId);
        setAvailableSlots(availableSlots);
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.BOOKING.SLOT_CONFLICT);
        logError(appError.code, error, "ReschedulePage");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [params.id, user, router]);

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleConfirmReschedule = async () => {
    if (!appointment || !selectedSlot) return;

    setRescheduling(true);
    setError("");

    try {
      await transactionService.rescheduleAppointmentWithTransaction(appointment.id, selectedSlot.id);
      router.push(`/patient/appointments/${appointment.id}`);
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.APPOINTMENT.CANCEL_FAILED);
      logError(appError.code, err, "ReschedulePage");
      setError(formatDisplayError(appError));
      setRescheduling(false);
    }
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("select");
      setSelectedSlot(null);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (!appointment || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF] px-5">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-8 text-center">
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
            href={`/patient/appointments/${appointment.id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Appointment
          </Link>
          <h1 className="font-display text-3xl text-primary sm:text-4xl">Reschedule Appointment</h1>
        </div>
      </div>

      
        <div className="mx-auto max-w-4xl">
          {/* Current Appointment Info */}
          <Card className="border-primary/10 mb-8 bg-primary/5">
            <CardContent className="p-3 sm:p-6">
              <h2 className="font-display text-xl text-primary mb-4">Current Appointment</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Service</p>
                  <p className="text-base text-primary">{service.title}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Date</p>
                  <p className="text-base text-primary">
                    {appointment.scheduledFor.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Time</p>
                  <p className="text-base text-primary">
                    {appointment.scheduledFor.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Duration</p>
                  <p className="text-base text-primary">{service.duration} minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {step === "select" && (
            <>
              <div className="mb-6">
                <h2 className="font-display text-2xl text-primary mb-2">Select New Time</h2>
                <p className="text-base text-muted-foreground">
                  Choose a new slot for your consultation
                </p>
              </div>

              {availableSlots.length === 0 ? (
                <Card className="border-primary/10">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                      <Calendar className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-display text-xl text-primary mb-2">No Available Slots</h3>
                    <p className="text-base text-muted-foreground mb-6">
                      There are no available slots for the next 30 days. Please try again later or contact support.
                    </p>
                    <Link href="/patient/support">
                      <Button>Contact Support</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {availableSlots.map((slot) => (
                    <Card
                      key={slot.id}
                      className="border-primary/10 cursor-pointer transition hover:-translate-y-1 hover:shadow-lg"
                      onClick={() => handleSlotSelect(slot)}
                    >
                      <CardContent className="p-3 sm:p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Calendar className="h-5 w-5 text-secondary" />
                          <span className="text-sm font-bold text-primary">
                            {slot.startTime.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-secondary" />
                          <span className="font-display text-xl text-primary">
                            {slot.startTime.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "confirm" && selectedSlot && (
            <>
              <div className="mb-6">
                <h2 className="font-display text-2xl text-primary mb-2">Confirm Reschedule</h2>
                <p className="text-base text-muted-foreground">
                  Review your new appointment time
                </p>
              </div>

              <Card className="border-primary/10 mb-8">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="font-display text-lg text-primary mb-4">New Appointment Time</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-secondary mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-muted-foreground">Date</p>
                          <p className="text-base text-primary">
                            {selectedSlot.startTime.toLocaleDateString("en-US", {
                              weekday: "long",
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
                          <p className="text-base text-primary">
                            {selectedSlot.startTime.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-primary/10">
                    <h3 className="font-display text-lg text-primary mb-4">What to Expect</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                        <span className="text-base text-muted-foreground">
                          Your current appointment will be cancelled
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                        <span className="text-base text-muted-foreground">
                          You'll receive a confirmation email with the new time
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                        <span className="text-base text-muted-foreground">
                          The previous time slot will be available for others
                        </span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm border border-red-200 mb-6">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={handleBack} disabled={rescheduling}>
                  Back
                </Button>
                <Button onClick={handleConfirmReschedule} disabled={rescheduling} className="flex items-center gap-2">
                  {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      
    </div>
  );
}
