"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { Video, Mail, Bell, Palette, Save, RefreshCw, CheckCircle, RotateCcw } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_THEME, type ThemeColors } from "@/contexts/theme-context";
import { TYPOGRAPHY } from "@/lib/design-tokens";

// ─── Firestore path ───────────────────────────────────────────────────────
function getSettingsDoc() {
  return doc(getFirebaseDb(), "platform_settings", "config");
}

interface PlatformSettings {
  platformName: string;
  consultationPlatform: string;
  googleMeetApiKey: string;
  zoomApiKey: string;
  zoomApiSecret: string;
  notificationEmail: string;
  theme: ThemeColors;
}

const DEFAULTS: PlatformSettings = {
  platformName: "Eye Aura",
  consultationPlatform: "google_meet",
  googleMeetApiKey: "",
  zoomApiKey: "",
  zoomApiSecret: "",
  notificationEmail: "onboarding@resend.dev",
  theme: { ...DEFAULT_THEME },
};

// ─── Color field metadata for the UI ──────────────────────────────────────
const COLOR_FIELDS: { key: keyof ThemeColors; label: string; description: string; group: string }[] = [
  { key: "primary", label: "Primary", description: "Headings, buttons, key UI elements", group: "Brand" },
  { key: "primaryForeground", label: "Primary Foreground", description: "Text on primary-colored backgrounds", group: "Brand" },
  { key: "secondary", label: "Secondary / Gold", description: "Highlights, badges, accent actions", group: "Brand" },
  { key: "secondaryForeground", label: "Secondary Foreground", description: "Text on secondary backgrounds", group: "Brand" },
  { key: "background", label: "Background", description: "Page background color", group: "Surface" },
  { key: "foreground", label: "Foreground", description: "Default body text color", group: "Surface" },
  { key: "card", label: "Card Background", description: "Card and panel backgrounds", group: "Surface" },
  { key: "cardForeground", label: "Card Foreground", description: "Text inside cards", group: "Surface" },
  { key: "muted", label: "Muted", description: "Subtle backgrounds, disabled states", group: "Surface" },
  { key: "mutedForeground", label: "Muted Foreground", description: "Secondary text, placeholders", group: "Surface" },
  { key: "accent", label: "Accent", description: "Soft accent backgrounds", group: "Accent" },
  { key: "accentForeground", label: "Accent Foreground", description: "Text on accent backgrounds", group: "Accent" },
  { key: "border", label: "Border", description: "Borders and dividers", group: "Accent" },
  { key: "ring", label: "Focus Ring", description: "Focus outline color", group: "Accent" },
];

