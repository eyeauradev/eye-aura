"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService } from "@/services/firestore";
import { UserPlus, Search, MoreVertical, Edit2, Ban, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";
import type { UserDocument } from "@/types/firestore";

export default function AdminDoctorsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<UserDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadDoctors() {
      try {
        setLoading(true);
        const allUsers = await usersService.getAll();
        const doctorsList = allUsers.filter((u) => u.role === "doctor");
        setDoctors(doctorsList);
      } catch (error) {
        console.error("Error loading doctors:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDoctors();
  }, []);

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDisableDoctor = async (doctorId: string) => {
    if (!confirm("Are you sure you want to disable this doctor?")) return;
    
    try {
      await usersService.update(doctorId, { onboardingCompleted: false });
      setDoctors(doctors.map((d) => (d.id === doctorId ? { ...d, onboardingCompleted: false } : d)));
    } catch (error) {
      console.error("Error disabling doctor:", error);
      alert("Failed to disable doctor");
    }
  };

  const handleActivateDoctor = async (doctorId: string) => {
    try {
      await usersService.update(doctorId, { onboardingCompleted: true });
      setDoctors(doctors.map((d) => (d.id === doctorId ? { ...d, onboardingCompleted: true } : d)));
    } catch (error) {
      console.error("Error activating doctor:", error);
      alert("Failed to activate doctor");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-primary mb-2">Doctors</h1>
          <p className="text-xl text-muted-foreground">
            Manage platform doctors
          </p>
        </div>
        <Link href="/admin/doctors/invite">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Doctor
          </Button>
        </Link>
      </div>

      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Doctors</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No doctors found matching your search" : "No doctors on the platform yet"}
                </p>
                {!searchQuery && (
                  <Link href="/admin/doctors/invite">
                    <Button>Invite First Doctor</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    onDisable={handleDisableDoctor}
                    onActivate={handleActivateDoctor}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionContainer>
    </div>
  );
}

function DoctorCard({ doctor, onDisable, onActivate }: { doctor: UserDocument; onDisable: (id: string) => void; onActivate: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-primary/5 hover:border-primary/10 transition">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-lg">
            {doctor.displayName?.charAt(0) || doctor.email?.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-medium text-primary">{doctor.displayName || "Unknown"}</p>
          <p className="text-sm text-muted-foreground">{doctor.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {doctor.onboardingCompleted ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800 border-gray-200">Disabled</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Joined {doctor.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/admin/doctors/${doctor.id}`}>
          <Button variant="ghost" size="icon">
            <Edit2 className="h-4 w-4" />
          </Button>
        </Link>
        {doctor.onboardingCompleted ? (
          <Button variant="ghost" size="icon" onClick={() => onDisable(doctor.id)}>
            <Ban className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => onActivate(doctor.id)}>
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
