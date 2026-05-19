"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usersService, appointmentsService, supportTicketsService, prescriptionsService } from "@/services/firestore";
import type { UserDocument, AppointmentDocument, PrescriptionDocument, SupportTicketDocument } from "@/types/firestore";
import { LayoutDashboard, Users, Calendar, MessageSquare, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    activeDoctors: 0,
    activePatients: 0,
    pendingTickets: 0,
    revenue: 0,
    pendingAppointments: 0,
    cancelledThisMonth: 0,
    newThisWeek: 0,
    completedAppointments: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

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
        
        // Load stats in parallel
        const [allUsers, allAppointments, allTickets, allPrescriptions] = await Promise.all([
          usersService.getAll(),
          appointmentsService.getAll(),
          supportTicketsService.getAll(),
          prescriptionsService.getAll(),
        ]);

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const doctors = allUsers.filter((u: UserDocument) => u.role === "doctor");
        const patients = allUsers.filter((u: UserDocument) => u.role === "patient");
        const pendingTickets = allTickets.filter((t: SupportTicketDocument) => t.status === "open" || t.status === "in_progress");
        const pendingApts = allAppointments.filter((a: AppointmentDocument) => a.status === "pending");
        const cancelledThisMonth = allAppointments.filter((a: AppointmentDocument) => {
          const d = new Date(a.scheduledFor);
          return a.status === "cancelled" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const newThisWeek = allAppointments.filter((a: AppointmentDocument) => new Date(a.createdAt) >= oneWeekAgo);
        const completed = allAppointments.filter((a: AppointmentDocument) => a.status === "completed");

        setStats({
          totalAppointments: allAppointments.length,
          activeDoctors: doctors.length,
          activePatients: patients.length,
          pendingTickets: pendingTickets.length,
          revenue: 0,
          pendingAppointments: pendingApts.length,
          cancelledThisMonth: cancelledThisMonth.length,
          newThisWeek: newThisWeek.length,
          completedAppointments: completed.length,
        });

        // Load recent activity
        const recentAppointments = allAppointments.slice(-5).reverse().map((apt: AppointmentDocument) => ({
          id: apt.id,
          type: "appointment",
          date: apt.scheduledFor,
          description: `Appointment with ${apt.patientId}`,
        }));

        const recentPrescriptions = allPrescriptions.slice(-5).reverse().map((rx: PrescriptionDocument) => ({
          id: rx.id,
          type: "prescription",
          date: rx.createdAt,
          description: `Prescription for ${rx.patientId}`,
        }));

        const recentTickets = allTickets.slice(-5).reverse().map((ticket: SupportTicketDocument) => ({
          id: ticket.id,
          type: "ticket",
          date: ticket.createdAt,
          description: ticket.subject,
        }));

        const activity = [...recentAppointments, ...recentPrescriptions, ...recentTickets]
          .filter(item => item.date) // Filter out items with undefined dates
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 10);

        setRecentActivity(activity);
      } catch (error) {
        console.error("Error loading dashboard:", error);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-primary mb-2">Admin Dashboard</h1>
        <p className="text-xl text-muted-foreground">
          Platform overview and operations
        </p>
      </div>

      {/* Platform Overview */}
      <SectionContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDoctors}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered doctors</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activePatients}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered patients</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">Need attention</p>
            </CardContent>
          </Card>
        </div>
      </SectionContainer>

      {/* Quick Actions */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/doctors/invite">
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Doctor
                </Button>
              </Link>
              <Link href="/admin/services/create">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Service
                </Button>
              </Link>
              <Link href="/admin/appointments">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Appointments
                </Button>
              </Link>
              <Link href="/admin/support">
                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Review Tickets
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </SectionContainer>

      {/* Recent Activity */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/50 border border-primary/5">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {activity.type === "appointment" && <Calendar className="h-5 w-5 text-primary" />}
                    {activity.type === "prescription" && <CheckCircle className="h-5 w-5 text-primary" />}
                    {activity.type === "ticket" && <MessageSquare className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary capitalize">
                      {activity.type === "appointment" && "New Appointment"}
                      {activity.type === "prescription" && "Prescription Created"}
                      {activity.type === "ticket" && "Support Ticket"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {activity.type}
                  </Badge>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </SectionContainer>

      {/* Platform Health */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.pendingAppointments}</p>
                  <p className="text-sm font-medium text-primary">Pending</p>
                  <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.cancelledThisMonth}</p>
                  <p className="text-sm font-medium text-primary">Cancellations</p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.newThisWeek}</p>
                  <p className="text-sm font-medium text-primary">New Bookings</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.completedAppointments}</p>
                  <p className="text-sm font-medium text-primary">Completed</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalAppointments > 0 ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0}% rate
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SectionContainer>
    </div>
  );
}
