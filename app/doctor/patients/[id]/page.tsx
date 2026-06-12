"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, prescriptionsService, usersService, servicesService } from "@/services/firestore";
import type { AppointmentDocument, PrescriptionDocument, UserDocument, ServiceDocument } from "@/types/firestore";
import type { ServiceRecommendation } from "@/types/recommendations";
import { ArrowLeft, Calendar, Clock, FileText, CalendarPlus, MessageSquare, Plus, Pencil, XCircle, Stethoscope, ClipboardList } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { PremiumTabs } from "@/components/premium/premium-tabs";
import { StatusBadge, type StatusVariant } from "@/components/premium/status-badge";
import { DashboardCard } from "@/components/premium/dashboard-card";
import { PremiumModal } from "@/components/premium/premium-modal";
import { RecommendServiceForm } from "@/components/doctor/recommend-service-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { useToast } from "@/components/ui/toast-provider";
import { getFirebaseAuth } from "@/services/firebase/client";

import Link from "next/link";

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDocument[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDocument[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState("history");

  // Recommendations state
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([]);
  const [recommendationServices, setRecommendationServices] = useState<Map<string, ServiceDocument>>(new Map());
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRecommendForm, setShowRecommendForm] = useState(false);
  const [editingRecommendation, setEditingRecommendation] = useState<ServiceRecommendation | undefined>(undefined);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  // Fetch recommendations for this patient by this doctor
  async function fetchRecommendations() {
    if (!params.id || !user) return;
    try {
      setLoadingRecommendations(true);
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        `/api/recommendations?patientId=${params.id}&doctorId=${user.id}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const recs: ServiceRecommendation[] = data.recommendations || data || [];
        setRecommendations(recs);

        // Fetch service details for display
        const serviceIds = [...new Set(recs.map((r) => r.serviceId))];
        const serviceMap = new Map<string, ServiceDocument>();
        for (const sid of serviceIds) {
          try {
            const svc = await servicesService.getById(sid);
            if (svc) serviceMap.set(sid, svc);
          } catch {
            // skip unavailable services
          }
        }
        setRecommendationServices(serviceMap);
      }
    } catch (err) {
      console.error("Error loading recommendations:", err);
    } finally {
      setLoadingRecommendations(false);
    }
  }

  useEffect(() => {
    if (activeTab === "recommendations") {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, params.id, user]);

  // Handle cancel recommendation
  async function handleCancelRecommendation(recommendationId: string) {
    if (!user) return;
    try {
      setCancelling(true);
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();

      const response = await fetch(`/api/recommendations/${recommendationId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        success("Recommendation cancelled successfully");
        setCancelConfirmId(null);
        fetchRecommendations();
      } else {
        const errorData = await response.json().catch(() => null);
        toastError(errorData?.message || "Failed to cancel recommendation");
      }
    } catch {
      toastError("An unexpected error occurred while cancelling");
    } finally {
      setCancelling(false);
    }
  }

  // Handle successful form submission (create or edit)
  function handleRecommendationSuccess() {
    setShowRecommendForm(false);
    setEditingRecommendation(undefined);
    success(editingRecommendation ? "Recommendation updated successfully" : "Recommendation sent successfully");
    fetchRecommendations();
  }

  // Map recommendation status to StatusBadge variant
  function getRecommendationBadgeVariant(status: string): StatusVariant {
    switch (status) {
      case "PENDING": return "pending";
      case "ACCEPTED": return "confirmed";
      case "DECLINED": return "cancelled";
      case "CANCELLED": return "cancelled";
      case "EXPIRED": return "inactive";
      default: return "pending";
    }
  }

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
              <PremiumButton variant="outline" icon={<ArrowLeft className="h-4 w-4" />}>
                Back to Patients
              </PremiumButton>
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
          <PremiumButton variant="ghost" className="mb-4" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Patients
          </PremiumButton>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={TYPOGRAPHY.heading}>{patient.displayName || "Patient"}</h1>
            <p className="text-base text-muted-foreground">{patient.email}</p>
            {patient.phoneNumber && <p className="text-sm text-muted-foreground">{patient.phoneNumber}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {appointments.length} consultation{appointments.length !== 1 ? 's' : ''}
            </Badge>
            <Link href={`/doctor/patients/${params.id}/assessment-history`}>
              <PremiumButton variant="outline" size="sm" icon={<ClipboardList className="h-4 w-4" />}>
                Assessment History
              </PremiumButton>
            </Link>
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
                      <PremiumButton variant="outline" size="sm">
                        View
                      </PremiumButton>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        
      )}

      {/* Tabs */}
      <PremiumTabs
        tabs={[
          { id: "history", label: "Consultation History", icon: <Calendar className="h-4 w-4" /> },
          { id: "prescriptions", label: "Prescriptions", icon: <FileText className="h-4 w-4" /> },
          { id: "recommendations", label: "Recommended Services", icon: <Stethoscope className="h-4 w-4" /> },
          { id: "assessment-history", label: "Assessment History", icon: <ClipboardList className="h-4 w-4" /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === "history" && (
        <>
          {/* Consultation History */}
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
                        <PremiumButton variant="ghost">View Details</PremiumButton>
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
        </>
      )}

      {activeTab === "prescriptions" && (
        <>
          {/* Prescriptions */}
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
                        <PremiumButton variant="ghost">View Details</PremiumButton>
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
        </>
      )}

      {activeTab === "recommendations" && (
        <>
          {/* Recommend Service Form (create or edit) */}
          {showRecommendForm && user && (
            <RecommendServiceForm
              patientId={params.id as string}
              doctorId={user.id}
              existingRecommendation={editingRecommendation}
              onSuccess={handleRecommendationSuccess}
              onCancel={() => {
                setShowRecommendForm(false);
                setEditingRecommendation(undefined);
              }}
            />
          )}

          {/* Recommend Service Button */}
          {!showRecommendForm && (
            <div className="flex justify-end">
              <PremiumButton
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingRecommendation(undefined);
                  setShowRecommendForm(true);
                }}
              >
                Recommend Service
              </PremiumButton>
            </div>
          )}

          {/* Recommendations List */}
          {loadingRecommendations ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => {
                const service = recommendationServices.get(rec.serviceId);
                return (
                  <DashboardCard key={rec.id} staggerIndex={index}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <StatusBadge variant={getRecommendationBadgeVariant(rec.status)}>
                            {rec.status}
                          </StatusBadge>
                          <h3 className="font-medium text-primary">
                            {service?.title || "Service"}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(rec.recommendedSlotStart).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>
                            {new Date(rec.recommendedSlotStart).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {new Date(rec.recommendedSlotEnd).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {rec.recommendationNote && (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {rec.recommendationNote}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Edit/Cancel actions for PENDING recommendations */}
                      {rec.status === "PENDING" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <PremiumButton
                            variant="ghost"
                            size="sm"
                            icon={<Pencil className="h-4 w-4" />}
                            onClick={() => {
                              setEditingRecommendation(rec);
                              setShowRecommendForm(true);
                            }}
                          >
                            Edit
                          </PremiumButton>
                          <PremiumButton
                            variant="ghost"
                            size="sm"
                            icon={<XCircle className="h-4 w-4" />}
                            onClick={() => setCancelConfirmId(rec.id)}
                          >
                            Cancel
                          </PremiumButton>
                        </div>
                      )}
                    </div>
                  </DashboardCard>
                );
              })}
            </div>
          ) : (
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4 sm:p-8 text-center">
                <Stethoscope className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
                <p className="text-base text-muted-foreground">No recommended services yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Recommend a service for your patient after consultation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cancel Confirmation Modal */}
          <PremiumModal
            open={!!cancelConfirmId}
            onClose={() => setCancelConfirmId(null)}
            title="Cancel Recommendation"
            subtitle="Are you sure you want to cancel this recommendation? The patient will be notified."
            actions={
              <>
                <PremiumButton
                  variant="outline"
                  onClick={() => setCancelConfirmId(null)}
                  disabled={cancelling}
                >
                  Keep
                </PremiumButton>
                <PremiumButton
                  variant="primary"
                  loading={cancelling}
                  onClick={() => {
                    if (cancelConfirmId) handleCancelRecommendation(cancelConfirmId);
                  }}
                >
                  Cancel Recommendation
                </PremiumButton>
              </>
            }
          >
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The reserved time slot will be released and the patient will receive a notification about the cancellation.
            </p>
          </PremiumModal>
        </>
      )}

      {activeTab === "assessment-history" && (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-4 sm:p-8 text-center">
            <ClipboardList className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium text-primary mb-2">Assessment History</p>
            <p className="text-sm text-muted-foreground mb-6">
              View all vision assessments for this patient across all appointments.
            </p>
            <Link href={`/doctor/patients/${params.id}/assessment-history`}>
              <PremiumButton variant="primary" icon={<ClipboardList className="h-4 w-4" />}>
                Open Assessment History
              </PremiumButton>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
