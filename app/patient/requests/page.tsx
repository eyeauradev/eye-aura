"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { EA, eaError } from "@/lib/errors";
import { servicesService, usersService } from "@/services/firestore";
import type { BookingRequestDocument, BookingRequestStatus, ServiceDocument, UserDocument } from "@/types/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const statusConfig: Record<string, { label: string; color: string; description: string }> = {
  pending: {
    label: "Awaiting doctor",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Awaiting doctor confirmation.",
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Your appointment is confirmed.",
  },
  rejected: {
    label: "Declined",
    color: "bg-red-100 text-red-800 border-red-200",
    description: "Consultation request declined.",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    description: "This request was cancelled.",
  },
  reschedule_requested: {
    label: "Reschedule Proposed",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Doctor has proposed a new time.",
  },
};

const refundMessages: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Refund being initiated…",
    color: "bg-yellow-50 text-yellow-800 border-yellow-200",
    icon: <RotateCcw className="h-3.5 w-3.5 animate-spin" />,
  },
  processed: {
    label: "Refund initiated — expect 5–7 business days",
    color: "bg-green-50 text-green-800 border-green-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    label: "Refund processing is taking longer than expected. Our team has been notified.",
    color: "bg-red-50 text-red-800 border-red-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

export default function PatientRequestsPage() {
  const { user } = useAuth();
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
      eaError(EA.BKG_001, e);
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
          <h1 className="font-display text-2xl sm:text-3xl text-primary">Booking Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the status of your consultation requests and refunds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadRequests}>
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Link href="/booking">
            <Button>
              New Booking
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
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

      {/* Cards */}
      {filtered.length === 0 ? (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-10 text-center">
            <Bell className="h-10 w-10 text-primary/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No requests here yet.</p>
            <Link href="/booking">
              <Button className="mt-4">Book a Consultation</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((request) => {
            const cfg = statusConfig[request.status] ?? statusConfig.pending;
            const isRejected = request.status === "rejected";
            const refundCfg = isRejected && request.refundStatus && request.refundStatus !== "none"
              ? refundMessages[request.refundStatus]
              : null;

            return (
              <Card
                key={request.id}
                className={cn(
                  "border transition-all",
                  request.status === "pending" && "border-amber-200 bg-amber-50/50",
                  request.status === "accepted" && "border-green-200 bg-green-50/30",
                  request.status === "rejected" && "border-red-100 bg-red-50/20",
                  request.status !== "pending" && request.status !== "accepted" && request.status !== "rejected" && "border-primary/10 bg-white/60"
                )}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-bold text-primary text-base">
                          {request.service?.title || "Consultation"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          with Dr. {request.doctor?.displayName || "Doctor"}
                        </p>
                      </div>
                      <Badge className={cn("flex items-center gap-1 text-xs shrink-0", cfg.color)}>
                        {cfg.label}
                      </Badge>
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
                      <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                        <p className="text-xs font-bold text-red-700 mb-0.5">Doctor's reason</p>
                        <p className="text-sm text-red-700">{request.rejectionReason}</p>
                      </div>
                    )}

                    {/* Reschedule proposal */}
                    {request.status === "reschedule_requested" && request.proposedTime && (
                      <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-orange-800 mb-0.5">New time proposed</p>
                          <p className="text-sm text-orange-700">
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
                    {refundCfg && (
                      <div className={cn(
                        "rounded-xl border px-3 py-2 flex items-start gap-2",
                        refundCfg.color
                      )}>
                        <span className="shrink-0 mt-0.5">{refundCfg.icon}</span>
                        <p className="text-xs leading-relaxed">{refundCfg.label}</p>
                      </div>
                    )}

                    {/* Payment amount */}
                    {request.paymentAmount && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-primary/5">
                        <span className="font-bold text-secondary">₹{request.paymentAmount}</span>
                        <span>·</span>
                        <span>Ref #{request.id.slice(-6)}</span>
                      </div>
                    )}

                    {/* CTA for accepted */}
                    {request.status === "accepted" && request.appointmentId && (
                      <Link href={`/patient/appointments/${request.appointmentId}`}>
                        <Button className="w-full mt-1" variant="outline">
                          View Appointment
                          <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </Link>
                    )}

                    {/* CTA for rejected — book again */}
                    {isRejected && (
                      <Link href="/booking">
                        <Button className="w-full mt-1" variant="outline">
                          Book Again
                          <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
