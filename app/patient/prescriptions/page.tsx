"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, usersService, appointmentsService } from "@/services/firestore";
import { FileText, Calendar, User, ArrowRight, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export default function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    async function loadPrescriptions() {
      if (!user) return;

      try {
        setLoading(true);
        
        const prescriptionData = await prescriptionsService.getByPatientId(user.id, 50);

        // Enrich with doctor and appointment data
        const enrichedPrescriptions = await Promise.all(
          prescriptionData.map(async (prescription) => {
            try {
              const doctor = await usersService.getById(prescription.doctorId);
              const appointment = await appointmentsService.getById(prescription.appointmentId);
              return { ...prescription, doctor, appointment };
            } catch (err) {
              console.error("Error enriching prescription:", prescription.id, err);
              return { ...prescription, doctor: null, appointment: null };
            }
          })
        );

        setPrescriptions(enrichedPrescriptions);
      } catch (error) {
        console.error("Error loading prescriptions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPrescriptions();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading your prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">My Prescriptions</h1>
        <p className="text-sm sm:text-xl text-muted-foreground">
          View and download your consultation prescriptions
        </p>
      </div>

        <div>
          {prescriptions.length === 0 ? (
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4 sm:p-12 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display text-xl text-primary mb-2">No Prescriptions Yet</h3>
                <p className="text-base text-muted-foreground mb-6">
                  Your prescription history will appear here after consultations.
                </p>
                <Link href="/booking">
                  <Button size="lg" className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Book a Consultation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id} className="border-primary/10 transition hover:-translate-y-1 hover:shadow-lg">
                  <CardHeader className="p-3 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">Prescription</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Dr. {prescription.doctor?.displayName || "Doctor"}
                        </p>
                      </div>
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(prescription.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{prescription.medications.length} medication{prescription.medications.length !== 1 ? "s" : ""}</span>
                    </div>
                    {prescription.followUpRequired && prescription.followUpDate && (
                      <div className="text-sm text-secondary">
                        Follow-up: {new Date(prescription.followUpDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                    <div className="pt-3 flex gap-2">
                      <Link href={`/patient/prescriptions/${prescription.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => window.open(`/prescriptions/${prescription.id}/pdf`, "_blank")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      
    </div>
  );
}
