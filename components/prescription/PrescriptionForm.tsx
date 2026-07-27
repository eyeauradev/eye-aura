"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, prescriptionsService, usersService } from "@/services/firestore";
import type { AppointmentDocument, PrescriptionDocument, UserDocument } from "@/types/firestore";
import { ArrowLeft, Eye, Save, Eye as EyeIcon } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";

interface EyeData {
  sph: string;
  cyl: string;
  axis: string;
  va: string;
  remarks: string;
}

interface NearVisionData {
  add: string;
  va: string;
  remarks: string;
}

interface PrescriptionFormData {
  rightEye: EyeData;
  leftEye: EyeData;
  nearVisionRight: NearVisionData;
  nearVisionLeft: NearVisionData;
  patientAge: string;
  patientGender: string;
  referredBy: string;
  diagnosis: string;
  eyeDrops: string;
  exercises: string;
  consultationNotes: string;
  followUpRequired: boolean;
  followUpDate: string;
  reviewAfter: string;
}

const initialEyeData: EyeData = {
  sph: "",
  cyl: "",
  axis: "",
  va: "",
  remarks: "",
};

const initialNearVisionData: NearVisionData = {
  add: "",
  va: "",
  remarks: "",
};

const initialFormData: PrescriptionFormData = {
  rightEye: { ...initialEyeData },
  leftEye: { ...initialEyeData },
  nearVisionRight: { ...initialNearVisionData },
  nearVisionLeft: { ...initialNearVisionData },
  patientAge: "",
  patientGender: "",
  referredBy: "",
  diagnosis: "",
  eyeDrops: "",
  exercises: "",
  consultationNotes: "",
  followUpRequired: false,
  followUpDate: "",
  reviewAfter: "",
};

interface PrescriptionFormProps {
  mode: "create" | "edit";
  prescriptionId?: string;
  appointmentId?: string;
  patientId?: string;
  onSuccess?: (prescriptionId: string) => void;
}

