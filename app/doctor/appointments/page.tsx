"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService } from "@/services/firestore";
import type { AppointmentDocument } from "@/types/firestore";
import { Calendar, Clock, Users, Filter, Search, Video, FileText, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentDocument[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadAppointments() {
      if (!user) return;

      try {
        setLoading(true);
        const doctorAppointments = await appointmentsService.getByDoctorId(user.id);
        setAppointments(doctorAppointments);
      } catch (error) {
        console.error("Error loading appointments:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [user]);

  const filteredAppointments = appointments.filter((appointment) => {
    // Filter by status
    if (filter === "upcoming") {
      return appointment.status === "pending" || appointment.status === "confirmed";
    }
    if (filter === "completed") {
      return appointment.status === "completed";
    }
    if (filter === "cancelled") {
      return appointment.status === "cancelled" || appointment.status === "cancellation_requested";
    }

    // Filter by search query (patient ID)
    if (searchQuery) {
      return appointment.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  const sortedAppointments = filteredAppointments.sort((a, b) => {
    return new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancellation_requested":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const canJoinConsultation = (appointment: AppointmentDocument) => {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledFor);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    // Allow joining 15 minutes before
    return timeDiff < 15 * 60 * 1000 && timeDiff > -60 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  const upcomingAppointments = sortedAppointments.filter(
    apt => apt.status === "pending" || apt.status === "confirmed"
  );
  const completedAppointments = sortedAppointments.filter(apt => apt.status === "completed");
  const cancelledAppointments = sortedAppointments.filter(
    apt => apt.status === "cancelled" || apt.status === "cancellation_requested"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl text-primary mb-2">Appointments</h1>
        <p className="text-xl text-muted-foreground">Manage your consultations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3 flex-1">
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
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
          >
            Completed
          </Button>
          <Button
            variant={filter === "cancelled" ? "default" : "outline"}
            onClick={() => setFilter("cancelled")}
          >
            Cancelled
          </Button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patient ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-primary/10 rounded-full bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Upcoming Appointments */}
      {filter === "all" && upcomingAppointments.length > 0 && (
        <SectionContainer>
          <h2 className="font-display text-2xl text-primary mb-6">Upcoming Appointments</h2>
          <div className="grid gap-4">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canJoin={canJoinConsultation(appointment)}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Completed Appointments */}
      {filter === "all" && completedAppointments.length > 0 && (
        <SectionContainer>
          <h2 className="font-display text-2xl text-primary mb-6">Completed Consultations</h2>
          <div className="grid gap-4">
            {completedAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canJoin={false}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Cancelled Appointments */}
      {filter === "all" && cancelledAppointments.length > 0 && (
        <SectionContainer>
          <h2 className="font-display text-2xl text-primary mb-6">Cancelled Appointments</h2>
          <div className="grid gap-4">
            {cancelledAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canJoin={false}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Filtered Results */}
      {filter !== "all" && sortedAppointments.length > 0 && (
        <SectionContainer>
          <h2 className="font-display text-2xl text-primary mb-6 capitalize">
            {filter} Appointments
          </h2>
          <div className="grid gap-4">
            {sortedAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                canJoin={canJoinConsultation(appointment)}
              />
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Empty State */}
      {sortedAppointments.length === 0 && (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground mb-2">No appointments found</p>
            <p className="text-sm text-muted-foreground">
              {filter === "all" ? "You don't have any appointments yet" : `No ${filter} appointments`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AppointmentCard({ appointment, canJoin }: { appointment: AppointmentDocument; canJoin: boolean }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancellation_requested":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const appointmentDate = new Date(appointment.scheduledFor);
  const isPast = appointmentDate < new Date();

  return (
    <Card className={`border-primary/10 ${isPast && appointment.status !== "completed" ? "opacity-60" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-primary">Patient ID: {appointment.patientId}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{appointmentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{appointmentDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
              {appointment.followUpRequired && (
                <Badge className="bg-secondary text-white">Follow-up Required</Badge>
              )}
              {appointment.consultationPlatform && (
                <Badge>{appointment.consultationPlatform}</Badge>
              )}
            </div>

            {appointment.notes && (
              <p className="text-sm text-muted-foreground line-clamp-2">{appointment.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {canJoin && appointment.consultationLink && (
              <Button asChild>
                <a
                  href={appointment.consultationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  Join
                </a>
              </Button>
            )}
            {appointment.status === "completed" && !appointment.prescriptionId && (
              <Button asChild variant="outline">
                <Link href={`/doctor/prescriptions/create/${appointment.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Prescription
                </Link>
              </Button>
            )}
            <Link href={`/doctor/appointments/${appointment.id}`}>
              <Button variant="ghost">View Details</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
