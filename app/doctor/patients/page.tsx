"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, usersService } from "@/services/firestore";
import type { AppointmentDocument, UserDocument } from "@/types/firestore";
import { Users, Search, Calendar, Clock, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";

export default function DoctorPatientsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentDocument[]>([]);
  const [patientCache, setPatientCache] = useState<Record<string, UserDocument>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadPatients() {
      if (!user) return;

      try {
        setLoading(true);
        const doctorAppointments = await appointmentsService.getByDoctorId(user.id);
        setAppointments(doctorAppointments);

        const uniqueIds = [...new Set(doctorAppointments.map(a => a.patientId))];
        const entries = await Promise.all(
          uniqueIds.map(async (id) => {
            const p = await usersService.getById(id);
            return [id, p] as [string, UserDocument | null];
          })
        );
        const cache: Record<string, UserDocument> = {};
        entries.forEach(([id, p]) => { if (p) cache[id] = p; });
        setPatientCache(cache);
      } catch (error) {
        console.error("Error loading patients:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, [user]);

  // Group appointments by patient
  const patientsMap = new Map<string, AppointmentDocument[]>();
  appointments.forEach((apt) => {
    if (!patientsMap.has(apt.patientId)) {
      patientsMap.set(apt.patientId, []);
    }
    patientsMap.get(apt.patientId)!.push(apt);
  });

  // Convert to array and get most recent appointment for each patient
  const patients = Array.from(patientsMap.entries()).map(([patientId, patientAppointments]) => {
    const sorted = patientAppointments.sort((a, b) => 
      new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
    );
    return {
      patientId,
      appointments: sorted,
      lastAppointment: sorted[0],
      followUpRequired: sorted.some(apt => apt.followUpRequired),
    };
  });

  // Filter by search query using patient name/email
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery) return true;
    const info = patientCache[patient.patientId];
    const q = searchQuery.toLowerCase();
    return (
      (info?.displayName?.toLowerCase().includes(q) ?? false) ||
      (info?.email?.toLowerCase().includes(q) ?? false) ||
      (info?.phoneNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">Patients</h1>
        <p className="text-sm sm:text-sm sm:text-xl text-muted-foreground">View patient consultation history</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by patient name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-primary/10 rounded-full bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-primary/10 bg-white/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-3xl font-bold text-primary">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Follow-Ups Required</p>
                <p className="text-3xl font-bold text-secondary">
                  {patients.filter(p => p.followUpRequired).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients List */}
      
        {filteredPatients.length > 0 ? (
          <div className="grid gap-4">
            {filteredPatients.map((patient) => (
              <PatientCard key={patient.patientId} patient={patient} info={patientCache[patient.patientId]} />
            ))}
          </div>
        ) : (
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">No patients found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try a different search term" : "You haven't had any consultations yet"}
              </p>
            </CardContent>
          </Card>
        )}
      
    </div>
  );
}

function PatientCard({ patient, info }: { patient: { patientId: string; appointments: AppointmentDocument[]; lastAppointment: AppointmentDocument; followUpRequired: boolean }; info?: UserDocument }) {
  const lastAppointment = patient.lastAppointment;
  const lastDate = new Date(lastAppointment.scheduledFor);
  const totalConsultations = patient.appointments.length;

  return (
    <Card className="border-primary/10 hover:border-primary/30 transition cursor-pointer">
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-primary">{info?.displayName || "Patient"}</p>
                <p className="text-xs text-muted-foreground">{info?.email}</p>
                {info?.phoneNumber && <p className="text-xs text-muted-foreground">{info.phoneNumber}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{totalConsultations} consultation{totalConsultations !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Last: {lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{lastDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {patient.followUpRequired && (
                <Badge className="bg-secondary text-white">Follow-up Required</Badge>
              )}
              <Badge className={getStatusColor(lastAppointment.status)}>
                {lastAppointment.status}
              </Badge>
            </div>
          </div>

          <Link href={`/doctor/patients/${patient.patientId}`}>
            <Button variant="ghost">
              View Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
