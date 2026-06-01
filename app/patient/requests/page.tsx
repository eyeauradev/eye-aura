"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { servicesService, usersService } from "@/services/firestore";
import type { BookingRequestDocument, BookingRequestStatus, ServiceDocument, UserDocument } from "@/types/firestore";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  GlassPanel,
} from "@/components/patient-portal";
import {
  Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays,
  RefreshCcw, RotateCcw, Bell, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnrichedRequest = BookingRequestDocument & {
  service?: ServiceDocument | null;
  doctor?: UserDocument | null;
};

const STATUS_TABS: { key: BookingRequestStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Awaiting" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "cancelled", label: "Cancelled" },
];

const statusConfig: Record<string, { label: string; variant: "pending" | "confirmed" | "cancelled" | "completed" | "requested"; description: string }> = {
  pending: {
    label: "Awaiting doctor",
    variant: "pending",
    description: "Awaiting doctor confirmation.",
  },
  accepted: {
    label: "Accepted",
    variant: "confirmed",
    description: "Your appointment is confirmed.",
  },
  rejected: {
    label: "Declined",
    variant: "cancelled",
    description: "Consultation request declined.",
  },
  cancelled: {
    label: "Cancelled",
    variant: "completed",
    description: "This request was cancelled.",
  },
  reschedule_requested: {
    label: "Reschedule Proposed",
    variant: "requested",
    description: "Doctor has proposed a new time.",
  },
};

export default function PatientRequestsPage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BookingRequestStatus | "all">("all");

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const all = await bookingRequestsService.getByPatientId(user.id);
      const enriched = await Promise.all(
        all.map(async (req) => {
          const [service, doctor] = await Promise.all([
            servicesService.getById(req.serviceId),
            usersService.getById(req.doctorId),
          ]);
          return { ...req, service, doctor };
        })
      );
      setRequests(enriched);
    } catch (e) {
      const appError = getDisplayError(e, ERROR_CODES.BOOKING.SLOT_CONFLICT);
      logError(appError.code, e, "PatientRequestsPage");
      errorFromAppError(appError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [user]);

  const filtered = activeTab === "all"
    ? requests
    : requests.filter((r) => r.status === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading your requests…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Booking Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the status of your consultation requests and refunds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PremiumButton variant="outline" onClick={loadRequests} icon={<RefreshCcw className="h-4 w-4" />}>
            Refresh
          </PremiumButton>
          <Link href="/booking">
            <PremiumButton trailingIcon={<ArrowRight className="h-4 w-4" />}>
              New Booking
            </PremiumButton>
          </Link>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "all"
            ? requests.length
            : requests.filter((r) => r.status === tab.key).length;
          return (
            <PremiumButton
              key={tab.key}
              variant={activeTab === tab.key ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                  activeTab === tab.key ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                )}>
                  {count}
                </span>
              )}
            </PremiumButton>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <GlassPanel padding="lg" className="text-center">
          <Bell className="h-10 w-10 text-primary/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No requests here yet.</p>
          <Link href="/booking">
            <PremiumButton className="mt-4">Book a Consultation</PremiumButton>
          </Link>
        </GlassPanel>
      ) : (
        <div className="grid gap-4">
          {filtered.map((request, i) => {
            const cfg = statusConfig[request.status] ?? statusConfig.pending;
            const isRejected = request.status === "rejected";
            const refundStatus = isRejected && request.refundStatus && request.refundStatus !== "none"
              ? request.refundStatus
              : null;

            return (
              <DashboardCard key={request.id} staggerIndex={i}>
                <div className="flex flex-col gap-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-base">
                        {request.service?.title || "Consultation"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        with Dr. {request.doctor?.displayName || "Doctor"}
                      </p>
                    </div>
                    <StatusBadge variant={cfg.variant} size="sm">
                      {cfg.label}
                    </StatusBadge>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

                  {/* Status message */}
                  <p className="text-xs text-muted-foreground">{cfg.description}</p>

                  {/* Rejection reason */}
                  {isRejected && request.rejectionReason && (
                    <div className="rounded-xl bg-ring/5 border border-ring/15 px-3 py-2">
                      <p className="text-xs font-bold text-foreground/80 mb-0.5">Doctor&apos;s reason</p>
                      <p className="text-sm text-foreground/70">{request.rejectionReason}</p>
                    </div>
                  )}

                  {/* Reschedule proposal */}
                  {request.status === "reschedule_requested" && request.proposedTime && (
                    <div className="rounded-xl bg-secondary/5 border border-secondary/15 px-3 py-2 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground/80 mb-0.5">New time proposed</p>
                        <p className="text-sm text-foreground/70">
                          {new Date(request.proposedTime).toLocaleString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Refund status */}
                  {refundStatus && (
                    <div className={cn(
                      "rounded-xl border px-3 py-2 flex items-start gap-2",
                      refundStatus === "pending" && "bg-secondary/5 border-secondary/20 text-foreground/80",
                      refundStatus === "processed" && "bg-primary/5 border-primary/20 text-foreground/80",
                      refundStatus === "failed" && "bg-ring/5 border-ring/20 text-foreground/80",
                    )}>
                      <span className="shrink-0 mt-0.5">
                        {refundStatus === "pending" && <RotateCcw className="h-3.5 w-3.5 animate-spin" />}
                        {refundStatus === "processed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {refundStatus === "failed" && <AlertCircle className="h-3.5 w-3.5" />}
                      </span>
                      <p className="text-xs leading-relaxed">
                        {refundStatus === "pending" && "Refund being initiated…"}
                        {refundStatus === "processed" && "Refund initiated — expect 5–7 business days"}
                        {refundStatus === "failed" && "Refund processing is taking longer than expected. Our team has been notified."}
                      </p>
                    </div>
                  )}

                  {/* Payment amount */}
                  {request.paymentAmount && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                      <span className="font-bold text-secondary">₹{request.paymentAmount}</span>
                      <span>·</span>
                      <span>Ref #{request.id.slice(-6)}</span>
                    </div>
                  )}

                  {/* CTA for accepted */}
                  {request.status === "accepted" && request.appointmentId && (
                    <Link href={`/patient/appointments/${request.appointmentId}`}>
                      <PremiumButton variant="outline" fullWidth trailingIcon={<ArrowRight className="h-4 w-4" />}>
                        View Appointment
                      </PremiumButton>
                    </Link>
                  )}

                  {/* CTA for rejected — book again */}
                  {isRejected && (
                    <Link href="/booking">
                      <PremiumButton variant="outline" fullWidth trailingIcon={<ArrowRight className="h-4 w-4" />}>
                        Book Again
                      </PremiumButton>
                    </Link>
                  )}
                </div>
              </DashboardCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
