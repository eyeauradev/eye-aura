"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { authService } from "@/services/auth/auth.service";
import { User, Mail, Phone, Calendar, Save, Camera, Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionContainer } from "@/components/section-container";
import { Badge } from "@/components/ui/badge";

export default function PatientProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    phoneNumber: "",
    emergencyContact: "",
    emergencyPhone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        phoneNumber: user.phoneNumber || "",
        emergencyContact: user.emergencyContact || "",
        emergencyPhone: user.emergencyPhone || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await updateUserProfile({
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <h1 className="font-display text-3xl text-primary sm:text-4xl">My Profile</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>
      </div>

      <SectionContainer>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profile Image */}
                    <div className="flex items-center gap-6 pb-6 border-b border-primary/10">
                      <div className="relative">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="Profile"
                            className="h-24 w-24 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-12 w-12 text-primary" />
                          </div>
                        )}
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-secondary text-white shadow-lg hover:bg-secondary/90 transition"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <p className="font-display text-xl text-primary">{user.displayName || "Your Name"}</p>
                        <p className="text-base text-muted-foreground">{user.email}</p>
                        <Badge className="mt-2 capitalize">{user.role}</Badge>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Full Name</Label>
                        <Input
                          id="displayName"
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={user.email}
                          disabled
                          className="bg-muted/30"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          placeholder="Enter your phone number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                        <Input
                          id="emergencyContact"
                          value={formData.emergencyContact}
                          onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                          placeholder="Emergency contact name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                        <Input
                          id="emergencyPhone"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                          placeholder="Emergency contact phone"
                        />
                      </div>
                    </div>

                    {success && (
                      <div className="flex items-center gap-2 p-4 rounded-2xl bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-bold">Profile updated successfully</span>
                      </div>
                    )}

                    <Button type="submit" size="lg" disabled={saving} className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Info */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Account Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Member Since</p>
                    <p className="text-base text-primary">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      }) : "Recent"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Profile Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-secondary" />
                      <span className="text-base text-primary">
                        {user.onboardingCompleted ? "Complete" : "Incomplete"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Preferences */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="text-base text-primary">Email Notifications</span>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="text-base text-primary">Appointment Reminders</span>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="text-base text-primary">Prescription Alerts</span>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preferred Consultation */}
              <Card className="border-primary/10 bg-primary/5">
                <CardHeader>
                  <CardTitle>Preferred Consultation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-white/50 border border-primary/10 cursor-pointer hover:bg-white transition">
                      <p className="text-sm font-bold text-primary">Video Consultation</p>
                      <p className="text-xs text-muted-foreground">Face-to-face digital care</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/50 border border-primary/10 cursor-pointer hover:bg-white transition">
                      <p className="text-sm font-bold text-primary">Voice Consultation</p>
                      <p className="text-xs text-muted-foreground">Audio-only session</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Support */}
              <Card className="border-primary/10">
                <CardContent className="p-6">
                  <p className="text-sm font-bold text-muted-foreground mb-3">Need Help?</p>
                  <Button variant="outline" size="lg" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
