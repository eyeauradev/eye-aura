"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, usersService, prescriptionsService, servicesService } from "@/services/firestore";
import { ArrowLeft, Calendar, User, FileText, Clock, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";

export default function AdminAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [prescription, setPrescription] = useState<any>(null);
  const [service, setService] = useState<any>(null);

  useEffect(() => {
    async function loadAppointment() {
      if (!params.id) return;

      try {
        setLoading(true);
        const apt = await appointmentsService.getById(params.id as string);
        setAppointment(apt);

        if (apt) {
          // Load patient and doctor
          const patientData = await usersService.getById(apt.patientId);
          const doctorData = await usersService.getById(apt.doctorId);
          setPatient(patientData);
          setDoctor(doctorData);

          // Load prescription if exists
          if (apt.prescriptionId) {
            const rx = await prescriptionsService.getById(apt.prescriptionId);
            setPrescription(rx);
          }

          // Load service
          const svc = await servicesService.getById(apt.serviceId);
          setService(svc);
        }
      } catch (error) {
        console.error("Error loading appointment:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Appointment not found</p>
            <Link href="/admin/appointments">
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
      <div>
        <Link href="/admin/appointments">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appointments
          </Button>
        </Link>
        <h1 className="font-display text-4xl text-primary mb-2">Appointment Details</h1>
        <p className="text-xl text-muted-foreground">
          {appointment.scheduledFor.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <SectionContainer>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Participants */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 border border-primary/5">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-primary">{patient?.displayName || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">Patient</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 border border-primary/5">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-primary">{doctor?.displayName || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Consultation Status</p>
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status}
                </Badge>
              </div>
              {appointment.followUpRequired && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Follow-up Required</p>
                  <Badge className="bg-secondary text-white">Yes</Badge>
                </div>
              )}
              {appointment.followUpDate && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Follow-up Date</p>
                  <p className="font-medium text-primary">
                    {appointment.followUpDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Consultation Platform</p>
                <p className="font-medium text-primary capitalize">{appointment.consultationPlatform}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionContainer>

      {/* Service */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Service</CardTitle>
          </CardHeader>
          <CardContent>
            {service ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary">{service.title}</p>
                  <p className="text-sm text-muted-foreground">{service.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-primary">{service.currency} {service.price}</p>
                  <p className="text-sm text-muted-foreground">{service.duration} min</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Service not found</p>
            )}
          </CardContent>
        </Card>
      </SectionContainer>

      {/* Prescription */}
      {prescription && (
        <SectionContainer>
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Prescription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Prescription Generated</p>
                    <p className="text-sm text-muted-foreground">
                      {prescription.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Link href={`/admin/prescriptions/${prescription.id}`}>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </SectionContainer>
      )}

      {/* Notes */}
      {appointment.notes && (
        <SectionContainer>
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Consultation Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{appointment.notes}</p>
            </CardContent>
          </Card>
        </SectionContainer>
      )}
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
