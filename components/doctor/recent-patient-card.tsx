"use client";

import Link from "next/link";
import {
  User,
  FileText,
  BookOpen,
  Eye,
  CalendarPlus,
  ExternalLink,
} from "lucide-react";
import { DashboardCard } from "@/components/premium/dashboard-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { StatusBadge } from "@/components/premium/status-badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

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
  onRecommendService: (patientId: string) => void;
  onAssignAssessment: (patientId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentPatientCard({
  patient,
  doctorId,
  onRecommendService,
  onAssignAssessment,
}: RecentPatientCardProps) {
  const truncatedName =
    patient.name.length > 60
      ? `${patient.name.slice(0, 60)}…`
      : patient.name;

  return (
    <DashboardCard
      className="lg:min-h-[180px] lg:min-w-[320px] flex flex-col"
      disableHover={false}
    >
      {/* ─── Info Section ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(TYPOGRAPHY.subheading, "text-sm truncate max-w-[220px] lg:max-w-[260px]")}
              title={patient.name}
            >
              {truncatedName}
            </h3>
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
      <div className="space-y-1.5 text-xs text-muted-foreground mb-4 flex-1">
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

      {/* ─── Quick Action Buttons ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/doctor/patients/${patient.patientId}`}>
          <PremiumButton
            variant="outline"
            size="sm"
            icon={<ExternalLink className="h-3.5 w-3.5" />}
          >
            View Profile
          </PremiumButton>
        </Link>
        <Link href={`/doctor/prescriptions/create?patientId=${patient.patientId}`}>
          <PremiumButton
            variant="outline"
            size="sm"
            icon={<FileText className="h-3.5 w-3.5" />}
          >
            Prescription
          </PremiumButton>
        </Link>
        <PremiumButton
          variant="outline"
          size="sm"
          icon={<BookOpen className="h-3.5 w-3.5" />}
          onClick={() => onRecommendService(patient.patientId)}
        >
          Recommend Service
        </PremiumButton>
        <PremiumButton
          variant="outline"
          size="sm"
          icon={<Eye className="h-3.5 w-3.5" />}
          onClick={() => onAssignAssessment(patient.patientId)}
        >
          Assign Assessment
        </PremiumButton>
      </div>

      {/* ─── Secondary Action ─────────────────────────────────────────── */}
      <div className="mt-2 pt-2 border-t border-border/40">
        <Link href={`/doctor/appointments?patientId=${patient.patientId}`}>
          <PremiumButton
            variant="ghost"
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
