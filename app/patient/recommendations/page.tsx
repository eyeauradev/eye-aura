"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usersService, servicesService } from "@/services/firestore";
import { getFirebaseAuth } from "@/services/firebase/client";
import type { ServiceDocument, UserDocument } from "@/types/firestore";
import type { ServiceRecommendation } from "@/types/recommendations";
import { TYPOGRAPHY } from "@/lib/patient-portal/design-tokens";
import {
  Clock,
  Calendar,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowRight,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  DashboardCard,
  SectionHeader,
  StatusBadge,
  PremiumButton,
} from "@/components/patient-portal";
import { PremiumTabs } from "@/components/premium/premium-tabs";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.Razorpay !== "undefined") {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type EnrichedRecommendation = ServiceRecommendation & {
  doctorName?: string;
  serviceName?: string;
  servicePrice?: number;
  serviceCurrency?: string;
};

export default function PatientRecommendationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<EnrichedRecommendation[]>([]);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);

  const tabs = [
    { id: "pending", label: "Pending" },
    { id: "confirmed", label: "Confirmed" },
    { id: "declined", label: "Declined" },
    { id: "all", label: "All" },
  ];

  // Handle accept flow from query params
  useEffect(() => {
    const action = searchParams.get("action");
    const id = searchParams.get("id");
    if (action === "accept" && id && user && !acceptingId) {
      handleAccept(id);
    }
  }, [searchParams, user]);

  useEffect(() => {
    fetchRecommendations();
  }, [user, activeTab]);

  async function handleAccept(recId: string) {
    setAcceptingId(recId);
    setAcceptError(null);
    setAcceptSuccess(null);

    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setAcceptError("You must be logged in to accept a recommendation.");
        setAcceptingId(null);
        return;
      }
      const idToken = await currentUser.getIdToken();

      // Fetch recommendation details to get service info
      const rec = recommendations.find((r) => r.id === recId);
      let servicePrice = rec?.servicePrice;
      let serviceCurrency = rec?.serviceCurrency || "INR";
      let serviceId = rec?.serviceId;
      let doctorId = rec?.doctorId;
      let requestedTime = rec?.recommendedSlotStart;

      // If rec not loaded yet, fetch from API
      if (!serviceId) {
        const recRes = await fetch(`/api/recommendations?status=PENDING`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (recRes.ok) {
          const recData = await recRes.json();
          const found = (recData.recommendations || []).find((r: ServiceRecommendation) => r.id === recId);
          if (!found) {
            setAcceptError("Recommendation not found.");
            setAcceptingId(null);
            return;
          }
          // Check expiry
          const expiresAt = new Date(found.expiresAt);
          if (expiresAt <= new Date()) {
            setAcceptError("This recommendation has expired. Please contact your doctor for a new recommendation.");
            setAcceptingId(null);
            return;
          }
          if (found.status !== "PENDING" && found.status !== "RECOMMENDED") {
            setAcceptError("This recommendation is no longer pending.");
            setAcceptingId(null);
            return;
          }
          serviceId = found.serviceId;
          doctorId = found.doctorId;
          requestedTime = found.recommendedSlotStart;
        } else {
          setAcceptError("Failed to fetch recommendation details.");
          setAcceptingId(null);
          return;
        }
      } else {
        // Check expiry from the loaded rec
        const expiresAt = new Date(rec!.expiresAt);
        if (expiresAt <= new Date()) {
          setAcceptError("This recommendation has expired. Please contact your doctor for a new recommendation.");
          setAcceptingId(null);
          return;
        }
      }

      // Get service price
      if (!servicePrice && serviceId) {
        const service = await servicesService.getById(serviceId);
        if (service) {
          servicePrice = service.price;
          serviceCurrency = service.currency || "INR";
        }
      }

      if (!servicePrice || !serviceId || !doctorId) {
        setAcceptError("Unable to determine service details for payment.");
        setAcceptingId(null);
        return;
      }

      // Step 1: Create Razorpay order
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          doctorId,
          serviceId,
          requestedTime: typeof requestedTime === "string" ? requestedTime : requestedTime ? new Date(requestedTime).toISOString() : new Date().toISOString(),
          notes: `Recommendation acceptance: ${recId}`,
          amount: servicePrice,
          currency: serviceCurrency,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        setAcceptError(errData.error || "Failed to create payment order. Please try again.");
        setAcceptingId(null);
        return;
      }

      const orderData = await orderRes.json();

      // Step 2: Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setAcceptError("Payment gateway failed to load. Please try again.");
        setAcceptingId(null);
        return;
      }

      // Step 3: Open Razorpay checkout
      await new Promise<void>((resolve) => {
        const options: RazorpayOptions = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Eye Aura",
          description: rec?.serviceName || "Recommended Service",
          order_id: orderData.orderId,
          handler: async (response) => {
            // Step 4: On payment success, call accept endpoint
            try {
              const acceptRes = await fetch(`/api/recommendations/${recId}/accept`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  paymentId: orderData.paymentId,
                }),
              });

              if (!acceptRes.ok) {
                const errData = await acceptRes.json().catch(() => ({}));
                setAcceptError(errData.error || "Payment was processed but booking failed. Please contact support.");
                setAcceptingId(null);
                resolve();
                return;
              }

              const acceptData = await acceptRes.json();
              setAcceptSuccess("Booking confirmed! Your appointment has been scheduled.");
              setAcceptingId(null);
              // Refresh recommendations after a short delay
              setTimeout(() => {
                setAcceptSuccess(null);
                router.replace("/patient/recommendations");
                fetchRecommendations();
              }, 3000);
              resolve();
            } catch (error) {
              setAcceptError("Payment was processed but an error occurred. Please contact support.");
              setAcceptingId(null);
              resolve();
            }
          },
          prefill: {
            name: user?.displayName || "",
            email: user?.email || "",
          },
          notes: {
            recommendation_id: recId,
          },
          modal: {
            ondismiss: () => {
              setAcceptingId(null);
              // Clear query params without triggering re-accept
              router.replace("/patient/recommendations");
              resolve();
            },
          },
          theme: {
            color: "#0F4F4B",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp: any) => {
          setAcceptError(resp?.error?.description || "Payment failed. Please try again.");
          setAcceptingId(null);
          router.replace("/patient/recommendations");
          resolve();
        });
        rzp.open();
      });
    } catch (error) {
      console.error("Error in accept flow:", error);
      setAcceptError("An unexpected error occurred. Please try again.");
      setAcceptingId(null);
    }
  }

  async function fetchRecommendations() {
    if (!user) return;
    try {
      setLoading(true);
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();

      let url: string;
      if (activeTab === "all") {
        url = "/api/recommendations";
      } else if (activeTab === "pending") {
        // Pending tab shows both PENDING and RECOMMENDED (both need payment)
        url = "/api/recommendations";
      } else if (activeTab === "confirmed") {
        url = "/api/recommendations?status=ACCEPTED";
      } else {
        url = `/api/recommendations?status=${activeTab.toUpperCase()}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        let recs: ServiceRecommendation[] = data.recommendations || [];

        // Filter for pending tab: show PENDING + RECOMMENDED (both awaiting payment)
        if (activeTab === "pending") {
          recs = recs.filter((r) => r.status === "PENDING" || r.status === "RECOMMENDED");
        }

        // Enrich with doctor and service names
        const enriched = await Promise.all(
          recs.map(async (rec) => {
            const doctor = await usersService.getById(rec.doctorId);
            const service = await servicesService.getById(rec.serviceId);
            return {
              ...rec,
              doctorName: doctor?.displayName || "Doctor",
              serviceName: service?.title || "Service",
              servicePrice: service?.price,
              serviceCurrency: service?.currency || "INR",
            };
          })
        );
        setRecommendations(enriched);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline(id: string) {
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();

      const res = await fetch(`/api/recommendations/${id}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ reason: declineReason.trim() || undefined }),
      });

      if (res.ok) {
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        setDecliningId(null);
        setDeclineReason("");
      }
    } catch (error) {
      console.error("Error declining recommendation:", error);
    }
  }

  const getDaysRemaining = (expiresAt: string | Date) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusVariant = (status: string): "pending" | "confirmed" | "cancelled" | "completed" => {
    switch (status) {
      case "PENDING": return "pending";
      case "RECOMMENDED": return "pending";
      case "ACCEPTED": return "confirmed";
      case "DECLINED": return "cancelled";
      case "CANCELLED": return "cancelled";
      case "EXPIRED": return "cancelled";
      default: return "pending";
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={TYPOGRAPHY.heading}>Recommended Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Services recommended by your doctor for further evaluation
        </p>
      </div>

      {/* Accept Success Banner */}
      {acceptSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-700">{acceptSuccess}</p>
        </div>
      )}

      {/* Accept Error Banner */}
      {acceptError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">{acceptError}</p>
          </div>
          <button
            onClick={() => setAcceptError(null)}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Accepting Overlay */}
      {acceptingId && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
          <p className="text-sm font-medium text-primary">Processing payment...</p>
        </div>
      )}

      {/* Tabs */}
      <PremiumTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              activeTab={activeTab}
              decliningId={decliningId}
              declineReason={declineReason}
              onDeclineReason={setDeclineReason}
              onStartDecline={(id) => { setDecliningId(id); setDeclineReason(""); }}
              onCancelDecline={() => { setDecliningId(null); setDeclineReason(""); }}
              onConfirmDecline={handleDecline}
              onAccept={handleAccept}
              acceptingId={acceptingId}
              getDaysRemaining={getDaysRemaining}
              getStatusVariant={getStatusVariant}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, { title: string; subtitle: string }> = {
    pending: {
      title: "No pending recommendations",
      subtitle: "When your doctor recommends a service, it will appear here.",
    },
    confirmed: {
      title: "No confirmed recommendations",
      subtitle: "Accepted recommendations with confirmed bookings will appear here.",
    },
    declined: {
      title: "No declined recommendations",
      subtitle: "Recommendations you've declined will appear here.",
    },
    all: {
      title: "No recommendations yet",
      subtitle: "Your doctor hasn't recommended any services yet.",
    },
  };

  const msg = messages[tab] || messages.all;

  return (
    <DashboardCard staggerIndex={0}>
      <div className="text-center py-12">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Stethoscope className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">{msg.title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{msg.subtitle}</p>
      </div>
    </DashboardCard>
  );
}

