"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doctorInvitesService } from "@/services/firestore";
import { useAuth } from "@/contexts/auth-context";
import { getDisplayError, logError, formatDisplayError, ERROR_CODES } from "@/lib/errors";
import { trackDoctorOnboardingCompleted } from "@/services/analytics/analytics.service";
import { Eye, EyeOff, Lock, User, Mail, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const { signInWithEmail, sendVerificationEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [formData, setFormData] = useState({
    displayName: "",
    password: "",
    phoneNumber: "",
  });

  useEffect(() => {
    async function loadInvite() {
      if (!params.token) {
        setError("Invalid invite link");
        setLoading(false);
        return;
      }

      try {
        // READ ONLY — public Firestore read, no writes on client side
        const inviteData = await doctorInvitesService.getByToken(params.token as string);

        if (!inviteData) {
          setError("Invalid invite link");
          setLoading(false);
          return;
        }

        if (inviteData.status === "completed") {
          setError("This invite has already been used");
          setLoading(false);
          return;
        }

        if (inviteData.status === "cancelled") {
          setError("This invite has been cancelled");
          setLoading(false);
          return;
        }

        if (new Date() > inviteData.expiresAt) {
          // Don't write from client — just show the error
          setError("This invite has expired");
          setLoading(false);
          return;
        }

        setInvite(inviteData);
        setLoading(false);
      } catch (err: unknown) {
        const appError = getDisplayError(err, ERROR_CODES.SYSTEM.UNEXPECTED);
        logError(appError.code, err, "InviteAcceptancePage");
        setError(formatDisplayError(appError));
        setLoading(false);
      }
    }

    loadInvite();
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.displayName || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Creating your account...");

      // Step 1: Server-side account creation via Admin SDK (bypasses Firestore rules)
      const response = await fetch("/api/doctor-onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: invite.token,
          displayName: formData.displayName,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      // Step 2: Auto sign-in with the newly created credentials
      setStatusMessage("Signing you in...");
      await signInWithEmail({ email: data.email, password: formData.password });
      trackDoctorOnboardingCompleted({ invite_id: invite?.id });

      // Step 3: Send verification email
      setStatusMessage("Sending verification email...");
      try {
        await sendVerificationEmail();
      } catch (verifyErr) {
        console.warn("[InvitePage] Could not send verification email:", verifyErr);
      }

      // Step 4: Redirect to verify-email page
      setSuccess(true);
      router.push("/auth/verify-email");
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.SYSTEM.UNEXPECTED);
      logError(appError.code, err, "InviteAcceptancePage");
      setError(formatDisplayError(appError));
      setStatusMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <Card className="border-red-200 bg-red-50/50 max-w-md w-full">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-6" />
            <h2 className="font-display text-2xl text-primary mb-4">Invalid Invite</h2>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button onClick={() => router.push("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <Card className="border-primary/10 max-w-md w-full">
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            <h2 className="font-display text-2xl text-primary mb-4">
              Welcome to Eye Aura!
            </h2>
            <p className="text-muted-foreground">
              Your account has been created. Redirecting to email verification...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-primary mb-2">Complete Onboarding</h1>
          <p className="text-base text-muted-foreground">
            You've been invited to join Eye Aura as a doctor
          </p>
        </div>

        <Card className="border-primary/10 shadow-lg">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-center text-2xl">Doctor Profile</CardTitle>
            <CardDescription className="text-center">
              Complete your profile to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Read-only email from invite — cannot be changed */}
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={invite.email}
                    readOnly
                    className="pl-10 bg-muted cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">This email was set by the admin and cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="displayName">Full Name *</Label>
                <div className="relative mt-2">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Dr. John Doe"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative mt-2">
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {statusMessage || "Processing..."}
                  </span>
                ) : "Complete Onboarding"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
