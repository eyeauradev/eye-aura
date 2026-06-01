"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getDisplayError, logError, formatDisplayError, ERROR_CODES } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, LogOut, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user?.emailVerified) {
      if (user.role === "doctor") {
        router.push("/doctor/dashboard");
      } else if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/patient/dashboard");
      }
    }
  }, [user, loading, router]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;

    setError("");
    setResendSuccess(false);
    setResendLoading(true);

    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setCooldown(60); // 60 second cooldown
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.AUTH.GENERIC);
      logError(appError.code, err, "VerifyEmailPage");
      setError(formatDisplayError(appError));
    } finally {
      setResendLoading(false);
    }
  };

  const handleRefresh = async () => {
    setError("");
    setRefreshLoading(true);

    try {
      await reloadUser();
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.AUTH.GENERIC);
      logError(appError.code, err, "VerifyEmailPage");
      setError(formatDisplayError(appError));
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-12 sm:px-8 bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 sm:px-8 bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </Link>
          <Badge className="mb-4">Verify your email</Badge>
          <h1 className="font-display text-3xl text-primary sm:text-4xl">
            Please verify your email
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            We've sent a verification link to your inbox
          </p>
        </div>

        <Card className="border-primary/10 shadow-lg">
          <CardHeader className="p-3 sm:p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your inbox</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification email to:
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-6">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-center font-medium text-primary">{user.email}</p>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Click the verification link in the email to activate your account</span>
              </p>
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>If you don't see it, check your spam folder</span>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Verification email resent successfully</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="w-full"
                disabled={refreshLoading}
                size="lg"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshLoading ? "animate-spin" : ""}`} />
                {refreshLoading ? "Checking..." : "I've verified my email"}
              </Button>

              <Button
                onClick={handleResend}
                variant="ghost"
                className="w-full"
                disabled={resendLoading || cooldown > 0}
                size="lg"
              >
                <Mail className="h-4 w-4 mr-2" />
                {resendLoading ? "Resending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Resend verification email"}
              </Button>

              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                size="lg"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Having trouble?{" "}
          <Link href="/auth/login" className="font-bold text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
