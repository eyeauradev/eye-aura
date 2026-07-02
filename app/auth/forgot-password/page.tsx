"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getDisplayError, formatDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { trackForgotPassword } from "@/services/analytics/analytics.service";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      await resetPassword(email);
      trackForgotPassword({ method: "email" });
      setSuccess(true);
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.AUTH.INVALID_CREDENTIAL);
      logError(appError.code, err, "ForgotPasswordForm");
      setError(formatDisplayError(appError));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 sm:px-8 bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      <div className="w-full max-w-md">

        {/* Brand lockup */}
        <div className="flex justify-center mb-1">
          <Link
            href="/"
            aria-label="Eye Aura homepage"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 rounded-lg"
          >
            <Image
              src="/eye-aura-logo-v2.svg"
              alt="Eye Aura"
              width={120}
              height={120}
              className="h-30 w-30 object-contain"
              priority
            />
          </Link>
        </div>

        {/* Page heading — primary visual focus */}
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl text-primary sm:text-4xl tracking-tight">
            {success ? "Check your inbox" : "Forgot your password?"}
          </h1>
          <p className="mt-2.5 text-base text-muted-foreground">
            {success
              ? <>Reset link sent to <span className="font-medium text-foreground">{email}</span></>
              : "We'll send you a reset link"
            }
          </p>
        </div>

        <Card className="border-primary/10 shadow-[0_8px_40px_rgba(15,79,75,0.09)]">
          <CardContent className="px-6 py-8 sm:px-8">

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/70 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_4px_rgba(15,79,75,0.08)] transition-[border-color,box-shadow] duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200/70"
                  >
                    {error}
                  </div>
                )}

                {/* Primary CTA */}
                <Button
                  type="submit"
                  className="w-full active:scale-[0.98] transition-transform duration-150"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>

                {/* Back link */}
                <div className="flex justify-center pt-1">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/80 hover:text-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 rounded"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to Sign In
                  </Link>
                </div>

              </form>
            ) : (
              /* Success state */
              <div className="space-y-6 text-center">

                {/* Icon */}
                <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>

                {/* Body copy */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Click the link in the email to reset your password.
                    <br />
                    If you don&apos;t see it, check your spam folder.
                  </p>
                </div>

                {/* Return CTA */}
                <Button
                  onClick={() => router.push("/auth/login")}
                  variant="outline"
                  className="w-full active:scale-[0.98] transition-transform duration-150"
                  size="lg"
                >
                  Back to Sign In
                </Button>

              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
