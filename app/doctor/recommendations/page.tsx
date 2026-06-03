"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseAuth } from "@/services/firebase/client";
import { servicesService, usersService } from "@/services/firestore";
import type { ServiceDocument, UserDocument } from "@/types/firestore";
import type { ServiceRecommendation } from "@/types/recommendations";
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  Stethoscope,
  Filter,
} from "lucide-react";
import {
  GlassPanel,
  PremiumButton,
  SectionHeader,
  DashboardCard,
} from "@/components/premium";
import { StatusBadge, type StatusVariant } from "@/components/premium/status-badge";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY, SPACING } from "@/lib/design-tokens";
import Link from "next/link";

type StatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED" | "RECOMMENDED";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Recommended", value: "RECOMMENDED" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Declined", value: "DECLINED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Expired", value: "EXPIRED" },
];

function getStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "PENDING":
      return "pending";
    case "RECOMMENDED":
      return "active";
    case "ACCEPTED":
      return "completed";
    case "DECLINED":
      return "cancelled";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired" as StatusVariant;
    default:
      return "pending";
  }
}

export default function DoctorRecommendationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([]);
  const [services, setServices] = useState<Map<string, ServiceDocument>>(new Map());
  const [patients, setPatients] = useState<Map<string, UserDocument>>(new Map());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadRecommendations() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const res = await fetch("/api/recommendations?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Failed to load recommendations");
        return;
      }

      const data = await res.json();
      const recs: ServiceRecommendation[] = data.recommendations || [];
      setRecommendations(recs);

      // Fetch service details for all unique service IDs
      const serviceIds = [...new Set(recs.map((r) => r.serviceId))];
      const serviceMap = new Map<string, ServiceDocument>();
      for (const sid of serviceIds) {
        try {
          const svc = await servicesService.getById(sid);
          if (svc) serviceMap.set(sid, svc);
        } catch {
          // skip
        }
      }
      setServices(serviceMap);

      // Fetch patient details for all unique patient IDs
      const patientIds = [...new Set(recs.map((r) => r.patientId))];
      const patientMap = new Map<string, UserDocument>();
      for (const pid of patientIds) {
        try {
          const patient = await usersService.getById(pid);
          if (patient) patientMap.set(pid, patient);
        } catch {
          // skip
        }
      }
      setPatients(patientMap);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const filteredRecommendations =
    statusFilter === "ALL"
      ? recommendations
      : recommendations.filter((r) => r.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassPanel padding="lg" className="max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Something went wrong</p>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <PremiumButton onClick={loadRecommendations} icon={<Loader2 className="h-4 w-4" />}>
            Retry
          </PremiumButton>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${SPACING.pageY}`}>
      <SectionHeader
        title="Service Recommendations"
        subtitle={`${recommendations.length} total recommendations`}
      />

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <PremiumButton
            key={opt.value}
            variant={statusFilter === opt.value ? "primary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== "ALL" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({recommendations.filter((r) =>
                  r.status === opt.value
                ).length})
              </span>
            )}
          </PremiumButton>
        ))}
      </div>

      {/* Recommendations List */}
      {filteredRecommendations.length === 0 ? (
        <GlassPanel padding="lg" className="text-center">
          <Stethoscope className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm">
            {statusFilter === "ALL"
              ? "No recommendations yet"
              : `No ${statusFilter.toLowerCase()} recommendations`}
          </p>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRecommendations.map((rec) => {
            const service = services.get(rec.serviceId);
            const patient = patients.get(rec.patientId);
            const slotDate = new Date(rec.recommendedSlotStart).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const slotTime = new Date(rec.recommendedSlotStart).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isSameSlot = (rec as any).sameAppointmentSlot;

            return (
              <DashboardCard key={rec.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`${TYPOGRAPHY.subheading} text-sm truncate`}>
                        {service?.title || "Unknown Service"}
                      </h3>
                      <StatusBadge variant={getStatusVariant(rec.status)} size="sm">
                        {rec.status === "RECOMMENDED" ? "During Appt" : rec.status.toLowerCase()}
                      </StatusBadge>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      Patient:{" "}
                      <Link
                        href={`/doctor/patients/${rec.patientId}`}
                        className="text-primary hover:underline"
                      >
                        {patient?.displayName || "Unknown"}
                      </Link>
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {slotDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {slotTime}
                      </span>
                      {isSameSlot && (
                        <Badge className="text-xs py-0 px-1.5 border">
                          Same appointment
                        </Badge>
                      )}
                    </div>

                    {rec.recommendationNote && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        &ldquo;{rec.recommendationNote}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Right: Meta */}
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    <p>
                      Created{" "}
                      {new Date(rec.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {rec.acceptedAt && (
                      <p className="text-green-600 flex items-center gap-1 justify-end mt-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Accepted
                      </p>
                    )}
                    {rec.declinedAt && (
                      <p className="text-red-600 flex items-center gap-1 justify-end mt-1">
                        <XCircle className="h-3 w-3" />
                        Declined
                      </p>
                    )}
                    {rec.status === "EXPIRED" && (
                      <p className="text-amber-600 flex items-center gap-1 justify-end mt-1">
                        <Timer className="h-3 w-3" />
                        Expired
                      </p>
                    )}
                  </div>
                </div>
              </DashboardCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
