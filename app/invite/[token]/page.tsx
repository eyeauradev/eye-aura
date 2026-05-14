"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doctorInvitesService, usersService } from "@/services/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirebaseAuth } from "@/services/firebase/client";
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const auth = getFirebaseAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        const inviteData = await doctorInvitesService.getByToken(params.token as string);
        
        if (!inviteData) {
          setError("Invalid invite link");
          setLoading(false);
          return;
        }

        if (inviteData.used) {
          setError("This invite has already been used");
          setLoading(false);
          return;
        }

        if (new Date() > inviteData.expiresAt) {
          setError("This invite has expired");
          setLoading(false);
          return;
        }

        setInvite(inviteData);
        setLoading(false);
      } catch (err: any) {
        setError("Failed to load invite");
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

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        invite.email,
        formData.password
      );

      await updateProfile(userCredential.user, {
        displayName: formData.displayName,
      });

      // Create Firestore user with doctor role
      await usersService.create({
        id: userCredential.user.uid,
        email: invite.email,
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        role: "doctor",
        onboardingCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mark invite as used
      await doctorInvitesService.markAsUsed(invite.id);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/doctor/dashboard");
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
            <p className="text-muted-foreground mb-8">
              Your account has been created successfully. You can now access the doctor dashboard.
            </p>
            <Button onClick={handleGoToDashboard} className="w-full">
              Go to Dashboard
            </Button>
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
            Set up your doctor account for {invite.email}
          </p>
        </div>

        <Card className="border-primary/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Doctor Profile</CardTitle>
            <CardDescription className="text-center">
              Complete your profile to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                {submitting ? "Creating Account..." : "Complete Onboarding"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
