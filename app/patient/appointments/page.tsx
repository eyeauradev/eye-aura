"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { Calendar, Clock, FileText, Video, ArrowRight, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";

export default function PatientAppointmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [pastAppointments, setPastAppointments] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    async function loadAppointments() {
      if (!user) return;

      try {
        setLoading(true);
        
        const allAppointments = await appointmentsService.getByPatientId(user.id, 50);
        
        const now = new Date();
        const upcoming: any[] = [];
        const past: any[] = [];

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
      } catch (error) {
        console.error("Error loading appointments:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [user]);

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800 border-green-200" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-200" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
    cancellation_requested: { label: "Cancellation Requested", color: "bg-orange-100 text-orange-800 border-orange-200" },
  };

  const AppointmentCard = ({ appointment }: { appointment: any }) => {
    const isUpcoming = new Date(appointment.scheduledFor) > new Date();
    const canJoin = appointment.status === "confirmed" && new Date(appointment.scheduledFor) <= new Date(new Date().getTime() + 15 * 60000) && new Date(appointment.scheduledFor) > new Date(new Date().getTime() - (appointment.service?.duration || 30) * 60000);

    return (
      <Card className="border-primary/10 transition hover:-translate-y-1 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-display text-xl text-primary mb-1">{appointment.service?.title}</h3>
              <p className="text-sm text-muted-foreground">with {appointment.doctor?.displayName || "Doctor"}</p>
            </div>
            <Badge className={statusConfig[appointment.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
              {statusConfig[appointment.status as keyof typeof statusConfig]?.label || appointment.status}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-secondary" />
              <span>{appointment.scheduledFor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-secondary" />
              <span>{appointment.scheduledFor.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/patient/appointments/${appointment.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </Link>
            {canJoin && (
              <Button className="flex items-center gap-2">
                <Video className="h-4 w-4" />
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
          <Link href="/booking">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-primary sm:text-4xl">My Appointments</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Manage your consultations and view history
              </p>
            </div>
            <Link href="/booking">
              <Button size="lg" className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Book Appointment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <SectionContainer>
        <div className="mx-auto max-w-6xl">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-8">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
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
      </SectionContainer>
    </div>
  );
}
