"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, prescriptionsService, usersService, visionAssessmentsService } from "@/services/firestore";
import { getAuth } from "firebase/auth";
import type { AppointmentDocument, PrescriptionDocument, UserDocument, VisionAssessmentDocument, VisionAssessmentType } from "@/types/firestore";
import { Calendar, Clock, Users, Video, FileText, ArrowLeft, CheckCircle2, X, CalendarPlus, MessageSquare, Eye, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";

const SNELLEN_OPTIONS = ["20/200","20/100","20/70","20/50","20/40","20/30","20/25","20/20","20/15"];

type ReviewForm = {
  remarks: string;
  correctedFarR: string;
  correctedFarL: string;
  correctedNearR: string;
  correctedNearL: string;
};

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
  const [existingAssessments, setExistingAssessments] = useState<VisionAssessmentDocument[]>([]);
  const [assigningTypes, setAssigningTypes] = useState<VisionAssessmentType[]>(["far", "near"]);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [reviews, setReviews] = useState<Record<string, ReviewForm>>({});
  const [savingReview, setSavingReview] = useState<string | null>(null);

  useEffect(() => {
    async function loadAppointment() {
      if (!params.id) return;

      try {
        setLoading(true);
        const apt = await appointmentsService.getById(params.id as string);
        setAppointment(apt);
        
        if (apt) {
          setNotes(apt.notes || "");
          const patientData = await usersService.getById(apt.patientId);
          setPatient(patientData);
          if (apt.prescriptionId) {
            const prescription = await prescriptionsService.getById(apt.prescriptionId);
            if (prescription) setPrescriptions([prescription]);
          }
          try {
            const existing = await visionAssessmentsService.getByAppointmentId(apt.id, user?.id);
            setExistingAssessments(existing);
            // Initialise review form state from saved values
            const initReviews: Record<string, ReviewForm> = {};
            existing.forEach((a) => {
              initReviews[a.id] = {
                remarks:        a.doctorRemarks              ?? "",
                correctedFarR:  a.doctorCorrectedFar?.rightEye ?? "",
                correctedFarL:  a.doctorCorrectedFar?.leftEye  ?? "",
                correctedNearR: a.doctorCorrectedNear?.rightEye ?? "",
                correctedNearL: a.doctorCorrectedNear?.leftEye  ?? "",
              };
            });
            setReviews(initReviews);
          } catch {
            // Index may still be building — non-fatal, assessment list just stays empty
          }
        }
      } catch (error) {
        console.error("Error loading appointment:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, user?.id]);

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

  const handleAssignAssessment = async () => {
    if (!appointment || !user || assigningTypes.length === 0) return;
    try {
      setAssigning(true);
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/assessments/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          patientId:       appointment.patientId,
          assessmentTypes: assigningTypes,
          assignedRole:    "doctor",
          doctorId:        user.id,
          appointmentId:   appointment.id,
          overrideUsed:    false,
          autoAssigned:    false,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Failed to assign assessment");
        return;
      }
      setAssignSuccess(true);
      // Refresh the existing assessments list — non-fatal if index is still building
      try {
        const updated = await visionAssessmentsService.getByAppointmentId(appointment.id, user?.id);
        setExistingAssessments(updated);
      } catch {
        // Ignore — assignment already succeeded
      }
      setTimeout(() => setAssignSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to assign assessment");
    } finally {
      setAssigning(false);
    }
  };

  const toggleType = (t: VisionAssessmentType) =>
    setAssigningTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const handleSaveReview = async (assessmentId: string) => {
    const rev = reviews[assessmentId];
    if (!rev) return;
    try {
      setSavingReview(assessmentId);
      const updates: Partial<import("@/types/firestore").VisionAssessmentDocument> = {
        reviewedAt: new Date(),
        ...(rev.remarks && { doctorRemarks: rev.remarks }),
        ...(rev.correctedFarR || rev.correctedFarL
          ? { doctorCorrectedFar:  { rightEye: rev.correctedFarR || "—", leftEye: rev.correctedFarL || "—" } }
          : {}),
        ...(rev.correctedNearR || rev.correctedNearL
          ? { doctorCorrectedNear: { rightEye: rev.correctedNearR || "—", leftEye: rev.correctedNearL || "—" } }
          : {}),
      };
      await visionAssessmentsService.update(assessmentId, updates);
      setExistingAssessments((prev) =>
        prev.map((a) => (a.id === assessmentId ? { ...a, ...updates } : a))
      );
    } catch (err) {
      console.error("Failed to save review:", err);
      alert("Failed to save review. Please try again.");
    } finally {
      setSavingReview(null);
    }
  };

  const setReview = (id: string, patch: Partial<ReviewForm>) =>
    setReviews((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { remarks:"", correctedFarR:"", correctedFarL:"", correctedNearR:"", correctedNearL:"" }), ...patch } }));

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
      

      {/* ─── Vision Assessments ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0f4f4b]/8 flex items-center justify-center">
            <Eye className="h-4 w-4 text-[#0f4f4b]" />
          </div>
          <h2 className="font-display text-xl text-[#0f4f4b]">Vision Assessments</h2>
        </div>

        {/* Per-assessment review cards */}
        {existingAssessments.map((a) => {
          const rev     = reviews[a.id] ?? { remarks:"", correctedFarR:"", correctedFarL:"", correctedNearR:"", correctedNearL:"" };
          const hasFar  = a.assessmentTypes.includes("far");
          const hasNear = a.assessmentTypes.includes("near");
          const done    = a.status === "completed";
          return (
            <Card key={a.id} className="border-[#0f4f4b]/12">
              <CardContent className="p-4 sm:p-6 space-y-5">

                {/* Header row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    {hasFar  && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#0f4f4b]/8 text-[#0f4f4b]">Far Vision</span>}
                    {hasNear && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#b5964d]/10 text-[#b5964d]">Near Vision</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#0f4f4b]/35">
                      {new Date(a.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      done                       ? "bg-green-100 text-green-700" :
                      a.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                      a.status === "expired"     ? "bg-gray-100 text-gray-500" :
                      "bg-[#b5964d]/12 text-[#b5964d]"
                    }`}>{a.status.replace("_", " ")}</span>
                  </div>
                </div>

                {/* Patient-reported results */}
                {done && (
                  <div className="space-y-3">
                    {a.resultFar && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f4f4b]/40 mb-2">Far Vision — Patient Reported</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["rightEye", "leftEye"] as const).map((eye) => (
                            <div key={eye} className="rounded-xl bg-[#0f4f4b]/4 border border-[#0f4f4b]/10 p-3">
                              <p className="text-[10px] font-bold uppercase text-[#0f4f4b]/40 mb-0.5">{eye === "rightEye" ? "Right Eye" : "Left Eye"}</p>
                              <p className="text-2xl font-black text-[#0f4f4b] leading-none">{a.resultFar![eye]}</p>
                              {a.doctorCorrectedFar?.[eye] && (
                                <p className="text-xs font-semibold text-[#b5964d] mt-1">Corrected → {a.doctorCorrectedFar[eye]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {a.resultNear && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#b5964d]/60 mb-2">Near Vision — Patient Reported</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["rightEye", "leftEye"] as const).map((eye) => (
                            <div key={eye} className="rounded-xl bg-[#b5964d]/6 border border-[#b5964d]/12 p-3">
                              <p className="text-[10px] font-bold uppercase text-[#b5964d]/50 mb-0.5">{eye === "rightEye" ? "Right Eye" : "Left Eye"}</p>
                              <p className="text-2xl font-black text-[#b5964d] leading-none">{a.resultNear![eye]}</p>
                              {a.doctorCorrectedNear?.[eye] && (
                                <p className="text-xs font-semibold text-[#0f4f4b] mt-1">Corrected → {a.doctorCorrectedNear[eye]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status notice for non-completed */}
                {!done && (
                  <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                    a.status === "in_progress" ? "bg-blue-50 border border-blue-200 text-blue-700" :
                    a.status === "expired"     ? "bg-gray-50 border border-gray-200 text-gray-500" :
                    "bg-[#b5964d]/6 border border-[#b5964d]/20 text-[#b5964d]"
                  }`}>
                    {a.status === "in_progress" ? "Patient is currently taking this assessment" :
                     a.status === "expired"     ? "Expired without completion" :
                     "Waiting for patient to start"}
                  </div>
                )}

                {/* Doctor review */}
                <div className="border-t border-[#0f4f4b]/8 pt-4 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f4f4b]/40">Doctor Review</p>

                  <div>
                    <label className="text-xs font-semibold text-[#0f4f4b]/60 block mb-1.5">Clinical Remarks</label>
                    <textarea
                      value={rev.remarks}
                      onChange={(e) => setReview(a.id, { remarks: e.target.value })}
                      placeholder="Add clinical remarks, observations, or notes…"
                      rows={3}
                      className="w-full p-3 text-sm border border-[#0f4f4b]/15 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0f4f4b]/15 resize-none"
                    />
                  </div>

                  {/* Override selects — only when results exist */}
                  {done && (
                    <div className="space-y-3">
                      {hasFar && a.resultFar && (
                        <div>
                          <p className="text-xs font-semibold text-[#0f4f4b]/60 mb-1.5">Override Far Vision</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([["correctedFarR", "Right Eye"], ["correctedFarL", "Left Eye"]] as const).map(([field, label]) => (
                              <div key={field}>
                                <p className="text-[10px] text-[#0f4f4b]/40 mb-1">{label}</p>
                                <select
                                  value={rev[field]}
                                  onChange={(e) => setReview(a.id, { [field]: e.target.value })}
                                  className="w-full text-sm border border-[#0f4f4b]/15 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f4f4b]/15"
                                >
                                  <option value="">— no override —</option>
                                  {SNELLEN_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {hasNear && a.resultNear && (
                        <div>
                          <p className="text-xs font-semibold text-[#0f4f4b]/60 mb-1.5">Override Near Vision</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([["correctedNearR", "Right Eye"], ["correctedNearL", "Left Eye"]] as const).map(([field, label]) => (
                              <div key={field}>
                                <p className="text-[10px] text-[#0f4f4b]/40 mb-1">{label}</p>
                                <select
                                  value={rev[field]}
                                  onChange={(e) => setReview(a.id, { [field]: e.target.value })}
                                  className="w-full text-sm border border-[#0f4f4b]/15 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f4f4b]/15"
                                >
                                  <option value="">— no override —</option>
                                  {SNELLEN_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    {a.reviewedAt ? (
                      <p className="text-xs text-[#0f4f4b]/35">
                        Last reviewed {new Date(a.reviewedAt).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </p>
                    ) : <span />}
                    <Button
                      onClick={() => handleSaveReview(a.id)}
                      disabled={savingReview === a.id}
                      className="h-8 px-3 bg-[#0f4f4b] hover:bg-[#0a3a36] rounded-xl text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {savingReview === a.id ? "Saving…" : "Save Review"}
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        })}

        {/* Assign new / additional */}
        <Card className="border-[#0f4f4b]/12">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[#0f4f4b]/8 flex items-center justify-center">
                <Zap className="h-4 w-4 text-[#0f4f4b]" />
              </div>
              <CardTitle className="text-base text-[#0f4f4b]">
                {existingAssessments.length > 0 ? "Assign Additional Assessment" : "Assign Vision Assessment"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="flex gap-2">
              {([["far", Eye, "Far Vision", "3m Snellen"], ["near", BookOpen, "Near Vision", "40cm chart"]] as const).map(
                ([type, Icon, label, sub]) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                      assigningTypes.includes(type)
                        ? "border-[#0f4f4b] bg-[#0f4f4b]/6"
                        : "border-[#0f4f4b]/15 bg-white hover:border-[#0f4f4b]/30"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${assigningTypes.includes(type) ? "text-[#0f4f4b]" : "text-[#0f4f4b]/40"}`} />
                    <span className={`text-xs font-bold ${assigningTypes.includes(type) ? "text-[#0f4f4b]" : "text-[#0f4f4b]/50"}`}>{label}</span>
                    <span className="text-[10px] text-[#0f4f4b]/40">{sub}</span>
                  </button>
                )
              )}
            </div>

            {assignSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Assessment assigned — patient will see it in their portal
              </div>
            )}

            <Button
              onClick={handleAssignAssessment}
              disabled={assigning || assigningTypes.length === 0}
              className="w-full bg-[#0f4f4b] hover:bg-[#0a3a36] rounded-xl"
            >
              <Zap className="h-4 w-4 mr-2" />
              {assigning ? "Assigning…" : `Assign ${assigningTypes.map((t) => t === "far" ? "Far" : "Near").join(" + ")} Assessment`}
            </Button>
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
