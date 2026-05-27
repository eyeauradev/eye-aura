"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { EA, eaError } from "@/lib/errors";
import { Save, Bell, CheckCircle, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
  InfoRow,
} from "@/components/patient-portal";

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
      <div className="min-h-[60vh] flex items-center justify-center">
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
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1">My Profile</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardCard disableHover>
            <SectionHeader title="Personal Information" className="mt-0 mb-4" />
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 pb-6 border-b border-border/50">
                {user.photoURL && !imgError ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    onError={() => setImgError(true)}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-primary/10 shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-semibold text-foreground truncate">{user.displayName || "Your Name"}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <StatusBadge variant="active" size="sm" className="mt-1.5 capitalize">
                    {user.role}
                  </StatusBadge>
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
                <div className="flex items-center gap-2 p-4 rounded-2xl bg-primary/5 text-primary border border-primary/20">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-bold">Profile updated successfully</span>
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 p-4 rounded-2xl bg-ring/5 text-ring border border-ring/20">
                  <span className="text-sm">{saveError}</span>
                </div>
              )}

              <PremiumButton type="submit" size="lg" disabled={saving} icon={<Save className="h-5 w-5" />}>
                {saving ? "Saving..." : "Save Changes"}
              </PremiumButton>
            </form>
          </DashboardCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <DashboardCard disableHover staggerIndex={1}>
            <SectionHeader title="Account Info" className="mt-0 mb-4" />
            <div className="space-y-4">
              <InfoRow
                label="Member Since"
                value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                }) : "Recent"}
              />
              <div>
                <p className="text-xs uppercase tracking-[0.12em] font-medium text-muted-foreground">Profile Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-secondary" />
                  <span className="text-base font-semibold text-foreground">
                    {user.onboardingCompleted ? "Complete" : "Incomplete"}
                  </span>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Notification Preferences */}
          <DashboardCard disableHover staggerIndex={2}>
            <SectionHeader title="Notifications" className="mt-0 mb-4" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Email Notifications</span>
                </div>
                <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                  <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-card" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Appointment Reminders</span>
                </div>
                <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                  <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-card" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Prescription Alerts</span>
                </div>
                <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer">
                  <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-card" />
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Preferred Consultation */}
          <GlassPanel padding="md">
            <SectionHeader title="Preferred Consultation" className="mt-0 mb-4" />
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-card/50 border border-border/50 cursor-pointer hover:bg-card/80 transition">
                <p className="text-sm font-bold text-foreground">Video Consultation</p>
                <p className="text-xs text-muted-foreground">Face-to-face digital care</p>
              </div>
              <div className="p-3 rounded-2xl bg-card/50 border border-border/50 cursor-pointer hover:bg-card/80 transition">
                <p className="text-sm font-bold text-foreground">Voice Consultation</p>
                <p className="text-xs text-muted-foreground">Audio-only session</p>
              </div>
            </div>
          </GlassPanel>

          {/* Support */}
          <GlassPanel padding="md">
            <p className="text-sm font-bold text-muted-foreground mb-3">Need Help?</p>
            <PremiumButton variant="outline" size="lg" fullWidth>
              Contact Support
            </PremiumButton>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