/** Apply colors to CSS variables for live preview */
function applyToDOM(theme: ThemeColors) {
  if (typeof document === "undefined") return;
  const varMap: Record<keyof ThemeColors, string> = {
    primary: "--primary",
    primaryForeground: "--primary-foreground",
    secondary: "--secondary",
    secondaryForeground: "--secondary-foreground",
    background: "--background",
    foreground: "--foreground",
    card: "--card",
    cardForeground: "--card-foreground",
    muted: "--muted",
    mutedForeground: "--muted-foreground",
    accent: "--accent",
    accentForeground: "--accent-foreground",
    border: "--border",
    ring: "--ring",
  };
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(varMap)) {
    const val = theme[key as keyof ThemeColors];
    if (val) root.style.setProperty(cssVar, val);
  }
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(getSettingsDoc());
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            platformName: data.platformName ?? DEFAULTS.platformName,
            consultationPlatform: data.consultationPlatform ?? DEFAULTS.consultationPlatform,
            googleMeetApiKey: data.googleMeetApiKey ?? "",
            zoomApiKey: data.zoomApiKey ?? "",
            zoomApiSecret: data.zoomApiSecret ?? "",
            notificationEmail: data.notificationEmail ?? DEFAULTS.notificationEmail,
            theme: { ...DEFAULT_THEME, ...(data.theme ?? {}) },
          });
          if (data.theme) applyToDOM({ ...DEFAULT_THEME, ...data.theme });
        }
      } catch (err) {
        console.warn("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Color change with live preview ──────────────────────────────────────
  const handleColorChange = useCallback((key: keyof ThemeColors, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, theme: { ...prev.theme, [key]: value } };
      applyToDOM(next.theme);
      return next;
    });
  }, []);

  // ── Reset to defaults ───────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (!confirm("Reset all colors to the default Eye Aura theme? This will save immediately.")) return;
    setSettings((prev) => ({ ...prev, theme: { ...DEFAULT_THEME } }));
    applyToDOM(DEFAULT_THEME);
    // Auto-save the reset
    (async () => {
      try {
        setSaving(true);
        await setDoc(getSettingsDoc(), { theme: DEFAULT_THEME }, { merge: true });
        setSuccess("Theme reset to defaults");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err: any) {
        setError(err?.message || "Failed to reset");
      } finally {
        setSaving(false);
      }
    })();
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        platformName: settings.platformName,
        consultationPlatform: settings.consultationPlatform,
        notificationEmail: settings.notificationEmail,
        theme: settings.theme,
      };
      if (settings.googleMeetApiKey) payload.googleMeetApiKey = settings.googleMeetApiKey;
      if (settings.zoomApiKey) payload.zoomApiKey = settings.zoomApiKey;
      if (settings.zoomApiSecret) payload.zoomApiSecret = settings.zoomApiSecret;

      await setDoc(getSettingsDoc(), payload, { merge: true });
      applyToDOM(settings.theme);
      setSuccess("Settings saved successfully");
      setTimeout(() => setSuccess(""), 3500);
    } catch (err: any) {
      setError(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Group colors for display
  const groups = ["Brand", "Surface", "Accent"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={TYPOGRAPHY.heading}>Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform configuration, theme, and preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Theme / Colors ─────────────────────────────────────────── */}
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme Colors
                </CardTitle>
                <CardDescription>
                  Customize the entire app color palette. Changes preview live.
                </CardDescription>
              </div>
              <PremiumButton
                type="button"
                variant="outline"
                onClick={handleReset}
                className="shrink-0 h-8 px-3 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset to Default
              </PremiumButton>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-6">
            {groups.map((group) => (
              <div key={group}>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  {group} Colors
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {COLOR_FIELDS.filter((f) => f.group === group).map((field) => (
                    <ColorField
                      key={field.key}
                      label={field.label}
                      description={field.description}
                      value={settings.theme[field.key]}
                      onChange={(v) => handleColorChange(field.key, v)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Live preview */}
            <div className="rounded-xl border border-primary/10 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Preview
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: settings.theme.primary }}>
                  Primary
                </span>
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: settings.theme.secondary }}>
                  Secondary
                </span>
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold border" style={{ color: settings.theme.primary, borderColor: settings.theme.border }}>
                  Outline
                </span>
                <span className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: settings.theme.muted, color: settings.theme.mutedForeground }}>
                  Muted
                </span>
                <span className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: settings.theme.accent, color: settings.theme.accentForeground }}>
                  Accent
                </span>
              </div>
              <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: settings.theme.background }}>
                <p className="text-sm font-bold" style={{ color: settings.theme.foreground }}>
                  {settings.platformName} — Sample text on background
                </p>
                <p className="text-xs" style={{ color: settings.theme.mutedForeground }}>
                  This is how muted text looks on the page background.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Platform Name ──────────────────────────────────────────── */}
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Platform Identity</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div>
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Consultation Platform ──────────────────────────────────── */}
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5" />
              Consultation Platform
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4">
            <div>
              <Label htmlFor="consultationPlatform">Default Platform</Label>
              <select
                id="consultationPlatform"
                value={settings.consultationPlatform}
                onChange={(e) => setSettings({ ...settings, consultationPlatform: e.target.value })}
                className="w-full mt-1.5 px-4 py-3 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
            {settings.consultationPlatform === "google_meet" && (
              <div>
                <Label htmlFor="googleMeetApiKey">Google Meet API Key (Optional)</Label>
                <Input id="googleMeetApiKey" type="password" value={settings.googleMeetApiKey} onChange={(e) => setSettings({ ...settings, googleMeetApiKey: e.target.value })} placeholder="Leave blank to keep existing" className="mt-1.5" />
              </div>
            )}
            {settings.consultationPlatform === "zoom" && (
              <>
                <div>
                  <Label htmlFor="zoomApiKey">Zoom API Key</Label>
                  <Input id="zoomApiKey" type="password" value={settings.zoomApiKey} onChange={(e) => setSettings({ ...settings, zoomApiKey: e.target.value })} placeholder="Leave blank to keep existing" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="zoomApiSecret">Zoom API Secret</Label>
                  <Input id="zoomApiSecret" type="password" value={settings.zoomApiSecret} onChange={(e) => setSettings({ ...settings, zoomApiSecret: e.target.value })} placeholder="Leave blank to keep existing" className="mt-1.5" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Email ──────────────────────────────────────────────────── */}
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4">
            <div>
              <Label htmlFor="notificationEmail">Sender Email</Label>
              <Input id="notificationEmail" type="email" value={settings.notificationEmail} onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/4 border border-primary/10">
              <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Powered by Resend. Set <code className="font-mono">RESEND_API_KEY</code> in env.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Feedback ───────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-green-50 text-green-700 border border-green-200 flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <PremiumButton type="submit" className="w-full" disabled={saving}>
          {saving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Settings</>}
        </PremiumButton>
      </form>
    </div>
  );
}

// ─── Color field component ────────────────────────────────────────────────

function ColorField({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Determine if the value is a simple hex (can use color picker) or rgba/complex
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value) || /^#[0-9a-fA-F]{3}$/.test(value);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-primary/8 bg-white/50">
      {isHex ? (
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-lg border border-primary/15 cursor-pointer p-0.5 bg-white shrink-0"
        />
      ) : (
        <div
          className="h-9 w-12 rounded-lg border border-primary/15 shrink-0"
          style={{ background: value }}
          title={value}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{description}</p>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 text-xs font-mono h-8 shrink-0"
      />
    </div>
  );
}
