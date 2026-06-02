"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, usersService, appointmentsService, servicesService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { User, ArrowLeft, Download, Printer, CheckCircle, Eye } from "lucide-react";
import {
  DashboardCard,
  PremiumButton,
  SectionHeader,
  GlassPanel,
} from "@/components/patient-portal";


export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    async function loadPrescription() {
      if (!params.id || !user) return;

      try {
        const prescriptionData = await prescriptionsService.getById(params.id as string);
        if (!prescriptionData || prescriptionData.patientId !== user.id) {
          router.push("/patient/prescriptions");
          return;
        }

        setPrescription(prescriptionData);

        const doctorData = await usersService.getById(prescriptionData.doctorId);
        setDoctor(doctorData);

        const appointmentData = prescriptionData.appointmentId
          ? await appointmentsService.getById(prescriptionData.appointmentId)
          : null;
        setAppointment(appointmentData);

        if (appointmentData) {
          const serviceData = await servicesService.getById(appointmentData.serviceId);
          setService(serviceData);
        }
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
        logError(appError.code, error, "PrescriptionModule");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadPrescription();
  }, [params.id, user, router]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    router.push(`/prescriptions/${prescription?.id}/pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="flex items-center justify-center py-32 px-4">
        <GlassPanel padding="lg" className="text-center max-w-sm">
          <p className="text-muted-foreground mb-4">Prescription not found</p>
          <Link href="/patient/prescriptions">
            <PremiumButton>View Prescriptions</PremiumButton>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Top bar — back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/patient/prescriptions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prescriptions
        </Link>
        <div className="flex gap-2">
          <PremiumButton variant="outline" size="sm" onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
            Print
          </PremiumButton>
          <PremiumButton size="sm" onClick={handleDownload} icon={<Download className="h-4 w-4" />}>
            Download PDF
          </PremiumButton>
        </div>
      </div>

      {/* Doctor + Meta banner */}
      <div className="rounded-3xl bg-primary p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            {doctor?.photoURL && !imgError ? (
              <img
                src={doctor.photoURL}
                alt={doctor.displayName || "Doctor"}
                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-primary-foreground/15"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-primary-foreground/10 grid place-items-center shrink-0">
                <User className="h-7 w-7 text-primary-foreground/50" />
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/45 mb-0.5">Prescribing Optometrist</p>
              <p className="text-lg font-bold text-primary-foreground">{doctor?.displayName || "Doctor"}</p>
              <p className="text-sm text-primary-foreground/55">Eye Wellness Specialist</p>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-6 sm:gap-2 sm:text-right">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/40">Prescription ID</p>
              <p className="font-mono text-sm text-primary-foreground/75">#{prescription.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/40">Issued</p>
              <p className="text-sm text-primary-foreground font-medium">
                {new Date(prescription.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
        {(service || appointment?.scheduledFor) && (
          <div className="mt-5 pt-5 border-t border-primary-foreground/10 flex flex-wrap items-center gap-3 text-sm text-primary-foreground/55">
            <Eye className="h-4 w-4 text-secondary" />
            {service && <span>{service.title}</span>}
            {service && appointment?.scheduledFor && <span className="text-primary-foreground/25">·</span>}
            {appointment?.scheduledFor && (
              <span>Consulted {new Date(appointment.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            )}
          </div>
        )}
      </div>

      {/* Vision Prescription Table */}
      <DashboardCard disableHover>
        <SectionHeader title="Vision Prescription" className="mt-0 mb-4" />
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-32"></th>
                {["SPH","CYL","AXIS","VA","PD"].map(h => (
                  <th key={h} className="pb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {[
                { label: "Right Eye", abbr: "OD", data: prescription.rightEye },
                { label: "Left Eye",  abbr: "OS", data: prescription.leftEye  },
              ].map(({ label, abbr, data }) => (
                <tr key={abbr}>
                  <td className="py-4 pr-4">
                    <span className="font-semibold text-foreground text-sm">{label}</span>
                    <span className="ml-2 text-[10px] font-semibold text-muted-foreground uppercase">{abbr}</span>
                  </td>
                  {["sph","cyl","axis","va","pd"].map(k => (
                    <td key={k} className="py-4 text-center font-mono text-foreground text-sm">
                      {data?.[k] ?? <span className="text-muted-foreground/40">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* Findings & Diagnosis */}
      <DashboardCard disableHover staggerIndex={1}>
        <SectionHeader title="Clinical Findings" className="mt-0 mb-4" />
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Findings</p>
            <p className="text-sm text-foreground leading-relaxed">{prescription.findings || "No findings recorded"}</p>
          </div>
          <div className="border-t border-border/30 pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Diagnosis</p>
            <p className="text-sm text-foreground leading-relaxed">{prescription.diagnosis || "No diagnosis recorded"}</p>
          </div>
        </div>
      </DashboardCard>

      {/* Medications */}
      {prescription.medications?.length > 0 && (
        <DashboardCard disableHover staggerIndex={2}>
          <SectionHeader title="Medications" className="mt-0 mb-4" />
          <div className="space-y-3">
            {prescription.medications.map((med: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-accent/15">
                <div className="h-8 w-8 shrink-0 rounded-xl bg-primary grid place-items-center text-primary-foreground text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm mb-1.5">{med.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {med.dosage    && <span><span className="font-medium text-foreground/70">Dosage:</span> {med.dosage}</span>}
                    {med.frequency && <span><span className="font-medium text-foreground/70">Frequency:</span> {med.frequency}</span>}
                    {med.duration  && <span><span className="font-medium text-foreground/70">Duration:</span> {med.duration}</span>}
                  </div>
                  {med.instructions && <p className="text-xs text-muted-foreground mt-1.5 italic">{med.instructions}</p>}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Eye Drops */}
      {prescription.eyeDrops?.length > 0 && (
        <DashboardCard disableHover staggerIndex={3}>
          <SectionHeader title="Eye Drops" className="mt-0 mb-4" />
          <div className="space-y-3">
            {prescription.eyeDrops.map((drop: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-secondary/8">
                <div className="h-8 w-8 shrink-0 rounded-xl bg-secondary grid place-items-center text-secondary-foreground text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm mb-1.5">{drop.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {drop.dosage    && <span><span className="font-medium text-foreground/70">Dosage:</span> {drop.dosage}</span>}
                    {drop.frequency && <span><span className="font-medium text-foreground/70">Frequency:</span> {drop.frequency}</span>}
                    {drop.duration  && <span><span className="font-medium text-foreground/70">Duration:</span> {drop.duration}</span>}
                  </div>
                  {drop.instructions && <p className="text-xs text-muted-foreground mt-1.5 italic">{drop.instructions}</p>}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Recommendations */}
      {prescription.recommendations?.length > 0 && (
        <DashboardCard disableHover staggerIndex={4}>
          <SectionHeader title="Recommendations" className="mt-0 mb-4" />
          <ul className="space-y-2.5">
            {prescription.recommendations.map((rec: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      {/* Exercises */}
      {prescription.exercises?.length > 0 && (
        <DashboardCard disableHover staggerIndex={5}>
          <SectionHeader title="Eye Exercises" className="mt-0 mb-4" />
          <div className="space-y-3">
            {prescription.exercises.map((ex: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-accent/15">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-foreground text-sm">{ex.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                    {ex.frequency && <span>{ex.frequency}</span>}
                    {ex.frequency && ex.duration && <span>·</span>}
                    {ex.duration  && <span>{ex.duration}</span>}
                  </div>
                </div>
                {ex.description && <p className="text-xs text-muted-foreground leading-relaxed">{ex.description}</p>}
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Consultation Notes */}
      {prescription.consultationNotes && (
        <DashboardCard disableHover staggerIndex={6}>
          <SectionHeader title="Consultation Notes" className="mt-0 mb-4" />
          <p className="text-sm text-foreground/70 leading-relaxed">{prescription.consultationNotes}</p>
        </DashboardCard>
      )}

      {/* Follow-up */}
      {prescription.followUpRequired && (
        <GlassPanel padding="md" className="flex items-center gap-4 border-secondary/20 bg-secondary/5">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-secondary/15 grid place-items-center">
            <CheckCircle className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Follow-up Required</p>
            {prescription.followUpDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Scheduled for {new Date(prescription.followUpDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Support footer */}
      <GlassPanel padding="md" className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <p className="font-semibold text-foreground text-sm mb-0.5">Have questions about your prescription?</p>
          <p className="text-xs text-muted-foreground">Contact our support team for any clarifications.</p>
        </div>
        <Link href="/patient/support" className="shrink-0">
          <PremiumButton variant="outline" size="sm">Contact Support</PremiumButton>
        </Link>
      </GlassPanel>

    </div>
  );
}
