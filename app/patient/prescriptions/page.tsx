"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, usersService, appointmentsService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { FileText, Calendar, User, Download, Plus } from "lucide-react";
import {
  DashboardCard,
  PremiumButton,
  SectionHeader,
  GlassPanel,
} from "@/components/patient-portal";


export default function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    async function loadPrescriptions() {
      if (!user) return;

      try {
        setLoading(true);
        
        const prescriptionData = await prescriptionsService.getByPatientId(user.id, 50);

        // Enrich with doctor and appointment data
        const enrichedPrescriptions = await Promise.all(
          prescriptionData.map(async (prescription) => {
            try {
              const doctor = await usersService.getById(prescription.doctorId);
              const appointment = await appointmentsService.getById(prescription.appointmentId);
              return { ...prescription, doctor, appointment };
            } catch (err) {
              const appError = getDisplayError(err, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
              logError(appError.code, err, "PrescriptionModule");
              errorFromAppError(appError);
              return { ...prescription, doctor: null, appointment: null };
            }
          })
        );

        setPrescriptions(enrichedPrescriptions);
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading your prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1">My Prescriptions</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and download your consultation prescriptions
        </p>
      </div>

      <div>
        {prescriptions.length === 0 ? (
          <GlassPanel padding="lg" className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Prescriptions Yet</h3>
            <p className="text-base text-muted-foreground mb-6">
              Your prescription history will appear here after consultations.
            </p>
            <Link href="/booking">
              <PremiumButton size="lg" icon={<Plus className="h-5 w-5" />}>
                Book a Consultation
              </PremiumButton>
            </Link>
          </GlassPanel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prescriptions.map((prescription, i) => (
              <DashboardCard key={prescription.id} staggerIndex={i}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">Prescription</h3>
                    <p className="text-sm text-muted-foreground">
                      Dr. {prescription.doctor?.displayName || "Doctor"}
                    </p>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(prescription.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{prescription.medications.length} medication{prescription.medications.length !== 1 ? "s" : ""}</span>
                  </div>
                  {prescription.followUpRequired && prescription.followUpDate && (
                    <div className="text-sm text-secondary">
                      Follow-up: {new Date(prescription.followUpDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                  <div className="pt-3 flex items-center gap-2">
                    <Link href={`/patient/prescriptions/${prescription.id}`} className="flex-1">
                      <PremiumButton variant="outline" size="sm" fullWidth>
                        View Details
                      </PremiumButton>
                    </Link>
                    <PremiumButton
                      variant="outline"
                      size="sm"
                      className="shrink-0 px-3"
                      onClick={() => window.open(`/prescriptions/${prescription.id}/pdf`, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </PremiumButton>
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
