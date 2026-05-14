"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usersService, appointmentsService, prescriptionsService, doctorSlotsService } from "@/services/firestore";
import { ArrowLeft, Calendar, Clock, User, CheckCircle, Ban, Edit2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";
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
      await usersService.update(doctor.id, { onboardingCompleted: !doctor.onboardingCompleted });
      setDoctor({ ...doctor, onboardingCompleted: !doctor.onboardingCompleted });
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
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Doctors
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
          <Link href="/admin/doctors">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Doctors
            </Button>
          </Link>
          <h1 className="font-display text-4xl text-primary mb-2">{doctor.displayName || "Unknown"}</h1>
          <p className="text-xl text-muted-foreground">{doctor.email}</p>
        </div>
        <div className="flex gap-3">
          {doctor.onboardingCompleted ? (
            <Button onClick={handleToggleStatus} variant="outline">
              <Ban className="h-4 w-4 mr-2" />
              Disable Account
            </Button>
          ) : (
            <Button onClick={handleToggleStatus} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Activate Account
            </Button>
          )}
          <Link href="/admin/doctors">
            <Button variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Doctor Profile */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {doctor.onboardingCompleted ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
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
      </SectionContainer>

      {/* Statistics */}
      <SectionContainer>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prescriptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Issued</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slots.filter((s) => s.isAvailable && !s.isBlocked).length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active</p>
            </CardContent>
          </Card>
        </div>
      </SectionContainer>

      {/* Recent Appointments */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
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
      </SectionContainer>
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
