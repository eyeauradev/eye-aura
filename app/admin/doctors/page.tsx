"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService } from "@/services/firestore";
import { UserPlus, Search, MoreVertical, Edit2, Ban, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
      await usersService.update(doctorId, { isActive: false });
      setDoctors(doctors.map((d) => (d.id === doctorId ? { ...d, isActive: false } : d)));
    } catch (error) {
      console.error("Error disabling doctor:", error);
      alert("Failed to disable doctor");
    }
  };

  const handleActivateDoctor = async (doctorId: string) => {
    try {
      await usersService.update(doctorId, { isActive: true });
      setDoctors(doctors.map((d) => (d.id === doctorId ? { ...d, isActive: true } : d)));
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-primary mb-1">Doctors</h1>
          <p className="text-base sm:text-sm sm:text-xl text-muted-foreground">Manage platform doctors</p>
        </div>
        <Link href="/admin/doctors/invite" className="self-start sm:self-auto">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Doctor
          </Button>
        </Link>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">All Doctors</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
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
      
    </div>
  );
}

function DoctorCard({ doctor, onDisable, onActivate }: { doctor: UserDocument; onDisable: (id: string) => void; onActivate: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-primary/5 hover:border-primary/10 transition">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-primary font-bold">
          {doctor.displayName?.charAt(0) || doctor.email?.charAt(0)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary truncate">{doctor.displayName || "Unknown"}</p>
        <p className="text-sm text-muted-foreground truncate">{doctor.email}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {doctor.isActive ? (
            !doctor.isSuspended ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">Suspended</Badge>
            )
          ) : (
            <Badge className="bg-gray-100 text-gray-800 border-gray-200">Disabled</Badge>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {doctor.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Link href={`/admin/doctors/${doctor.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </Link>
        {doctor.isActive ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDisable(doctor.id)}>
            <Ban className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onActivate(doctor.id)}>
            <CheckCircle className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
