"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService, servicesService, usersService } from "@/services/firestore";
import { Calendar, Clock, FileText, Plus, Video, ArrowRight, Droplets, Sun, Eye as EyeIcon, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);

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
      } catch (error) {
        console.error("Error loading dashboard data:", error);
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
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-200" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
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
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-primary sm:text-4xl">
                {getGreeting()}, {user?.displayName?.split(" ")[0] || "there"}
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Here's what's happening with your eye wellness journey
              </p>
            </div>
            <Link href="/booking">
              <Button size="lg" className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Book Appointment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <SectionContainer>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Appointments */}
              <Card className="border-primary/10">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <Link href="/patient/appointments">
                    <Button variant="ghost" className="flex items-center gap-2">
                      View All
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
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
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className="font-bold text-primary">{appointment.service?.title}</h3>
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
                  ) : (
                    <Card className="border-primary/10 bg-primary/5">
                      <CardContent className="p-8 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-base text-muted-foreground mb-4">
                          You don't have any upcoming appointments
                        </p>
                        <Link href="/booking">
                          <Button>Book Your First Appointment</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Wellness Tips */}
              <Card className="border-primary/10 bg-primary/5">
                <CardHeader>
                  <CardTitle>Eye Wellness Tips</CardTitle>
                </CardHeader>
                <CardContent>
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
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/booking" className="block">
                    <Button variant="outline" size="lg" className="w-full justify-start">
                      <Plus className="h-5 w-5 mr-3" />
                      Book Appointment
                    </Button>
                  </Link>
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
                      <FileText className="h-5 w-5 mr-3" />
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
                <CardContent>
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
                <CardContent className="p-6">
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
      </SectionContainer>
    </div>
  );
}
