"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, usersService } from "@/services/firestore";
import { transactionService } from "@/services/booking/transaction.service";
import { getAuth } from "firebase/auth";
import { useToast } from "@/components/ui/toast-provider";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import type { AppError } from "@/lib/errors";
import { Calendar, Clock, AlertCircle, CheckCircle2, X, ArrowLeft, DollarSign, History } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import Link from "next/link";
import type { AppointmentDocument, UserDocument, RefundDecision } from "@/types/firestore";
import { isRefundEligible } from "@/lib/refund-eligibility";
import { filterCancellationRequests } from "./filter-utils";
import type { FilterStatus, EnrichedCancellation } from "./filter-utils";

export default function AdminCancellationsPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo, errorFromAppError } = useToast();
  const [requests, setRequests] = useState<EnrichedCancellation[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalChoiceModalId, setApprovalChoiceModalId] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState<string | null>(null);

  useEffect(() => {
    loadCancellationRequests();
  }, []);

  async function loadCancellationRequests() {
    try {
      setLoading(true);

      // Fetch all appointments and filter for cancellation-related ones
      const allAppointments = await appointmentsService.getAll(200);

      const cancellationAppointments = allAppointments.filter((apt) => {
        // Pending: currently in cancellation_requested status
        if (apt.status === "cancellation_requested") return true;
        // Approved: cancelled with cancellationApprovedAt set
        if (apt.status === "cancelled" && apt.cancellationApprovedAt) return true;
        // Rejected: has cancellationRejectedAt set
        if (apt.cancellationRejectedAt) return true;
        return false;
      });

      // Load all users for name lookup
      const allUsers = await usersService.getAll(200);
      const userMap: Record<string, UserDocument> = {};
      allUsers.forEach((u) => {
        userMap[u.id] = u;
      });

      const enriched: EnrichedCancellation[] = cancellationAppointments.map((apt) => ({
        appointment: apt,
        patientName: userMap[apt.patientId]?.displayName || "Unknown Patient",
        doctorName: userMap[apt.doctorId]?.displayName || "Unknown Doctor",
      }));

      setRequests(enriched);
    } catch (error) {
      console.error("Error loading cancellation requests:", error);
    } finally {
      setLoading(false);
    }
  }

  function getFilteredRequests(): EnrichedCancellation[] {
    return filterCancellationRequests(requests, filter);
  }

  async function handleApprove(appointmentId: string) {
    if (!user) return;

    // Check if the appointment has a paymentId — if so, show the choice modal
    const item = requests.find((r) => r.appointment.id === appointmentId);
    if (item?.appointment.paymentId) {
      setApprovalChoiceModalId(appointmentId);
      return;
    }

    // No payment — approve directly with no_refund
    await executeApproval(appointmentId, "no_refund");
  }

  async function executeApproval(appointmentId: string, decision: "refund" | "no_refund") {
    if (!user) return;

    try {
      setActionLoading(appointmentId);
      setApprovalChoiceModalId(null);

      const refundDecision: RefundDecision = {
        decision,
        decidedBy: user.id,
        decidedByRole: "admin",
        decidedAt: new Date(),
      };

      // Approve the cancellation via transaction
      const result = await transactionService.approveCancellationWithTransaction(
        appointmentId,
        { uid: user.id, role: "admin" },
        refundDecision
      );

      // If "Approve with Refund" was selected and payment exists, call the Refund API
      if (decision === "refund" && result.paymentId) {
        try {
          const idToken = await getAuth().currentUser?.getIdToken();
          const res = await fetch("/api/payments/cancellation-refund", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              appointmentId,
              paymentId: result.paymentId,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Refund request failed");
          }
        } catch (refundError: unknown) {
          console.error("Refund API error:", refundError);
          const appError = getDisplayError(refundError, ERROR_CODES.PAYMENT.VERIFICATION_FAILED);
          logError(appError.code, refundError, "AdminCancellationsPage");
          errorFromAppError(appError);
        }
      }

      // Reload data
      await loadCancellationRequests();
    } catch (error: unknown) {
      console.error("Error approving cancellation:", error);
      const appError = getDisplayError(error, ERROR_CODES.ADMIN.OPERATION_FAILED);
      logError(appError.code, error, "AdminCancellationsPage");
      errorFromAppError(appError);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleIssueRefund(appointmentId: string, paymentId: string) {
    if (!user) return;

    try {
      setRefundLoading(appointmentId);
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/payments/cancellation-refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ appointmentId, paymentId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toastInfo("Refund already processed for this appointment.");
        } else {
          toastError("Failed to issue refund: " + (errData.error || "Unknown error"));
        }
      } else {
        toastSuccess("Refund initiated successfully.");
      }

      // Reload data to reflect updated state
      await loadCancellationRequests();
    } catch (error: unknown) {
      console.error("Error issuing refund:", error);
      const appError = getDisplayError(error, ERROR_CODES.PAYMENT.VERIFICATION_FAILED);
      logError(appError.code, error, "AdminCancellationsPage");
      errorFromAppError(appError);
    } finally {
      setRefundLoading(null);
    }
  }

  async function handleReject(appointmentId: string) {
    if (!user || !rejectionReason.trim()) {
      toastError("Please provide a rejection reason");
      return;
    }

    try {
      setActionLoading(appointmentId);

      await transactionService.rejectCancellationWithTransaction(
        appointmentId,
        { uid: user.id, role: "admin" },
        rejectionReason.trim()
      );

      setRejectModalId(null);
      setRejectionReason("");

      // Reload data
      await loadCancellationRequests();
    } catch (error: unknown) {
      console.error("Error rejecting cancellation:", error);
      const appError = getDisplayError(error, ERROR_CODES.ADMIN.OPERATION_FAILED);
      logError(appError.code, error, "AdminCancellationsPage");
      errorFromAppError(appError);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cancellation requests...</p>
        </div>
      </div>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin/appointments">
          <PremiumButton variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appointments
          </PremiumButton>
        </Link>
        <h1 className={TYPOGRAPHY.heading}>
          Cancellation Requests
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and manage patient cancellation requests
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as FilterStatus[]).map((status) => (
          <PremiumButton
            key={status}
            variant={filter === status ? "primary" : "outline"}
            onClick={() => setFilter(status)}
            className={filter === status ? "" : "border-primary/10"}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === "pending" && (
              <Badge className="ml-2 bg-orange-100 text-orange-800 border-orange-200 text-xs">
                {requests.filter((r) => r.appointment.status === "cancellation_requested").length}
              </Badge>
            )}
          </PremiumButton>
        ))}
      </div>

      {/* Cancellation Requests List */}
      <Card className="border-primary/10">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg">
            {filter === "all" ? "All Requests" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                No {filter === "all" ? "" : filter} cancellation requests found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((item) => (
                <CancellationRequestCard
                  key={item.appointment.id}
                  item={item}
                  actionLoading={actionLoading}
                  refundLoading={refundLoading}
                  onApprove={handleApprove}
                  onReject={(id) => {
                    setRejectModalId(id);
                    setRejectionReason("");
                  }}
                  onIssueRefund={handleIssueRefund}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Reason Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-lg">Reject Cancellation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this cancellation request.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full min-h-[100px] p-3 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
              />
              <div className="flex gap-3 justify-end">
                <PremiumButton
                  variant="outline"
                  onClick={() => {
                    setRejectModalId(null);
                    setRejectionReason("");
                  }}
                  disabled={actionLoading === rejectModalId}
                >
                  Cancel
                </PremiumButton>
                <PremiumButton
                  onClick={() => handleReject(rejectModalId)}
                  disabled={!rejectionReason.trim() || actionLoading === rejectModalId}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {actionLoading === rejectModalId ? "Rejecting..." : "Reject Request"}
                </PremiumButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Refund Choice Modal */}
      {approvalChoiceModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-lg">Approve Cancellation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This appointment has a payment. Would you like to issue a refund along with the approval?
              </p>
              <div className="flex flex-col gap-3">
                <PremiumButton
                  onClick={() => executeApproval(approvalChoiceModalId, "refund")}
                  disabled={actionLoading === approvalChoiceModalId}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {actionLoading === approvalChoiceModalId ? "Processing..." : "Approve with Refund"}
                </PremiumButton>
                <PremiumButton
                  onClick={() => executeApproval(approvalChoiceModalId, "no_refund")}
                  disabled={actionLoading === approvalChoiceModalId}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {actionLoading === approvalChoiceModalId ? "Processing..." : "Approve without Refund"}
                </PremiumButton>
                <PremiumButton
                  onClick={() => setApprovalChoiceModalId(null)}
                  disabled={actionLoading === approvalChoiceModalId}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  Cancel
                </PremiumButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CancellationRequestCard({
  item,
  actionLoading,
  refundLoading,
  onApprove,
  onReject,
  onIssueRefund,
}: {
  item: EnrichedCancellation;
  actionLoading: string | null;
  refundLoading: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onIssueRefund: (appointmentId: string, paymentId: string) => void;
}) {
  const { appointment, patientName, doctorName } = item;
  const isPending = appointment.status === "cancellation_requested";
  const isApproved = appointment.status === "cancelled" && !!appointment.cancellationApprovedAt;
  const isRejected = !!appointment.cancellationRejectedAt;

  // Check refund eligibility for approved appointments
  const refundEligibility = isApproved ? isRefundEligible(appointment, "admin") : null;

  return (
    <div className="p-4 rounded-xl bg-white/50 border border-primary/5 hover:border-primary/10 transition space-y-3">
      {/* Top row: patient/doctor info and status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-primary text-sm">
            {patientName}
          </p>
          <p className="text-xs text-muted-foreground">
            Doctor: {doctorName}
          </p>
        </div>
        <Badge className={getRequestStatusColor(appointment)}>
          {isPending ? "Pending" : isApproved ? "Approved" : "Rejected"}
        </Badge>
      </div>

      {/* Appointment date and cancellation details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            {appointment.scheduledFor.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {appointment.cancellationRequestedAt && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              Requested: {new Date(appointment.cancellationRequestedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Cancellation reason */}
      {appointment.cancellationReason && (
        <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
          <p className="text-xs font-medium text-orange-800 mb-0.5">Cancellation Reason</p>
          <p className="text-sm text-orange-700">{appointment.cancellationReason}</p>
        </div>
      )}

      {/* Rejection reason (if rejected) */}
      {isRejected && appointment.cancellationRejectionReason && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3">
          <p className="text-xs font-medium text-red-800 mb-0.5">Rejection Reason</p>
          <p className="text-sm text-red-700">{appointment.cancellationRejectionReason}</p>
        </div>
      )}

      {/* Actions for pending requests */}
      {isPending && (
        <div className="flex gap-2 pt-1">
          <PremiumButton
            onClick={() => onApprove(appointment.id)}
            disabled={actionLoading === appointment.id}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {actionLoading === appointment.id ? "Processing..." : "Approve"}
          </PremiumButton>
          <PremiumButton
            onClick={() => onReject(appointment.id)}
            disabled={actionLoading === appointment.id}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </PremiumButton>
        </div>
      )}

      {/* Post-approval "Issue Refund" button (Task 7.2) */}
      {isApproved && refundEligibility?.eligible && appointment.paymentId && (
        <div className="pt-1">
          <PremiumButton
            onClick={() => onIssueRefund(appointment.id, appointment.paymentId!)}
            disabled={refundLoading === appointment.id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            {refundLoading === appointment.id ? "Processing Refund..." : "Issue Refund"}
          </PremiumButton>
        </div>
      )}

      {/* Refund status indicator for approved appointments */}
      {isApproved && appointment.refundStatus === "processed" && (
        <div className="rounded-lg bg-green-50 border border-green-100 p-2">
          <p className="text-xs font-medium text-green-800">✓ Refund processed</p>
        </div>
      )}
      {isApproved && appointment.refundStatus === "pending" && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-2">
          <p className="text-xs font-medium text-yellow-800">⏳ Refund in progress</p>
        </div>
      )}
      {isApproved && appointment.refundStatus === "failed" && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-2">
          <p className="text-xs font-medium text-red-800">✗ Refund failed</p>
        </div>
      )}

      {/* Refund Audit Trail (Task 7.3) */}
      {isApproved && appointment.refundAuditTrail && appointment.refundAuditTrail.length > 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-gray-700">Refund Audit Trail</p>
          </div>
          <div className="space-y-1.5 pl-5 border-l-2 border-gray-200">
            {appointment.refundAuditTrail.map((entry, idx) => (
              <div key={idx} className="relative text-xs">
                <div className="absolute -left-[1.1rem] top-1 w-2 h-2 rounded-full bg-gray-300" />
                <p className="font-medium text-gray-700">
                  {entry.action === "decision_at_approval" ? "Decision at Approval" : "Post-Approval Refund"}
                  {" — "}
                  <span className={entry.decision === "refund" ? "text-green-700" : "text-orange-700"}>
                    {entry.decision === "refund" ? "Refund" : "No Refund"}
                  </span>
                </p>
                <p className="text-gray-500">
                  By {entry.actorRole} • {new Date(entry.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getRequestStatusColor(appointment: AppointmentDocument): string {
  if (appointment.status === "cancellation_requested") {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }
  if (appointment.status === "cancelled" && appointment.cancellationApprovedAt) {
    return "bg-green-100 text-green-800 border-green-200";
  }
  if (appointment.cancellationRejectedAt) {
    return "bg-red-100 text-red-800 border-red-200";
  }
  return "bg-gray-100 text-gray-800 border-gray-200";
}
