"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { servicesService, usersService } from "@/services/firestore";
import type { BookingRequestDocument, ServiceDocument, UserDocument } from "@/types/firestore";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  GlassPanel,
  InfoRow,
} from "@/components/patient-portal";
import {
  CheckCircle, Clock, XCircle, AlertCircle, CalendarDays,
  ArrowLeft, ArrowRight, RotateCcw, ShieldCheck, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnrichedRequest = BookingRequestDocument & {
  service?: ServiceDocument | null;
  doctor?: UserDocument | null;
};

const statusConfig: Record<string, { label: string; variant: "pending" | "confirmed" | "cancelled" | "completed" | "requested"; icon: React.ReactNode; heading: string; description: string }> = {
  pending: {
    label: "Awaiting doctor",
    variant: "pending",
    icon: <Clock className="h-10 w-10 text-secondary" />,
    heading: "Request Submitted",
    description: "Your payment is confirmed. The doctor will review your request within 24–48 hours.",
  },
  accepted: {
    label: "Accepted",
    variant: "confirmed",
    icon: <CheckCircle className="h-10 w-10 text-primary" />,
    heading: "Appointment Confirmed",
    description: "The doctor has accepted your request. Your appointment is confirmed.",
  },
  rejected: {
    label: "Declined",
    variant: "cancelled",
    icon: <XCircle className="h-10 w-10 text-ring" />,
    heading: "Request Declined",
    description: "The doctor was unable to accept this request. A refund has been initiated.",
  },
  cancelled: {
    label: "Cancelled",
    variant: "completed",
    icon: <XCircle className="h-10 w-10 text-muted-foreground" />,
    heading: "Request Cancelled",
    description: "This booking request has been cancelled.",
  },
  reschedule_requested: {
    label: "Reschedule Proposed",
    variant: "requested",
    icon: <AlertCircle className="h-10 w-10 text-secondary" />,
    heading: "New Time Proposed",
    description: "The doctor has proposed a different time for your consultation.",
  },
};

export default function PatientRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<EnrichedRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const req = await bookingRequestsService.getById(id);
        if (!req) { setNotFound(true); return; }
        const [service, doctor] = await Promise.all([
          servicesService.getById(req.serviceId),
          usersService.getById(req.doctorId),
        ]);
        setRequest({ ...req, service, doctor });
      } catch (e) {
        console.error("Error loading request:", e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your request…</p>
        </div>
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-5">
        <GlassPanel padding="lg" className="max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Request Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This booking request doesn&apos;t exist or you may not have access to it.
          </p>
          <PremiumButton onClick={() => router.push("/patient/requests")}>
            View All Requests
          </PremiumButton>
        </GlassPanel>
      </div>
    );
  }

  const cfg = statusConfig[request.status] ?? statusConfig.pending;
  const isRejected = request.status === "rejected";
  const isPending = request.status === "pending";
  const isAccepted = request.status === "accepted";
  const refundStatus = isRejected && request.refundStatus && request.refundStatus !== "none"
    ? request.refundStatus
    : null;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Back nav */}
      <Link
        href="/patient/requests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        All Requests
      </Link>

      <DashboardCard disableHover>
        <div className="space-y-6">
          {/* Status icon + heading */}
          <div className="text-center space-y-3">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
              {cfg.icon}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{cfg.heading}</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                {cfg.description}
              </p>
            </div>
            <StatusBadge variant={cfg.variant} size="sm">{cfg.label}</StatusBadge>
          </div>

          {/* Booking details */}
          <div className="rounded-2xl bg-primary/3 border border-border/50 divide-y divide-border/30">
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-muted-foreground font-medium">Service</span>
              <span className="font-bold text-foreground text-right">{request.service?.title || "Consultation"}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-muted-foreground font-medium">Doctor</span>
              <span className="font-bold text-foreground text-right">
                Dr. {request.doctor?.displayName || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-muted-foreground font-medium">Requested time</span>
              <span className="font-bold text-foreground text-right">
                {new Date(request.requestedTime).toLocaleString("en-IN", {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
            {request.paymentAmount && (
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground font-medium">Amount paid</span>
                <span className="font-bold text-secondary">₹{request.paymentAmount}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-4 py-3 text-xs text-muted-foreground">
              <span>Ref #</span>
              <span className="font-mono">{request.id.slice(-8)}</span>
            </div>
          </div>

          {/* Notes */}
          {request.notes && (
            <div className="rounded-2xl bg-primary/3 border border-border/50 px-4 py-3">
              <p className="text-xs font-bold text-muted-foreground mb-1">Your notes</p>
              <p className="text-sm text-foreground italic">&ldquo;{request.notes}&rdquo;</p>
            </div>
          )}

          {/* Pending — next steps */}
          {isPending && (
            <div className="rounded-2xl bg-secondary/5 border border-secondary/20 px-4 py-4 space-y-2">
              <p className="text-xs font-bold text-foreground">What happens next</p>
              <ul className="space-y-1.5 text-xs text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-0.5">•</span>
                  Doctor reviews your request within 24–48 hours
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-0.5">•</span>
                  If accepted, your appointment is confirmed
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-0.5">•</span>
                  If declined, a full refund is automatically initiated
                </li>
              </ul>
            </div>
          )}

          {/* Payment security note for pending */}
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <ShieldCheck className="h-3.5 w-3.5 text-secondary shrink-0" />
              Payment confirmed and secured · Ref #{request.id.slice(-8)}
            </div>
          )}

          {/* Rejection reason */}
          {isRejected && request.rejectionReason && (
            <div className="rounded-2xl bg-ring/5 border border-ring/15 px-4 py-3">
              <p className="text-xs font-bold text-foreground/80 mb-1">Doctor&apos;s reason</p>
              <p className="text-sm text-foreground/70">{request.rejectionReason}</p>
            </div>
          )}

          {/* Reschedule proposal */}
          {request.status === "reschedule_requested" && request.proposedTime && (
            <div className="rounded-2xl bg-secondary/5 border border-secondary/15 px-4 py-3 flex items-start gap-3">
              <CalendarDays className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground/80 mb-1">New time proposed</p>
                <p className="text-sm text-foreground/70">
                  {new Date(request.proposedTime).toLocaleString("en-IN", {
                    weekday: "short", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Refund status */}
          {refundStatus && (
            <div className={cn(
              "rounded-2xl border px-4 py-3 flex items-start gap-3",
              refundStatus === "pending" && "bg-secondary/5 border-secondary/20 text-foreground/80",
              refundStatus === "processed" && "bg-primary/5 border-primary/20 text-foreground/80",
              refundStatus === "failed" && "bg-ring/5 border-ring/20 text-foreground/80",
            )}>
              <span className="shrink-0 mt-0.5">
                {refundStatus === "pending" && <RotateCcw className="h-4 w-4 animate-spin" />}
                {refundStatus === "processed" && <CheckCircle className="h-4 w-4" />}
                {refundStatus === "failed" && <AlertCircle className="h-4 w-4" />}
              </span>
              <p className="text-sm leading-relaxed">
                {refundStatus === "pending" && "Refund being initiated…"}
                {refundStatus === "processed" && "Refund initiated — expect 5–7 business days to reflect in your account."}
                {refundStatus === "failed" && "Refund processing is taking longer than expected. Our team has been notified and will resolve this shortly."}
              </p>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-3 pt-2">
            {isAccepted && request.appointmentId && (
              <Link href={`/patient/appointments/${request.appointmentId}`}>
                <PremiumButton fullWidth trailingIcon={<ArrowRight className="h-4 w-4" />}>
                  View Appointment
                </PremiumButton>
              </Link>
            )}
            {isRejected && (
              <Link href="/booking">
                <PremiumButton fullWidth trailingIcon={<ArrowRight className="h-4 w-4" />}>
                  Book Again
                </PremiumButton>
              </Link>
            )}
            <div className="flex gap-3">
              <PremiumButton variant="outline" fullWidth icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push("/patient/requests")}>
                All Requests
              </PremiumButton>
              <PremiumButton variant="outline" fullWidth icon={<Home className="h-4 w-4" />} onClick={() => router.push("/patient/dashboard")}>
                Dashboard
              </PremiumButton>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
