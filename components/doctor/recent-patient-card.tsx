"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  User,
  CalendarPlus,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { DashboardCard } from "@/components/premium/dashboard-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { StatusBadge } from "@/components/premium/status-badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { appointmentsService, servicesService } from "@/services/firestore";
import type { AppointmentDocument } from "@/types/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecentPatientData {
  patientId: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  lastAppointmentDate: string;
  lastAssessmentDate?: string | null;
  upcomingAppointment?: string | null;
  status: "active" | "completed" | "pending";
}

export interface RecentPatientCardProps {
  patient: RecentPatientData;
  doctorId: string;
}

interface AppointmentWithService {
  appointment: AppointmentDocument;
  serviceName: string;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "text-green-600 bg-green-50";
    case "scheduled":
    case "confirmed":
      return "text-blue-600 bg-blue-50";
    case "in_progress":
      return "text-orange-600 bg-orange-50";
    case "no_show":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function getStatusDotColor(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-500";
    case "scheduled":
    case "confirmed":
      return "bg-blue-500";
    case "in_progress":
      return "bg-orange-500";
    case "no_show":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function formatAppointmentStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentPatientCard({
  patient,
  doctorId,
}: RecentPatientCardProps) {
  const [recentAppointments, setRecentAppointments] = useState<AppointmentWithService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecentAppointments() {
      try {
        // Fetch appointments for this patient and doctor combination
        // This ensures we only get appointments relevant to this doctor-patient relationship
        const appointments = await appointmentsService.getByPatientIdAndDoctorId(
          patient.patientId,
          doctorId,
          10
        );
        
        // Filter out cancelled appointments and sort by date descending
        const filteredAppointments = appointments
          .filter((apt) => apt.status !== "cancelled")
          .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime())
          .slice(0, 3); // Take only 3 most recent

        // Fetch service names for each appointment
        const appointmentsWithServices = await Promise.all(
          filteredAppointments.map(async (apt) => {
            try {
              const service = await servicesService.getById(apt.serviceId);
              return {
                appointment: apt,
                serviceName: service?.title || "Unknown Service",
              };
            } catch (error) {
              console.error("Error loading service:", error);
              return {
                appointment: apt,
                serviceName: "Unknown Service",
              };
            }
          })
        );

        setRecentAppointments(appointmentsWithServices);
      } catch (error) {
        console.error("Error loading recent appointments:", error);
        // Set empty array on error instead of leaving loading state
        setRecentAppointments([]);
      } finally {
        setLoading(false);
      }
    }

    loadRecentAppointments();
  }, [patient.patientId, doctorId]);

  const truncatedName =
    patient.name.length > 60
      ? `${patient.name.slice(0, 60)}…`
      : patient.name;

  return (
    <DashboardCard
      className="lg:min-h-[180px] lg:min-w-[320px] flex flex-col"
      disableHover={false}
    >
      {/* ─── Header Section ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={cn(TYPOGRAPHY.subheading, "text-sm truncate max-w-[180px] lg:max-w-[220px]")}
                title={patient.name}
              >
                {truncatedName}
              </h3>
              <Link
                href={`/doctor/patients/${patient.patientId}`}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 shrink-0 font-medium"
              >
                View Profile <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {/* Demographics */}
            {(patient.age != null || patient.gender != null) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  patient.age != null ? `${patient.age} yrs` : null,
                  patient.gender != null ? patient.gender : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>
        <StatusBadge variant={patient.status} size="sm">
          {patient.status}
        </StatusBadge>
      </div>

      {/* ─── Date Fields ──────────────────────────────────────────────── */}
      <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
        <div className="flex justify-between">
          <span>Last Appointment</span>
          <span className="text-foreground font-medium">
            {patient.lastAppointmentDate}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Last Assessment</span>
          <span className="text-foreground font-medium">
            {patient.lastAssessmentDate ?? "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Upcoming</span>
          <span className="text-foreground font-medium">
            {patient.upcomingAppointment ?? "—"}
          </span>
        </div>
      </div>

      {/* ─── Recent Appointments Timeline ─────────────────────────────── */}
      <div className="border-t border-border/40 pt-3 mb-3 flex-1">
        <h4 className="text-xs font-semibold text-foreground mb-2.5">Recent Appointments</h4>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : recentAppointments.length > 0 ? (
          <div className="space-y-2">
            {recentAppointments.map((item, index) => (
              <Link
                key={item.appointment.id}
                href={`/doctor/appointments/${item.appointment.id}`}
                className="flex items-start gap-2.5 text-xs p-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/5 transition-all cursor-pointer group"
              >
                {/* Status Dot */}
                <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", getStatusDotColor(item.appointment.status))} />
                
                {/* Appointment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                        {new Date(item.appointment.scheduledFor).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">{item.serviceName}</p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                        getStatusColor(item.appointment.status)
                      )}
                    >
                      {formatAppointmentStatus(item.appointment.status)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No recent appointments</p>
        )}

        {/* View All Appointments Button */}
        <div className="mt-3">
          <Link href={`/doctor/appointments?patientId=${patient.patientId}`}>
            <PremiumButton
              variant="outline"
              size="sm"
              fullWidth
              icon={<Calendar className="h-3.5 w-3.5" />}
            >
              View All Appointments
            </PremiumButton>
          </Link>
        </div>
      </div>

      {/* ─── Primary Action ───────────────────────────────────────────── */}
      <div className="mt-auto pt-3 border-t border-border/40">
        <Link href={`/doctor/appointments/create?patientId=${patient.patientId}`}>
          <PremiumButton
            size="sm"
            fullWidth
            icon={<CalendarPlus className="h-3.5 w-3.5" />}
          >
            Book Follow-up
          </PremiumButton>
        </Link>
      </div>
    </DashboardCard>
  );
}
