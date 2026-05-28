"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, usersService } from "@/services/firestore";
import type { AppointmentDocument, UserDocument } from "@/types/firestore";
import { Calendar, Clock, Users, Video, FileText, Search, X } from "lucide-react";
import {
  DashboardCard,
  GlassPanel,
  PremiumButton,
  PremiumTabs,
  SectionHeader,
  StatusBadge,
} from "@/components/premium";
import type { PremiumTabItem } from "@/components/premium";
import { SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { staggerContainer, cardEntrance } from "@/lib/motion-variants";
import Link from "next/link";

type FilterStatus = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const filterTabs: PremiumTabItem[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentDocument[]>([]);
  const [patientCache, setPatientCache] = useState<Record<string, UserDocument>>({});
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    async function loadAppointments() {
      if (!user) return;

      try {
        setLoading(true);
        const doctorAppointments = await appointmentsService.getByDoctorId(user.id);
        setAppointments(doctorAppointments);

        // Fetch patient profiles for all unique patients
        const uniquePatientIds = [...new Set(doctorAppointments.map((a) => a.patientId))];
        const patientEntries = await Promise.all(
          uniquePatientIds.map(async (id) => {
            const p = await usersService.getById(id);
            return [id, p] as [string, UserDocument | null];
          })
        );
        const cache: Record<string, UserDocument> = {};
        patientEntries.forEach(([id, p]) => {
          if (p) cache[id] = p;
        });
        setPatientCache(cache);
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
    if (activeFilter !== "all") {
      if (activeFilter === "cancelled") {
        if (appointment.status !== "cancelled" && appointment.status !== "cancellation_requested") {
          return false;
        }
      } else if (appointment.status !== activeFilter) {
        return false;
      }
    }

    // Filter by search query (patient name/email)
    if (searchQuery) {
      const patient = patientCache[appointment.patientId];
      const q = searchQuery.toLowerCase();
      return (
        (patient?.displayName?.toLowerCase().includes(q) ?? false) ||
        (patient?.email?.toLowerCase().includes(q) ?? false) ||
        (patient?.phoneNumber?.toLowerCase().includes(q) ?? false)
      );
    }

    return true;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    return new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime();
  });

  const handleFilterChange = (tabId: string) => {
    setActiveFilter(tabId as FilterStatus);
    setAnimationKey((prev) => prev + 1);
  };

  const canJoinConsultation = (appointment: AppointmentDocument) => {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledFor);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    return timeDiff < 15 * 60 * 1000 && timeDiff > -60 * 60 * 1000;
  };

  const mapStatusToVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "pending" as const;
      case "confirmed":
        return "confirmed" as const;
      case "in_progress":
        return "in_progress" as const;
      case "completed":
        return "completed" as const;
      case "cancelled":
      case "cancellation_requested":
        return "cancelled" as const;
      default:
        return "pending" as const;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${SPACING.sectionGap}`}>
      {/* Page Header */}
      <SectionHeader
        title="Appointments"
        subtitle="Manage your consultations and schedule"
        className="mt-0"
      />

      {/* Filter Tabs */}
      <div className={`flex flex-col ${SPACING.cardGap}`}>
        <PremiumTabs
          tabs={filterTabs}
          activeTab={activeFilter}
          onTabChange={handleFilterChange}
          variant="underline"
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by patient name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-border bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Appointment Cards */}
      {sortedAppointments.length > 0 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={animationKey}
            variants={shouldReduceMotion ? undefined : staggerContainer}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className={`grid ${SPACING.cardGap}`}
          >
            {sortedAppointments.map((appointment, index) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                patient={patientCache[appointment.patientId]}
                canJoin={canJoinConsultation(appointment)}
                staggerIndex={index}
                mapStatusToVariant={mapStatusToVariant}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Empty State */
        <GlassPanel padding="lg" className="text-center">
          <Calendar className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className={TYPOGRAPHY.subheading}>No appointments found</p>
          <p className="text-sm text-muted-foreground mt-2">
            {activeFilter === "all"
              ? "You don't have any appointments yet"
              : `No ${activeFilter} appointments match your current filter`}
          </p>
        </GlassPanel>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  patient,
  canJoin,
  staggerIndex,
  mapStatusToVariant,
}: {
  appointment: AppointmentDocument;
  patient?: UserDocument;
  canJoin: boolean;
  staggerIndex: number;
  mapStatusToVariant: (status: string) => "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
}) {
  const appointmentDate = new Date(appointment.scheduledFor);
  const isPast = appointmentDate < new Date() && appointment.status !== "completed";

  return (
    <DashboardCard
      staggerIndex={staggerIndex}
      className={`transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(var(--primary-rgb),0.10)] ${isPast ? "opacity-70" : ""}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Patient Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <p className={`${TYPOGRAPHY.subheading} truncate`}>
                {patient?.displayName || "Patient"}
              </p>
              <StatusBadge variant={mapStatusToVariant(appointment.status)} size="sm">
                {appointment.status.replace("_", " ")}
              </StatusBadge>
            </div>

            {/* Appointment type & metadata */}
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className={TYPOGRAPHY.label}>
                {appointment.consultationPlatform?.replace("_", " ") || "Consultation"}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {appointmentDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {appointmentDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                {appointment.notes}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {canJoin && appointment.consultationLink && (
            <PremiumButton
              asChild
              size="sm"
              variant="primary"
              icon={<Video className="h-4 w-4" />}
            >
              <a
                href={appointment.consultationLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Join
              </a>
            </PremiumButton>
          )}
          {appointment.status === "completed" && !appointment.prescriptionId && (
            <PremiumButton asChild size="sm" variant="outline" icon={<FileText className="h-4 w-4" />}>
              <Link href={`/doctor/prescriptions/create/${appointment.id}`}>
                Prescription
              </Link>
            </PremiumButton>
          )}
          <PremiumButton asChild size="sm" variant="ghost">
            <Link href={`/doctor/appointments/${appointment.id}`}>
              View Details
            </Link>
          </PremiumButton>
        </div>
      </div>
    </DashboardCard>
  );
}
