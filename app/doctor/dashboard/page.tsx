"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Users, Calendar, Bell, CheckCircle, Video, FileText, Clock, AlertCircle, Loader2, XCircle, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService } from "@/services/firestore";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { usersService } from "@/services/firestore";
import type { AppointmentDocument, BookingRequestDocument } from "@/types/firestore";
import { RecentPatientCard, type RecentPatientData } from "@/components/doctor/recent-patient-card";
import { RecommendServiceDialog } from "@/components/doctor/recommend-service-dialog";
import { AssignAssessmentDialog } from "@/components/doctor/assign-assessment-dialog";
import {
  MetricCard,
  DashboardCard,
  GlassPanel,
  PremiumButton,
  SectionHeader,
  StatusBadge,
} from "@/components/premium";
import { SPACING } from "@/lib/design-tokens";
import { staggerContainer, cardEntrance } from "@/lib/motion-variants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getFirebaseAuth } from "@/services/firebase/client";
import { getDisplayError, logError, formatDisplayError, ERROR_CODES } from "@/lib/errors";
import { trackDoctorRequestAction } from "@/services/analytics/analytics.service";

export default function DoctorDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<(AppointmentDocument & { patient?: any })[]>([]);
  const [recentPatients, setRecentPatients] = useState<RecentPatientData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(BookingRequestDocument & { patient?: any })[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    pendingRequests: 0,
    completedConsultations: 0,
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Dialog state for Recent Patient quick actions
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showRecommendDialog, setShowRecommendDialog] = useState(false);
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);

  // Whether to show the account-disabled dialog
  const isDisabled = !authLoading && !!user && (!user.isActive || user.isSuspended);

  // Role-based redirect — use stable primitives as deps to avoid re-firing on every user object refresh
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }
    if (user.role === "patient") {
      router.replace("/patient/dashboard");
      return;
    }
    // Disabled/suspended doctors stay on this page — AccountDisabledDialog is shown below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, authLoading]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const allAppointments = await appointmentsService.getByDoctorId(user.id);

      // Filter today's appointments
      const todayAppts = allAppointments.filter((apt) => {
        const aptDate = new Date(apt.scheduledFor);
        return aptDate >= today && aptDate < tomorrow;
      });

      // Get pending booking requests
      const requests = await bookingRequestsService.getByDoctorIdAndStatus(user.id, "pending");

      // Enrich requests with patient data
      const requestsWithPatient = await Promise.all(
        requests.map(async (request) => {
          const patient = await usersService.getById(request.patientId);
          return { ...request, patient };
        })
      );

      // Enrich today's appointments with patient data
      const todayApptsWithPatient = await Promise.all(
        todayAppts.map(async (apt) => {
          const patient = await usersService.getById(apt.patientId);
          return { ...apt, patient };
        })
      );

      // Calculate stats
      const completedAll = allAppointments.filter((apt) => apt.status === "completed").length;

      // Get unique patient IDs from all appointments
      const uniquePatientIds = new Set(allAppointments.map((apt) => apt.patientId));

      // Build recent patients list (last 5 unique patients)
      const patientMap = new Map<string, RecentPatientData>();
      const sortedAppointments = [...allAppointments].sort(
        (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
      );

      for (const apt of sortedAppointments) {
        if (patientMap.size >= 5) break;
        if (!patientMap.has(apt.patientId)) {
          const patient = await usersService.getById(apt.patientId);
          const statusMap: Record<string, "active" | "completed" | "pending"> = {
            confirmed: "active",
            completed: "completed",
            pending: "pending",
            cancelled: "completed",
          };
          patientMap.set(apt.patientId, {
            patientId: apt.patientId,
            name: patient?.displayName || "Patient",
            age: null,
            gender: null,
            lastAppointmentDate: new Date(apt.scheduledFor).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            lastAssessmentDate: null,
            upcomingAppointment: null,
            status: statusMap[apt.status] || "pending",
          });
        }
      }

      setTodayAppointments(todayApptsWithPatient);
      setPendingRequests(requestsWithPatient);
      setRecentPatients(Array.from(patientMap.values()));
      setStats({
        totalPatients: uniquePatientIds.size,
        appointmentsToday: todayAppts.length,
        pendingRequests: requests.length,
        completedConsultations: completedAll,
      });
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const canJoinConsultation = (appointment: AppointmentDocument) => {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledFor);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    return timeDiff < 15 * 60 * 1000 && timeDiff > -60 * 60 * 1000;
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await bookingRequestsService.acceptRequest(requestId);
      trackDoctorRequestAction({ action: "accepted", request_id: requestId });
      const requests = await bookingRequestsService.getByDoctorIdAndStatus(user!.id, "pending");
      const requestsWithPatient = await Promise.all(
        requests.map(async (request) => {
          const patient = await usersService.getById(request.patientId);
          return { ...request, patient };
        })
      );
      setPendingRequests(requestsWithPatient);
      setStats((prev) => ({ ...prev, pendingRequests: requests.length }));
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const openRejectDialog = (requestId: string) => {
    setRejectReason("");
    setRejectError(null);
    setRejectDialog({ open: true, requestId });
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("Please provide a reason for rejecting this request.");
      return;
    }
    setRejectLoading(true);
    setRejectError(null);
    try {
      const auth = getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingRequestId: rejectDialog.requestId,
          reason: rejectReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reject request");
      }

      trackDoctorRequestAction({
        action: "rejected",
        request_id: rejectDialog.requestId,
        reject_reason: rejectReason.trim(),
      });
      setRejectDialog({ open: false, requestId: "" });
      const requests = await bookingRequestsService.getByDoctorIdAndStatus(user!.id, "pending");
      const requestsWithPatient = await Promise.all(
        requests.map(async (request) => {
          const patient = await usersService.getById(request.patientId);
          return { ...request, patient };
        })
      );
      setPendingRequests(requestsWithPatient);
      setStats((prev) => ({ ...prev, pendingRequests: requests.length }));
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.DOCTOR.OPERATION_FAILED);
      logError(appError.code, err, "DoctorDashboard");
      setRejectError(formatDisplayError(appError));
    } finally {
      setRejectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
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
          <PremiumButton onClick={loadDashboardData} icon={<Loader2 className="h-4 w-4" />}>
            Retry
          </PremiumButton>
        </GlassPanel>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-0 ${SPACING.pageY}`}>
        {/* Onboarding banner */}
        {user && !user.onboardingCompleted && (
          <GlassPanel padding="sm" className="mb-6 flex items-center gap-4">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              Complete your profile for a better consultation experience.
            </p>
            <PremiumButton asChild variant="outline" size="sm">
              <Link href="/doctor/profile">Complete Profile</Link>
            </PremiumButton>
          </GlassPanel>
        )}

        {/* Key Metrics Section */}
        <SectionHeader title="Overview" subtitle="Your practice at a glance" />
        <motion.div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${SPACING.cardGap}`}
          variants={shouldReduceMotion ? undefined : staggerContainer}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
        >
          <MetricCard
            icon={<Users className="h-6 w-6" />}
            value={stats.totalPatients}
            label="Total Patients"
            staggerIndex={0}
          />
          <MetricCard
            icon={<Calendar className="h-6 w-6" />}
            value={stats.appointmentsToday}
            label="Appointments Today"
            staggerIndex={1}
          />
          <MetricCard
            icon={<Bell className="h-6 w-6" />}
            value={stats.pendingRequests}
            label="Pending Requests"
            staggerIndex={2}
          />
          <MetricCard
            icon={<CheckCircle className="h-6 w-6" />}
            value={stats.completedConsultations}
            label="Completed Consultations"
            staggerIndex={3}
          />
        </motion.div>

        {/* Appointment Overview Section */}
        <SectionHeader
          title="Today's Appointments"
          subtitle={`${todayAppointments.length} scheduled for today`}
          action={
            <PremiumButton asChild variant="outline" size="sm">
              <Link href="/doctor/appointments">View All</Link>
            </PremiumButton>
          }
        />
        {todayAppointments.length > 0 ? (
          <motion.div
            className={`grid grid-cols-1 md:grid-cols-2 ${SPACING.cardGap}`}
            variants={shouldReduceMotion ? undefined : staggerContainer}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
          >
            {todayAppointments.slice(0, 4).map((appointment, index) => {
              const canJoin = canJoinConsultation(appointment);
              return (
                <DashboardCard key={appointment.id} staggerIndex={index}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {appointment.patient?.displayName || "Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appointment.scheduledFor).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      variant={appointment.status as any}
                      size="sm"
                    >
                      {appointment.status}
                    </StatusBadge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {canJoin && appointment.consultationLink && (
                      <PremiumButton asChild size="sm" icon={<Video className="h-3.5 w-3.5" />}>
                        <a
                          href={appointment.consultationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Join
                        </a>
                      </PremiumButton>
                    )}
                    {appointment.status === "completed" && !appointment.prescriptionId && (
                      <PremiumButton asChild variant="outline" size="sm" icon={<FileText className="h-3.5 w-3.5" />}>
                        <Link href={`/doctor/prescriptions/create/${appointment.id}`}>
                          Prescription
                        </Link>
                      </PremiumButton>
                    )}
                    <PremiumButton asChild variant="ghost" size="sm">
                      <Link href={`/doctor/appointments/${appointment.id}`}>View</Link>
                    </PremiumButton>
                  </div>
                </DashboardCard>
              );
            })}
          </motion.div>
        ) : (
          <GlassPanel padding="lg" className="text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">No consultations scheduled for today</p>
          </GlassPanel>
        )}

        {/* Recent Patients Section */}
        <SectionHeader
          title="Recent Patients"
          subtitle="Your 5 most recent patients"
          action={
            <PremiumButton asChild variant="outline" size="sm">
              <Link href="/doctor/patients">View All</Link>
            </PremiumButton>
          }
        />
        {recentPatients.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            variants={shouldReduceMotion ? undefined : staggerContainer}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
          >
            {recentPatients.map((patient) => (
              <RecentPatientCard
                key={patient.patientId}
                patient={patient}
                doctorId={user!.id}
              />
            ))}
          </motion.div>
        ) : (
          <GlassPanel padding="md" className="text-center">
            <p className="text-muted-foreground text-sm">No patient records yet</p>
          </GlassPanel>
        )}

        {/* Action Center */}
        <SectionHeader title="Action Center" subtitle="Quick actions for your practice" />
        <GlassPanel padding="lg">
          <div className="flex flex-wrap gap-3">
            <PremiumButton asChild icon={<Calendar className="h-4 w-4" />}>
              <Link href="/doctor/appointments">New Appointment</Link>
            </PremiumButton>
            <PremiumButton asChild variant="outline" icon={<Bell className="h-4 w-4" />}>
              <Link href="/doctor/requests">View Requests</Link>
            </PremiumButton>
            <PremiumButton asChild variant="outline" icon={<Clock className="h-4 w-4" />}>
              <Link href="/doctor/slots">Manage Slots</Link>
            </PremiumButton>
          </div>
        </GlassPanel>

        {/* Pending Booking Requests */}
        {pendingRequests.length > 0 && (
          <>
            <SectionHeader
              title="Pending Booking Requests"
              subtitle={`${pendingRequests.length} awaiting your response`}
              action={
                <PremiumButton asChild variant="outline" size="sm">
                  <Link href="/doctor/requests">View All</Link>
                </PremiumButton>
              }
            />
            <motion.div
              className={`grid grid-cols-1 ${SPACING.cardGap}`}
              variants={shouldReduceMotion ? undefined : staggerContainer}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
            >
              {pendingRequests.slice(0, 3).map((request, index) => (
                <DashboardCard key={request.id} staggerIndex={index}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                        <Bell className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {request.patient?.displayName || "Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.requestedTime).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <StatusBadge variant="requested" size="sm">
                        Pending
                      </StatusBadge>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-muted-foreground italic pl-1">
                        &ldquo;{request.notes}&rdquo;
                      </p>
                    )}
                    <div className="flex gap-2">
                      <PremiumButton
                        onClick={() => handleAcceptRequest(request.id)}
                        size="sm"
                        icon={<CheckCircle className="h-4 w-4" />}
                        className="flex-1"
                      >
                        Accept
                      </PremiumButton>
                      <PremiumButton
                        variant="outline"
                        onClick={() => openRejectDialog(request.id)}
                        size="sm"
                        className="flex-1"
                      >
                        Reject
                      </PremiumButton>
                    </div>
                  </div>
                </DashboardCard>
              ))}
            </motion.div>
          </>
        )}
      </div>

      {/* Recommend Service and Assign Assessment Dialogs */}
      {selectedPatientId && (
        <>
          <RecommendServiceDialog
            open={showRecommendDialog}
            onClose={() => {
              setShowRecommendDialog(false);
              setSelectedPatientId(null);
            }}
            patientId={selectedPatientId}
            doctorId={user!.id}
          />
          <AssignAssessmentDialog
            open={showAssessmentDialog}
            onClose={() => {
              setShowAssessmentDialog(false);
              setSelectedPatientId(null);
            }}
            patientId={selectedPatientId}
            doctorId={user!.id}
          />
        </>
      )}

      {/* Account Disabled Dialog */}
      <Dialog open={isDisabled} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md mx-4"
          // Prevent closing by clicking outside or pressing Escape
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Account Disabled
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Your doctor account has been disabled. Please contact the admin to have it re-enabled before you can access the dashboard.
            </p>
          </div>
          <DialogFooter>
            <PremiumButton
              variant="outline"
              onClick={async () => { await signOut(); router.replace("/auth/login"); }}
            >
              Sign Out
            </PremiumButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) =>
          !rejectLoading && setRejectDialog({ open, requestId: open ? rejectDialog.requestId : "" })
        }
      >
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
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
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError(null);
              }}
              rows={3}
              className="resize-none rounded-2xl"
              disabled={rejectLoading}
            />
            {rejectError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl px-3 py-2">
                {rejectError}
              </p>
            )}
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
              Decline &amp; Refund
            </PremiumButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
