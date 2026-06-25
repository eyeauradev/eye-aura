"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import {
  usersService,
  appointmentsService,
  supportTicketsService,
  prescriptionsService,
} from "@/services/firestore";
import type {
  UserDocument,
  AppointmentDocument,
  PrescriptionDocument,
  SupportTicketDocument,
} from "@/types/firestore";
import {
  Users,
  Stethoscope,
  Calendar,
  DollarSign,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

import {
  MetricCard,
  DashboardCard,
  GlassPanel,
  PremiumButton,
  SectionHeader,
} from "@/components/premium";
import { SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { staggerContainer, cardEntrance } from "@/lib/motion-variants";

interface ActivityItem {
  id: string;
  type: "appointment" | "prescription" | "ticket";
  timestamp: Date;
  actorName: string;
  description: string;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDoctors: 0,
    appointmentsToday: 0,
    revenue: 0,
  });
  const [metricErrors, setMetricErrors] = useState({
    totalUsers: false,
    activeDoctors: false,
    appointmentsToday: false,
    revenue: false,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [platformHealth, setPlatformHealth] = useState({
    pendingAppointments: 0,
    completedAppointments: 0,
    totalAppointments: 0,
    openTickets: 0,
  });

  // Role-based redirect
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "patient") {
        router.replace("/patient/dashboard");
        return;
      }
      if (user.role === "doctor") {
        router.replace("/doctor/dashboard");
        return;
      }
      if (!user.isActive || user.isSuspended) {
        router.replace("/auth/login");
        return;
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const [allUsers, allAppointments, allTickets, allPrescriptions] =
          await Promise.all([
            usersService.getAll(),
            appointmentsService.getAll(),
            supportTicketsService.getAll(),
            prescriptionsService.getAll(),
          ]);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const doctors = allUsers.filter(
          (u: UserDocument) => u.role === "doctor"
        );
        const appointmentsToday = allAppointments.filter(
          (a: AppointmentDocument) => {
            const d = new Date(a.scheduledFor);
            return d >= today && d < tomorrow;
          }
        );
        const pendingApts = allAppointments.filter(
          (a: AppointmentDocument) => a.status === "pending"
        );
        const completed = allAppointments.filter(
          (a: AppointmentDocument) => a.status === "completed"
        );
        const openTickets = allTickets.filter(
          (t: SupportTicketDocument) =>
            t.status === "open" || t.status === "in_progress"
        );

        setStats({
          totalUsers: allUsers.length,
          activeDoctors: doctors.length,
          appointmentsToday: appointmentsToday.length,
          revenue: 0,
        });

        setPlatformHealth({
          pendingAppointments: pendingApts.length,
          completedAppointments: completed.length,
          totalAppointments: allAppointments.length,
          openTickets: openTickets.length,
        });

        // Build recent activity feed (max 20 items)
        const recentAppointments = allAppointments
          .filter((apt: AppointmentDocument) => apt.scheduledFor)
          .slice(-10)
          .reverse()
          .map((apt: AppointmentDocument) => ({
            id: apt.id,
            type: "appointment" as const,
            timestamp: new Date(apt.scheduledFor),
            actorName: apt.patientId,
            description: `Appointment scheduled`,
          }));

        const recentPrescriptions = allPrescriptions
          .filter((rx: PrescriptionDocument) => rx.createdAt)
          .slice(-5)
          .reverse()
          .map((rx: PrescriptionDocument) => ({
            id: rx.id,
            type: "prescription" as const,
            timestamp: new Date(rx.createdAt),
            actorName: rx.patientId,
            description: `Prescription created`,
          }));

        const recentTickets = allTickets
          .filter((ticket: SupportTicketDocument) => ticket.createdAt)
          .slice(-5)
          .reverse()
          .map((ticket: SupportTicketDocument) => ({
            id: ticket.id,
            type: "ticket" as const,
            timestamp: new Date(ticket.createdAt),
            actorName: ticket.userId || "User",
            description: ticket.subject,
          }));

        const activity = [
          ...recentAppointments,
          ...recentPrescriptions,
          ...recentTickets,
        ]
          .filter((item) => item.timestamp && !isNaN(item.timestamp.getTime()))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 20);

        setRecentActivity(activity);
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Failed to load dashboard data.");
        setMetricErrors({
          totalUsers: true,
          activeDoctors: true,
          appointmentsToday: true,
          revenue: true,
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${SPACING.pageX} ${SPACING.pageY}`}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className={TYPOGRAPHY.heading}>Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform overview and operations
        </p>
      </div>

      {/* Operational Metrics */}
      <SectionHeader title="Operational Metrics" subtitle="Key platform statistics" />
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
      >
        <MetricCard
          icon={<Users className="h-6 w-6" />}
          value={metricErrors.totalUsers ? "—" : stats.totalUsers}
          label={metricErrors.totalUsers ? "Data unavailable" : "Total Users"}
          staggerIndex={0}
        />
        <MetricCard
          icon={<Stethoscope className="h-6 w-6" />}
          value={metricErrors.activeDoctors ? "—" : stats.activeDoctors}
          label={metricErrors.activeDoctors ? "Data unavailable" : "Active Doctors"}
          staggerIndex={1}
        />
        <MetricCard
          icon={<Calendar className="h-6 w-6" />}
          value={metricErrors.appointmentsToday ? "—" : stats.appointmentsToday}
          label={
            metricErrors.appointmentsToday
              ? "Data unavailable"
              : "Appointments Today"
          }
          staggerIndex={2}
        />
        <MetricCard
          icon={<DollarSign className="h-6 w-6" />}
          value={metricErrors.revenue ? "—" : `₹${stats.revenue.toLocaleString("en-IN")}`}
          label={metricErrors.revenue ? "Data unavailable" : "Revenue"}
          staggerIndex={3}
        />
      </motion.div>

      {/* Analytics Section */}
      <SectionHeader title="Platform Analytics" subtitle="Performance overview" />
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
      >
        <DashboardCard staggerIndex={0}>
          <div className="p-6 min-h-[200px] flex flex-col">
            <h4 className={TYPOGRAPHY.subheading}>Appointment Overview</h4>
            <div className="mt-4 flex-1 flex items-center justify-center rounded-3xl bg-muted/30 p-6">
              <div className="text-center space-y-2">
                <p className={TYPOGRAPHY.body}>
                  {platformHealth.completedAppointments} completed of{" "}
                  {platformHealth.totalAppointments} total
                </p>
                <p className={TYPOGRAPHY.label}>
                  {platformHealth.totalAppointments > 0
                    ? Math.round(
                        (platformHealth.completedAppointments /
                          platformHealth.totalAppointments) *
                          100
                      )
                    : 0}
                  % completion rate
                </p>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard staggerIndex={1}>
          <div className="p-6 min-h-[200px] flex flex-col">
            <h4 className={TYPOGRAPHY.subheading}>Support Tickets</h4>
            <div className="mt-4 flex-1 flex items-center justify-center rounded-3xl bg-muted/30 p-6">
              <div className="text-center space-y-2">
                <p className={TYPOGRAPHY.body}>
                  {platformHealth.openTickets} open tickets
                </p>
                <p className={TYPOGRAPHY.label}>
                  {platformHealth.pendingAppointments} pending appointments
                </p>
              </div>
            </div>
          </div>
        </DashboardCard>
      </motion.div>

      {/* Recent Activity Feed */}
      <SectionHeader
        title="Recent Activity"
        subtitle="Latest platform events"
        action={
          <Link href="/admin/appointments">
            <PremiumButton variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
              View All
            </PremiumButton>
          </Link>
        }
      />
      <GlassPanel padding="md">
        <div className="space-y-0">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id + index}
                className="flex items-center gap-4 py-3 border-b border-border/50 last:border-b-0"
                variants={shouldReduceMotion ? undefined : cardEntrance}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
                custom={index}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {activity.type === "appointment" && (
                    <Calendar className="h-4 w-4 text-primary" />
                  )}
                  {activity.type === "prescription" && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                  {activity.type === "ticket" && (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={TYPOGRAPHY.body + " truncate"}>
                    {activity.description}
                  </p>
                  <p className={TYPOGRAPHY.label}>
                    {activity.actorName}
                  </p>
                </div>
                <span className={TYPOGRAPHY.label + " shrink-0"}>
                  {activity.timestamp.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </motion.div>
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" />
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
      >
        <DashboardCard staggerIndex={0}>
          <Link href="/admin/doctors/invite" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className={TYPOGRAPHY.subheading + " text-sm"}>Invite Doctor</p>
              <p className={TYPOGRAPHY.label}>Add new physician</p>
            </div>
          </Link>
        </DashboardCard>

        <DashboardCard staggerIndex={1}>
          <Link href="/admin/services/create" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className={TYPOGRAPHY.subheading + " text-sm"}>Create Service</p>
              <p className={TYPOGRAPHY.label}>New service type</p>
            </div>
          </Link>
        </DashboardCard>

        <DashboardCard staggerIndex={2}>
          <Link href="/admin/appointments" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className={TYPOGRAPHY.subheading + " text-sm"}>Appointments</p>
              <p className={TYPOGRAPHY.label}>Manage bookings</p>
            </div>
          </Link>
        </DashboardCard>

        <DashboardCard staggerIndex={3}>
          <Link href="/admin/support" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className={TYPOGRAPHY.subheading + " text-sm"}>Support</p>
              <p className={TYPOGRAPHY.label}>Review tickets</p>
            </div>
          </Link>
        </DashboardCard>
      </motion.div>

      {/* Error retry */}
      {error && (
        <div className="mt-8 text-center">
          <GlassPanel padding="lg">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className={TYPOGRAPHY.body + " mb-4"}>{error}</p>
            <PremiumButton
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </PremiumButton>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
