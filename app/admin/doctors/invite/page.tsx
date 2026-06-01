"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { doctorInvitesService, usersService } from "@/services/firestore";
import { sendDoctorInviteEmail } from "@/services/email/email.service";
import { Mail, User, Calendar, Clock, ArrowLeft, CheckCircle } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { getDisplayError, logError, ERROR_CODES, formatDisplayError } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";

import Link from "next/link";

export default function AdminDoctorInvitePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [emailWarning, setEmailWarning] = useState(false);
  const [formData, setFormData] = useState({
    doctorName: "",
    email: "",
    specialization: "",
    consultationTypes: [] as string[],
  });
  const [error, setError] = useState("");

  const consultationOptions = [
    "General Eye Examination",
    "Contact Lens Consultation",
    "Digital Eye Strain Guidance",
    "Video Consultation",
    "Prescription Renewal",
  ];

  const handleConsultationTypeToggle = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      consultationTypes: prev.consultationTypes.includes(type)
        ? prev.consultationTypes.filter((t) => t !== type)
        : [...prev.consultationTypes, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.doctorName || !formData.email || !formData.specialization) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.consultationTypes.length === 0) {
      setError("Please select at least one consultation type");
      return;
    }

    try {
      setLoading(true);

      if (!user) {
        setError("You must be logged in to invite doctors");
        return;
      }

      // Pre-check: block invite if email belongs to an admin account
      const existingUser = await usersService.getByEmail(formData.email);
      if (existingUser?.role === "admin") {
        setError("Cannot send a doctor invite to an admin account");
        setLoading(false);
        return;
      }

      // Create invite
      const invite = await doctorInvitesService.create({
        email: formData.email,
        doctorName: formData.doctorName,
        invitedBy: user.id,
        invitedByName: user.displayName,
        specialization: formData.specialization,
        consultationTypes: formData.consultationTypes,
      });

      // Generate invite link
      const link = `${window.location.origin}/invite/${invite.token}`;
      const expiryDate = invite.expiresAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      setInviteLink(link);

      // Try to send email, but don't fail if it's not configured
      try {
        await sendDoctorInviteEmail(formData.email, {
          doctorName: formData.doctorName,
          inviteLink: link,
          expiryDate,
        });
      } catch (emailError) {
        console.warn("Email service not configured, but invite was created:", emailError);
        setEmailWarning(true);
      }

      setSuccess(true);
    } catch (err: unknown) {
      const appError = getDisplayError(err, ERROR_CODES.ADMIN.OPERATION_FAILED);
      logError(appError.code, err, "AdminModule");
      errorFromAppError(appError);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-8">
        <div>
          <Link href="/admin/doctors">
            <PremiumButton variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Doctors
            </PremiumButton>
          </Link>
          <h1 className={TYPOGRAPHY.heading}>Invite Sent</h1>
          <p className="text-sm text-muted-foreground">
            Doctor invite has been created successfully
          </p>
        </div>

        
          <Card className="border-primary/10 bg-green-50/50">
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h2 className={TYPOGRAPHY.subheading + " mb-4"}>
                Invite Created for {formData.email}
              </h2>
              
              {emailWarning && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> Email service is not configured, so the invite email was not sent automatically.
                    Please manually share the invite link below with the doctor.
                  </p>
                </div>
              )}
              
              <p className="text-muted-foreground mb-6">
                {!emailWarning 
                  ? "An invite email has been sent to the doctor. You can also share the link below directly."
                  : "Please share the invite link below with the doctor to complete their onboarding."
                }
                {" "}The invite link expires in 7 days.
              </p>
              
              <div className="mb-6 p-4 bg-white border border-primary/10 rounded-lg text-left">
                <p className="text-sm font-medium text-muted-foreground mb-2">Invite Link:</p>
                <code className="text-sm text-primary break-all block mb-3">{inviteLink}</code>
                <PremiumButton
                  variant="outline"
                  className="w-full"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                >
                  Copy Link
                </PremiumButton>
              </div>
              
              <Link href="/admin/doctors">
                <PremiumButton className="w-full">
                  Back to Doctors
                </PremiumButton>
              </Link>
            </CardContent>
          </Card>
        
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/doctors">
          <PremiumButton variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Doctors
          </PremiumButton>
        </Link>
        <h1 className={TYPOGRAPHY.heading}>Invite Doctor</h1>
        <p className="text-sm text-muted-foreground">
          Send an invite to a new doctor to join the platform
        </p>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Doctor Information</CardTitle>
            <CardDescription>
              Enter the doctor's details to send an invite
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="doctorName">Doctor Name *</Label>
                <div className="relative mt-2">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="doctorName"
                    type="text"
                    placeholder="Dr. John Doe"
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="specialization">Specialization *</Label>
                <div className="relative mt-2">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="specialization"
                    type="text"
                    placeholder="e.g., Optometry, Ophthalmology"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Consultation Types *</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Select the consultation types this doctor can provide
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {consultationOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleConsultationTypeToggle(option)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.consultationTypes.includes(option)
                          ? "border-primary bg-primary/5"
                          : "border-primary/10 hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="font-medium text-sm">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <PremiumButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending Invite..." : "Send Invite"}
              </PremiumButton>
            </form>
          </CardContent>
        </Card>
      
    </div>
  );
}
