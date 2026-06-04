"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { usersService, servicesService } from "@/services/firestore";
import { getFirebaseAuth } from "@/services/firebase/client";
import { getDisplayError, logError, formatDisplayError, ERROR_CODES } from "@/lib/errors";
import type { BookingRequestDocument, BookingRequestStatus, ServiceDocument, UserDocument } from "@/types/firestore";
import { getEffectiveServiceIds } from "@/lib/booking/compatibility";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock, CheckCircle2, XCircle, AlertCircle, Bell, Loader2,
  User, CalendarDays, RefreshCcw, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPOGRAPHY } from "@/lib/design-tokens";

type EnrichedRequest = BookingRequestDocument & { patient?: UserDocument | null; service?: ServiceDocument | null; services?: ServiceDocument[] };

const STATUS_TABS: { key: BookingRequestStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:              { label: "Pending",              color: "bg-amber-100 text-amber-800 border-amber-200",   icon: <Clock className="h-3.5 w-3.5" /> },
  accepted:             { label: "Accepted",             color: "bg-green-100 text-green-800 border-green-200",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected:             { label: "Declined",             color: "bg-red-100 text-red-800 border-red-200",         icon: <XCircle className="h-3.5 w-3.5" /> },
  cancelled:            { label: "Cancelled",            color: "bg-gray-100 text-gray-800 border-gray-200",      icon: <XCircle className="h-3.5 w-3.5" /> },
  reschedule_requested: { label: "Reschedule Requested", color: "bg-orange-100 text-orange-800 border-orange-200", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const refundConfig: Record<string, { label: string; color: string }> = {
  none:      { label: "No Payment",          color: "bg-gray-100 text-gray-600 border-gray-200" },
  pending:   { label: "Refund Initiating…",  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  processed: { label: "Refund Initiated",    color: "bg-green-100 text-green-700 border-green-200" },
  failed:    { label: "Refund Needs Attention", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function DoctorRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BookingRequestStatus | "all">("pending");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [retryingRefundId, setRetryingRefundId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const all = await bookingRequestsService.getByDoctorId(user.id);
      const enriched = await Promise.all(
        all.map(async (req) => {
          const patient = await usersService.getById(req.patientId);
          // Fetch all services for multi-service bookings
          const serviceIds = getEffectiveServiceIds(req);
          const services = (await Promise.all(
            serviceIds.map((id) => servicesService.getById(id))
          )).filter(Boolean) as ServiceDocument[];
          const service = services[0] || null;
          return { ...req, patient, service, services };
        })
      );
      setRequests(enriched);
    } catch (e) {
      console.error("Error loading requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [user]);

  const filtered = activeTab === "all"
    ? requests
    : requests.filter((r) => r.status === activeTab);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      await bookingRequestsService.acceptRequest(id);
      await loadRequests();
    } catch (e) {
      console.error("Error accepting:", e);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRetryRefund = async (request: EnrichedRequest) => {
    setRetryingRefundId(request.id);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookingRequestId: request.id,
          reason: request.rejectionReason || "Doctor declined",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        console.error("Retry refund failed:", d.error);
      }
      await loadRequests();
    } catch (err) {
      console.error("Retry refund error:", err);
    } finally {
      setRetryingRefundId(null);
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectReason("");
    setRejectError(null);
    setRejectDialog({ open: true, requestId: id });
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("Please provide a reason.");
      return;
    }
    setRejectLoading(true);
    setRejectError(null);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingRequestId: rejectDialog.requestId, reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to decline request");
      }
      setRejectDialog({ open: false, requestId: "" });
      await loadRequests();
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.DOCTOR.OPERATION_FAILED);
      logError(appError.code, err, "DoctorRequestsPage");
      setRejectError(formatDisplayError(appError));
    } finally {
      setRejectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading requests…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className={TYPOGRAPHY.heading}>Booking Requests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and manage consultation requests from patients.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                <Bell className="h-3 w-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}
            <PremiumButton variant="outline" onClick={loadRequests} icon={<RefreshCcw className="h-4 w-4" />}>
              Refresh
            </PremiumButton>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === "all"
              ? requests.length
              : requests.filter((r) => r.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  activeTab === tab.key
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-primary/20 hover:border-primary/40"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === tab.key ? "bg-white/20" : "bg-primary/10 text-primary"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Request Cards */}
        {filtered.length === 0 ? (
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-8 text-center">
              <Bell className="h-10 w-10 text-primary/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {activeTab === "pending" ? "No pending requests." : "No requests in this category."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((request) => {
              const cfg = statusConfig[request.status] ?? statusConfig.pending;
              const isPending = request.status === "pending";
              const isRejected = request.status === "rejected";
              const refundCfg = isRejected
                ? refundConfig[request.refundStatus ?? "none"]
                : null;

              return (
                <Card
                  key={request.id}
                  className={cn(
                    "border transition-all",
                    isPending ? "border-amber-200 bg-amber-50" : "border-primary/10 bg-white/60"
                  )}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4">
                      {/* Top row: patient + status */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className={cn(TYPOGRAPHY.subheading, "truncate")}>
                              {request.patient?.displayName || "Patient"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {request.patient?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("flex items-center gap-1 text-xs", cfg.color)}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                          {refundCfg && (
                            <Badge className={cn("text-xs", refundCfg.color)}>
                              {refundCfg.label}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="h-4 w-4 shrink-0" />
                          <span>
                            {new Date(request.requestedTime).toLocaleString("en-IN", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {request.services && request.services.length > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>
                              {request.services.length === 1
                                ? `${request.services[0].title} · ${request.services[0].duration} min`
                                : `${request.services.length} services · ${request.services.reduce((s, svc) => s + svc.duration, 0)} min`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Multi-service breakdown */}
                      {request.services && request.services.length > 1 && (
                        <div className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 space-y-1">
                          {request.services.map((svc) => (
                            <div key={svc.id} className="flex items-center justify-between text-xs">
                              <span className="text-foreground font-medium">{svc.title}</span>
                              <span className="text-muted-foreground">{svc.duration} min · ₹{svc.price}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {request.notes && (
                        <p className="text-sm text-muted-foreground italic px-1">
                          "{request.notes}"
                        </p>
                      )}

                      {/* Rejection reason */}
                      {request.rejectionReason && (
                        <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                          <p className={cn(TYPOGRAPHY.label, "text-red-700 mb-0.5")}>Decline reason</p>
                          <p className="text-sm text-red-700">{request.rejectionReason}</p>
                        </div>
                      )}

                      {/* Payment info */}
                      {request.paymentAmount && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-secondary">
                            ₹{request.paymentAmount} paid
                          </span>
                          {isRejected && request.refundStatus === "processed" && (
                            <span className="text-green-700">· Refund initiated</span>
                          )}
                          {isRejected && request.refundStatus === "failed" && (
                            <span className="text-red-600">· Refund needs attention</span>
                          )}
                        </div>
                      )}

                      {/* Retry refund for stuck/failed declined requests */}
                      {isRejected && (request.refundStatus === "pending" || request.refundStatus === "failed") && (
                        <div className="pt-1">
                          <PremiumButton
                            variant="outline"
                            onClick={() => handleRetryRefund(request)}
                            disabled={retryingRefundId === request.id}
                            loading={retryingRefundId === request.id}
                            fullWidth
                            size="sm"
                            icon={<RotateCcw className="h-4 w-4" />}
                          >
                            {retryingRefundId === request.id ? "Retrying refund…" : "Retry Refund"}
                          </PremiumButton>
                        </div>
                      )}

                      {/* Actions for pending */}
                      {isPending && (
                        <div className="flex gap-2 pt-1">
                          <PremiumButton
                            onClick={() => handleAccept(request.id)}
                            disabled={acceptingId === request.id}
                            loading={acceptingId === request.id}
                            className="flex-1"
                            size="sm"
                            icon={<CheckCircle2 className="h-4 w-4" />}
                          >
                            {acceptingId === request.id ? "Accepting…" : "Accept"}
                          </PremiumButton>
                          <PremiumButton
                            variant="outline"
                            onClick={() => openRejectDialog(request.id)}
                            className="flex-1"
                            size="sm"
                          >
                            Decline
                          </PremiumButton>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => !rejectLoading && setRejectDialog({ open, requestId: open ? rejectDialog.requestId : "" })}
      >
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className={cn(TYPOGRAPHY.subheading, "flex items-center gap-2")}>
              <XCircle className="h-5 w-5 text-red-500" />
              Decline Booking Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Please let the patient know why you are unable to accept this request. A full refund will be automatically initiated.
            </p>
            <Textarea
              placeholder="e.g. I am unavailable on this date. Please book for a different time."
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); setRejectError(null); }}
              rows={3}
              className="resize-none"
              disabled={rejectLoading}
            />
            {rejectError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {rejectError}
              </p>
            )}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800">
                The patient will be notified and their payment will be refunded automatically.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <PremiumButton
              variant="outline"
              onClick={() => setRejectDialog({ open: false, requestId: "" })}
              disabled={rejectLoading}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              onClick={handleConfirmReject}
              disabled={rejectLoading || !rejectReason.trim()}
              loading={rejectLoading}
            >
              {rejectLoading ? "Declining…" : "Decline & Refund"}
            </PremiumButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
