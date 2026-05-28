"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { doctorInvitesService } from "@/services/firestore";
import type { DoctorInviteDocument, InviteStatus } from "@/types/firestore";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";

import { Mail, Copy, RefreshCw, X, Clock, CheckCircle, AlertCircle, Calendar, User as UserIcon } from "lucide-react";

export default function DoctorInvitesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<DoctorInviteDocument[]>([]);
  const [openedInvites, setOpenedInvites] = useState<DoctorInviteDocument[]>([]);
  const [completedInvites, setCompletedInvites] = useState<DoctorInviteDocument[]>([]);
  const [failedInvites, setFailedInvites] = useState<DoctorInviteDocument[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvites() {
      if (!user) return;

      try {
        setLoading(true);
        const [pending, opened, completed, failed] = await Promise.all([
          doctorInvitesService.getByStatus("pending"),
          doctorInvitesService.getByStatus("opened"),
          doctorInvitesService.getByStatus("completed"),
          doctorInvitesService.getByStatus("failed"),
        ]);

        setPendingInvites(pending);
        setOpenedInvites(opened);
        setCompletedInvites(completed);
        setFailedInvites(failed);
      } catch (error) {
        console.error("Error loading invites:", error);
      } finally {
        setLoading(false);
      }
    }

    loadInvites();
  }, [user]);

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
  };

  const handleResend = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const response = await fetch("/api/doctor-invites/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend invite");
      }
      
      // Reload invites
      const [pending, opened, completed, failed] = await Promise.all([
        doctorInvitesService.getByStatus("pending"),
        doctorInvitesService.getByStatus("opened"),
        doctorInvitesService.getByStatus("completed"),
        doctorInvitesService.getByStatus("failed"),
      ]);

      setPendingInvites(pending);
      setOpenedInvites(opened);
      setCompletedInvites(completed);
      setFailedInvites(failed);
    } catch (error) {
      console.error("Error resending invite:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      await doctorInvitesService.cancel(inviteId);
      
      // Reload invites
      const [pending, opened, completed, failed] = await Promise.all([
        doctorInvitesService.getByStatus("pending"),
        doctorInvitesService.getByStatus("opened"),
        doctorInvitesService.getByStatus("completed"),
        doctorInvitesService.getByStatus("failed"),
      ]);

      setPendingInvites(pending);
      setOpenedInvites(opened);
      setCompletedInvites(completed);
      setFailedInvites(failed);
    } catch (error) {
      console.error("Error cancelling invite:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadge = (status: InviteStatus) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>;
      case "opened":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Opened</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
    }
  };

  const renderInviteCard = (invite: DoctorInviteDocument) => (
    <Card key={invite.id} className="border-primary/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{invite.email}</span>
              {getStatusBadge(invite.status)}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {invite.invitedByName && (
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3 w-3" />
                  <span>Invited by: {invite.invitedByName}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Created: {invite.createdAt.toLocaleDateString()}</span>
              </div>
              
              {invite.openedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Opened: {invite.openedAt.toLocaleDateString()}</span>
                </div>
              )}
              
              {invite.completedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  <span>Completed: {invite.completedAt.toLocaleDateString()}</span>
                </div>
              )}
              
              {invite.status === "pending" && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Expires in {getDaysUntilExpiry(invite.expiresAt)} days</span>
                </div>
              )}
              
              {invite.resendCount > 0 && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3" />
                  <span>Resent {invite.resendCount} time(s)</span>
                </div>
              )}
              
              {invite.specialization && (
                <div>Specialization: {invite.specialization}</div>
              )}
              
              {invite.errorReason && (
                <div className="text-red-600">Error: {invite.errorReason}</div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {invite.status === "pending" && (
              <>
                <PremiumButton
                  variant="outline"
                  onClick={() => handleCopyLink(invite.token)}
                  disabled={actionLoading === invite.id}
                >
                  <Copy className="h-4 w-4" />
                </PremiumButton>
                <PremiumButton
                  variant="outline"
                  onClick={() => handleResend(invite.id)}
                  disabled={actionLoading === invite.id}
                >
                  <RefreshCw className="h-4 w-4" />
                </PremiumButton>
                <PremiumButton
                  variant="outline"
                  onClick={() => handleCancel(invite.id)}
                  disabled={actionLoading === invite.id}
                >
                  <X className="h-4 w-4" />
                </PremiumButton>
              </>
            )}
            
            {invite.status === "opened" && (
              <>
                <PremiumButton
                  variant="outline"
                  onClick={() => handleResend(invite.id)}
                  disabled={actionLoading === invite.id}
                >
                  <RefreshCw className="h-4 w-4" />
                </PremiumButton>
                <PremiumButton
                  variant="outline"
                  onClick={() => handleCancel(invite.id)}
                  disabled={actionLoading === invite.id}
                >
                  <X className="h-4 w-4" />
                </PremiumButton>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className={TYPOGRAPHY.heading}>Doctor Invites</h1>
        <p className="text-sm text-muted-foreground">
          Manage doctor invitation lifecycle
        </p>
      </div>

      
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Pending Invites */}
          <div>
            <h2 className="text-2xl font-display text-primary mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Pending Invites ({pendingInvites.length})
            </h2>
            {pendingInvites.length === 0 ? (
              <Card className="border-primary/10">
                <CardContent className="p-4 sm:p-8 text-center text-muted-foreground">
                  No pending invites
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingInvites.map(renderInviteCard)}
              </div>
            )}
          </div>

          {/* Opened Invites */}
          {openedInvites.length > 0 && (
            <div>
              <h2 className="text-2xl font-display text-primary mb-4 flex items-center gap-2">
                <Mail className="h-6 w-6" />
                Opened Invites ({openedInvites.length})
              </h2>
              <div className="grid gap-4">
                {openedInvites.map(renderInviteCard)}
              </div>
            </div>
          )}

          {/* Completed Invites */}
          {completedInvites.length > 0 && (
            <div>
              <h2 className="text-2xl font-display text-primary mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                Completed Invites ({completedInvites.length})
              </h2>
              <div className="grid gap-4">
                {completedInvites.map(renderInviteCard)}
              </div>
            </div>
          )}

          {/* Failed Invites */}
          {failedInvites.length > 0 && (
            <div>
              <h2 className="text-2xl font-display text-primary mb-4 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                Failed Invites ({failedInvites.length})
              </h2>
              <div className="grid gap-4">
                {failedInvites.map(renderInviteCard)}
              </div>
            </div>
          )}
        </div>
      
    </div>
  );
}
