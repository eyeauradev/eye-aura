"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, usersService, appointmentsService, servicesService } from "@/services/firestore";
import { FileText, User, Calendar, ArrowLeft, Download, Printer, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [service, setService] = useState<any>(null);

  useEffect(() => {
    async function loadPrescription() {
      if (!params.id || !user) return;

      try {
        const prescriptionData = await prescriptionsService.getById(params.id as string);
        if (!prescriptionData || prescriptionData.patientId !== user.id) {
          router.push("/patient/prescriptions");
          return;
        }

        setPrescription(prescriptionData);

        const doctorData = await usersService.getById(prescriptionData.doctorId);
        setDoctor(doctorData);

        const appointmentData = await appointmentsService.getById(prescriptionData.appointmentId);
        setAppointment(appointmentData);

        if (appointmentData) {
          const serviceData = await servicesService.getById(appointmentData.serviceId);
          setService(serviceData);
        }
      } catch (error) {
        console.error("Error loading prescription:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPrescription();
  }, [params.id, user, router]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In production, this would generate a PDF
    alert("PDF download would be generated here");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF] px-5">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-base text-muted-foreground">Prescription not found</p>
            <Link href="/patient/prescriptions" className="inline-block mt-4">
              <Button>View Prescriptions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <Link
            href="/patient/prescriptions"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prescriptions
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-primary sm:text-4xl">Prescription Details</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Your consultation prescription and recommendations
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-5 w-5" />
                Print
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      
        <div className="mx-auto max-w-4xl">
          <div className="space-y-6">
            {/* Prescription Card */}
            <Card className="border-primary/10" id="prescription-content">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">Prescription</CardTitle>
                    <p className="mt-2 text-base text-muted-foreground">
                      Prescription #{prescription.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-muted-foreground">Date</p>
                    <p className="text-base text-primary">
                      {new Date(prescription.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Doctor Info */}
                <div className="flex items-center gap-4 pb-6 border-b border-primary/10">
                  {doctor?.photoURL ? (
                    <img
                      src={doctor.photoURL}
                      alt={doctor.displayName || "Doctor"}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-primary text-lg">{doctor?.displayName || "Doctor"}</p>
                    <p className="text-base text-muted-foreground">Eye Wellness Specialist</p>
                  </div>
                </div>

                {/* Consultation Details */}
                <div className="pb-6 border-b border-primary/10">
                  <p className="text-sm font-bold text-muted-foreground mb-3">Consultation Details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="text-base text-primary">{service?.title || "Consultation"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Consultation Date</p>
                      <p className="text-base text-primary">
                        {appointment?.scheduledFor
                          ? new Date(appointment.scheduledFor).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Eye Examination Data */}
                <div className="pb-6 border-b border-primary/10">
                  <p className="text-sm font-bold text-muted-foreground mb-4">Eye Examination Results</p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="p-4 rounded-2xl bg-primary/5">
                      <h4 className="font-bold text-primary mb-3">Right Eye (OD)</h4>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">SPH: </span>
                          <span className="text-primary">{prescription.rightEye?.sph || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CYL: </span>
                          <span className="text-primary">{prescription.rightEye?.cyl || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">AXIS: </span>
                          <span className="text-primary">{prescription.rightEye?.axis || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">VA: </span>
                          <span className="text-primary">{prescription.rightEye?.va || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PD: </span>
                          <span className="text-primary">{prescription.rightEye?.pd || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary/5">
                      <h4 className="font-bold text-primary mb-3">Left Eye (OS)</h4>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">SPH: </span>
                          <span className="text-primary">{prescription.leftEye?.sph || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CYL: </span>
                          <span className="text-primary">{prescription.leftEye?.cyl || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">AXIS: </span>
                          <span className="text-primary">{prescription.leftEye?.axis || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">VA: </span>
                          <span className="text-primary">{prescription.leftEye?.va || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PD: </span>
                          <span className="text-primary">{prescription.leftEye?.pd || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Findings & Diagnosis */}
                <div className="pb-6 border-b border-primary/10">
                  <p className="text-sm font-bold text-muted-foreground mb-3">Findings</p>
                  <p className="text-base text-primary leading-relaxed mb-4">{prescription.findings || "No findings recorded"}</p>
                  <p className="text-sm font-bold text-muted-foreground mb-3">Diagnosis</p>
                  <p className="text-base text-primary leading-relaxed">{prescription.diagnosis || "No diagnosis recorded"}</p>
                </div>

                {/* Medications */}
                {prescription.medications && prescription.medications.length > 0 && (
                  <div className="pb-6 border-b border-primary/10">
                    <p className="text-sm font-bold text-muted-foreground mb-4">Medications</p>
                    <div className="space-y-4">
                      {prescription.medications.map((med: any, index: number) => (
                        <div key={index} className="p-4 rounded-2xl bg-primary/5">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-primary">{med.name}</h4>
                            <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                              {index + 1}
                            </Badge>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Dosage: </span>
                              <span className="text-primary">{med.dosage}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Frequency: </span>
                              <span className="text-primary">{med.frequency}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              <span className="text-primary">{med.duration}</span>
                            </div>
                          </div>
                          {med.instructions && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              <span className="font-bold">Instructions: </span>
                              {med.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eye Drops */}
                {prescription.eyeDrops && prescription.eyeDrops.length > 0 && (
                  <div className="pb-6 border-b border-primary/10">
                    <p className="text-sm font-bold text-muted-foreground mb-4">Eye Drops</p>
                    <div className="space-y-4">
                      {prescription.eyeDrops.map((drop: any, index: number) => (
                        <div key={index} className="p-4 rounded-2xl bg-primary/5">
                          <h4 className="font-bold text-primary mb-2">{drop.name}</h4>
                          <div className="grid gap-2 sm:grid-cols-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Dosage: </span>
                              <span className="text-primary">{drop.dosage}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Frequency: </span>
                              <span className="text-primary">{drop.frequency}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              <span className="text-primary">{drop.duration}</span>
                            </div>
                          </div>
                          {drop.instructions && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              <span className="font-bold">Instructions: </span>
                              {drop.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {prescription.recommendations && prescription.recommendations.length > 0 && (
                  <div className="pb-6 border-b border-primary/10">
                    <p className="text-sm font-bold text-muted-foreground mb-3">Recommendations</p>
                    <ul className="space-y-2">
                      {prescription.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-base text-primary">
                          <span className="text-secondary mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Exercises */}
                {prescription.exercises && prescription.exercises.length > 0 && (
                  <div className="pb-6 border-b border-primary/10">
                    <p className="text-sm font-bold text-muted-foreground mb-4">Eye Exercises</p>
                    <div className="space-y-4">
                      {prescription.exercises.map((exercise: any, index: number) => (
                        <div key={index} className="p-4 rounded-2xl bg-primary/5">
                          <h4 className="font-bold text-primary mb-2">{exercise.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                          <div className="grid gap-2 sm:grid-cols-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Frequency: </span>
                              <span className="text-primary">{exercise.frequency}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              <span className="text-primary">{exercise.duration}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consultation Notes */}
                {prescription.consultationNotes && (
                  <div className="pb-6 border-b border-primary/10">
                    <p className="text-sm font-bold text-muted-foreground mb-2">Consultation Notes</p>
                    <p className="text-base text-primary leading-relaxed">{prescription.consultationNotes}</p>
                  </div>
                )}

                {/* Follow-up */}
                {prescription.followUpRequired && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/10">
                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                    <div>
                      <p className="font-bold text-primary mb-1">Follow-up Required</p>
                      {prescription.followUpDate && (
                        <p className="text-base text-muted-foreground">
                          Scheduled for {new Date(prescription.followUpDate).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-1">Need clarification?</p>
                    <p className="text-base text-muted-foreground">
                      Contact support if you have questions about your prescription
                    </p>
                  </div>
                  <Link href="/patient/support">
                    <Button size="lg">Contact Support</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      
    </div>
  );
}
