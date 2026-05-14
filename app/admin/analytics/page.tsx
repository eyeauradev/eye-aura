"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService, appointmentsService, prescriptionsService } from "@/services/firestore";
import type { UserDocument, AppointmentDocument, PrescriptionDocument } from "@/types/firestore";
import { BarChart3, Calendar, Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";

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
    thisMonthAppointments: 0,
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
        
        const now = new Date();
        const thisMonth = allAppointments.filter((a: AppointmentDocument) => {
          const aptDate = a.scheduledFor;
          return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
        });

        setStats({
          totalUsers: allUsers.length,
          totalDoctors: doctors.length,
          totalPatients: patients.length,
          totalAppointments: allAppointments.length,
          totalPrescriptions: allPrescriptions.length,
          completedAppointments: completed.length,
          pendingAppointments: pending.length,
          thisMonthAppointments: thisMonth.length,
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

      <SectionContainer>
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
      </SectionContainer>

      <SectionContainer>
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
      </SectionContainer>

      <SectionContainer>
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
      </SectionContainer>

      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 border border-primary/5">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-xl font-bold text-primary">
                    {stats.totalAppointments > 0 
                      ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 border border-primary/5">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Appointments/Day</p>
                  <p className="text-xl font-bold text-primary">
                    {stats.thisMonthAppointments > 0 
                      ? (stats.thisMonthAppointments / 30).toFixed(1) 
                      : "0.0"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/50 border border-primary/5">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doctor/Patient Ratio</p>
                  <p className="text-xl font-bold text-primary">
                    {stats.totalPatients > 0 
                      ? (stats.totalDoctors / stats.totalPatients).toFixed(2) 
                      : "0.00"}
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

function CheckCircle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function Clock({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