interface RecommendationCardProps {
  rec: ServiceRecommendation & { doctorName?: string; serviceName?: string; servicePrice?: number; serviceCurrency?: string };
  activeTab: string;
  decliningId: string | null;
  declineReason: string;
  onDeclineReason: (v: string) => void;
  onStartDecline: (id: string) => void;
  onCancelDecline: () => void;
  onConfirmDecline: (id: string) => void;
  onAccept: (id: string) => void;
  acceptingId: string | null;
  getDaysRemaining: (expiresAt: string | Date) => number;
  getStatusVariant: (status: string) => "pending" | "confirmed" | "cancelled" | "completed";
}

function RecommendationCard({
  rec,
  activeTab,
  decliningId,
  declineReason,
  onDeclineReason,
  onStartDecline,
  onCancelDecline,
  onConfirmDecline,
  onAccept,
  acceptingId,
  getDaysRemaining,
  getStatusVariant,
}: RecommendationCardProps) {
  const isPending = rec.status === "PENDING" || rec.status === "RECOMMENDED";
  const isRecommended = rec.status === "RECOMMENDED";
  const daysLeft = isPending ? getDaysRemaining(rec.expiresAt) : 0;

  return (
    <DashboardCard staggerIndex={0}>
      <div className="p-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-primary text-base truncate">
              {rec.serviceName}
            </h3>
            <p className="text-sm text-muted-foreground">
              Recommended by Dr. {rec.doctorName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPending && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200">
                <Timer className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">
                  {daysLeft}d remaining
                </span>
              </div>
            )}
            <StatusBadge variant={getStatusVariant(rec.status)} size="sm">
              {rec.status === "ACCEPTED" ? "Confirmed" : rec.status === "RECOMMENDED" ? "Awaiting Payment" : rec.status.charAt(0) + rec.status.slice(1).toLowerCase()}
            </StatusBadge>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(rec.recommendedSlotStart).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
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
        </div>

        {/* Clinical note */}
        {rec.recommendationNote && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Clinical Note</p>
            <p className="text-sm text-foreground">{rec.recommendationNote}</p>
          </div>
        )}

        {/* Status-specific info */}
        {rec.status === "ACCEPTED" && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Booking confirmed — Your appointment has been scheduled
            </span>
          </div>
        )}

        {rec.status === "DECLINED" && rec.declineReason && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50 mb-3">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Decline reason: {rec.declineReason}
            </span>
          </div>
        )}

        {/* Timestamps */}
        {activeTab !== "pending" && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
            {rec.createdAt && (
              <span>Created: {new Date(rec.createdAt).toLocaleDateString()}</span>
            )}
            {rec.acceptedAt && (
              <span>Accepted: {new Date(rec.acceptedAt).toLocaleDateString()}</span>
            )}
            {rec.declinedAt && (
              <span>Declined: {new Date(rec.declinedAt).toLocaleDateString()}</span>
            )}
          </div>
        )}

        {/* Actions for PENDING */}
        {isPending && (
          <>
            {decliningId === rec.id ? (
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Are you sure you want to decline this recommendation?
                </p>
                <textarea
                  value={declineReason}
                  onChange={(e) => onDeclineReason(e.target.value)}
                  placeholder="Optional: reason for declining..."
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-background p-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex items-center gap-2">
                  <PremiumButton
                    variant="outline"
                    size="sm"
                    onClick={onCancelDecline}
                  >
                    Cancel
                  </PremiumButton>
                  <PremiumButton
                    variant="primary"
                    size="sm"
                    onClick={() => onConfirmDecline(rec.id)}
                  >
                    Confirm Decline
                  </PremiumButton>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <PremiumButton
                  variant="primary"
                  size="sm"
                  onClick={() => onAccept(rec.id)}
                  disabled={acceptingId === rec.id}
                >
                  {acceptingId === rec.id ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Pay & Book"
                  )}
                </PremiumButton>
                <PremiumButton
                  variant="outline"
                  size="sm"
                  onClick={() => onStartDecline(rec.id)}
                  disabled={!!acceptingId}
                >
                  Decline
                </PremiumButton>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}
