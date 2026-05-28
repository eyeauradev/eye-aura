"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usersService, appointmentsService, prescriptionsService, doctorSlotsService } from "@/services/firestore";
import { ArrowLeft, Calendar, Clock, User, CheckCircle, Ban, Edit2, Eye, Save, X } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TYPOGRAPHY } from "@/lib/design-tokens";

import Link from "next/link";
import type { UserDocument, AppointmentDocument, PrescriptionDocument, DoctorSlotDocument } from "@/types/firestore";

export default function AdminDoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<UserDocument | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDocument[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDocument[]>([]);
  const [slots, setSlots] = useState<DoctorSlotDocument[]>([]);

  useEffect(() => {
    async function loadDoctorData() {
      if (!params.id) return;

      try {
        setLoading(true);
        const doctorData = await usersService.getById(params.id as string);
        setDoctor(doctorData);

        if (doctorData) {
          // Load appointments for this doctor
          const allAppointments = await appointmentsService.getAll();
          const doctorAppointments = allAppointments.filter((apt: AppointmentDocument) => apt.doctorId === doctorData.id);
          setAppointments(doctorAppointments);

          // Load prescriptions created by this doctor
          const allPrescriptions = await prescriptionsService.getAll();
          const doctorPrescriptions = allPrescriptions.filter((rx: PrescriptionDocument) => rx.doctorId === doctorData.id);
          setPrescriptions(doctorPrescriptions);

          // Load slots for this doctor
          const allSlots = await doctorSlotsService.getAll();
          const doctorSlots = allSlots.filter((slot: DoctorSlotDocument) => slot.doctorId === doctorData.id);
          setSlots(doctorSlots);
        }
      } catch (error) {
        console.error("Error loading doctor data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDoctorData();
  }, [params.id]);

  const handleToggleStatus = async () => {
    if (!doctor) return;

    try {
      await usersService.update(doctor.id, { isActive: !doctor.isActive });
      setDoctor({ ...doctor, isActive: !doctor.isActive });
    } catch (error) {
      console.error("Error toggling doctor status:", error);
      alert("Failed to update doctor status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading doctor details...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Doctor not found</p>
            <Link href="/admin/doctors">
              <PremiumButton variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Doctors
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
          <Link href="/admin/doctors">
            <PremiumButton variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Doctors
            </PremiumButton>
          </Link>
          <h1 className={TYPOGRAPHY.heading}>{doctor.displayName || "Unknown"}</h1>
          <p className={TYPOGRAPHY.label}>{doctor.email}</p>
        </div>
        <div className="flex gap-3">
          {doctor.isActive ? (
            <PremiumButton onClick={handleToggleStatus} variant="outline">
              <Ban className="h-4 w-4 mr-2" />
              Disable Account
            </PremiumButton>
          ) : (
            <PremiumButton onClick={handleToggleStatus} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Activate Account
            </PremiumButton>
          )}
          <Link href="/admin/doctors">
            <PremiumButton variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </PremiumButton>
          </Link>
        </div>
      </div>

      {/* Doctor Profile */}
      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-6">
            {/* Display Name Editor */}
            <DisplayNameEditor doctor={doctor} onUpdate={(name) => setDoctor({ ...doctor, displayName: name })} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {doctor.isActive ? (
                  !doctor.isSuspended ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">Suspended</Badge>
                  )
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">Disabled</Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                <p className="font-medium text-primary">{doctor.phoneNumber || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Joined</p>
                <p className="font-medium text-primary">
                  {doctor.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      

      {/* Statistics */}
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="text-2xl font-semibold text-foreground">{appointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="text-2xl font-semibold text-foreground">{prescriptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Issued</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="text-2xl font-semibold text-foreground">{slots.filter((s) => s.isAvailable && !s.isBlocked).length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active</p>
            </CardContent>
          </Card>
        </div>
      

      {/* Recent Appointments */}
      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {appointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No appointments yet</p>
            ) : (
              <div className="space-y-4">
                {appointments.slice(-5).reverse().map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-primary/5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-primary">
                          {appointment.scheduledFor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-sm text-muted-foreground">Patient ID: {appointment.patientId}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      
    </div>
  );
}

function DisplayNameEditor({ doctor, onUpdate }: { doctor: UserDocument; onUpdate: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(doctor.displayName || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await usersService.update(doctor.id, { displayName: name.trim() });
      onUpdate(name.trim());
      setEditing(false);
    } catch (err) {
      console.error("Failed to update display name:", err);
      alert("Failed to update display name");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/4 border border-primary/10">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Display Name (visible to patients)</p>
          <p className="text-base font-semibold text-foreground">{doctor.displayName || "Not set"}</p>
        </div>
        <PremiumButton variant="outline" className="min-h-0 h-8 px-3 text-xs shrink-0" onClick={() => { setName(doctor.displayName || ""); setEditing(true); }}>
          <Edit2 className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </PremiumButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/4 border border-primary/10">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">Display Name (visible to patients)</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dr. Harshita Sharma"
          className="h-9"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
      </div>
      <PremiumButton className="min-h-0 h-8 px-3 text-xs" onClick={handleSave} disabled={saving || !name.trim()}>
        <Save className="h-3.5 w-3.5 mr-1" />
        {saving ? "…" : "Save"}
      </PremiumButton>
      <PremiumButton variant="ghost" className="min-h-0 h-8 w-8 px-0" onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5" />
      </PremiumButton>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in_progress":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "cancellation_requested":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
