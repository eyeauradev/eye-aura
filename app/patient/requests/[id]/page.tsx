"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { servicesService, usersService } from "@/services/firestore";
import type { BookingRequestDocument, ServiceDocument, UserDocument } from "@/types/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, Clock, XCircle, AlertCircle, CalendarDays,
  ArrowLeft, ArrowRight, RotateCcw, ShieldCheck, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnrichedRequest = BookingRequestDocument & {
  service?: ServiceDocument | null;
  doctor?: UserDocument | null;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; heading: string; description: string }> = {
  pending: {
    label: "Awaiting doctor",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <Clock className="h-10 w-10 text-amber-500" />,
    heading: "Request Submitted",
    description: "Your payment is confirmed. The doctor will review your request within 24–48 hours.",
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle className="h-10 w-10 text-green-500" />,
    heading: "Appointment Confirmed",
    description: "The doctor has accepted your request. Your appointment is confirmed.",
  },
  rejected: {
    label: "Declined",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <XCircle className="h-10 w-10 text-red-400" />,
    heading: "Request Declined",
    description: "The doctor was unable to accept this request. A refund has been initiated.",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <XCircle className="h-10 w-10 text-gray-400" />,
    heading: "Request Cancelled",
    description: "This booking request has been cancelled.",
  },
  reschedule_requested: {
    label: "Reschedule Proposed",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <AlertCircle className="h-10 w-10 text-orange-500" />,
    heading: "New Time Proposed",
    description: "The doctor has proposed a different time for your consultation.",
  },
};

const refundMessages: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Refund being initiated…",
    color: "bg-yellow-50 text-yellow-800 border-yellow-200",
    icon: <RotateCcw className="h-4 w-4 animate-spin shrink-0" />,
  },
  processed: {
    label: "Refund initiated — expect 5–7 business days to reflect in your account.",
    color: "bg-green-50 text-green-800 border-green-200",
    icon: <CheckCircle className="h-4 w-4 shrink-0" />,
  },
  failed: {
    label: "Refund processing is taking longer than expected. Our team has been notified and will resolve this shortly.",
    color: "bg-red-50 text-red-800 border-red-200",
    icon: <AlertCircle className="h-4 w-4 shrink-0" />,
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
      <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your request…</p>
        </div>
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF] flex items-center justify-center px-5">
        <Card className="border-primary/10 bg-white/80 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-display text-xl text-primary mb-2">Request Not Found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This booking request doesn't exist or you may not have access to it.
            </p>
            <Button onClick={() => router.push("/patient/requests")}>
              View All Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cfg = statusConfig[request.status] ?? statusConfig.pending;
  const isRejected = request.status === "rejected";
  const isPending = request.status === "pending";
  const isAccepted = request.status === "accepted";
  const refundCfg = isRejected && request.refundStatus && request.refundStatus !== "none"
    ? refundMessages[request.refundStatus]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      <div className="mx-auto max-w-xl px-5 py-10 sm:py-16">

        {/* Back nav */}
        <Link
          href="/patient/requests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All Requests
        </Link>

        <Card className="border-primary/10 bg-white/80">
          <CardContent className="p-6 sm:p-8 space-y-6">

            {/* Status icon + heading */}
            <div className="text-center space-y-3">
              <div className="mx-auto h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
                {cfg.icon}
              </div>
              <div>
                <h1 className="font-display text-2xl text-primary">{cfg.heading}</h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                  {cfg.description}
                </p>
              </div>
              <Badge className={cn("text-xs", cfg.color)}>{cfg.label}</Badge>
            </div>

            {/* Booking details */}
            <div className="rounded-2xl bg-primary/5 border border-primary/10 divide-y divide-primary/5">
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground font-medium">Service</span>
                <span className="font-bold text-primary text-right">{request.service?.title || "Consultation"}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground font-medium">Doctor</span>
                <span className="font-bold text-primary text-right">
                  Dr. {request.doctor?.displayName || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground font-medium">Requested time</span>
                <span className="font-bold text-primary text-right">
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
              <div className="rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
                <p className="text-xs font-bold text-muted-foreground mb-1">Your notes</p>
                <p className="text-sm text-primary italic">"{request.notes}"</p>
              </div>
            )}

            {/* Pending — next steps */}
            {isPending && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-4 space-y-2">
                <p className="text-xs font-bold text-amber-900">What happens next</p>
                <ul className="space-y-1.5 text-xs text-amber-800">
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
              <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-xs font-bold text-red-700 mb-1">Doctor's reason</p>
                <p className="text-sm text-red-700">{request.rejectionReason}</p>
              </div>
            )}

            {/* Reschedule proposal */}
            {request.status === "reschedule_requested" && request.proposedTime && (
              <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 flex items-start gap-3">
                <CalendarDays className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-orange-800 mb-1">New time proposed</p>
                  <p className="text-sm text-orange-700">
                    {new Date(request.proposedTime).toLocaleString("en-IN", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Refund status */}
            {refundCfg && (
              <div className={cn("rounded-2xl border px-4 py-3 flex items-start gap-3", refundCfg.color)}>
                {refundCfg.icon}
                <p className="text-sm leading-relaxed">{refundCfg.label}</p>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
              {isAccepted && request.appointmentId && (
                <Link href={`/patient/appointments/${request.appointmentId}`}>
                  <Button className="w-full">
                    View Appointment
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              )}
              {isRejected && (
                <Link href="/booking">
                  <Button className="w-full">
                    Book Again
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => router.push("/patient/requests")}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  All Requests
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push("/patient/dashboard")}>
                  <Home className="h-4 w-4 mr-1.5" />
                  Dashboard
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
