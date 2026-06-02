"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, usersService } from "@/services/firestore";
import type { PrescriptionDocument, UserDocument } from "@/types/firestore";
import { FileText, Eye, Calendar, Search, X, Loader2 } from "lucide-react";
import {
  DashboardCard,
  GlassPanel,
  PremiumButton,
  SectionHeader,
  StatusBadge,
} from "@/components/premium";
import { SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { staggerContainer } from "@/lib/motion-variants";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";

export default function DoctorPrescriptionsPage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDocument[]>([]);
  const [patientCache, setPatientCache] = useState<Record<string, UserDocument>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadPrescriptions() {
      if (!user) return;

      try {
        setLoading(true);
        const doctorPrescriptions = await prescriptionsService.getByDoctorId(user.id);
        setPrescriptions(doctorPrescriptions);

        // Fetch patient profiles for all unique patients
        const uniquePatientIds = [...new Set(doctorPrescriptions.map((p) => p.patientId))];
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
        const appError = getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
        logError(appError.code, error, "PrescriptionModule");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadPrescriptions();
  }, [user]);

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchQuery) return true;
    const patient = patientCache[rx.patientId];
    const q = searchQuery.toLowerCase();
    return (
      (patient?.displayName?.toLowerCase().includes(q) ?? false) ||
      (patient?.email?.toLowerCase().includes(q) ?? false) ||
      (rx.diagnosis?.toLowerCase().includes(q) ?? false) ||
      (rx.findings?.toLowerCase().includes(q) ?? false)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${SPACING.sectionGap}`}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Prescriptions"
          subtitle={`${prescriptions.length} prescription${prescriptions.length !== 1 ? "s" : ""} issued`}
          className="mt-0"
        />
        <Link href="/doctor/prescriptions/create/new">
          <PremiumButton icon={<FileText className="h-4 w-4" />}>
            Create Prescription
          </PremiumButton>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by patient name or diagnosis..."
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

      {/* Prescriptions List */}
      {filteredPrescriptions.length > 0 ? (
        <motion.div
          variants={shouldReduceMotion ? undefined : staggerContainer}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          className={`grid ${SPACING.cardGap}`}
        >
          {filteredPrescriptions.map((rx, index) => {
            const patient = patientCache[rx.patientId];
            const createdDate = new Date(rx.createdAt);

            return (
              <DashboardCard
                key={rx.id}
                staggerIndex={index}
                className="transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(var(--primary-rgb),0.10)]"
              >
                <Link href={`/doctor/prescriptions/${rx.id}`} className="block">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Patient Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className={`${TYPOGRAPHY.subheading} truncate`}>
                            {patient?.displayName || "Patient"}
                          </p>
                          {rx.followUpRequired && (
                            <StatusBadge variant="pending" size="sm">
                              Follow-up
                            </StatusBadge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          {rx.diagnosis && (
                            <span className={TYPOGRAPHY.label}>
                              {rx.diagnosis.length > 40
                                ? rx.diagnosis.slice(0, 40) + "..."
                                : rx.diagnosis}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              {createdDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Eye Data Summary */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs">
                          OD: {rx.rightEye.sph || "—"} / OS: {rx.leftEye.sph || "—"}
                        </span>
                      </div>
                      <PremiumButton variant="ghost" size="sm">
                        View
                      </PremiumButton>
                    </div>
                  </div>
                </Link>
              </DashboardCard>
            );
          })}
        </motion.div>
      ) : (
        <GlassPanel padding="lg" className="text-center">
          <FileText className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className={TYPOGRAPHY.subheading}>No prescriptions found</p>
          <p className="text-sm text-muted-foreground mt-2">
            {searchQuery
              ? "No prescriptions match your search"
              : "You haven't issued any prescriptions yet"}
          </p>
        </GlassPanel>
      )}
    </div>
  );
}
