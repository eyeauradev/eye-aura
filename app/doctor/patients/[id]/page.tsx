"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, prescriptionsService, usersService } from "@/services/firestore";
import type { AppointmentDocument, PrescriptionDocument, UserDocument } from "@/types/firestore";
import { ArrowLeft, Calendar, Clock, FileText, Users, CalendarPlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDocument[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDocument[]>([]);

  useEffect(() => {
    async function loadPatientData() {
      if (!params.id || !user) return;

      try {
        setLoading(true);

        // Load patient info
        const patientData = await usersService.getById(params.id as string);
        setPatient(patientData);

        // Load appointments for this patient with this doctor
        const doctorAppointments = await appointmentsService.getByPatientIdAndDoctorId(params.id as string, user.id);
        const sortedAppointments = doctorAppointments.sort((a, b) =>
          new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
        );
        setAppointments(sortedAppointments);

        // Load prescriptions from these appointments
        const prescriptionPromises = sortedAppointments
          .filter(apt => apt.prescriptionId)
          .map(apt => prescriptionsService.getById(apt.prescriptionId!));
        
        const loadedPrescriptions = await Promise.all(prescriptionPromises);
        setPrescriptions(loadedPrescriptions.filter(p => p !== null) as PrescriptionDocument[]);
      } catch (error) {
        console.error("Error loading patient data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPatientData();
  }, [params.id, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Patient not found</p>
            <Link href="/doctor/patients">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patients
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const followUpAppointments = appointments.filter(apt => apt.followUpRequired);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/doctor/patients">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">{patient.displayName || "Patient"}</h1>
            <p className="text-base text-muted-foreground">{patient.email}</p>
            {patient.phoneNumber && <p className="text-sm text-muted-foreground">{patient.phoneNumber}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {appointments.length} consultation{appointments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Patient Info */}
      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-primary">{patient.email}</p>
              </div>
              {patient.phoneNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium text-primary">{patient.phoneNumber}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">First Consultation</p>
                <p className="font-medium text-primary">
                  {appointments.length > 0
                    ? new Date(appointments[appointments.length - 1].createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Consultation</p>
                <p className="font-medium text-primary">
                  {appointments.length > 0
                    ? new Date(appointments[0].scheduledFor).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      

      {/* Follow-Up Status */}
      {followUpAppointments.length > 0 && (
        
          <Card className="border-secondary/20 bg-secondary/5">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-lg text-secondary">Follow-Up Required</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3">
                {followUpAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CalendarPlus className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="font-medium text-primary">
                          {new Date(apt.scheduledFor).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        {apt.followUpDate && (
                          <p className="text-sm text-muted-foreground">
                            Follow-up date: {new Date(apt.followUpDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={`/doctor/appointments/${apt.id}`}>
                      <Button variant="outline" size="default">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        
      )}

      {/* Consultation History */}
      
        <h2 className="font-display text-2xl text-primary mb-6">Consultation History</h2>
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="border-primary/10">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">
                            {new Date(appointment.scheduledFor).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.scheduledFor).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        {appointment.followUpRequired && (
                          <Badge className="bg-secondary text-white">Follow-up Required</Badge>
                        )}
                      </div>

                      {appointment.notes && (
                        <div className="flex items-start gap-2 mb-3">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                        </div>
                      )}
                    </div>

                    <Link href={`/doctor/appointments/${appointment.id}`}>
                      <Button variant="ghost">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-4 sm:p-8 text-center">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-base text-muted-foreground">No consultation history yet</p>
            </CardContent>
          </Card>
        )}
      

      {/* Prescriptions */}
      
        <h2 className="font-display text-2xl text-primary mb-6">Prescriptions</h2>
        {prescriptions.length > 0 ? (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <Card key={prescription.id} className="border-primary/10">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">
                            {new Date(prescription.createdAt).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {prescription.diagnosis || "No diagnosis recorded"}
                          </p>
                        </div>
                      </div>

                      {prescription.consultationNotes && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground line-clamp-2">{prescription.consultationNotes}</p>
                        </div>
                      )}
                    </div>

                    <Link href={`/doctor/prescriptions/${prescription.id}`}>
                      <Button variant="ghost">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-4 sm:p-8 text-center">
              <FileText className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-base text-muted-foreground">No prescriptions yet</p>
            </CardContent>
          </Card>
        )}
      
    </div>
  );
}
