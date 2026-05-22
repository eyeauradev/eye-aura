"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { EA, eaError } from "@/lib/errors";
import { Save, Bell, CheckCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";

export default function PatientProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
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
      setSaveError(eaError(EA.PAT_003, error));
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-4xl text-primary mb-1">My Profile</h1>
        <p className="text-sm sm:text-xl text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

        <div>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-primary/10">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-4 pb-6 border-b border-primary/10">
                      {user.photoURL && !imgError ? (
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          onError={() => setImgError(true)}
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-[#0f4f4b]/10 shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-[#0f4f4b]/10 grid place-items-center shrink-0">
                          <User className="h-8 w-8 sm:h-10 sm:w-10 text-[#0f4f4b]/40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-display text-lg sm:text-xl text-primary truncate">{user.displayName || "Your Name"}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <Badge className="mt-1.5 capitalize">{user.role}</Badge>
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
                    {saveError && (
                      <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200">
                        <span className="text-sm">{saveError}</span>
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
                <CardHeader className="p-3 sm:p-6">
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
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-primary">Email Notifications</span>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-primary">Appointment Reminders</span>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-primary">Prescription Alerts</span>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preferred Consultation */}
              <Card className="border-primary/10 bg-primary/5">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle>Preferred Consultation</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
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
                <CardContent className="p-3 sm:p-6">
                  <p className="text-sm font-bold text-muted-foreground mb-3">Need Help?</p>
                  <Button variant="outline" size="lg" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </div>
  );
}
