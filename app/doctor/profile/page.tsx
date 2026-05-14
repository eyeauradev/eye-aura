"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usersService } from "@/services/firestore";
import type { UserDocument } from "@/types/firestore";
import { User, Mail, Phone, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionContainer } from "@/components/section-container";

export default function DoctorProfilePage() {
  const { user } = useAuth();
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
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
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
        <h1 className="font-display text-4xl text-primary mb-2">Profile Settings</h1>
        <p className="text-xl text-muted-foreground">Manage your account information</p>
      </div>

      {/* Profile Form */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
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

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </SectionContainer>

      {/* Account Info */}
      <SectionContainer>
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-medium text-primary">{user?.id}</p>
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
      </SectionContainer>
    </div>
  );
}