export function PrescriptionForm({ mode, prescriptionId, appointmentId, patientId, onSuccess }: PrescriptionFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError, error, success } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentDocument | null>(null);
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [formData, setFormData] = useState<PrescriptionFormData>(initialFormData);
  const [existingPrescription, setExistingPrescription] = useState<PrescriptionDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Edit mode: Load existing prescription
        if (mode === "edit" && prescriptionId) {
          const prescription = await prescriptionsService.getById(prescriptionId);
          if (!prescription) {
            throw new Error("Prescription not found");
          }
          setExistingPrescription(prescription);

          // Load patient data
          const patientData = await usersService.getById(prescription.patientId);
          setPatient(patientData);

          // Pre-fill form with existing data
          setFormData({
            rightEye: { ...initialEyeData, ...prescription.rightEye },
            leftEye: { ...initialEyeData, ...prescription.leftEye },
            nearVisionRight: prescription.nearVisionRight ? { ...initialNearVisionData, ...prescription.nearVisionRight } : { ...initialNearVisionData },
            nearVisionLeft: prescription.nearVisionLeft ? { ...initialNearVisionData, ...prescription.nearVisionLeft } : { ...initialNearVisionData },
            patientAge: prescription.patientAge || "",
            patientGender: prescription.patientGender || "",
            referredBy: prescription.referredBy || "",
            diagnosis: prescription.diagnosis || "",
            eyeDrops: prescription.eyeDrops || "",
            exercises: prescription.exercises || "",
            consultationNotes: prescription.consultationNotes || "",
            followUpRequired: prescription.followUpRequired || false,
            followUpDate: prescription.followUpDate ? new Date(prescription.followUpDate).toISOString().split("T")[0] : "",
            reviewAfter: prescription.reviewAfter || "",
          });
        }

        // Create mode with appointment: Load appointment and patient
        if (mode === "create" && appointmentId) {
          const apt = await appointmentsService.getById(appointmentId);
          if (apt) {
            setAppointment(apt);
            const patientData = await usersService.getById(apt.patientId);
            setPatient(patientData);
          }
        }

        // Create mode with patientId: Load patient
        if (mode === "create" && patientId && !appointmentId) {
          const patientData = await usersService.getById(patientId);
          setPatient(patientData);
        }
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
        logError(appError.code, error, "PrescriptionForm");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [mode, prescriptionId, appointmentId, patientId]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEyeDataChange = (eye: "rightEye" | "leftEye", field: keyof EyeData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: value }
    }));
  };

  const handleNearVisionChange = (eye: "nearVisionRight" | "nearVisionLeft", field: keyof NearVisionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: value }
    }));
  };

  const validateForm = (): boolean => {
    // Validate required fields based on requirements 3.2, 3.3, 3.4
    if (!formData.rightEye.sph && !formData.rightEye.cyl) {
      error("Please provide right eye SPH or CYL values");
      return false;
    }
    if (!formData.leftEye.sph && !formData.leftEye.cyl) {
      error("Please provide left eye SPH or CYL values");
      return false;
    }
    if (!formData.diagnosis.trim()) {
      error("Diagnosis is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get target patient ID
    const targetPatientId = mode === "edit" 
      ? existingPrescription!.patientId 
      : patientId || appointment?.patientId;

    if (!targetPatientId) {
      const error = getDisplayError(
        new Error("Patient ID is required"),
        ERROR_CODES.PRESCRIPTION.OPERATION_FAILED
      );
      logError(error.code, new Error("Patient ID is required"), "PrescriptionForm.submit");
      errorFromAppError(error);
      return;
    }

    try {
      setSaving(true);

      if (mode === "edit" && existingPrescription) {
        // Editing existing prescription — save previous version to history
        const previousData: Partial<PrescriptionDocument> = {
          rightEye: existingPrescription.rightEye,
          leftEye: existingPrescription.leftEye,
          nearVisionRight: existingPrescription.nearVisionRight,
          nearVisionLeft: existingPrescription.nearVisionLeft,
          patientAge: existingPrescription.patientAge,
          patientGender: existingPrescription.patientGender,
          referredBy: existingPrescription.referredBy,
          diagnosis: existingPrescription.diagnosis,
          eyeDrops: existingPrescription.eyeDrops,
          exercises: existingPrescription.exercises,
          consultationNotes: existingPrescription.consultationNotes,
          reviewAfter: existingPrescription.reviewAfter,
          followUpRequired: existingPrescription.followUpRequired,
          ...(existingPrescription.followUpDate ? { followUpDate: existingPrescription.followUpDate } : {}),
        };

        const updates: Partial<PrescriptionDocument> = {
          rightEye: formData.rightEye,
          leftEye: formData.leftEye,
          nearVisionRight: formData.nearVisionRight,
          nearVisionLeft: formData.nearVisionLeft,
          patientAge: formData.patientAge,
          patientGender: formData.patientGender,
          referredBy: formData.referredBy,
          diagnosis: formData.diagnosis,
          eyeDrops: formData.eyeDrops,
          exercises: formData.exercises,
          consultationNotes: formData.consultationNotes,
          reviewAfter: formData.reviewAfter,
          followUpRequired: formData.followUpRequired,
          ...(formData.followUpRequired && formData.followUpDate ? { followUpDate: new Date(formData.followUpDate) } : {}),
        };

        await prescriptionsService.updateWithHistory(
          existingPrescription.id,
          updates,
          previousData,
          user.id
        );

        success("Prescription updated successfully");
        
        if (onSuccess) {
          onSuccess(existingPrescription.id);
        } else {
          router.push(`/doctor/prescriptions/${existingPrescription.id}`);
        }
      } else {
        // Creating new prescription
        const prescription: PrescriptionDocument = {
          id: crypto.randomUUID(),
          patientId: targetPatientId,
          doctorId: user.id,
          ...(appointment ? { appointmentId: appointment.id } : {}),
          rightEye: formData.rightEye,
          leftEye: formData.leftEye,
          nearVisionRight: formData.nearVisionRight,
          nearVisionLeft: formData.nearVisionLeft,
          patientAge: formData.patientAge,
          patientGender: formData.patientGender,
          referredBy: formData.referredBy,
          diagnosis: formData.diagnosis,
          eyeDrops: formData.eyeDrops,
          exercises: formData.exercises,
          consultationNotes: formData.consultationNotes,
          reviewAfter: formData.reviewAfter,
          followUpRequired: formData.followUpRequired,
          ...(formData.followUpRequired && formData.followUpDate ? { followUpDate: new Date(formData.followUpDate) } : {}),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await prescriptionsService.create(prescription);

        // Update appointment with prescription ID if linked
        if (appointment) {
          await appointmentsService.update(appointment.id, {
            prescriptionId: prescription.id,
          });
        }

        success("Prescription created successfully");
        
        if (onSuccess) {
          onSuccess(prescription.id);
        } else {
          router.push(`/doctor/prescriptions/${prescription.id}`);
        }
      }
    } catch (error) {
      const appError = getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
      logError(
        appError.code, 
        error, 
        "PrescriptionForm",
        true, // Log to Firestore
        {
          user: user ? { id: user.id, role: user.role, email: user.email } : undefined,
          action: mode === "edit" ? "update_prescription" : "create_prescription",
          resourceId: mode === "edit" ? existingPrescription?.id : undefined,
          resourceType: "prescription",
        }
      );
      errorFromAppError(appError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !existingPrescription) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Prescription not found</p>
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
          <h1 className="text-3xl font-bold text-primary mb-2">
            {mode === "edit" ? "Edit Prescription" : "Create Prescription"}
          </h1>
          {patient && (
            <>
              <p className="text-lg text-muted-foreground">{patient.displayName || "Patient"}</p>
              <p className="text-sm text-muted-foreground">{patient.email}</p>
              {patient.phoneNumber && <p className="text-sm text-muted-foreground">{patient.phoneNumber}</p>}
            </>
          )}
        </div>
        <PremiumButton onClick={() => setShowPreview(!showPreview)} variant="outline" icon={<EyeIcon className="h-4 w-4" />}>
          {showPreview ? "Hide Preview" : "Show Preview"}
        </PremiumButton>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Right Eye */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Right Eye</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
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
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Remarks</label>
                  <input
                    type="text"
                    value={formData.rightEye.remarks}
                    onChange={(e) => handleEyeDataChange("rightEye", "remarks", e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Left Eye */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Left Eye</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
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
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Remarks</label>
                  <input
                    type="text"
                    value={formData.leftEye.remarks}
                    onChange={(e) => handleEyeDataChange("leftEye", "remarks", e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Near Vision Right */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Near Vision Right (ADD)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">ADD</label>
                    <input
                      type="text"
                      value={formData.nearVisionRight.add}
                      onChange={(e) => handleNearVisionChange("nearVisionRight", "add", e.target.value)}
                      placeholder="e.g., +1.50"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">VA</label>
                    <input
                      type="text"
                      value={formData.nearVisionRight.va}
                      onChange={(e) => handleNearVisionChange("nearVisionRight", "va", e.target.value)}
                      placeholder="e.g., N6"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Remarks</label>
                    <input
                      type="text"
                      value={formData.nearVisionRight.remarks}
                      onChange={(e) => handleNearVisionChange("nearVisionRight", "remarks", e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Near Vision Left */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Near Vision Left (ADD)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">ADD</label>
                    <input
                      type="text"
                      value={formData.nearVisionLeft.add}
                      onChange={(e) => handleNearVisionChange("nearVisionLeft", "add", e.target.value)}
                      placeholder="e.g., +1.50"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">VA</label>
                    <input
                      type="text"
                      value={formData.nearVisionLeft.va}
                      onChange={(e) => handleNearVisionChange("nearVisionLeft", "va", e.target.value)}
                      placeholder="e.g., N6"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Remarks</label>
                    <input
                      type="text"
                      value={formData.nearVisionLeft.remarks}
                      onChange={(e) => handleNearVisionChange("nearVisionLeft", "remarks", e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient Demographics */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Patient Demographics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Age</label>
                    <input
                      type="text"
                      value={formData.patientAge}
                      onChange={(e) => handleInputChange("patientAge", e.target.value)}
                      placeholder="e.g., 32 years"
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Gender</label>
                    <select
                      value={formData.patientGender}
                      onChange={(e) => handleInputChange("patientGender", e.target.value)}
                      className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Referred By</label>
                  <input
                    type="text"
                    value={formData.referredBy}
                    onChange={(e) => handleInputChange("referredBy", e.target.value)}
                    placeholder="Referral source (optional)"
                    className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Diagnosis *</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                  placeholder="Enter diagnosis... (required)"
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  required
                />
              </CardContent>
            </Card>

            {/* Eye Drops */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Eye Drops</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
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
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Exercises</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <textarea
                  value={formData.exercises}
                  onChange={(e) => handleInputChange("exercises", e.target.value)}
                  placeholder="Enter recommended exercises..."
                  rows={3}
                  className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </CardContent>
            </Card>

            {/* Consultation Notes */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Consultation Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
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
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Follow-Up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-3 sm:p-6">
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
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Review After</label>
                  <input
                    type="text"
                    value={formData.reviewAfter}
                    onChange={(e) => handleInputChange("reviewAfter", e.target.value)}
                    placeholder="e.g., 1 month, 3 months"
                    className="w-full px-4 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3">
              <PremiumButton 
                type="submit" 
                disabled={saving} 
                loading={saving} 
                className="flex-1" 
                icon={<Save className="h-4 w-4" />}
              >
                {saving ? "Saving..." : mode === "edit" ? "Update Prescription" : "Save Prescription"}
              </PremiumButton>
              <PremiumButton type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </PremiumButton>
            </div>
          </form>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-6">
            <Card className="border-primary/10 bg-white">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg">Prescription Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <PrescriptionPreview formData={formData} appointment={appointment} doctor={user} patient={patient} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Preview Component
function PrescriptionPreview({ formData, appointment, doctor, patient }: { formData: PrescriptionFormData; appointment: AppointmentDocument | null; doctor: any; patient: any }) {
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
        <p className="text-sm font-medium text-primary">{patient?.displayName || "Patient"}</p>
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
      </div>

      {/* Diagnosis */}
      {formData.diagnosis && (
        <div className="mb-6 pb-6 border-b border-primary/10">
          <h3 className="font-display text-lg text-primary mb-4">Diagnosis</h3>
          <p className="text-sm text-muted-foreground">{formData.diagnosis}</p>
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
