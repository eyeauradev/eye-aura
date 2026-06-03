"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, RefreshCw, AlertCircle, Phone, Mail, ExternalLink } from "lucide-react";
import { usersService } from "@/services/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumButton } from "@/components/premium/premium-button";
import { TYPOGRAPHY, SPACING } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { UserDocument } from "@/types/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientSummaryCardProps {
  patientId: string;
  /** Optional age — not stored in UserDocument, passed from external context */
  age?: number | null;
  /** Optional gender — not stored in UserDocument, passed from external context */
  gender?: string | null;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientSummaryCard({
  patientId,
  age,
  gender,
  className,
}: PatientSummaryCardProps) {
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatient = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await usersService.getById(patientId);
      if (!data) {
        setError("Patient not found");
      } else {
        setPatient(data);
      }
    } catch {
      setError("Failed to load patient data");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  // ─── Error State ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <Card className={cn("border-destructive/20", className)}>
        <CardContent className={cn(SPACING.cardPadding)}>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/70" />
            <p className="text-sm text-destructive">{error}</p>
            <PremiumButton
              variant="outline"
              size="sm"
              onClick={fetchPatient}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Retry
            </PremiumButton>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className={cn(SPACING.cardPadding)}>
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-14 w-14 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!patient) return null;

  // ─── Render ───────────────────────────────────────────────────────────────

  const displayName = patient.displayName || "Unknown Patient";
  const phone = patient.phoneNumber || patient.whatsappNumber || null;
  const email = patient.email || null;

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className={cn(SPACING.cardPadding)}>
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {patient.photoURL ? (
            <img
              src={patient.photoURL}
              alt={displayName}
              className="h-14 w-14 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
          )}

          {/* Name and demographics */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(TYPOGRAPHY.subheading, "truncate")}>
              {displayName}
            </h3>
            {/* Age and Gender — omitted entirely when null/undefined */}
            {(age != null || gender != null) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {[
                  age != null ? `${age} years` : null,
                  gender != null ? gender : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{phone ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{email ?? "—"}</span>
          </div>
        </div>

        {/* View Full Profile Button */}
        <div className="mt-4">
          <Link href={`/doctor/patients/${patientId}`}>
            <PremiumButton
              variant="outline"
              size="sm"
              fullWidth
              icon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              View Full Profile
            </PremiumButton>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
