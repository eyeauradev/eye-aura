"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { Calendar, Clock, FileText, CheckCircle, ArrowRight, Download, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    async function loadAppointment() {
      if (!params.id || !user) return;

      try {
        const appointmentData = await appointmentsService.getById(params.id as string);
        if (!appointmentData) {
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

  const handleAddToCalendar = () => {
    if (!appointment || !service) return;

    const startDate = new Date(appointment.scheduledFor);
    const endDate = new Date(startDate.getTime() + service.duration * 60000);
    
    const title = `Eye Aura Consultation - ${service.title}`;
    const details = `Your eye wellness consultation with Eye Aura.\n\nService: ${service.title}\nDuration: ${service.duration} minutes`;
    const location = "Online Video Consultation";

    const googleCalendarUrl = new URL("https://calendar.google.com/calendar/render");
    googleCalendarUrl.searchParams.append("action", "TEMPLATE");
    googleCalendarUrl.searchParams.append("text", title);
    googleCalendarUrl.searchParams.append("dates", `${startDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}`);
    googleCalendarUrl.searchParams.append("details", details);
    googleCalendarUrl.searchParams.append("location", location);

    window.open(googleCalendarUrl.toString(), "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading your appointment...</p>
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

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    confirmed: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-blue-100 text-blue-800 border-blue-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      <div className="py-8 px-5 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10 mb-6">
              <CheckCircle className="h-10 w-10 text-secondary" />
            </div>
            <h1 className="font-display text-4xl text-primary sm:text-5xl mb-4">
              Booking Confirmed
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Your consultation has been successfully scheduled. We've sent a confirmation to your email.
            </p>
          </div>

          {/* Appointment Card */}
          <Card className="border-primary/10 shadow-lg mb-8">
            <CardContent className="p-4 sm:p-8">
              {/* Status Badge */}
              <div className="mb-6">
                <Badge className={statusColors[appointment.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800 border-gray-200"}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Badge>
              </div>

              {/* Service Info */}
              <div className="mb-6 pb-6 border-b border-primary/10">
                <h2 className="font-display text-2xl text-primary mb-2">{service.title}</h2>
                <p className="text-base text-muted-foreground">{service.description}</p>
              </div>

              {/* Appointment Details */}
              <div className="grid gap-6 sm:grid-cols-2 mb-6 pb-6 border-b border-primary/10">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Date</p>
                    <p className="text-lg font-bold text-primary">
                      {appointment.scheduledFor.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Time</p>
                    <p className="text-lg font-bold text-primary">
                      {appointment.scheduledFor.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Duration</p>
                    <p className="text-lg font-bold text-primary">{service.duration} minutes</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                    <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-secondary">₹</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Price</p>
                    <p className="text-lg font-bold text-secondary">{service.currency} {service.price}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="mb-6 pb-6 border-b border-primary/10">
                  <p className="text-sm font-bold text-muted-foreground mb-2">Your Notes</p>
                  <p className="text-base text-primary">{appointment.notes}</p>
                </div>
              )}

              {/* Doctor Info */}
              {doctor && (
                <div className="mb-6">
                  <p className="text-sm font-bold text-muted-foreground mb-3">Consultation With</p>
                  <div className="flex items-center gap-4">
                    {doctor.photoURL ? (
                      <img
                        src={doctor.photoURL}
                        alt={doctor.displayName || "Doctor"}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {doctor.displayName?.charAt(0) || "D"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-primary">{doctor.displayName || "Doctor"}</p>
                      <p className="text-sm text-muted-foreground">Eye Wellness Specialist</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="border-primary/10 mb-8 bg-primary/5">
            <CardContent className="p-3 sm:p-6">
              <h3 className="font-display text-xl text-primary mb-4">What's Next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <span className="text-base text-muted-foreground">
                    Check your email for detailed consultation instructions
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <span className="text-base text-muted-foreground">
                    Add this appointment to your calendar to stay organized
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <span className="text-base text-muted-foreground">
                    Prepare any questions or concerns you'd like to discuss
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <span className="text-base text-muted-foreground">
                    Join the consultation 5 minutes before your scheduled time
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              onClick={handleAddToCalendar}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <CalendarPlus className="h-5 w-5" />
              Add to Calendar
            </Button>
            <Link href={`/patient/appointments/${appointment.id}`} className="flex-1 sm:flex-none">
              <Button size="lg" className="w-full flex items-center gap-2">
                View Appointment
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
