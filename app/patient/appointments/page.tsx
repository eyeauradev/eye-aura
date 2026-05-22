"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { EA, eaError } from "@/lib/errors";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import type { AppointmentDocument, ServiceDocument, UserDocument } from "@/types/firestore";
import type { BookingRequestDocument } from "@/types/firestore";
import { Calendar, Clock, Video, Filter, Plus, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


export default function PatientAppointmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<(AppointmentDocument & { service?: ServiceDocument; doctor?: UserDocument })[]>([]);
  const [pastAppointments, setPastAppointments] = useState<(AppointmentDocument & { service?: ServiceDocument; doctor?: UserDocument })[]>([]);
  const [bookingRequests, setBookingRequests] = useState<(BookingRequestDocument & { service?: ServiceDocument; doctor?: UserDocument })[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<(BookingRequestDocument & { service?: ServiceDocument; doctor?: UserDocument })[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past" | "requests">("all");

  useEffect(() => {
    async function loadAppointments() {
      if (!user) return;

      try {
        setLoading(true);
        
        const allAppointments = await appointmentsService.getByPatientId(user.id, 50);
        
        const now = new Date();
        const upcoming: AppointmentDocument[] = [];
        const past: AppointmentDocument[] = [];

        for (const appointment of allAppointments) {
          const service = await servicesService.getById(appointment.serviceId);
          const doctor = await usersService.getById(appointment.doctorId);
          
          const appointmentWithDetails = {
            ...appointment,
            service,
            doctor,
          };

          if (appointment.status === "cancelled") {
            past.push(appointmentWithDetails);
          } else if (new Date(appointment.scheduledFor) > now) {
            upcoming.push(appointmentWithDetails);
          } else {
            past.push(appointmentWithDetails);
          }
        }

        // Sort by date
        upcoming.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
        past.sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());

        setUpcomingAppointments(upcoming);
        setPastAppointments(past);

        // Load booking requests
        const requests = await bookingRequestsService.getByPatientId(user.id);
        const requestsWithDetails = await Promise.all(
          requests.map(async (request) => {
            const service = await servicesService.getById(request.serviceId);
            const doctor = await usersService.getById(request.doctorId);
            return { 
              ...request, 
              service: service || undefined, 
              doctor: doctor || undefined 
            };
          })
        );
        // Accepted → moved to appointments; rejected → separate section
        setBookingRequests(requestsWithDetails.filter(r => r.status !== "accepted" && r.status !== "rejected"));
        setRejectedRequests(requestsWithDetails.filter(r => r.status === "rejected"));
      } catch (error) {
        eaError(EA.APT_001, error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [user]);

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800 border-green-200" },
    accepted: { label: "Accepted", color: "bg-green-100 text-green-800 border-green-200" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-200" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
    cancellation_requested: { label: "Cancellation Requested", color: "bg-orange-100 text-orange-800 border-orange-200" },
    requested: { label: "Requested", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    reschedule_requested: { label: "Reschedule Requested", color: "bg-orange-100 text-orange-800 border-orange-200" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200" },
  };

  const getRequestStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "requested":
        return <Clock className="h-5 w-5" />;
      case "accepted":
      case "confirmed":
        return <CheckCircle2 className="h-5 w-5" />;
      case "rejected":
        return <XCircle className="h-5 w-5" />;
      case "reschedule_requested":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const BookingRequestCard = ({ request }: { request: BookingRequestDocument & { service?: ServiceDocument; doctor?: UserDocument } }) => {
    return (
      <Card className="border-primary/10 bg-white overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
        <div className="h-1 w-full bg-gradient-to-r from-[#b5964d] to-[#d4b978]" />
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#0f4f4b] leading-snug line-clamp-2 text-sm mb-0.5">{request.service?.title || "Consultation"}</p>
              <p className="text-xs text-muted-foreground truncate">with {request.doctor?.displayName || "Doctor"}</p>
            </div>
            <Badge className={`shrink-0 text-[10px] px-2 py-0.5 ${statusConfig[request.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}`}>
              {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#1a9e98]" />
              <span>{new Date(request.requestedTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#1a9e98]" />
              <span>{new Date(request.requestedTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {request.status === "reschedule_requested" && request.proposedTime && (
            <div className="flex items-center gap-2 text-xs text-amber-700 mb-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">Doctor proposed: {new Date(request.proposedTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}

          {request.rejectionReason && (
            <div className="flex items-start gap-2 text-xs text-red-600 mb-3 p-2.5 bg-red-50 rounded-xl border border-red-100">
              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{request.rejectionReason}</span>
            </div>
          )}

          {request.rescheduleReason && (
            <div className="flex items-start gap-2 text-xs text-orange-600 mb-3 p-2.5 bg-orange-50 rounded-xl border border-orange-100">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{request.rescheduleReason}</span>
            </div>
          )}

          <Link href={`/patient/requests/${request.id}`}>
            <Button variant="outline" className="w-full h-8 text-xs rounded-xl">
              View Details
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  const AppointmentCard = ({ appointment }: { appointment: AppointmentDocument & { service?: ServiceDocument; doctor?: UserDocument } }) => {
    const isUpcoming = new Date(appointment.scheduledFor) > new Date();
    const canJoin = appointment.status === "confirmed" && new Date(appointment.scheduledFor) <= new Date(new Date().getTime() + 15 * 60000) && new Date(appointment.scheduledFor) > new Date(new Date().getTime() - (appointment.service?.duration || 30) * 60000);

    return (
      <Card className="border-primary/10 bg-white overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
        <div className={`h-1 w-full bg-gradient-to-r ${isUpcoming ? "from-[#0f4f4b] to-[#1a9e98]" : "from-gray-200 to-gray-300"}`} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#0f4f4b] leading-snug line-clamp-2 text-sm mb-0.5">{appointment.service?.title || "Consultation"}</p>
              <p className="text-xs text-muted-foreground truncate">with {appointment.doctor?.displayName || "Doctor"}</p>
            </div>
            <Badge className={`shrink-0 text-[10px] px-2 py-0.5 ${statusConfig[appointment.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}`}>
              {statusConfig[appointment.status as keyof typeof statusConfig]?.label || appointment.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#1a9e98]" />
              <span>{appointment.scheduledFor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#1a9e98]" />
              <span>{appointment.scheduledFor.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/patient/appointments/${appointment.id}`} className="flex-1">
              <Button variant="outline" className="w-full h-8 text-xs rounded-xl">
                View Details
              </Button>
            </Link>
            {canJoin && (
              <Button className="flex items-center gap-1.5 h-8 text-xs rounded-xl px-3">
                <Video className="h-3.5 w-3.5" />
                Join
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: "upcoming" | "past" }) => (
    <Card className="border-primary/10 bg-primary/5">
      <CardContent className="p-12 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-xl text-primary mb-2">
          {type === "upcoming" ? "No Upcoming Appointments" : "No Past Appointments"}
        </h3>
        <p className="text-base text-muted-foreground mb-6">
          {type === "upcoming"
            ? "You don't have any scheduled consultations yet."
            : "Your consultation history will appear here."}
        </p>
        {type === "upcoming" && (
          <Link href="/booking" className="inline-flex">
            <Button size="lg" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Book Appointment
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  const showUpcoming = filter === "all" || filter === "upcoming";
  const showPast = filter === "all" || filter === "past";
  const showRequests = filter === "all" || filter === "requests";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-primary sm:text-4xl">My Appointments</h1>
          <p className="mt-1 text-base text-muted-foreground">Manage your consultations and view history</p>
        </div>
        <Link href="/booking" className="self-start sm:self-auto">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </Link>
      </div>

      <div>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "requests" ? "default" : "outline"}
              onClick={() => setFilter("requests")}
            >
              Requests
            </Button>
            <Button
              variant={filter === "upcoming" ? "default" : "outline"}
              onClick={() => setFilter("upcoming")}
            >
              Upcoming
            </Button>
            <Button
              variant={filter === "past" ? "default" : "outline"}
              onClick={() => setFilter("past")}
            >
              Past
            </Button>
          </div>

          {/* Booking Requests */}
          {showRequests && (
            <div className="mb-12 space-y-8">
              <div>
                <h2 className="font-display text-2xl text-primary mb-6">Booking Requests</h2>
                {bookingRequests.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {bookingRequests.map((request) => (
                      <BookingRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-primary/10 bg-primary/5">
                    <CardContent className="p-4 sm:p-8 text-center">
                      <Clock className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
                      <p className="text-base text-muted-foreground">No pending requests</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {rejectedRequests.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl text-primary mb-6">Rejected Requests</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rejectedRequests.map((request) => (
                      <BookingRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Appointments */}
          {showUpcoming && (
            <div className="mb-12">
              <h2 className="font-display text-2xl text-primary mb-6">Upcoming Appointments</h2>
              {upcomingAppointments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <EmptyState type="upcoming" />
              )}
            </div>
          )}

          {/* Past Appointments */}
          {showPast && (
            <div>
              <h2 className="font-display text-2xl text-primary mb-6">Past Appointments</h2>
              {pastAppointments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pastAppointments.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <EmptyState type="past" />
              )}
            </div>
          )}
        </div>
    </div>
  );
}
