"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { servicesService, usersService } from "@/services/firestore";
import { ArrowLeft, Save, Eye, BookOpen, Zap } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TYPOGRAPHY } from "@/lib/design-tokens";

import Link from "next/link";
import type { ServiceDocument, UserDocument, VisionAssessmentType, ServiceAssessmentAutomation } from "@/types/firestore";
import { AVAILABLE_ASSESSMENT_TYPES, getAssessmentLabel } from "@/lib/assessment-type-mapping";

export default function AdminServiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<ServiceDocument | null>(null);
  const [doctors, setDoctors] = useState<UserDocument[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [automation, setAutomation] = useState<ServiceAssessmentAutomation>({
    enabled: false,
    assessmentTypes: ["far", "near"],
    triggerMode: "instant",
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    price: "",
    currency: "",
    duration: "",
    suitableFor: [] as string[],
    displayOrder: "" as string, // optional ranking; empty string = no rank
  });

  useEffect(() => {
    async function loadData() {
      if (!params.id) return;

      try {
        setLoading(true);
        const [serviceData, doctorsData] = await Promise.all([
          servicesService.getById(params.id as string),
          usersService.getByRole("doctor"),
        ]);

        setService(serviceData);
        setDoctors(doctorsData);
        setSelectedDoctorIds(serviceData?.doctorIds || []);
        if (serviceData?.assessmentAutomation) {
          setAutomation(serviceData.assessmentAutomation);
        }

        if (!serviceData) return;

        setFormData({
          title: serviceData.title,
          description: serviceData.description,
          type: serviceData.type,
          price: serviceData.price.toString(),
          currency: serviceData.currency,
          duration: serviceData.duration.toString(),
          suitableFor: serviceData.suitableFor,
          displayOrder: typeof serviceData.displayOrder === "number" ? serviceData.displayOrder.toString() : "",
        });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    try {
      setSaving(true);
      await servicesService.update(service.id, {
        title: formData.title,
        description: formData.description,
        type: formData.type as any,
        price: parseFloat(formData.price),
        currency: formData.currency,
        duration: parseInt(formData.duration),
        suitableFor: formData.suitableFor,
        doctorIds: selectedDoctorIds,
        // displayOrder: only write when a valid positive integer is provided
        ...(formData.displayOrder.trim() !== "" && !isNaN(Number(formData.displayOrder))
          ? { displayOrder: parseInt(formData.displayOrder) }
          : { displayOrder: undefined }),
        // Only include assessmentAutomation when enabled — passing undefined
        // causes Firestore to throw "Unsupported field value: undefined".
        ...(automation.enabled ? { assessmentAutomation: automation } : {}),
      });
      router.push(`/admin/services/${service.id}`);
    } catch (error) {
      console.error("Error updating service:", error);
      alert("Failed to update service");
    } finally {
      setSaving(false);
    }
  };

  const toggleDoctor = (doctorId: string) => {
    setSelectedDoctorIds((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Service not found</p>
            <Link href="/admin/services">
              <PremiumButton variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </PremiumButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/admin/services/${service.id}`}>
            <PremiumButton variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Service
            </PremiumButton>
          </Link>
          <h1 className={TYPOGRAPHY.heading}>Edit Service</h1>
          <p className="text-sm text-muted-foreground">Update service details and assign doctors</p>
        </div>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle>Service Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="title">Service Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Service Type</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="displayOrder">Display Order (optional)</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    min="1"
                    placeholder="e.g. 1 = shown first"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lower number = higher priority. Leave empty to sort last.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="suitableFor">Suitable For (comma-separated)</Label>
                <Input
                  id="suitableFor"
                  value={formData.suitableFor.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      suitableFor: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <div className="pt-6 border-t border-primary/10">
                <Label className="text-base font-semibold mb-4 block">Assign Doctors</Label>
                {doctors.length === 0 ? (
                  <p className="text-muted-foreground">No doctors available. Please create doctor accounts first.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {doctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition ${
                          selectedDoctorIds.includes(doctor.id)
                            ? "border-secondary bg-secondary/5"
                            : "border-primary/10 hover:border-primary/30"
                        }`}
                      >
                        <Checkbox
                          id={`doctor-${doctor.id}`}
                          checked={selectedDoctorIds.includes(doctor.id)}
                          onCheckedChange={() => toggleDoctor(doctor.id)}
                        />
                        <div className="flex-1 cursor-pointer" onClick={() => toggleDoctor(doctor.id)}>
                          <p className="font-medium text-primary">{doctor.displayName || "Doctor"}</p>
                          <p className="text-sm text-muted-foreground">{doctor.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDoctorIds.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {selectedDoctorIds.length} doctor{selectedDoctorIds.length !== 1 ? "s" : ""} selected
                  </p>
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
                      <p className="text-sm font-semibold text-[#0f4f4b]">Assessment Automation</p>
                      <p className="text-xs text-[#0f4f4b]/50">Auto-assign vision tests when booking is confirmed</p>
                    </div>
                  </div>
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
                      {AVAILABLE_ASSESSMENT_TYPES.map(({ value: t, label }) => {
                        const Icon = t === "far" ? Eye : BookOpen;
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

              <div className="flex justify-end gap-4 pt-6 border-t border-primary/10">
                <Link href={`/admin/services/${service.id}`}>
                  <PremiumButton variant="outline" type="button">
                    Cancel
                  </PremiumButton>
                </Link>
                <PremiumButton type="submit" disabled={saving} className="min-w-[200px]">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </PremiumButton>
              </div>
            </form>
          </CardContent>
        </Card>
      
    </div>
  );
}
