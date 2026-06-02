"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService, servicesService } from "@/services/firestore";
import { getFirebaseAuth } from "@/services/firebase/client";
import type { RecommendationMetrics, ServiceRecommendation } from "@/types/recommendations";
import {
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Ban,
  Timer,
  TrendingUp,
  Search,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MetricCard,
  DashboardCard,
  GlassPanel,
  PremiumButton,
  SectionHeader,
} from "@/components/premium";
import { StatusBadge } from "@/components/premium/status-badge";
import { SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { staggerContainer } from "@/lib/motion-variants";

interface EnrichedRecommendation extends ServiceRecommendation {
  patientName?: string;
  doctorName?: string;
  serviceName?: string;
}

export default function AdminRecommendationsPage() {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RecommendationMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<EnrichedRecommendation[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side filtered recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((rec) => rec.status === statusFilter.toUpperCase());
    }

    // Apply text search filter (by patient or doctor name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (rec) =>
          (rec.patientName?.toLowerCase().includes(query)) ||
          (rec.doctorName?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [recommendations, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [user]);

  async function getToken() {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }

  async function loadData() {
    try {
      setLoading(true);
      const idToken = await getToken();
      if (!idToken) return;

      // Fetch metrics and recommendations in parallel
      const [metricsRes, recsRes] = await Promise.all([
        fetch("/api/recommendations/metrics", {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        fetch("/api/recommendations", {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (recsRes.ok) {
        const recsData = await recsRes.json();
        const recs: ServiceRecommendation[] = recsData.recommendations || [];

        // Enrich with names
        const enriched = await Promise.all(
          recs.slice(0, 50).map(async (rec) => {
            const [patient, doctor, service] = await Promise.all([
              usersService.getById(rec.patientId),
              usersService.getById(rec.doctorId),
              servicesService.getById(rec.serviceId),
            ]);
            return {
              ...rec,
              patientName: patient?.displayName || "Patient",
              doctorName: doctor?.displayName || "Doctor",
              serviceName: service?.title || "Service",
            };
          })
        );
        setRecommendations(enriched);
      }
    } catch (error) {
      console.error("Error loading recommendations data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      const idToken = await getToken();
      if (!idToken) return;

      const res = await fetch(`/api/recommendations/${id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        setCancellingId(null);
        // Refresh data
        await loadData();
      }
    } catch (error) {
      console.error("Error cancelling recommendation:", error);
    }
  }

  const getStatusVariant = (status: string): "pending" | "confirmed" | "cancelled" | "completed" => {
    switch (status) {
      case "PENDING": return "pending";
      case "ACCEPTED": return "confirmed";
      case "DECLINED": return "cancelled";
      case "CANCELLED": return "cancelled";
      case "EXPIRED": return "cancelled";
      default: return "pending";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${SPACING.pageX} ${SPACING.pageY}`}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className={TYPOGRAPHY.heading}>Recommended Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview and management of doctor-recommended services
        </p>
      </div>

      {/* Metrics Grid */}
      <SectionHeader title="Metrics" subtitle="Recommendation performance overview" />
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
      >
        <MetricCard
          icon={<BarChart3 className="h-6 w-6" />}
          value={metrics?.total ?? 0}
          label="Total Recommendations"
          staggerIndex={0}
        />
        <MetricCard
          icon={<Clock className="h-6 w-6" />}
          value={metrics?.pending ?? 0}
          label="Pending"
          staggerIndex={1}
        />
        <MetricCard
          icon={<CheckCircle className="h-6 w-6" />}
          value={metrics?.accepted ?? 0}
          label="Accepted"
          staggerIndex={2}
        />
        <MetricCard
          icon={<XCircle className="h-6 w-6" />}
          value={metrics?.declined ?? 0}
          label="Declined"
          staggerIndex={3}
        />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
      >
        <MetricCard
          icon={<Ban className="h-6 w-6" />}
          value={metrics?.cancelled ?? 0}
          label="Cancelled"
          staggerIndex={4}
        />
        <MetricCard
          icon={<Timer className="h-6 w-6" />}
          value={metrics?.expired ?? 0}
          label="Expired"
          staggerIndex={5}
        />
        <MetricCard
          icon={<TrendingUp className="h-6 w-6" />}
          value={`${metrics?.conversionRate ?? 0}%`}
          label="Conversion Rate"
          staggerIndex={6}
        />
      </motion.div>

      {/* Recommendations Table */}
      <SectionHeader title="All Recommendations" subtitle="Recent recommendations across all doctors" />

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[150px]"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>

        {/* Search Input */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient or doctor name..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Search recommendations"
          />
        </div>

        {/* Results count */}
        <span className="text-xs text-muted-foreground shrink-0">
          {filteredRecommendations.length} of {recommendations.length} shown
        </span>
      </div>

      <GlassPanel padding="md">
        {filteredRecommendations.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No recommendations found</p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-[1.5fr_1.5fr_1.5fr_1fr_0.8fr_0.8fr] gap-4 px-4 py-3 border-b border-border/50 text-xs uppercase tracking-wider font-medium text-muted-foreground">
              <span>Patient</span>
              <span>Doctor</span>
              <span>Service</span>
              <span>Date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {/* Table Rows */}
            {filteredRecommendations.map((rec, index) => (
              <div
                key={rec.id}
                className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1.5fr_1fr_0.8fr_0.8fr] gap-2 md:gap-4 px-4 py-3 border-b border-border/50 last:border-b-0 items-center hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="md:hidden text-xs text-muted-foreground font-medium">Patient:</span>
                  <span className={`${TYPOGRAPHY.body} text-sm truncate`}>{rec.patientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="md:hidden text-xs text-muted-foreground font-medium">Doctor:</span>
                  <span className={`${TYPOGRAPHY.body} text-sm truncate`}>{rec.doctorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="md:hidden text-xs text-muted-foreground font-medium">Service:</span>
                  <span className={`${TYPOGRAPHY.body} text-sm truncate`}>{rec.serviceName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="md:hidden text-xs text-muted-foreground font-medium">Date:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(rec.recommendedSlotStart).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="md:hidden text-xs text-muted-foreground font-medium">Status:</span>
                  <StatusBadge variant={getStatusVariant(rec.status)} size="sm">
                    {rec.status.charAt(0) + rec.status.slice(1).toLowerCase()}
                  </StatusBadge>
                </div>
                <div>
                  {rec.status === "PENDING" && (
                    <>
                      {cancellingId === rec.id ? (
                        <div className="flex items-center gap-1">
                          <PremiumButton
                            variant="outline"
                            size="sm"
                            onClick={() => setCancellingId(null)}
                          >
                            No
                          </PremiumButton>
                          <PremiumButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleCancel(rec.id)}
                          >
                            Yes
                          </PremiumButton>
                        </div>
                      ) : (
                        <PremiumButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancellingId(rec.id)}
                        >
                          Cancel
                        </PremiumButton>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
