"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, prescriptionsService, usersService, visionAssessmentsService } from "@/services/firestore";
import { transactionService } from "@/services/booking/transaction.service";
import { getAuth } from "firebase/auth";
import type { AppointmentDocument, PrescriptionDocument, UserDocument, VisionAssessmentDocument, VisionAssessmentType, RefundDecision } from "@/types/firestore";
import { isRefundEligible } from "@/lib/refund-eligibility";
import { useToast } from "@/components/ui/toast-provider";
import { Calendar, Clock, Users, Video, FileText, ArrowLeft, CheckCircle2, X, CalendarPlus, MessageSquare, Eye, BookOpen, Zap, RefreshCw } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";

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
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApprovalChoiceModal, setShowApprovalChoiceModal] = useState(false);
  const [issuingRefund, setIssuingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

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

  const handleApproveCancellation = async () => {
    if (!appointment || !user) return;

    // If appointment has a paymentId or bookingRequestId (payment may be on the booking request), show the refund choice modal
    if (appointment.paymentId || appointment.bookingRequestId) {
      setShowApprovalChoiceModal(true);
      return;
    }

    // No payment — approve directly without refund options
    await approveWithDecision("no_refund");
  };

  const approveWithDecision = async (decision: "refund" | "no_refund") => {
    if (!appointment || !user) return;

    try {
      setUpdating(true);
      setShowApprovalChoiceModal(false);
      const refundDecision: RefundDecision = {
        decision,
        decidedBy: user.id,
        decidedByRole: "doctor",
        decidedAt: new Date(),
      };
      const result = await transactionService.approveCancellationWithTransaction(
        appointment.id,
        { uid: user.id, role: "doctor" },
        refundDecision
      );

      // If "Approve with Refund" was selected, call the Refund API
      // paymentId may be on the appointment directly or on the booking request
      let refundPaymentId = result.paymentId;
      if (!refundPaymentId && result.bookingRequestId) {
        // Look up paymentId from the booking request
        try {
          const { bookingRequestsService } = await import("@/services/firestore/booking-requests.service");
          const bookingRequest = await bookingRequestsService.getById(result.bookingRequestId);
          refundPaymentId = bookingRequest?.paymentId;
        } catch (e) {
          console.error("Error looking up booking request payment:", e);
        }
      }

      if (decision === "refund" && refundPaymentId) {
        try {
          const idToken = await getAuth().currentUser?.getIdToken();
          const res = await fetch("/api/payments/cancellation-refund", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              appointmentId: appointment.id,
              paymentId: refundPaymentId,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("Refund API error:", errData);
            toastError("Cancellation approved but refund failed. You can issue the refund later.");
          }
        } catch (refundErr) {
          console.error("Refund API error:", refundErr);
          toastError("Cancellation approved but refund failed. You can issue the refund later.");
        }
      } else if (decision === "refund" && !refundPaymentId) {
        toastInfo("Cancellation approved. No payment found to refund.");
      }

      // Refresh appointment data
      const updated = await appointmentsService.getById(appointment.id);
      if (updated) setAppointment(updated);
      toastSuccess("Cancellation approved successfully.");
    } catch (error: any) {
      console.error("Error approving cancellation:", error);
      toastError(error?.message || "Failed to approve cancellation. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleIssueRefund = async () => {
    if (!appointment || !user) return;

    try {
      setIssuingRefund(true);
      setRefundError(null);

      // Find paymentId — may be on appointment directly or on the booking request
      let refundPaymentId = appointment.paymentId;
      if (!refundPaymentId && appointment.bookingRequestId) {
        try {
          const { bookingRequestsService } = await import("@/services/firestore/booking-requests.service");
          const bookingRequest = await bookingRequestsService.getById(appointment.bookingRequestId);
          refundPaymentId = bookingRequest?.paymentId;
        } catch (e) {
          console.error("Error looking up booking request payment:", e);
        }
      }

      if (!refundPaymentId) {
        setRefundError("No payment found to refund.");
        return;
      }

      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/payments/cancellation-refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          paymentId: refundPaymentId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Refund failed" }));
        if (res.status === 409) {
          setRefundError("Refund already processed for this appointment.");
        } else {
          setRefundError(errData.error || "Failed to issue refund. Please try again.");
        }
        // Refresh appointment data to update UI state
        const updated = await appointmentsService.getById(appointment.id);
        if (updated) setAppointment(updated);
        return;
      }

      // Refresh appointment data
      const updated = await appointmentsService.getById(appointment.id);
      if (updated) setAppointment(updated);
      toastSuccess("Refund initiated successfully.");
    } catch (error: any) {
      console.error("Error issuing refund:", error);
      setRefundError("Network error. Please try again.");
    } finally {
      setIssuingRefund(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!appointment || !user || !rejectionReason.trim()) return;

    try {
      setUpdating(true);
      await transactionService.rejectCancellationWithTransaction(
        appointment.id,
        { uid: user.id, role: "doctor" },
        rejectionReason.trim()
      );

      // Refresh appointment data
      const updated = await appointmentsService.getById(appointment.id);
      if (updated) setAppointment(updated);
      setShowRejectModal(false);
      setRejectionReason("");
      toastSuccess("Cancellation request rejected.");
    } catch (error: any) {
      console.error("Error rejecting cancellation:", error);
      toastError(error?.message || "Failed to reject cancellation. Please try again.");
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
        toastError(err.error ?? "Failed to assign assessment");
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
      toastError("Failed to assign assessment");
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
      toastError("Failed to save review. Please try again.");
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
      case "cancellation_requested":
        return "bg-orange-100 text-orange-800 border-orange-200";
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
              <PremiumButton variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Appointments
              </PremiumButton>
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
          <PremiumButton variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appointments
          </PremiumButton>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className={TYPOGRAPHY.heading}>Appointment Details</h1>
            <p className={TYPOGRAPHY.subheading}>{patient?.displayName || "Patient"}</p>
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
                <PremiumButton asChild className="w-full">
                  <a
                    href={appointment.consultationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Join Consultation
                  </a>
                </PremiumButton>
              )}
              
              {appointment.status === "pending" && (
                <PremiumButton
                  onClick={() => handleUpdateStatus("confirmed")}
                  disabled={updating}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Appointment
                </PremiumButton>
              )}
              
              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <PremiumButton
                  onClick={() => handleUpdateStatus("completed")}
                  disabled={updating}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Completed
                </PremiumButton>
              )}
              
              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <PremiumButton
                  onClick={() => handleUpdateStatus("cancelled")}
                  disabled={updating}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </PremiumButton>
              )}

              {appointment.status === "cancellation_requested" && (
                <div className="space-y-3 border-t border-primary/10 pt-3">
                  <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                    <p className="text-sm font-bold text-orange-800 mb-1">Cancellation Requested</p>
                    <p className="text-xs text-orange-700">
                      Reason: {appointment.cancellationReason}
                    </p>
                    {appointment.cancellationRequestedAt && (
                      <p className="text-xs text-orange-600 mt-1">
                        Requested: {new Date(appointment.cancellationRequestedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <PremiumButton
                    onClick={() => handleApproveCancellation()}
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {updating ? "Approving..." : "Approve Cancellation"}
                  </PremiumButton>
                  <PremiumButton
                    onClick={() => setShowRejectModal(true)}
                    disabled={updating}
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject Cancellation
                  </PremiumButton>
                </div>
              )}

              {appointment.status === "completed" && !appointment.prescriptionId && (
                <Link href={`/doctor/prescriptions/create/${appointment.id}`} className="w-full">
                  <PremiumButton variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Prescription
                  </PremiumButton>
                </Link>
              )}

              {/* Post-approval Issue Refund section */}
              {appointment.status === "cancelled" && (() => {
                const eligibility = isRefundEligible(appointment, "doctor");
                if (!eligibility.eligible) return null;

                const daysSinceApproval = appointment.cancellationApprovedAt
                  ? Math.floor((Date.now() - new Date(appointment.cancellationApprovedAt).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                const remainingDays = Math.max(0, 7 - daysSinceApproval);

                return (
                  <div className="space-y-3 border-t border-primary/10 pt-3">
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                      <p className="text-sm font-bold text-blue-800 mb-1">Refund Available</p>
                      <p className="text-xs text-blue-700">
                        You have {remainingDays} day{remainingDays !== 1 ? "s" : ""} remaining to issue a refund for this appointment.
                      </p>
                    </div>
                    {refundError && (
                      <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                        <p className="text-xs text-red-700">{refundError}</p>
                      </div>
                    )}
                    <PremiumButton
                      onClick={handleIssueRefund}
                      disabled={issuingRefund}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${issuingRefund ? "animate-spin" : ""}`} />
                      {issuingRefund ? "Processing Refund..." : "Issue Refund"}
                    </PremiumButton>
                  </div>
                );
              })()}
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
                    <PremiumButton
                      onClick={() => handleSaveReview(a.id)}
                      disabled={savingReview === a.id}
                      className="h-8 px-3 bg-[#0f4f4b] hover:bg-[#0a3a36] rounded-xl text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {savingReview === a.id ? "Saving…" : "Save Review"}
                    </PremiumButton>
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

            <PremiumButton
              onClick={handleAssignAssessment}
              disabled={assigning || assigningTypes.length === 0}
              className="w-full bg-[#0f4f4b] hover:bg-[#0a3a36] rounded-xl"
            >
              <Zap className="h-4 w-4 mr-2" />
              {assigning ? "Assigning…" : `Assign ${assigningTypes.map((t) => t === "far" ? "Far" : "Near").join(" + ")} Assessment`}
            </PremiumButton>
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
            <PremiumButton onClick={handleSaveNotes} disabled={updating}>
              {updating ? "Saving..." : "Save Notes"}
            </PremiumButton>
          </CardContent>
        </Card>
      

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <div>
          <h2 className={TYPOGRAPHY.subheading + " mb-6"}>Prescriptions</h2>
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
                      <PremiumButton variant="outline">View Details</PremiumButton>
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
      
      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-display text-xl text-primary">Reject Cancellation</h3>
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this cancellation request. The patient will be notified.
            </p>
            <div>
              <label className="text-sm font-bold text-muted-foreground mb-2 block">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the cancellation request is being rejected..."
                className="w-full h-24 rounded-2xl border border-primary/20 bg-white/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary/50"
              />
            </div>
            <div className="flex gap-3">
              <PremiumButton
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={updating}
              >
                Cancel
              </PremiumButton>
              <PremiumButton
                onClick={handleRejectCancellation}
                disabled={updating || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {updating ? "Rejecting..." : "Confirm Rejection"}
              </PremiumButton>
            </div>
          </div>
        </div>
      )}

      {/* Approval Refund Choice Modal */}
      {showApprovalChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-display text-xl text-primary">Approve Cancellation</h3>
            <p className="text-sm text-muted-foreground">
              This appointment has a payment associated with it. Would you like to issue a refund to the patient?
            </p>
            <div className="flex flex-col gap-3">
              <PremiumButton
                onClick={() => approveWithDecision("refund")}
                disabled={updating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {updating ? "Processing..." : "Approve with Refund"}
              </PremiumButton>
              <PremiumButton
                onClick={() => approveWithDecision("no_refund")}
                disabled={updating}
                variant="outline"
                className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <X className="h-4 w-4 mr-2" />
                {updating ? "Processing..." : "Approve without Refund"}
              </PremiumButton>
              <PremiumButton
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setShowApprovalChoiceModal(false)}
                disabled={updating}
              >
                Cancel
              </PremiumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
