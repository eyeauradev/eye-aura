"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, usersService } from "@/services/firestore";
import { Search, Calendar, Filter } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";

import Link from "next/link";
import type { AppointmentDocument, UserDocument } from "@/types/firestore";

export default function AdminAppointmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentDocument[]>([]);
  const [patients, setPatients] = useState<Record<string, UserDocument>>({});
  const [doctors, setDoctors] = useState<Record<string, UserDocument>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true);
        const allAppointments = await appointmentsService.getAll();

        // Load patients and doctors
        const allUsers = await usersService.getAll();
        const patientMap: Record<string, UserDocument> = {};
        const doctorMap: Record<string, UserDocument> = {};
        
        allUsers.forEach((u: UserDocument) => {
          if (u.role === "patient") patientMap[u.id] = u;
          if (u.role === "doctor") doctorMap[u.id] = u;
        });

        setAppointments(allAppointments);
        setPatients(patientMap);
        setDoctors(doctorMap);
      } catch (error) {
        console.error("Error loading appointments:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, []);

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = 
      patients[apt.patientId]?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patients[apt.patientId]?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctors[apt.doctorId]?.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className={TYPOGRAPHY.heading}>Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Monitor all platform appointments
        </p>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">All Appointments</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient or doctor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-56"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="cancellation_requested">Cancellation Requested</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" 
                    ? "No appointments found matching your filters" 
                    : "No appointments yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    patient={patients[appointment.patientId]}
                    doctor={doctors[appointment.doctorId]}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      
    </div>
  );
}

function AppointmentCard({ 
  appointment, 
  patient, 
  doctor 
}: { 
  appointment: AppointmentDocument; 
  patient: any; 
  doctor: any; 
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/50 border border-primary/5 hover:border-primary/10 transition">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Calendar className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary text-sm">
          {appointment.scheduledFor.toLocaleDateString("en-US", { 
            weekday: "short",
            month: "short", 
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {patient?.displayName || "Unknown"} → {doctor?.displayName || "Unknown"}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge className={getStatusColor(appointment.status)}>
            {appointment.status.replace(/_/g, " ")}
          </Badge>
          {appointment.followUpRequired && (
            <Badge className="bg-secondary text-white">Follow-up</Badge>
          )}
        </div>
      </div>
      <Link href={`/admin/appointments/${appointment.id}`} className="shrink-0">
        <PremiumButton variant="ghost" size="icon">
          <Calendar className="h-4 w-4" />
        </PremiumButton>
      </Link>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in_progress":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "cancellation_requested":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
