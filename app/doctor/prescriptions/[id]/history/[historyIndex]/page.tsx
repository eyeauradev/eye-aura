"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, usersService } from "@/services/firestore";
import type { PrescriptionDocument, UserDocument, PrescriptionHistoryEntry } from "@/types/firestore";
import { ArrowLeft, Download, Share2, Clock } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import Link from "next/link";

export default function HistoricalPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<PrescriptionDocument | null>(null);
  const [historyEntry, setHistoryEntry] = useState<PrescriptionHistoryEntry | null>(null);
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [doctor, setDoctor] = useState<UserDocument | null>(null);

  useEffect(() => {
    async function loadHistoricalPrescription() {
      if (!params.id || !params.historyIndex) return;

      try {
        setLoading(true);
        const rx = await prescriptionsService.getById(params.id as string);
        
        if (!rx) {
          throw new Error("Prescription not found");
        }

        setPrescription(rx);

        // Get the history entry (remember: history is stored oldest first, but we display newest first)
        const historyIndex = parseInt(params.historyIndex as string);
        if (rx.history && rx.history.length > 0) {
          // Reverse to match the display order (newest first)
          const reversedHistory = [...rx.history].reverse();
          const entry = reversedHistory[historyIndex];
          
          if (!entry) {
            throw new Error("History entry not found");
          }

          setHistoryEntry(entry);

          // Load patient
          const pat = await usersService.getById(rx.patientId);
          setPatient(pat);

          // Load doctor who saved this version
          if (entry.savedBy) {
            const doc = await usersService.getById(entry.savedBy);
            setDoctor(doc);
          }
        } else {
          throw new Error("No history available for this prescription");
        }
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
        logError(appError.code, error, "HistoricalPrescriptionPage");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadHistoricalPrescription();
  }, [params.id, params.historyIndex]);

  const handleExportPDF = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!prescription) return;
    const shareUrl = `${window.location.origin}/doctor/prescriptions/${prescription.id}/history/${params.historyIndex}`;
    await navigator.clipboard.writeText(shareUrl);
    alert("Shareable link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading historical prescription...</p>
        </div>
      </div>
    );
  }

  if (!prescription || !historyEntry) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Historical prescription not found</p>
            <Link href="/doctor/prescriptions">
              <PremiumButton variant="outline" icon={<ArrowLeft className="h-4 w-4" />}>
                Back to Prescriptions
              </PremiumButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = historyEntry.data as any;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Link href={`/doctor/prescriptions/${prescription.id}`}>
            <PremiumButton variant="ghost" className="mb-4" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Current Prescription
            </PremiumButton>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className={TYPOGRAPHY.heading}>Historical Prescription</h1>
            <Badge className="flex items-center gap-1 bg-secondary/10 text-secondary">
              <Clock className="h-3 w-3" />
              {new Date(historyEntry.savedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {patient?.displayName || "Patient"} • Saved on {new Date(historyEntry.savedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })} at {new Date(historyEntry.savedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <PremiumButton onClick={handleExportPDF} variant="outline" icon={<Download className="h-4 w-4" />}>
            Export PDF
          </PremiumButton>
          <PremiumButton onClick={handleShare} variant="outline" icon={<Share2 className="h-4 w-4" />}>
            Share
          </PremiumButton>
        </div>
      </div>

      {/* Prescription Display */}
      <Card className="border-primary/10 bg-white">
        <CardContent className="p-4 sm:p-8">
          <PrescriptionDisplay data={data} patient={patient} doctor={doctor} savedAt={historyEntry.savedAt} />
        </CardContent>
      </Card>
    </div>
  );
}

function PrescriptionDisplay({ 
  data, 
  patient, 
  doctor,
  savedAt,
}: { 
  data: any; 
  patient: UserDocument | null; 
  doctor: UserDocument | null;
  savedAt: Date;
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
          <p className="text-sm text-muted-foreground">
            Date: {new Date(savedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-sm text-muted-foreground">Dr. {doctor?.displayName || "Doctor"}</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="mb-6 pb-6 border-b border-primary/10">
        <p className="text-sm text-muted-foreground">Patient: {patient?.displayName || "N/A"}</p>
        {patient?.email && <p className="text-sm text-muted-foreground">{patient.email}</p>}
        {patient?.phoneNumber && <p className="text-sm text-muted-foreground">{patient.phoneNumber}</p>}
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
                <span>{data.rightEye?.sph || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CYL:</span>
                <span>{data.rightEye?.cyl || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AXIS:</span>
                <span>{data.rightEye?.axis || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VA:</span>
                <span>{data.rightEye?.va || "-"}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium text-primary mb-3">Left Eye (OS)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SPH:</span>
                <span>{data.leftEye?.sph || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CYL:</span>
                <span>{data.leftEye?.cyl || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AXIS:</span>
                <span>{data.leftEye?.axis || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VA:</span>
                <span>{data.leftEye?.va || "-"}</span>
              </div>
            </div>
          </div>
        </div>
        {data.pd && (
          <div className="mt-4">
            <p className="text-sm"><span className="text-muted-foreground">PD:</span> {data.pd}</p>
          </div>
        )}
      </div>

      {/* Findings & Diagnosis */}
      {(data.findings || data.diagnosis) && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Findings & Diagnosis</h3>
          {data.findings && (
            <div className="mb-3">
              <p className="text-sm font-medium text-primary mb-1">Findings:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.findings}</p>
            </div>
          )}
          {data.diagnosis && (
            <div>
              <p className="text-sm font-medium text-primary mb-1">Diagnosis:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.diagnosis}</p>
            </div>
          )}
        </div>
      )}

      {/* Medications */}
      {data.medications && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Medications</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.medications}</p>
        </div>
      )}

      {/* Eye Drops */}
      {data.eyeDrops && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Eye Drops</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.eyeDrops}</p>
        </div>
      )}

      {/* Exercises */}
      {data.exercises && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Exercises</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.exercises}</p>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Recommendations</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.recommendations}</p>
        </div>
      )}

      {/* Consultation Notes */}
      {data.consultationNotes && (
        <div className="mb-6">
          <h3 className="font-display text-lg text-primary mb-4">Consultation Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.consultationNotes}</p>
        </div>
      )}

      {/* Follow-Up */}
      {data.followUpRequired && data.followUpDate && (
        <div className="mt-6 pt-6 border-t border-primary/10">
          <div className="flex items-center gap-2 text-secondary">
            <Clock className="h-4 w-4" />
            <p className="text-sm font-medium">
              Follow-up Required: {new Date(data.followUpDate).toLocaleDateString("en-US", {
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
