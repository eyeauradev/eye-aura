"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService, appointmentsService, prescriptionsService } from "@/services/firestore";
import type { UserDocument, AppointmentDocument, PrescriptionDocument } from "@/types/firestore";
import { BarChart3, Calendar, Users, TrendingUp, Activity, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalPrescriptions: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    cancelledAppointments: 0,
    thisMonthAppointments: 0,
    newThisWeek: 0,
    cancellationRate: 0,
    completionRate: 0,
  });

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        
        const [allUsers, allAppointments, allPrescriptions] = await Promise.all([
          usersService.getAll(),
          appointmentsService.getAll(),
          prescriptionsService.getAll(),
        ]);

        const doctors = allUsers.filter((u: UserDocument) => u.role === "doctor");
        const patients = allUsers.filter((u: UserDocument) => u.role === "patient");
        const completed = allAppointments.filter((a: AppointmentDocument) => a.status === "completed");
        const pending = allAppointments.filter((a: AppointmentDocument) => a.status === "pending");
        const cancelled = allAppointments.filter((a: AppointmentDocument) => a.status === "cancelled");
        
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = allAppointments.filter((a: AppointmentDocument) => {
          const aptDate = a.scheduledFor;
          return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
        });
        const newThisWeek = allAppointments.filter((a: AppointmentDocument) => new Date(a.createdAt) >= oneWeekAgo);
        const total = allAppointments.length;

        setStats({
          totalUsers: allUsers.length,
          totalDoctors: doctors.length,
          totalPatients: patients.length,
          totalAppointments: total,
          totalPrescriptions: allPrescriptions.length,
          completedAppointments: completed.length,
          pendingAppointments: pending.length,
          cancelledAppointments: cancelled.length,
          thisMonthAppointments: thisMonth.length,
          newThisWeek: newThisWeek.length,
          cancellationRate: total > 0 ? Math.round((cancelled.length / total) * 100) : 0,
          completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
        });
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-primary mb-2">Analytics</h1>
        <p className="text-xl text-muted-foreground">
          Platform performance and usage metrics
        </p>
      </div>

      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered users</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDoctors}</div>
              <p className="text-xs text-muted-foreground mt-1">On platform</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered patients</p>
            </CardContent>
          </Card>

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
        </div>
      

      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">Appointments completed</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonthAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">Appointments scheduled</p>
            </CardContent>
          </Card>
        </div>
      

      
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Prescription Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Prescriptions Generated</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.totalPrescriptions}</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      

      
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.completionRate}%</p>
                  <p className="text-sm font-medium text-primary">Completion Rate</p>
                  <p className="text-xs text-muted-foreground">{stats.completedAppointments} of {stats.totalAppointments} completed</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.cancellationRate}%</p>
                  <p className="text-sm font-medium text-primary">Cancellation Rate</p>
                  <p className="text-xs text-muted-foreground">{stats.cancelledAppointments} cancelled total</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {stats.thisMonthAppointments > 0 ? (stats.thisMonthAppointments / new Date().getDate()).toFixed(1) : "0.0"}
                  </p>
                  <p className="text-sm font-medium text-primary">Avg / Day</p>
                  <p className="text-xs text-muted-foreground">{stats.thisMonthAppointments} this month</p>
                </div>
              </div>
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
              <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 border border-purple-100">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {stats.totalPatients > 0 ? (stats.totalDoctors / stats.totalPatients).toFixed(2) : "0.00"}
                  </p>
                  <p className="text-sm font-medium text-primary">Doctor/Patient Ratio</p>
                  <p className="text-xs text-muted-foreground">{stats.totalDoctors} doctors, {stats.totalPatients} patients</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-teal-50 border border-teal-100">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.newThisWeek}</p>
                  <p className="text-sm font-medium text-primary">New Bookings</p>
                  <p className="text-xs text-muted-foreground">Created this week</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      
    </div>
  );
}

