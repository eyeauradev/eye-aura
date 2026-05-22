"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, usersService, appointmentsService, servicesService } from "@/services/firestore";
import { User, ArrowLeft, Download, Printer, CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [service, setService] = useState<any>(null);

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

        const appointmentData = await appointmentsService.getById(prescriptionData.appointmentId);
        setAppointment(appointmentData);

        if (appointmentData) {
          const serviceData = await servicesService.getById(appointmentData.serviceId);
          setService(serviceData);
        }
      } catch (error) {
        console.error("Error loading prescription:", error);
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1a9e98] border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-[#0f4f4b]/60">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="flex items-center justify-center py-32 px-4">
        <div className="text-center max-w-sm">
          <p className="text-[#0f4f4b]/60 mb-4">Prescription not found</p>
          <Link href="/patient/prescriptions">
            <Button>View Prescriptions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f4f4b]/40 mb-4">{children}</p>
  );

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Top bar — back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/patient/prescriptions"
          className="inline-flex items-center gap-2 text-sm text-[#0f4f4b]/55 hover:text-[#0f4f4b] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prescriptions
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2 h-9 text-xs rounded-xl px-4">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} className="flex items-center gap-2 h-9 text-xs rounded-xl px-4">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Doctor + Meta banner */}
      <div className="rounded-3xl bg-[#0f4f4b] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            {doctor?.photoURL ? (
              <img
                src={doctor.photoURL}
                alt={doctor.displayName || "Doctor"}
                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/15"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-white/10 grid place-items-center shrink-0">
                <User className="h-7 w-7 text-white/50" />
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/45 mb-0.5">Prescribing Optometrist</p>
              <p className="text-lg font-bold text-white">{doctor?.displayName || "Doctor"}</p>
              <p className="text-sm text-white/55">Eye Wellness Specialist</p>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-6 sm:gap-2 sm:text-right">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Prescription ID</p>
              <p className="font-mono text-sm text-white/75">#{prescription.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Issued</p>
              <p className="text-sm text-white font-medium">
                {new Date(prescription.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
        {(service || appointment?.scheduledFor) && (
          <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3 text-sm text-white/55">
            <Eye className="h-4 w-4 text-[#1a9e98]" />
            {service && <span>{service.title}</span>}
            {service && appointment?.scheduledFor && <span className="text-white/25">·</span>}
            {appointment?.scheduledFor && (
              <span>Consulted {new Date(appointment.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            )}
          </div>
        )}
      </div>

      {/* Vision Prescription Table */}
      <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-6">
        <SectionLabel>Vision Prescription</SectionLabel>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-[#0f4f4b]/8">
                <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#0f4f4b]/40 w-32"></th>
                {["SPH","CYL","AXIS","VA","PD"].map(h => (
                  <th key={h} className="pb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#0f4f4b]/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0f4f4b]/5">
              {[
                { label: "Right Eye", abbr: "OD", data: prescription.rightEye },
                { label: "Left Eye",  abbr: "OS", data: prescription.leftEye  },
              ].map(({ label, abbr, data }) => (
                <tr key={abbr}>
                  <td className="py-4 pr-4">
                    <span className="font-semibold text-[#0f4f4b] text-sm">{label}</span>
                    <span className="ml-2 text-[10px] font-semibold text-[#0f4f4b]/35 uppercase">{abbr}</span>
                  </td>
                  {["sph","cyl","axis","va","pd"].map(k => (
                    <td key={k} className="py-4 text-center font-mono text-[#0f4f4b] text-sm">
                      {data?.[k] ?? <span className="text-[#0f4f4b]/25">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Findings & Diagnosis */}
      <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-6">
        <SectionLabel>Clinical Findings</SectionLabel>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#0f4f4b]/50 mb-1.5">Findings</p>
            <p className="text-sm text-[#0f4f4b] leading-relaxed">{prescription.findings || "No findings recorded"}</p>
          </div>
          <div className="border-t border-[#0f4f4b]/6 pt-4">
            <p className="text-xs font-semibold text-[#0f4f4b]/50 mb-1.5">Diagnosis</p>
            <p className="text-sm text-[#0f4f4b] leading-relaxed">{prescription.diagnosis || "No diagnosis recorded"}</p>
          </div>
        </div>
      </div>

      {/* Medications */}
      {prescription.medications?.length > 0 && (
        <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-6">
          <SectionLabel>Medications</SectionLabel>
          <div className="space-y-3">
            {prescription.medications.map((med: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-[#f5f2ec]">
                <div className="h-8 w-8 shrink-0 rounded-xl bg-[#0f4f4b] grid place-items-center text-white text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0f4f4b] text-sm mb-1.5">{med.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#0f4f4b]/55">
                    {med.dosage    && <span><span className="font-medium text-[#0f4f4b]/70">Dosage:</span> {med.dosage}</span>}
                    {med.frequency && <span><span className="font-medium text-[#0f4f4b]/70">Frequency:</span> {med.frequency}</span>}
                    {med.duration  && <span><span className="font-medium text-[#0f4f4b]/70">Duration:</span> {med.duration}</span>}
                  </div>
                  {med.instructions && <p className="text-xs text-[#0f4f4b]/45 mt-1.5 italic">{med.instructions}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eye Drops */}
      {prescription.eyeDrops?.length > 0 && (
        <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-6">
          <SectionLabel>Eye Drops</SectionLabel>
          <div className="space-y-3">
            {prescription.eyeDrops.map((drop: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-[#edf5f4]">
                <div className="h-8 w-8 shrink-0 rounded-xl bg-[#1a9e98] grid place-items-center text-white text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0f4f4b] text-sm mb-1.5">{drop.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#0f4f4b]/55">
                    {drop.dosage    && <span><span className="font-medium text-[#0f4f4b]/70">Dosage:</span> {drop.dosage}</span>}
                    {drop.frequency && <span><span className="font-medium text-[#0f4f4b]/70">Frequency:</span> {drop.frequency}</span>}
                    {drop.duration  && <span><span className="font-medium text-[#0f4f4b]/70">Duration:</span> {drop.duration}</span>}
                  </div>
                  {drop.instructions && <p className="text-xs text-[#0f4f4b]/45 mt-1.5 italic">{drop.instructions}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {prescription.recommendations?.length > 0 && (
        <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-6">
          <SectionLabel>Recommendations</SectionLabel>
          <ul className="space-y-2.5">
            {prescription.recommendations.map((rec: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#0f4f4b]">
                <CheckCircle className="h-4 w-4 text-[#1a9e98] mt-0.5 shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Exercises */}
      {prescription.exercises?.length > 0 && (
        <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-6">
          <SectionLabel>Eye Exercises</SectionLabel>
          <div className="space-y-3">
            {prescription.exercises.map((ex: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-[#f5f2ec]">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-[#0f4f4b] text-sm">{ex.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-[#0f4f4b]/45 shrink-0">
                    {ex.frequency && <span>{ex.frequency}</span>}
                    {ex.frequency && ex.duration && <span>·</span>}
                    {ex.duration  && <span>{ex.duration}</span>}
                  </div>
                </div>
                {ex.description && <p className="text-xs text-[#0f4f4b]/55 leading-relaxed">{ex.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultation Notes */}
      {prescription.consultationNotes && (
        <div className="rounded-3xl border border-[#0f4f4b]/8 bg-white p-6">
          <SectionLabel>Consultation Notes</SectionLabel>
          <p className="text-sm text-[#0f4f4b]/70 leading-relaxed">{prescription.consultationNotes}</p>
        </div>
      )}

      {/* Follow-up */}
      {prescription.followUpRequired && (
        <div className="rounded-3xl border border-[#1a9e98]/20 bg-[#1a9e98]/5 p-5 flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-[#1a9e98]/15 grid place-items-center">
            <CheckCircle className="h-5 w-5 text-[#1a9e98]" />
          </div>
          <div>
            <p className="font-semibold text-[#0f4f4b] text-sm">Follow-up Required</p>
            {prescription.followUpDate && (
              <p className="text-xs text-[#0f4f4b]/55 mt-0.5">
                Scheduled for {new Date(prescription.followUpDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Support footer */}
      <div className="rounded-3xl border border-[#0f4f4b]/8 bg-[#f5f2ec] p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <p className="font-semibold text-[#0f4f4b] text-sm mb-0.5">Have questions about your prescription?</p>
          <p className="text-xs text-[#0f4f4b]/50">Contact our support team for any clarifications.</p>
        </div>
        <Link href="/patient/support" className="shrink-0">
          <Button variant="outline" className="rounded-xl h-9 text-xs px-4">Contact Support</Button>
        </Link>
      </div>

    </div>
  );
}
