"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import type { BookingRequestDocument, ServiceDocument, UserDocument } from "@/types/firestore";
import type { ServiceRecommendation } from "@/types/recommendations";
import { TYPOGRAPHY, SPACING } from "@/lib/patient-portal/design-tokens";
import { getFirebaseAuth } from "@/services/firebase/client";
import {
  Calendar,
  Clock,
  FileText,
  Plus,
  ArrowRight,
  Droplets,
  Sun,
  Eye as EyeIcon,
  Heart,
  User,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Timer,
} from "lucide-react";
import { trackRecommendationAction, trackCtaClick } from "@/services/analytics/analytics.service";
import {
  DashboardCard,
  SectionHeader,
  InfoRow,
  StatusBadge,
  QuickActionsPanel,
  PremiumButton,
} from "@/components/patient-portal";

export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);
  const [servicesWithDoctors, setServicesWithDoctors] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<(BookingRequestDocument & { service?: ServiceDocument; doctor?: UserDocument })[]>([]);
  const [recommendations, setRecommendations] = useState<(ServiceRecommendation & { doctorName?: string; serviceName?: string })[]>([]);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  // Role-based redirect — use stable primitives as deps to avoid re-firing on every user object refresh
  useEffect(() => {
    if (authLoading || !user) return;
    // Check inactive/suspended first — a disabled doctor should go to login, not bounce to /doctor/dashboard
    if (!user.isActive || user.isSuspended) {
      router.replace("/auth/login");
      return;
    }
    if (user.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }
    if (user.role === "doctor") {
      router.replace("/doctor/dashboard");
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.isActive, user?.isSuspended, authLoading]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;

      try {
        setLoading(true);

        // Load upcoming appointments
        const allAppointments = await appointmentsService.getByPatientId(user.id, 10);
        const now = new Date();
        const upcoming = allAppointments
          .filter((apt) => apt.status !== "cancelled" && new Date(apt.scheduledFor) > now)
          .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
          .slice(0, 3);

        // Enrich with service and doctor data
        const enrichedAppointments = await Promise.all(
          upcoming.map(async (apt) => {
            const service = await servicesService.getById(apt.serviceId);
            const doctor = await usersService.getById(apt.doctorId);
            return { ...apt, service, doctor };
          })
        );

        setUpcomingAppointments(enrichedAppointments);

        // Load recent prescriptions
        const { prescriptionsService } = await import("@/services/firestore");
        const prescriptionData = await prescriptionsService.getByPatientId(user.id, 3);
        const enrichedPrescriptions = await Promise.all(
          prescriptionData.map(async (p) => {
            const doctor = await usersService.getById(p.doctorId);
            return { ...p, doctor };
          })
        );
        setRecentPrescriptions(enrichedPrescriptions);

        // Load booking requests — only non-accepted ones (accepted become confirmed appointments)
        const requests = await bookingRequestsService.getByPatientId(user.id);
        const activeRequests = requests.filter(r => r.status !== "accepted" && r.status !== "rejected");
        const enrichedRequests = await Promise.all(
          activeRequests.slice(0, 5).map(async (req) => {
            const service = await servicesService.getById(req.serviceId);
            const doctor = await usersService.getById(req.doctorId);
            return { ...req, service: service ?? undefined, doctor: doctor ?? undefined };
          })
        );
        setBookingRequests(enrichedRequests);

        // Load pending recommendations
        try {
          const auth = getFirebaseAuth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            const idToken = await currentUser.getIdToken();
            const recResponse = await fetch("/api/recommendations?status=PENDING", {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (recResponse.ok) {
              const recData = await recResponse.json();
              const recs: ServiceRecommendation[] = recData.recommendations || [];
              // Enrich with doctor names and service names
              const enrichedRecs = await Promise.all(
                recs.map(async (rec) => {
                  const doctor = await usersService.getById(rec.doctorId);
                  const service = await servicesService.getById(rec.serviceId);
                  return {
                    ...rec,
                    doctorName: doctor?.displayName || "Doctor",
                    serviceName: service?.title || "Service",
                  };
                })
              );
              setRecommendations(enrichedRecs);
            }
          }
        } catch (recError) {
          console.error("Error loading recommendations:", recError);
        }

        // Load available services with doctors
        const allServices = await servicesService.getAll();
        const activeServices = allServices.filter((s) => s.isActive !== false);
        const servicesWithDoctorsData = await Promise.all(
          activeServices.map(async (service) => {
            const doctorIds = service.doctorIds || [];
            const doctors = await Promise.all(
              doctorIds.map((doctorId) => usersService.getById(doctorId))
            );
            return { ...service, doctors: doctors.filter((d) => d !== null) };
          })
        );
        setServicesWithDoctors(servicesWithDoctorsData);
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.USER.LOAD_FAILED);
        logError(appError.code, error, "PatientDashboard");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const handleDeclineRecommendation = async (id: string) => {
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
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const rec = recommendations.find((r) => r.id === id);
        trackRecommendationAction({
          action: "declined",
          recommendation_id: id,
          service_name: rec?.serviceName,
        });
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        setDecliningId(null);
      }
    } catch (err) {
      console.error("Error declining recommendation:", err);
    }
  };

  const getDaysRemaining = (expiresAt: string | Date) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const wellnessTips = [
    {
      icon: Droplets,
      title: "Stay Hydrated",
      description: "Drink water regularly to keep your eyes moist and comfortable.",
    },
    {
      icon: Sun,
      title: "Take Screen Breaks",
      description: "Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
    },
    {
      icon: EyeIcon,
      title: "Adjust Brightness",
      description: "Match your screen brightness to your surroundings to reduce eye strain.",
    },
    {
      icon: Heart,
      title: "Blink Often",
      description: "Remember to blink frequently to keep your eyes lubricated.",
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const mapStatusToVariant = (status: string) => {
    const mapping: Record<string, "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "requested" | "active" | "inactive"> = {
      pending: "pending",
      confirmed: "confirmed",
      accepted: "confirmed",
      in_progress: "in_progress",
      completed: "completed",
      cancelled: "cancelled",
      requested: "requested",
      reschedule_requested: "pending",
      rejected: "cancelled",
    };
    return mapping[status] || "pending";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Confirmed",
      accepted: "Accepted",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      requested: "Requested",
      reschedule_requested: "Reschedule",
      rejected: "Rejected",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Optional onboarding banner */}
      {user && !user.onboardingCompleted && (
        <DashboardCard disableHover staggerIndex={0} className="flex items-center gap-3 p-3">
          <AlertCircle className="h-5 w-5 text-secondary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              Complete your profile for a better experience.
            </p>
          </div>
          <Link href="/patient/profile" className="shrink-0">
            <PremiumButton variant="outline" size="sm">
              Complete
            </PremiumButton>
          </Link>
        </DashboardCard>
      )}

      {/* Greeting */}
      <div>
        <h1 className={TYPOGRAPHY.heading}>
          {getGreeting()}, {user?.displayName?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome to your dashboard
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Requests */}
          {bookingRequests.length > 0 && (
            <DashboardCard staggerIndex={1}>
              <SectionHeader
                title="Pending Requests"
                className="mt-0 mb-4"
                action={
                  <Link href="/patient/appointments">
                    <PremiumButton variant="ghost" size="sm" trailingIcon={<ArrowRight className="h-3 w-3" />}>
                      View All
                    </PremiumButton>
                  </Link>
                }
              />
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-secondary" />
                <StatusBadge variant="pending" size="sm">
                  {bookingRequests.length} pending
                </StatusBadge>
              </div>
              <div className="space-y-2">
                {bookingRequests.slice(0, 3).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {request.service?.title || "Consultation"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(request.requestedTime).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <StatusBadge variant={mapStatusToVariant(request.status)} size="sm">
                      {getStatusLabel(request.status)}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </DashboardCard>
          )}

          {/* Upcoming Appointments */}
          <DashboardCard staggerIndex={2}>
            <SectionHeader
              title="Upcoming Appointments"
              className="mt-0 mb-4"
              action={
                <Link href="/patient/appointments">
                  <PremiumButton variant="ghost" size="sm" trailingIcon={<ArrowRight className="h-3 w-3" />}>
                    View All
                  </PremiumButton>
                </Link>
              }
            />
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-card/50 border border-border/30 transition hover:bg-card/70 hover:shadow-md"
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-primary truncate">
                            {appointment.service?.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            with {appointment.doctor?.displayName || "Doctor"}
                          </p>
                        </div>
                        <StatusBadge variant={mapStatusToVariant(appointment.status)} size="sm">
                          {getStatusLabel(appointment.status)}
                        </StatusBadge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {appointment.scheduledFor.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {" at "}
                          {appointment.scheduledFor.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : bookingRequests.length > 0 ? (
              <div className="text-center py-8 rounded-2xl bg-secondary/5 border border-secondary/15">
                <Bell className="h-12 w-12 text-secondary mx-auto mb-4" />
                <p className="text-base text-muted-foreground mb-4">
                  You have {bookingRequests.length} booking request{bookingRequests.length > 1 ? "s" : ""} pending approval
                </p>
                <Link href="/patient/appointments?filter=requests">
                  <PremiumButton variant="primary">View Requests</PremiumButton>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <p className="text-base text-muted-foreground mb-4">
                  You don&apos;t have any upcoming appointments
                </p>
                <Link href="/booking">
                  <PremiumButton variant="primary">Book a Consultation</PremiumButton>
                </Link>
              </div>
            )}
          </DashboardCard>

          {/* Recommended Services */}
          {recommendations.length > 0 && (
            <DashboardCard staggerIndex={3}>
              <SectionHeader
                title="Recommended Services"
                className="mt-0 mb-4"
                action={
                  <Link href="/patient/recommendations">
                    <PremiumButton variant="ghost" size="sm" trailingIcon={<ArrowRight className="h-3 w-3" />}>
                      View All
                    </PremiumButton>
                  </Link>
                }
              />
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="h-5 w-5 text-secondary" />
                <p className="text-sm text-muted-foreground">Recommended by your doctor</p>
              </div>
              <div className="space-y-4">
                {recommendations.slice(0, 3).map((rec) => {
                  const daysLeft = getDaysRemaining(rec.expiresAt);
                  return (
                    <div
                      key={rec.id}
                      className="p-4 rounded-2xl bg-card/50 border border-border/30 transition hover:bg-card/70 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-primary truncate">
                            {rec.serviceName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Recommended by Dr. {rec.doctorName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Timer className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-600">
                            {daysLeft}d left
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(rec.recommendedSlotStart).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {" at "}
                          {new Date(rec.recommendedSlotStart).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {rec.recommendationNote && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 italic">
                          &ldquo;{rec.recommendationNote}&rdquo;
                        </p>
                      )}
                      {decliningId === rec.id ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                          <p className="text-sm text-foreground flex-1">Decline this recommendation?</p>
                          <PremiumButton
                            variant="outline"
                            size="sm"
                            onClick={() => setDecliningId(null)}
                          >
                            Cancel
                          </PremiumButton>
                          <PremiumButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleDeclineRecommendation(rec.id)}
                          >
                            Confirm
                          </PremiumButton>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/patient/recommendations?action=accept&id=${rec.id}`}
                            onClick={() => trackRecommendationAction({ action: "accepted", recommendation_id: rec.id, service_name: rec.serviceName })}
                          >
                            <PremiumButton variant="primary" size="sm">
                              Pay & Book
                            </PremiumButton>
                          </Link>
                          <PremiumButton
                            variant="outline"
                            size="sm"
                            onClick={() => setDecliningId(rec.id)}
                          >
                            Decline
                          </PremiumButton>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </DashboardCard>
          )}

          {/* Available Services */}
          <DashboardCard staggerIndex={3}>
            <SectionHeader
              title="Available Services"
              className="mt-0 mb-4"
              action={
                <Link href="/booking">
                  <PremiumButton variant="ghost" size="sm" trailingIcon={<ArrowRight className="h-3 w-3" />}>
                    Book Now
                  </PremiumButton>
                </Link>
              }
            />
            {servicesWithDoctors.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {servicesWithDoctors.slice(0, 4).map((service) => (
                  <Link key={service.id} href="/booking">
                    <div className="p-5 rounded-2xl border border-border/40 bg-card/50 hover:border-secondary/30 transition hover:-translate-y-1 hover:shadow-lg cursor-pointer h-full">
                      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent/35 text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-primary mb-2">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {service.description}
                      </p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-lg text-secondary">
                          {service.currency === "INR" ? "₹" : service.currency}{service.price.toLocaleString("en-IN")}
                        </span>
                        <StatusBadge variant="active" size="sm">
                          {service.duration} min
                        </StatusBadge>
                      </div>
                      {service.doctors && service.doctors.length > 0 && (
                        <div className="pt-3 border-t border-border/30">
                          <p className="text-xs font-bold text-muted-foreground mb-2">Available with:</p>
                          <div className="flex flex-wrap gap-2">
                            {service.doctors.slice(0, 3).map((doctor: any) => (
                              <div
                                key={doctor.id}
                                className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-2 py-1 rounded-full"
                              >
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{doctor.displayName || "Doctor"}</span>
                              </div>
                            ))}
                            {service.doctors.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{service.doctors.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 rounded-2xl bg-primary/5">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-base text-muted-foreground">
                  No services available at the moment
                </p>
              </div>
            )}
          </DashboardCard>

          {/* Wellness Tips */}
          <DashboardCard staggerIndex={4} className="bg-primary/3">
            <SectionHeader title="Eye Wellness Tips" className="mt-0 mb-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              {wellnessTips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-2xl bg-card/50">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/35 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-sm mb-1">{tip.title}</h4>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActionsPanel />

          {/* Recent Prescriptions */}
          <DashboardCard staggerIndex={5}>
            <SectionHeader
              title="Recent Prescriptions"
              className="mt-0 mb-4"
              action={
                <Link href="/patient/prescriptions">
                  <PremiumButton variant="ghost" size="sm">
                    View All
                  </PremiumButton>
                </Link>
              }
            />
            {recentPrescriptions.length > 0 ? (
              <div className="space-y-3">
                {recentPrescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card/50 border border-border/30"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/35 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary truncate">
                        {prescription.title || "Prescription"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(prescription.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No prescriptions yet
                </p>
              </div>
            )}
          </DashboardCard>

          {/* Support */}
          <DashboardCard staggerIndex={6} className="bg-primary/3">
            <p className="text-sm font-bold text-muted-foreground mb-3">Need Help?</p>
            <Link href="/patient/support">
              <PremiumButton variant="outline" size="lg" fullWidth>
                Contact Support
              </PremiumButton>
            </Link>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
