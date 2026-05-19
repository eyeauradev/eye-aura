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
import { SectionContainer } from "@/components/section-container";
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
        <h1 className="font-display text-4xl text-primary mb-2">
          {getGreeting()}, {user?.displayName || "Doctor"}
        </h1>
        <p className="text-xl text-muted-foreground">{formatDate()}</p>
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
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalUpcoming}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.completedToday}</div>
          </CardContent>
        </Card>
        <Card className={`border-primary/10 bg-white/50 ${stats.pendingRequests > 0 ? "ring-2 ring-amber-400" : ""}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.pendingRequests}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.pendingPrescriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Booking Requests */}
      {pendingRequests.length > 0 && (
        <SectionContainer>
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
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <Bell className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">{request.patient?.displayName || "Patient"}</p>
                          <p className="text-sm text-muted-foreground">{request.patient?.email || ""}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested: {new Date(request.requestedTime).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {request.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{request.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionContainer>
      )}

      {/* Today's Consultations */}
      <SectionContainer>
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
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-primary">{appointment.patient?.displayName || "Patient"}</p>
                            <p className="text-sm text-muted-foreground">{appointment.patient?.email || ""}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(appointment.scheduledFor).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        {canJoin && appointment.consultationLink && (
                          <Button asChild size="default">
                            <a
                              href={appointment.consultationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <Video className="h-4 w-4" />
                              Join
                            </a>
                          </Button>
                        )}
                        {appointment.status === "completed" && !appointment.prescriptionId && (
                          <Button asChild variant="outline">
                            <Link href={`/doctor/prescriptions/create/${appointment.id}`}>
                              <FileText className="h-4 w-4 mr-2" />
                              Create Prescription
                            </Link>
                          </Button>
                        )}
                        <Link href={`/doctor/appointments/${appointment.id}`}>
                          <Button variant="ghost">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-base text-muted-foreground">No consultations scheduled for today</p>
            </CardContent>
          </Card>
        )}
      </SectionContainer>

      {/* Follow-Up Appointments */}
      {followUpAppointments.length > 0 && (
        <SectionContainer>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-primary">Follow-Up Required</h2>
            <Badge className="bg-secondary text-white">{followUpAppointments.length}</Badge>
          </div>

          <div className="grid gap-4">
            {followUpAppointments.slice(0, 3).map((appointment) => (
              <Card key={appointment.id} className="border-secondary/20 bg-secondary/5">
                <CardContent className="p-6">
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
        </SectionContainer>
      )}

      {/* Quick Actions */}
      <SectionContainer>
        <h2 className="font-display text-2xl text-primary mb-6">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/doctor/slots">
            <Card className="border-primary/10 hover:border-primary/30 transition cursor-pointer">
              <CardContent className="p-6">
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
              <CardContent className="p-6">
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
                <CardContent className="p-6">
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
              <CardContent className="p-6">
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
              <CardContent className="p-6">
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
              <CardContent className="p-6">
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
      </SectionContainer>
    </div>
  );
}
