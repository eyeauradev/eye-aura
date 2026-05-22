"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { EA, eaError } from "@/lib/errors";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import type { BookingRequestDocument, ServiceDocument, UserDocument } from "@/types/firestore";
import { Calendar, Clock, FileText, Plus, Video, ArrowRight, Droplets, Sun, Eye as EyeIcon, Heart, User, Star, Bell, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);
  const [servicesWithDoctors, setServicesWithDoctors] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<(BookingRequestDocument & { service?: ServiceDocument; doctor?: UserDocument })[]>([]);

  // Role-based redirect
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "admin") {
        router.replace("/admin/dashboard");
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
        eaError(EA.PAT_001, error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

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

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800 border-green-200" },
    accepted: { label: "Accepted", color: "bg-green-100 text-green-800 border-green-200" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-200" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
    requested: { label: "Requested", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    reschedule_requested: { label: "Reschedule Requested", color: "bg-orange-100 text-orange-800 border-orange-200" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200" },
  };

  const getRequestStatusIcon = (status: string) => {
    switch (status) {
      case "requested":
        return <Clock className="h-5 w-5" />;
      case "accepted":
      case "confirmed":
        return <CheckCircle2 className="h-5 w-5" />;
      case "rejected":
        return <XCircle className="h-5 w-5" />;
      case "reschedule_requested":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-800">
              Complete your profile for a better experience.
            </p>
          </div>
          <Link href="/patient/profile" className="shrink-0">
            <Button variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-100 text-xs h-8 px-2">
              Complete
            </Button>
          </Link>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">
          {getGreeting()}, {user?.displayName?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm sm:text-sm sm:text-xl text-muted-foreground">
          Welcome to your dashboard
        </p>
      </div>

      
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Booking Requests */}
              {bookingRequests.length > 0 && (
                <Card className="border-primary/10">
                  <CardHeader className="flex items-center justify-between p-3 sm:p-6">
                    <div className="flex items-center gap-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Bell className="h-5 w-5 text-[#b5964d]" />
                        Pending Requests
                      </CardTitle>
                      <Badge className="bg-[#b5964d]/10 text-[#b5964d] border-[#b5964d]/20 text-xs">
                        {bookingRequests.length}
                      </Badge>
                    </div>
                    <Link href="/patient/appointments">
                      <Button variant="ghost" className="flex items-center gap-1 text-xs h-8 px-2">
                        View All
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="space-y-2">
                      {bookingRequests.slice(0, 3).map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f2ec] border border-primary/8"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#0f4f4b] text-sm truncate">{request.service?.title || "Consultation"}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(request.requestedTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                          <Badge className={`shrink-0 text-[10px] px-2 py-0.5 ${statusConfig[request.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800"}`}>
                            {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Appointments */}
              <Card className="border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Upcoming Appointments</CardTitle>
                  <Link href="/patient/appointments">
                    <Button variant="ghost" className="flex items-center gap-1 text-xs h-8 px-2">
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-primary/10 transition hover:bg-white hover:shadow-md"
                        >
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/35 text-primary">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <h3 className="font-bold text-primary truncate">{appointment.service?.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  with {appointment.doctor?.displayName || "Doctor"}
                                </p>
                              </div>
                              <Badge className={statusConfig[appointment.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                                {statusConfig[appointment.status as keyof typeof statusConfig]?.label || appointment.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
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
                        </div>
                      ))}
                    </div>
                  ) : bookingRequests.length > 0 ? (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardContent className="p-4 sm:p-8 text-center">
                        <Bell className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                        <p className="text-base text-muted-foreground mb-4">
                          You have {bookingRequests.length} booking request{bookingRequests.length > 1 ? 's' : ''} pending approval
                        </p>
                        <Link href="/patient/appointments?filter=requests">
                          <Button>View Requests</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-primary/10 bg-primary/5">
                      <CardContent className="p-4 sm:p-8 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-base text-muted-foreground mb-4">
                          You don't have any upcoming appointments
                        </p>
                        <Link href="/booking">
                          <Button>Book a Consultation</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Available Services */}
              <Card className="border-primary/10">
                <CardHeader className="flex items-center justify-between p-3 sm:p-6">
                  <CardTitle className="text-base">Available Services</CardTitle>
                  <Link href="/booking">
                    <Button variant="ghost" className="flex items-center gap-1 text-xs h-8 px-2">
                      Book Now
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {servicesWithDoctors.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {servicesWithDoctors.slice(0, 4).map((service) => (
                        <Link key={service.id} href="/booking">
                          <Card className="border-primary/10 hover:border-secondary/30 transition hover:-translate-y-1 hover:shadow-lg cursor-pointer h-full">
                            <CardContent className="p-5">
                              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent/35 text-primary">
                                <FileText className="h-6 w-6" />
                              </div>
                              <h3 className="font-bold text-primary mb-2">{service.title}</h3>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-display text-lg text-secondary">
                                  {service.currency} {service.price}
                                </span>
                                <Badge className="bg-secondary/10 text-secondary">{service.duration} min</Badge>
                              </div>
                              {service.doctors && service.doctors.length > 0 && (
                                <div className="pt-3 border-t border-primary/10">
                                  <p className="text-xs font-bold text-muted-foreground mb-2">Available with:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {service.doctors.slice(0, 3).map((doctor: any) => (
                                      <div key={doctor.id} className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-2 py-1 rounded-full">
                                        <User className="h-3 w-3" />
                                        <span className="truncate max-w-[100px]">{doctor.displayName || "Doctor"}</span>
                                      </div>
                                    ))}
                                    {service.doctors.length > 3 && (
                                      <span className="text-xs text-muted-foreground">+{service.doctors.length - 3} more</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-primary/10 bg-primary/5">
                      <CardContent className="p-4 sm:p-8 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-base text-muted-foreground mb-4">
                          No services available at the moment
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Wellness Tips */}
              <Card className="border-primary/10 bg-primary/5">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle>Eye Wellness Tips</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {wellnessTips.map((tip, index) => {
                      const Icon = tip.icon;
                      return (
                        <div key={index} className="flex items-start gap-3 p-4 rounded-2xl bg-white/50">
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
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="border-primary/10">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/booking" className="block">
                    <Button variant="outline" size="lg" className="w-full justify-start">
                      <Plus className="h-5 w-5 mr-3" />
                      Request Consultation
                    </Button>
                  </Link>
                  {bookingRequests.length > 0 && (
                    <Link href="/patient/requests" className="block">
                      <Button variant="outline" size="lg" className="w-full justify-start">
                        <Bell className="h-5 w-5 mr-3" />
                        My Requests
                      </Button>
                    </Link>
                  )}
                  <Link href="/patient/appointments" className="block">
                    <Button variant="outline" size="lg" className="w-full justify-start">
                      <Calendar className="h-5 w-5 mr-3" />
                      My Appointments
                    </Button>
                  </Link>
                  <Link href="/patient/prescriptions" className="block">
                    <Button variant="outline" size="lg" className="w-full justify-start">
                      <FileText className="h-5 w-5 mr-3" />
                      Prescriptions
                    </Button>
                  </Link>
                  <Link href="/patient/profile" className="block">
                    <Button variant="outline" size="lg" className="w-full justify-start">
                      <User className="h-5 w-5 mr-3" />
                      My Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Prescriptions */}
              <Card className="border-primary/10">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Recent Prescriptions</CardTitle>
                  <Link href="/patient/prescriptions">
                    <Button variant="ghost">View All</Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {recentPrescriptions.length > 0 ? (
                    <div className="space-y-3">
                      {recentPrescriptions.map((prescription) => (
                        <div
                          key={prescription.id}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-primary/10"
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
                </CardContent>
              </Card>

              {/* Support */}
              <Card className="border-primary/10 bg-primary/5">
                <CardContent className="p-3 sm:p-6">
                  <p className="text-sm font-bold text-muted-foreground mb-3">Need Help?</p>
                  <Link href="/patient/support">
                    <Button variant="outline" size="lg" className="w-full">
                      Contact Support
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      
    </div>
  );
}
