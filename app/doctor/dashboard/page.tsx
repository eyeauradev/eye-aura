"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService } from "@/services/firestore";
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";
import { usersService } from "@/services/firestore";
import type { AppointmentDocument, BookingRequestDocument } from "@/types/firestore";
import { Calendar, Clock, Users, FileText, Settings, ArrowRight, Video, CheckCircle2, Bell, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";

export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<(AppointmentDocument & { patient?: any })[]>([]);
  const [followUpAppointments, setFollowUpAppointments] = useState<(AppointmentDocument & { patient?: any })[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(BookingRequestDocument & { patient?: any })[]>([]);
  const [stats, setStats] = useState({
    totalUpcoming: 0,
    completedToday: 0,
    pendingPrescriptions: 0,
    pendingRequests: 0,
  });

  // Role-based redirect
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }
      if (user.role === "patient") {
        router.replace("/patient/dashboard");
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

        // Get today's appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const allAppointments = await appointmentsService.getByDoctorId(user.id);
        
        // Filter today's appointments
        const todayAppts = allAppointments.filter(apt => {
          const aptDate = new Date(apt.scheduledFor);
          return aptDate >= today && aptDate < tomorrow;
        });

        // Filter follow-up appointments
        const followUpAppts = allAppointments.filter(apt => apt.followUpRequired);

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

        // Enrich follow-up appointments with patient data
        const followUpApptsWithPatient = await Promise.all(
          followUpAppts.map(async (apt) => {
            const patient = await usersService.getById(apt.patientId);
            return { ...apt, patient };
          })
        );

        // Calculate stats
        const upcoming = allAppointments.filter(apt => 
          apt.status === "pending" || apt.status === "confirmed"
        ).length;

        const completed = todayAppts.filter(apt => 
          apt.status === "completed"
        ).length;

        // Count pending prescriptions (appointments without prescriptions)
        const pendingPrescriptions = todayAppts.filter(apt => 
          apt.status === "completed" && !apt.prescriptionId
        ).length;

        setTodayAppointments(todayApptsWithPatient);
        setFollowUpAppointments(followUpApptsWithPatient);
        setPendingRequests(requestsWithPatient);
        setStats({
          totalUpcoming: upcoming,
          completedToday: completed,
          pendingPrescriptions,
          pendingRequests: requests.length,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const canJoinConsultation = (appointment: AppointmentDocument) => {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledFor);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    // Allow joining 15 minutes before
    return timeDiff < 15 * 60 * 1000 && timeDiff > -60 * 60 * 1000;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await bookingRequestsService.acceptRequest(requestId);
      // Reload requests
      const requests = await bookingRequestsService.getByDoctorIdAndStatus(user!.id, "pending");
      const requestsWithPatient = await Promise.all(
        requests.map(async (request) => {
          const patient = await usersService.getById(request.patientId);
          return { ...request, patient };
        })
      );
      setPendingRequests(requestsWithPatient);
      setStats(prev => ({ ...prev, pendingRequests: requests.length }));
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt("Please provide a reason for rejecting this request:");
    if (!reason) return;

    try {
      await bookingRequestsService.rejectRequest(requestId, reason);
      // Reload requests
      const requests = await bookingRequestsService.getByDoctorIdAndStatus(user!.id, "pending");
      const requestsWithPatient = await Promise.all(
        requests.map(async (request) => {
          const patient = await usersService.getById(request.patientId);
          return { ...request, patient };
        })
      );
      setPendingRequests(requestsWithPatient);
      setStats(prev => ({ ...prev, pendingRequests: requests.length }));
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Optional onboarding banner */}
      {user && !user.onboardingCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-blue-800">
              Complete your profile for a better consultation experience.
            </p>
          </div>
          <Link href="/doctor/profile">
            <Button variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-100">
              Complete Profile
            </Button>
          </Link>
        </div>
      )}

      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">
          {getGreeting()}, {user?.displayName || "Doctor"}
        </h1>
        <p className="text-sm sm:text-sm sm:text-xl text-muted-foreground">{formatDate()}</p>
        <p className="text-base text-muted-foreground mt-2">
          Ready to provide exceptional eye care today.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="text-3xl font-bold text-primary">{stats.totalUpcoming}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="text-3xl font-bold text-primary">{stats.completedToday}</div>
          </CardContent>
        </Card>
        <Card className={`border-primary/10 bg-white/50 ${stats.pendingRequests > 0 ? "ring-2 ring-amber-400" : ""}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="text-3xl font-bold text-primary">{stats.pendingRequests}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="text-3xl font-bold text-primary">{stats.pendingPrescriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Booking Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl text-primary">Pending Booking Requests</h2>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                {pendingRequests.length} new
              </Badge>
            </div>
            <Link href="/doctor/requests">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {pendingRequests.slice(0, 3).map((request) => (
              <Card key={request.id} className="border-amber-200 bg-amber-50">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Bell className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-primary truncate">{request.patient?.displayName || "Patient"}</p>
                        <p className="text-xs text-muted-foreground truncate">{request.patient?.email || ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.requestedTime).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-muted-foreground italic px-1">
                        "{request.notes}"
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 h-9 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                        className="flex-1 h-9 text-sm"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Today's Consultations */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-primary">Today's Consultations</h2>
          <Link href="/doctor/appointments">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        {todayAppointments.length > 0 ? (
          <div className="grid gap-4">
            {todayAppointments.map((appointment) => {
              const canJoin = canJoinConsultation(appointment);
              return (
                <Card key={appointment.id} className="border-primary/10">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-primary truncate">{appointment.patient?.displayName || "Patient"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(appointment.scheduledFor).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(appointment.status)} shrink-0 text-[10px]`}>
                          {appointment.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canJoin && appointment.consultationLink && (
                          <Button asChild className="flex-1 min-w-[80px] h-9 text-sm">
                            <a
                              href={appointment.consultationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <Video className="h-3.5 w-3.5" />
                              Join
                            </a>
                          </Button>
                        )}
                        {appointment.status === "completed" && !appointment.prescriptionId && (
                          <Button asChild variant="outline" className="flex-1 min-w-[100px] h-9 text-sm">
                            <Link href={`/doctor/prescriptions/create/${appointment.id}`}>
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Prescription
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="ghost" className="flex-1 min-w-[80px] h-9 text-sm">
                          <Link href={`/doctor/appointments/${appointment.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div>
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4 sm:p-8 text-center">
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
                <p className="text-base text-muted-foreground">No consultations scheduled for today</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Follow-Up Appointments */}
      {followUpAppointments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-primary">Follow-Up Required</h2>
            <Badge className="bg-secondary text-white">{followUpAppointments.length}</Badge>
          </div>

          <div className="grid gap-4">
            {followUpAppointments.slice(0, 3).map((appointment) => (
              <Card key={appointment.id} className="border-secondary/20 bg-secondary/5">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-medium text-primary">{appointment.patient?.displayName || "Patient"}</p>
                        {appointment.followUpDate && (
                          <p className="text-sm text-muted-foreground">
                            Follow-up: {new Date(appointment.followUpDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={`/doctor/appointments/${appointment.id}`}>
                      <Button variant="outline" size="default">
                        View
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="font-display text-2xl text-primary mb-6">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/doctor/slots">
            <Card className="border-primary/10 hover:border-primary/30 transition cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Calendar</p>
                    <p className="text-sm text-muted-foreground">View your schedule</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/doctor/schedule">
            <Card className="border-primary/10 hover:border-primary/30 transition cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Edit Schedule</p>
                    <p className="text-sm text-muted-foreground">Configure weekly availability</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {pendingRequests.length > 0 && (
            <Link href="/doctor/requests">
              <Card className="border-amber-200 bg-amber-50 hover:border-amber-300 transition cursor-pointer">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Bell className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-primary">Review Requests</p>
                      <p className="text-sm text-muted-foreground">{pendingRequests.length} pending</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          <Link href="/doctor/appointments">
            <Card className="border-primary/10 hover:border-primary/30 transition cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">All Appointments</p>
                    <p className="text-sm text-muted-foreground">View scheduled consultations</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/doctor/patients">
            <Card className="border-primary/10 hover:border-primary/30 transition cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Patient History</p>
                    <p className="text-sm text-muted-foreground">Review patient records</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/doctor/profile">
            <Card className="border-primary/10 hover:border-primary/30 transition cursor-pointer">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Profile Settings</p>
                    <p className="text-sm text-muted-foreground">Update your information</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
