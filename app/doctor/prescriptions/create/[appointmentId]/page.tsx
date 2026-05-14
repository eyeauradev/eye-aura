"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, prescriptionsService } from "@/services/firestore";
import type { AppointmentDocument, PrescriptionDocument } from "@/types/firestore";
import { ArrowLeft, Eye, FileText, Save, Eye as EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";

interface EyeData {
  sph: string;
  cyl: string;
  axis: string;
  va: string;
}

interface PrescriptionFormData {
  rightEye: EyeData;
  leftEye: EyeData;
  pd: string;
  diagnosis: string;
  findings: string;
  medications: string;
  eyeDrops: string;
  exercises: string;
  recommendations: string;
  consultationNotes: string;
  followUpRequired: boolean;
  followUpDate: string;
}

const initialEyeData: EyeData = {
  sph: "",
  cyl: "",
  axis: "",
  va: "",
};

const initialFormData: PrescriptionFormData = {
  rightEye: { ...initialEyeData },
  leftEye: { ...initialEyeData },
  pd: "",
  diagnosis: "",
  findings: "",
  medications: "",
  eyeDrops: "",
  exercises: "",
  recommendations: "",
  consultationNotes: "",
  followUpRequired: false,
  followUpDate: "",
};

export default function DoctorPrescriptionCreatePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentDocument | null>(null);
  const [formData, setFormData] = useState<PrescriptionFormData>(initialFormData);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function loadAppointment() {
      if (!params.appointmentId) return;

      try {
        setLoading(true);
        const apt = await appointmentsService.getById(params.appointmentId as string);
        setAppointment(apt);
      } catch (error) {
        console.error("Error loading appointment:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [params.appointmentId]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEyeDataChange = (eye: "rightEye" | "leftEye", field: keyof EyeData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment || !user) return;

    try {
      setSaving(true);

      const prescription: PrescriptionDocument = {
        id: crypto.randomUUID(),
        patientId: appointment.patientId,
        doctorId: user.id,
        appointmentId: appointment.id,
        rightEye: formData.rightEye,
        leftEye: formData.leftEye,
        pd: formData.pd,
        diagnosis: formData.diagnosis,
        findings: formData.findings,
        medications: formData.medications,
        eyeDrops: formData.eyeDrops,
        exercises: formData.exercises,
        recommendations: formData.recommendations,
        consultationNotes: formData.consultationNotes,
        followUpRequired: formData.followUpRequired,
        followUpDate: formData.followUpRequired ? new Date(formData.followUpDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prescriptionsService.create(prescription);

      // Update appointment with prescription ID
      await appointmentsService.update(appointment.id, {
        prescriptionId: prescription.id,
      });

      router.push(`/doctor/prescriptions/${prescription.id}`);
    } catch (error) {
      console.error("Error creating prescription:", error);
      alert("Failed to create prescription. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Appointment not found</p>
            <Link href="/doctor/appointments">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Appointments
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
          <h1 className="font-display text-4xl text-primary mb-2">Create Prescription</h1>
          <p className="text-xl text-muted-foreground">Patient ID: {appointment.patientId}</p>
        </div>
        <Button onClick={() => setShowPreview(!showPreview)} variant="outline">
          <EyeIcon className="h-4 w-4 mr-2" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Right Eye */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Right Eye</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">SPH</label>
                    <input
                      type="text"
                      value={formData.rightEye.sph}
                      onChange={(e) => handleEyeDataChange("rightEye", "sph", e.target.value)}
                      placeholder="e.g., -2.50"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">CYL</label>
                    <input
                      type="text"
                      value={formData.rightEye.cyl}
                      onChange={(e) => handleEyeDataChange("rightEye", "cyl", e.target.value)}
                      placeholder="e.g., -0.50"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">AXIS</label>
                    <input
                      type="text"
                      value={formData.rightEye.axis}
                      onChange={(e) => handleEyeDataChange("rightEye", "axis", e.target.value)}
                      placeholder="e.g., 180"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">VA</label>
                    <input
                      type="text"
                      value={formData.rightEye.va}
                      onChange={(e) => handleEyeDataChange("rightEye", "va", e.target.value)}
                      placeholder="e.g., 6/6"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Left Eye */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Left Eye</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">SPH</label>
                    <input
                      type="text"
                      value={formData.leftEye.sph}
                      onChange={(e) => handleEyeDataChange("leftEye", "sph", e.target.value)}
                      placeholder="e.g., -2.50"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">CYL</label>
                    <input
                      type="text"
                      value={formData.leftEye.cyl}
                      onChange={(e) => handleEyeDataChange("leftEye", "cyl", e.target.value)}
                      placeholder="e.g., -0.50"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">AXIS</label>
                    <input
                      type="text"
                      value={formData.leftEye.axis}
                      onChange={(e) => handleEyeDataChange("leftEye", "axis", e.target.value)}
                      placeholder="e.g., 180"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">VA</label>
                    <input
                      type="text"
                      value={formData.leftEye.va}
                      onChange={(e) => handleEyeDataChange("leftEye", "va", e.target.value)}
                      placeholder="e.g., 6/6"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PD */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Pupillary Distance</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="text"
                  value={formData.pd}
                  onChange={(e) => handleInputChange("pd", e.target.value)}
                  placeholder="e.g., 64"
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </CardContent>
            </Card>

            {/* Diagnosis */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Diagnosis</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                  placeholder="Enter diagnosis..."
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Findings */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.findings}
                  onChange={(e) => handleInputChange("findings", e.target.value)}
                  placeholder="Enter examination findings..."
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Medications */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Medications</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.medications}
                  onChange={(e) => handleInputChange("medications", e.target.value)}
                  placeholder="Enter prescribed medications..."
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Eye Drops */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Eye Drops</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.eyeDrops}
                  onChange={(e) => handleInputChange("eyeDrops", e.target.value)}
                  placeholder="Enter prescribed eye drops..."
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Exercises */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Exercises</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.exercises}
                  onChange={(e) => handleInputChange("exercises", e.target.value)}
                  placeholder="Enter recommended exercises..."
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.recommendations}
                  onChange={(e) => handleInputChange("recommendations", e.target.value)}
                  placeholder="Enter recommendations..."
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Consultation Notes */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Consultation Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.consultationNotes}
                  onChange={(e) => handleInputChange("consultationNotes", e.target.value)}
                  placeholder="Enter consultation notes..."
                  rows={4}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Follow-Up */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Follow-Up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="followUpRequired"
                    checked={formData.followUpRequired}
                    onChange={(e) => handleInputChange("followUpRequired", e.target.checked)}
                    className="w-5 h-5 rounded border-primary/10"
                  />
                  <label htmlFor="followUpRequired" className="text-sm font-medium text-primary">
                    Follow-up required
                  </label>
                </div>
                {formData.followUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Follow-up Date</label>
                    <input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => handleInputChange("followUpDate", e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Prescription"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-6">
            <Card className="border-primary/10 bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Prescription Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <PrescriptionPreview formData={formData} appointment={appointment} doctor={user} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescriptionPreview({ formData, appointment, doctor }: { formData: PrescriptionFormData; appointment: AppointmentDocument; doctor: any }) {
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
          <p className="text-sm text-muted-foreground">Date: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p className="text-sm text-muted-foreground">Dr. {doctor?.displayName || "Doctor"}</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="mb-6 pb-6 border-b border-primary/10">
        <p className="text-sm text-muted-foreground">Patient ID: {appointment.patientId}</p>
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
                <span>{formData.rightEye.sph || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CYL:</span>
                <span>{formData.rightEye.cyl || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AXIS:</span>
                <span>{formData.rightEye.axis || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VA:</span>
                <span>{formData.rightEye.va || "-"}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium text-primary mb-3">Left Eye (OS)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SPH:</span>
                <span>{formData.leftEye.sph || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CYL:</span>
                <span>{formData.leftEye.cyl || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AXIS:</span>
                <span>{formData.leftEye.axis || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VA:</span>
                <span>{formData.leftEye.va || "-"}</span>
              </div>
            </div>
          </div>
        </div>
        {formData.pd && (
          <div className="mt-4">
            <p className="text-sm"><span className="text-muted-foreground">PD:</span> {formData.pd}</p>
          </div>
        )}
      </div>

      {/* Findings & Diagnosis */}
      {(formData.findings || formData.diagnosis) && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Findings & Diagnosis</h3>
          {formData.findings && (
            <div className="mb-3">
              <p className="text-sm font-medium text-primary mb-1">Findings:</p>
              <p className="text-sm text-muted-foreground">{formData.findings}</p>
            </div>
          )}
          {formData.diagnosis && (
            <div>
              <p className="text-sm font-medium text-primary mb-1">Diagnosis:</p>
              <p className="text-sm text-muted-foreground">{formData.diagnosis}</p>
            </div>
          )}
        </div>
      )}

      {/* Medications */}
      {formData.medications && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Medications</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.medications}</p>
        </div>
      )}

      {/* Eye Drops */}
      {formData.eyeDrops && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Eye Drops</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.eyeDrops}</p>
        </div>
      )}

      {/* Exercises */}
      {formData.exercises && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Exercises</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.exercises}</p>
        </div>
      )}

      {/* Recommendations */}
      {formData.recommendations && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Recommendations</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.recommendations}</p>
        </div>
      )}

      {/* Consultation Notes */}
      {formData.consultationNotes && (
        <div className="mb-6">
          <h3 className="font-display text-lg text-primary mb-4">Consultation Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.consultationNotes}</p>
        </div>
      )}

      {/* Follow-Up */}
      {formData.followUpRequired && formData.followUpDate && (
        <div className="mt-6 pt-6 border-t border-primary/10">
          <div className="flex items-center gap-2 text-secondary">
            <Eye className="h-4 w-4" />
            <p className="text-sm font-medium">
              Follow-up Required: {new Date(formData.followUpDate).toLocaleDateString("en-US", {
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
