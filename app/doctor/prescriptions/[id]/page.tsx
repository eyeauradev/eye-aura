"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, appointmentsService, usersService } from "@/services/firestore";
import type { PrescriptionDocument, AppointmentDocument, UserDocument } from "@/types/firestore";
import { ArrowLeft, Eye, Download, Share2, Calendar, User, FileText, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";

export default function DoctorPrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<PrescriptionDocument | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDocument | null>(null);
  const [patient, setPatient] = useState<UserDocument | null>(null);

  useEffect(() => {
    async function loadPrescription() {
      if (!params.id) return;

      try {
        setLoading(true);
        const rx = await prescriptionsService.getById(params.id as string);
        setPrescription(rx);

        if (rx) {
          // Load appointment
          if (rx.appointmentId) {
            const apt = await appointmentsService.getById(rx.appointmentId);
            setAppointment(apt);
          }

          // Load patient
          const pat = await usersService.getById(rx.patientId);
          setPatient(pat);
        }
      } catch (error) {
        console.error("Error loading prescription:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPrescription();
  }, [params.id]);

  const handleExportPDF = () => {
    if (!prescription) return;
    router.push(`/prescriptions/${prescription.id}/pdf`);
  };

  const handleExportPNG = () => {
    // TODO: Implement PNG export
    alert("PNG export will be implemented with html2canvas or similar");
  };

  const handleShare = async () => {
    if (!prescription) return;
    // TODO: Implement shareable link generation
    const shareUrl = `${window.location.origin}/prescriptions/${prescription.id}`;
    await navigator.clipboard.writeText(shareUrl);
    alert("Shareable link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Prescription not found</p>
            <Link href="/doctor/prescriptions">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Prescriptions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/doctor/appointments">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Appointments
            </Button>
          </Link>
          <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">Prescription Details</h1>
          <p className="text-sm sm:text-sm sm:text-xl text-muted-foreground">
            {patient?.displayName || "Patient"} • {new Date(prescription.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleExportPNG} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PNG
          </Button>
          <Button onClick={handleShare} variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Prescription Display */}
      
        <Card className="border-primary/10 bg-white">
          <CardContent className="p-4 sm:p-8">
            <PrescriptionDisplay prescription={prescription} patient={patient} doctor={user} appointment={appointment} />
          </CardContent>
        </Card>
      

      {/* Actions */}
      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointment && (
              <Link href={`/doctor/appointments/${appointment.id}`} className="block">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Related Appointment
                </Button>
              </Link>
            )}
            {patient && (
              <Link href={`/doctor/patients/${patient.id}`} className="block">
                <Button variant="outline" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  View Patient History
                </Button>
              </Link>
            )}
            <Link href={`/doctor/prescriptions/create/${prescription.appointmentId}`} className="block">
              <Button variant="outline" className="w-full">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Prescription
              </Button>
            </Link>
          </CardContent>
        </Card>
      
    </div>
  );
}

function PrescriptionDisplay({ 
  prescription, 
  patient, 
  doctor, 
  appointment 
}: { 
  prescription: PrescriptionDocument; 
  patient: UserDocument | null; 
  doctor: any; 
  appointment: AppointmentDocument | null; 
}) {
  return (
    <div className="border border-primary/10 rounded-xl p-8 bg-gradient-to-br from-[#F7F4EF] to-[#DDE5DF]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0F4F4B] to-[#1A6B66] flex items-center justify-center">
            <span className="text-white font-bold text-lg">EA</span>
          </div>
          <div>
            <h2 className="font-display text-2xl text-primary">Eye Aura</h2>
            <p className="text-sm text-muted-foreground">Digital Eye Wellness</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Date: {new Date(prescription.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p className="text-sm text-muted-foreground">Dr. {doctor?.displayName || "Doctor"}</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="mb-6 pb-6 border-b border-primary/10">
        <p className="text-sm text-muted-foreground">Patient: {patient?.displayName || "N/A"}</p>
        {patient?.email && <p className="text-sm text-muted-foreground">{patient.email}</p>}
        {patient?.phoneNumber && <p className="text-sm text-muted-foreground">{patient.phoneNumber}</p>}
        {appointment && (
          <p className="text-sm text-muted-foreground">Consultation: {new Date(appointment.scheduledFor).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        )}
      </div>

      {/* Eye Examination Results */}
      <div className="mb-6 pb-6 border-b border-primary/10">
        <h3 className="font-display text-lg text-primary mb-4">Eye Examination Results</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="font-medium text-primary mb-3">Right Eye (OD)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SPH:</span>
                <span>{prescription.rightEye.sph || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CYL:</span>
                <span>{prescription.rightEye.cyl || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AXIS:</span>
                <span>{prescription.rightEye.axis || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VA:</span>
                <span>{prescription.rightEye.va || "-"}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium text-primary mb-3">Left Eye (OS)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SPH:</span>
                <span>{prescription.leftEye.sph || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CYL:</span>
                <span>{prescription.leftEye.cyl || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AXIS:</span>
                <span>{prescription.leftEye.axis || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VA:</span>
                <span>{prescription.leftEye.va || "-"}</span>
              </div>
            </div>
          </div>
        </div>
        {prescription.pd && (
          <div className="mt-4">
            <p className="text-sm"><span className="text-muted-foreground">PD:</span> {prescription.pd}</p>
          </div>
        )}
      </div>

      {/* Findings & Diagnosis */}
      {(prescription.findings || prescription.diagnosis) && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Findings & Diagnosis</h3>
          {prescription.findings && (
            <div className="mb-3">
              <p className="text-sm font-medium text-primary mb-1">Findings:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.findings}</p>
            </div>
          )}
          {prescription.diagnosis && (
            <div>
              <p className="text-sm font-medium text-primary mb-1">Diagnosis:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.diagnosis}</p>
            </div>
          )}
        </div>
      )}

      {/* Medications */}
      {prescription.medications && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Medications</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.medications}</p>
        </div>
      )}

      {/* Eye Drops */}
      {prescription.eyeDrops && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Eye Drops</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.eyeDrops}</p>
        </div>
      )}

      {/* Exercises */}
      {prescription.exercises && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Exercises</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.exercises}</p>
        </div>
      )}

      {/* Recommendations */}
      {prescription.recommendations && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Recommendations</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.recommendations}</p>
        </div>
      )}

      {/* Consultation Notes */}
      {prescription.consultationNotes && (
        <div className="mb-6">
          <h3 className="font-display text-lg text-primary mb-4">Consultation Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.consultationNotes}</p>
        </div>
      )}

      {/* Follow-Up */}
      {prescription.followUpRequired && prescription.followUpDate && (
        <div className="mt-6 pt-6 border-t border-primary/10">
          <div className="flex items-center gap-2 text-secondary">
            <Eye className="h-4 w-4" />
            <p className="text-sm font-medium">
              Follow-up Required: {new Date(prescription.followUpDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-primary/10 text-center">
        <p className="text-xs text-muted-foreground">
          This prescription is generated by Eye Aura Digital Eye Wellness Platform.
          For questions, please contact your eye care provider.
        </p>
      </div>
    </div>
  );
}
