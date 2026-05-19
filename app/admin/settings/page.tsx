"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Settings, Video, Mail, Bell, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "Eye Aura",
    consultationPlatform: "google_meet",
    googleMeetApiKey: "",
    zoomApiKey: "",
    zoomApiSecret: "",
    notificationEmail: "onboarding@resend.dev",
    primaryColor: "#0F4F4B",
    secondaryColor: "#1A6B66",
  });
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In a real implementation, this would save to a settings collection
      // For now, we'll simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-primary mb-2">Settings</h1>
        <p className="text-xl text-muted-foreground">
          Platform configuration and preferences
        </p>
      </div>

      
        <form onSubmit={handleSave} className="space-y-6">
          {/* Platform Settings */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Platform Settings
              </CardTitle>
              <CardDescription>
                Configure platform branding and identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consultation Platform */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                Consultation Platform
              </CardTitle>
              <CardDescription>
                Configure video consultation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="consultationPlatform">Default Platform</Label>
                <select
                  id="consultationPlatform"
                  value={settings.consultationPlatform}
                  onChange={(e) => setSettings({ ...settings, consultationPlatform: e.target.value })}
                  className="w-full px-4 py-3 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="google_meet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              {settings.consultationPlatform === "google_meet" && (
                <div>
                  <Label htmlFor="googleMeetApiKey">Google Meet API Key (Optional)</Label>
                  <Input
                    id="googleMeetApiKey"
                    type="password"
                    value={settings.googleMeetApiKey}
                    onChange={(e) => setSettings({ ...settings, googleMeetApiKey: e.target.value })}
                    placeholder="Enter API key for advanced features"
                  />
                </div>
              )}
              {settings.consultationPlatform === "zoom" && (
                <>
                  <div>
                    <Label htmlFor="zoomApiKey">Zoom API Key</Label>
                    <Input
                      id="zoomApiKey"
                      type="password"
                      value={settings.zoomApiKey}
                      onChange={(e) => setSettings({ ...settings, zoomApiKey: e.target.value })}
                      placeholder="Enter Zoom API key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zoomApiSecret">Zoom API Secret</Label>
                    <Input
                      id="zoomApiSecret"
                      type="password"
                      value={settings.zoomApiSecret}
                      onChange={(e) => setSettings({ ...settings, zoomApiSecret: e.target.value })}
                      placeholder="Enter Zoom API secret"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Configure email notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notificationEmail">Sender Email</Label>
                <Input
                  id="notificationEmail"
                  type="email"
                  value={settings.notificationEmail}
                  onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                  placeholder="noreply@eyeaura.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This email will be used as the sender for all platform emails
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-primary">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Powered by Resend. Configure API key in environment variables.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {success && (
            <div className="p-4 rounded-xl bg-green-50 text-green-700 border border-green-200">
              Settings saved successfully
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      
    </div>
  );
}
