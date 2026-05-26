"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Check, X, Eye, BookOpen, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { servicesService, usersService } from "@/services/firestore";
import type { ServiceType, UserDocument, VisionAssessmentType, ServiceAssessmentAutomation } from "@/types/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import Link from "next/link";

export default function AdminServiceCreatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctors, setDoctors] = useState<UserDocument[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "comprehensive_eye_exam" as any,
    price: "",
    currency: "INR",
    duration: "30",
    suitableFor: [] as string[],
    doctorIds: [] as string[],
  });
  const [automation, setAutomation] = useState<ServiceAssessmentAutomation>({
    enabled: false,
    assessmentTypes: ["far", "near"],
    triggerMode: "instant",
  });
  const [symptomInput, setSymptomInput] = useState("");
  const [error, setError] = useState("");

  const serviceTypes = [
    "comprehensive_eye_exam",
    "video_consultation",
    "contact_lens_consultation",
    "digital_eye_strain_guidance",
  ] as const;

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const allDoctors = await usersService.getByRole("doctor");
      setDoctors(allDoctors);
    } catch (err) {
      console.error("Failed to load doctors:", err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleAddSymptom = () => {
    if (symptomInput.trim() && !formData.suitableFor.includes(symptomInput.trim())) {
      setFormData({ ...formData, suitableFor: [...formData.suitableFor, symptomInput.trim()] });
      setSymptomInput("");
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    setFormData({ ...formData, suitableFor: formData.suitableFor.filter((s) => s !== symptom) });
  };

  const handleToggleDoctor = (doctorId: string) => {
    if (formData.doctorIds.includes(doctorId)) {
      setFormData({ ...formData, doctorIds: formData.doctorIds.filter((id) => id !== doctorId) });
    } else {
      setFormData({ ...formData, doctorIds: [...formData.doctorIds, doctorId] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title || !formData.description || !formData.price || !formData.duration) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.suitableFor.length === 0) {
      setError("Please add at least one suitable condition/symptom");
      return;
    }

    if (formData.doctorIds.length === 0) {
      setError("Please select at least one doctor who can provide this service");
      return;
    }

    try {
      setLoading(true);

      const newService = await servicesService.create({
        id: crypto.randomUUID(),
        title: formData.title,
        description: formData.description,
        type: formData.type,
        price: parseFloat(formData.price),
        currency: formData.currency,
        duration: parseInt(formData.duration),
        suitableFor: formData.suitableFor,
        doctorIds: formData.doctorIds,
        isActive: true,
        assessmentAutomation: automation.enabled ? automation : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      router.push(`/admin/services/${newService.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/services">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </Link>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">Create Service</h1>
        <p className="text-sm sm:text-xl text-muted-foreground">
          Add a new consultation service to the platform
        </p>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Service Details</CardTitle>
            <CardDescription>
              Enter the service information below
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Service Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., General Eye Examination"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  placeholder="Describe the service..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Service Type *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ServiceType })}
                  className="w-full px-4 py-3 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  {serviceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Input
                    id="currency"
                    type="text"
                    placeholder="INR"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Suitable For *</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Add conditions or symptoms this service addresses
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="e.g., blurred vision, eye strain"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSymptom())}
                  />
                  <Button type="button" onClick={handleAddSymptom}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.suitableFor.map((symptom) => (
                    <span
                      key={symptom}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-2"
                    >
                      {symptom}
                      <button
                        type="button"
                        onClick={() => handleRemoveSymptom(symptom)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Label>Assign Doctors *</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select doctors who can provide this service
                </p>
                {doctorsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading doctors...</p>
                ) : doctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No doctors available. Please invite doctors first.</p>
                ) : (
                  <div className="grid gap-2 mt-3 max-h-60 overflow-y-auto">
                    {doctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        onClick={() => handleToggleDoctor(doctor.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                          formData.doctorIds.includes(doctor.id)
                            ? "bg-primary/10 border-primary/30"
                            : "bg-white/50 border-primary/10 hover:bg-primary/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-secondary/15 flex items-center justify-center text-secondary">
                            {doctor.displayName?.charAt(0).toUpperCase() || "D"}
                          </div>
                          <div>
                            <p className="font-medium text-primary">{doctor.displayName || "Doctor"}</p>
                            <p className="text-sm text-muted-foreground">{doctor.email}</p>
                          </div>
                        </div>
                        {formData.doctorIds.includes(doctor.id) ? (
                          <Check className="h-5 w-5 text-primary" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-primary/30" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assessment Automation */}
              <div className="rounded-2xl border border-[#0f4f4b]/12 bg-[#0f4f4b]/2 p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-[#0f4f4b]/10 flex items-center justify-center shrink-0">
                      <Zap className="h-3.5 w-3.5 text-[#0f4f4b]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0f4f4b]">Assessment Automation</p>
                      <p className="text-xs text-[#0f4f4b]/50">Auto-assign vision tests when booking is confirmed</p>
                    </div>
                  </div>
                  {/* Toggle — div-based for reliable absolute positioning */}
                  <div
                    role="switch"
                    aria-checked={automation.enabled}
                    onClick={() => setAutomation((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative h-6 w-11 rounded-full cursor-pointer shrink-0 transition-colors duration-200 ${
                      automation.enabled ? "bg-[#0f4f4b]" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        automation.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                {automation.enabled && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-[#0f4f4b]/55">Which test(s) to assign automatically?</p>
                    <div className="flex gap-2">
                      {(["far", "near"] as VisionAssessmentType[]).map((t) => {
                        const Icon = t === "far" ? Eye : BookOpen;
                        const label = t === "far" ? "Far Vision" : "Near Vision";
                        const active = automation.assessmentTypes.includes(t);
                        return (
                          <div
                            key={t}
                            role="checkbox"
                            aria-checked={active}
                            onClick={() =>
                              setAutomation((prev) => ({
                                ...prev,
                                assessmentTypes: active
                                  ? prev.assessmentTypes.filter((x) => x !== t)
                                  : [...prev.assessmentTypes, t],
                              }))
                            }
                            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer select-none transition-all ${
                              active
                                ? "bg-[#0f4f4b] text-white"
                                : "bg-white border border-[#0f4f4b]/20 text-[#0f4f4b]/50 hover:border-[#0f4f4b]/40"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-semibold">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-[#0f4f4b]/40 pt-1">
                      Assessment is assigned immediately when the doctor accepts the booking. Expires 1 hour after appointment time.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creating Service..." : "Create Service"}
              </Button>
            </form>
          </CardContent>
        </Card>
      
    </div>
  );
}
