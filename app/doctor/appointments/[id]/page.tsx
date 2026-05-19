"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, prescriptionsService, usersService } from "@/services/firestore";
import type { AppointmentDocument, PrescriptionDocument, UserDocument } from "@/types/firestore";
import { Calendar, Clock, Users, Video, FileText, ArrowLeft, CheckCircle2, X, CalendarPlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";

export default function DoctorAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentDocument | null>(null);
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDocument[]>([]);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadAppointment() {
      if (!params.id) return;

      try {
        setLoading(true);
        const apt = await appointmentsService.getById(params.id as string);
        setAppointment(apt);
        
        if (apt) {
          setNotes(apt.notes || "");
          // Load patient info
          const patientData = await usersService.getById(apt.patientId);
          setPatient(patientData);
          // Load prescription for this appointment
          if (apt.prescriptionId) {
            const prescription = await prescriptionsService.getById(apt.prescriptionId);
            if (prescription) {
              setPrescriptions([prescription]);
            }
          }
        }
      } catch (error) {
        console.error("Error loading appointment:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [params.id]);

  const handleUpdateStatus = async (status: "confirmed" | "completed" | "cancelled") => {
    if (!appointment) return;

    try {
      setUpdating(true);
      await appointmentsService.update(appointment.id, { status });
      setAppointment({ ...appointment, status });
    } catch (error) {
      console.error("Error updating appointment:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!appointment) return;

    try {
      setUpdating(true);
      await appointmentsService.update(appointment.id, { notes });
      setAppointment({ ...appointment, notes });
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setUpdating(false);
    }
  };

  const canJoinConsultation = () => {
    if (!appointment) return false;
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledFor);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    // Allow joining 15 minutes before
    return timeDiff < 15 * 60 * 1000 && timeDiff > -60 * 60 * 1000;
  };

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

  const appointmentDate = new Date(appointment.scheduledFor);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/doctor/appointments">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appointments
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">Appointment Details</h1>
            <p className="text-xl font-medium text-primary">{patient?.displayName || "Patient"}</p>
            <p className="text-sm text-muted-foreground">{patient?.email}</p>
            {patient?.phoneNumber && <p className="text-sm text-muted-foreground">{patient.phoneNumber}</p>}
          </div>
          <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
        </div>
      </div>

      {/* Appointment Info */}
      
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-primary/10">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-lg">Consultation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-primary">
                    {appointmentDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium text-primary">
                    {appointmentDate.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {appointment.consultationPlatform && (
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="font-medium text-primary capitalize">{appointment.consultationPlatform}</p>
                  </div>
                </div>
              )}
              {appointment.followUpRequired && appointment.followUpDate && (
                <div className="flex items-center gap-3">
                  <CalendarPlus className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Follow-up Required</p>
                    <p className="font-medium text-secondary">
                      {new Date(appointment.followUpDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canJoinConsultation() && appointment.consultationLink && (
                <Button asChild className="w-full">
                  <a
                    href={appointment.consultationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Join Consultation
                  </a>
                </Button>
              )}
              
              {appointment.status === "pending" && (
                <Button
                  onClick={() => handleUpdateStatus("confirmed")}
                  disabled={updating}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Appointment
                </Button>
              )}
              
              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <Button
                  onClick={() => handleUpdateStatus("completed")}
                  disabled={updating}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
              )}
              
              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <Button
                  onClick={() => handleUpdateStatus("cancelled")}
                  disabled={updating}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </Button>
              )}

              {appointment.status === "completed" && !appointment.prescriptionId && (
                <Link href={`/doctor/prescriptions/create/${appointment.id}`} className="w-full">
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Prescription
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      

      {/* Consultation Notes */}
      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Consultation Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add consultation notes, symptoms, or observations..."
              className="w-full min-h-[150px] p-4 border border-primary/10 rounded-2xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <Button onClick={handleSaveNotes} disabled={updating}>
              {updating ? "Saving..." : "Save Notes"}
            </Button>
          </CardContent>
        </Card>
      

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-primary mb-6">Prescriptions</h2>
          <div className="grid gap-4">
            {prescriptions.map((prescription) => (
              <Card key={prescription.id} className="border-primary/10">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">
                        Created: {new Date(prescription.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {prescription.diagnosis || "No diagnosis recorded"}
                      </p>
                    </div>
                    <Link href={`/doctor/prescriptions/${prescription.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Timeline */}
      <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Appointment Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-primary"></div>
                <div>
                  <p className="font-medium text-primary">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(appointment.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {appointment.status !== "pending" && (
                <div className="flex items-center gap-4">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium text-primary">Confirmed</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.updatedAt !== appointment.createdAt
                        ? new Date(appointment.updatedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recently"}
                    </p>
                  </div>
                </div>
              )}
              {appointment.status === "completed" && (
                <div className="flex items-center gap-4">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium text-primary">Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.updatedAt !== appointment.createdAt
                        ? new Date(appointment.updatedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recently"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      
    </div>
  );
}
