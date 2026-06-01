"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService } from "@/services/firestore";
import type { UserDocument } from "@/types/firestore";
import { User, Mail, Phone, Calendar, Save } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";


export default function DoctorProfilePage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserDocument | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    phoneNumber: "",
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        setLoading(true);
        const userProfile = await usersService.getById(user.id);
        setProfile(userProfile);
        setFormData({
          displayName: userProfile?.displayName || "",
          phoneNumber: userProfile?.phoneNumber || "",
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await usersService.update(user.id, {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
      });
      setProfile(profile ? { ...profile, ...formData } : null);
    } catch (error) {
      const appError = getDisplayError(error, ERROR_CODES.DOCTOR.OPERATION_FAILED);
      logError(appError.code, error, "DoctorModule");
      errorFromAppError(appError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className={TYPOGRAPHY.heading}>Profile Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account information</p>
      </div>

      {/* Profile Form */}
      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Dr. John Doe"
                className="w-full px-4 py-3 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Email</label>
              <div className="flex items-center gap-3 px-4 py-3 border border-primary/10 rounded-xl bg-white/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <PremiumButton onClick={handleSave} disabled={saving} loading={saving} fullWidth icon={<Save className="h-4 w-4" />}>
              {saving ? "Saving..." : "Save Changes"}
            </PremiumButton>
          </CardContent>
        </Card>
      

      {/* Account Info */}
      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 min-w-0">
              <User className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-primary truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium text-primary capitalize">{user?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium text-primary">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      
    </div>
  );
}
