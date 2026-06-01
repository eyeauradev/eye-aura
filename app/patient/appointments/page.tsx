"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import type { AppointmentDocument, ServiceDocument, UserDocument } from "@/types/firestore";
import type { BookingRequestDocument } from "@/types/firestore";
import { Calendar, Clock, Filter, Plus, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
} from "@/components/patient-portal";


export default function PatientAppointmentsPage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
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
        const appError = getDisplayError(error, ERROR_CODES.APPOINTMENT.LOAD_FAILED);
        logError(appError.code, error, "PatientAppointmentsPage");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [user]);

  const getStatusVariant = (status: string) => {
    const map: Record<string, "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "requested"> = {
      pending: "pending",
      confirmed: "confirmed",
      accepted: "confirmed",
      in_progress: "in_progress",
      completed: "completed",
      cancelled: "cancelled",
      cancellation_requested: "pending",
      requested: "requested",
      reschedule_requested: "pending",
      rejected: "cancelled",
    };
    return map[status] || "pending";
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      accepted: "Accepted",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      cancellation_requested: "Cancellation Requested",
      requested: "Requested",
      reschedule_requested: "Reschedule Requested",
      rejected: "Rejected",
    };
    return map[status] || status;
  };

  const BookingRequestCard = ({ request, index }: { request: BookingRequestDocument & { service?: ServiceDocument; doctor?: UserDocument }; index: number }) => {
    return (
      <DashboardCard staggerIndex={index} className="overflow-hidden">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground leading-snug line-clamp-2 text-sm mb-0.5">{request.service?.title || "Consultation"}</p>
            <p className="text-xs text-muted-foreground truncate">with {request.doctor?.displayName || "Doctor"}</p>
          </div>
          <StatusBadge variant={getStatusVariant(request.status)} size="sm">
            {getStatusLabel(request.status)}
          </StatusBadge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-secondary" />
            <span>{new Date(request.requestedTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-secondary" />
            <span>{new Date(request.requestedTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        {request.status === "reschedule_requested" && request.proposedTime && (
          <div className="flex items-center gap-2 text-xs text-foreground/70 mb-3 p-2.5 bg-secondary/8 rounded-xl border border-secondary/20">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">Doctor proposed: {new Date(request.proposedTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}

        {request.rejectionReason && (
          <div className="flex items-start gap-2 text-xs text-ring mb-3 p-2.5 bg-ring/8 rounded-xl border border-ring/15">
            <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{request.rejectionReason}</span>
          </div>
        )}

        {request.rescheduleReason && (
          <div className="flex items-start gap-2 text-xs text-secondary mb-3 p-2.5 bg-secondary/8 rounded-xl border border-secondary/15">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{request.rescheduleReason}</span>
          </div>
        )}

        <Link href={`/patient/requests/${request.id}`}>
          <PremiumButton variant="outline" size="sm" fullWidth>
            View Details
          </PremiumButton>
        </Link>
      </DashboardCard>
    );
  };

  const AppointmentCard = ({ appointment, index }: { appointment: AppointmentDocument & { service?: ServiceDocument; doctor?: UserDocument }; index: number }) => {
    const isUpcoming = new Date(appointment.scheduledFor) > new Date();

    return (
      <DashboardCard staggerIndex={index} className="overflow-hidden">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground leading-snug line-clamp-2 text-sm mb-0.5">{appointment.service?.title || "Consultation"}</p>
            <p className="text-xs text-muted-foreground truncate">with {appointment.doctor?.displayName || "Doctor"}</p>
          </div>
          <StatusBadge variant={getStatusVariant(appointment.status)} size="sm">
            {getStatusLabel(appointment.status)}
          </StatusBadge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-secondary" />
            <span>{appointment.scheduledFor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-secondary" />
            <span>{appointment.scheduledFor.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/patient/appointments/${appointment.id}`} className="flex-1">
            <PremiumButton variant="outline" size="sm" fullWidth>
              View Details
            </PremiumButton>
          </Link>
        </div>
      </DashboardCard>
    );
  };

  const EmptyState = ({ type }: { type: "upcoming" | "past" }) => (
    <GlassPanel padding="lg" className="text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Calendar className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {type === "upcoming" ? "No Upcoming Appointments" : "No Past Appointments"}
      </h3>
      <p className="text-base text-muted-foreground mb-6">
        {type === "upcoming"
          ? "You don't have any scheduled consultations yet."
          : "Your consultation history will appear here."}
      </p>
      {type === "upcoming" && (
        <Link href="/booking" className="inline-flex">
          <PremiumButton size="lg" icon={<Plus className="h-5 w-5" />}>
            Book Appointment
          </PremiumButton>
        </Link>
      )}
    </GlassPanel>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
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
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">My Appointments</h1>
          <p className="mt-1 text-base text-muted-foreground">Manage your consultations and view history</p>
        </div>
        <Link href="/booking" className="self-start sm:self-auto">
          <PremiumButton icon={<Plus className="h-4 w-4" />}>
            Book Appointment
          </PremiumButton>
        </Link>
      </div>

      <div>
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <PremiumButton
            variant={filter === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </PremiumButton>
          <PremiumButton
            variant={filter === "requests" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("requests")}
          >
            Requests
          </PremiumButton>
          <PremiumButton
            variant={filter === "upcoming" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </PremiumButton>
          <PremiumButton
            variant={filter === "past" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("past")}
          >
            Past
          </PremiumButton>
        </div>

        {/* Booking Requests */}
        {showRequests && (
          <div className="mb-12 space-y-8">
            <div>
              <SectionHeader title="Booking Requests" className="mt-0" />
              {bookingRequests.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bookingRequests.map((request, i) => (
                    <BookingRequestCard key={request.id} request={request} index={i} />
                  ))}
                </div>
              ) : (
                <GlassPanel padding="md" className="text-center">
                  <Clock className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
                  <p className="text-base text-muted-foreground">No pending requests</p>
                </GlassPanel>
              )}
            </div>

            {rejectedRequests.length > 0 && (
              <div>
                <SectionHeader title="Rejected Requests" className="mt-0" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rejectedRequests.map((request, i) => (
                    <BookingRequestCard key={request.id} request={request} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Appointments */}
        {showUpcoming && (
          <div className="mb-12">
            <SectionHeader title="Upcoming Appointments" className="mt-0" />
            {upcomingAppointments.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingAppointments.map((appointment, i) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} index={i} />
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
            <SectionHeader title="Past Appointments" className="mt-0" />
            {pastAppointments.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastAppointments.map((appointment, i) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} index={i} />
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
