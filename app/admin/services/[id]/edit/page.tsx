"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { servicesService, usersService } from "@/services/firestore";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";
import type { ServiceDocument, UserDocument } from "@/types/firestore";

export default function AdminServiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<ServiceDocument | null>(null);
  const [doctors, setDoctors] = useState<UserDocument[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    price: "",
    currency: "",
    duration: "",
    suitableFor: [] as string[],
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

        if (!serviceData) return;

        setFormData({
          title: serviceData.title,
          description: serviceData.description,
          type: serviceData.type,
          price: serviceData.price.toString(),
          currency: serviceData.currency,
          duration: serviceData.duration.toString(),
          suitableFor: serviceData.suitableFor,
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
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </Button>
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
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Service
            </Button>
          </Link>
          <h1 className="font-display text-4xl text-primary mb-2">Edit Service</h1>
          <p className="text-xl text-muted-foreground">Update service details and assign doctors</p>
        </div>
      </div>

      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Label className="text-base font-bold mb-4 block">Assign Doctors</Label>
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

              <div className="flex justify-end gap-4 pt-6 border-t border-primary/10">
                <Link href={`/admin/services/${service.id}`}>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving} className="min-w-[200px]">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </SectionContainer>
    </div>
  );
}
