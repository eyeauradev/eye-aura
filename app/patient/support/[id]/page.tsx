"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { supportTicketsService, usersService } from "@/services/firestore";
import { EA, eaError } from "@/lib/errors";
import { MessageSquare, ArrowLeft, Send, User, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
  InfoRow,
} from "@/components/patient-portal";


const statusVariantMap: Record<string, "pending" | "in_progress" | "confirmed" | "completed"> = {
  open: "pending",
  in_progress: "in_progress",
  resolved: "confirmed",
  closed: "completed",
};

const statusLabelMap: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const priorityVariantMap: Record<string, "pending" | "cancelled" | "requested"> = {
  low: "pending",
  medium: "pending",
  high: "cancelled",
  urgent: "cancelled",
};

export default function SupportTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [assignedTo, setAssignedTo] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      if (!params.id || !user) return;

      try {
        const ticketData = await supportTicketsService.getById(params.id as string);
        if (!ticketData || ticketData.userId !== user.id) {
          router.push("/patient/support");
          return;
        }

        setTicket(ticketData);

        if (ticketData.assignedTo) {
          const assignedToData = await usersService.getById(ticketData.assignedTo);
          setAssignedTo(assignedToData);
        }
      } catch (error) {
        eaError(EA.SUP_003, error);
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [params.id, user, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !newMessage.trim() || !user) return;

    setSubmitting(true);

    try {
      await supportTicketsService.addResponse(
        ticket.id,
        user.id,
        user.displayName || "You",
        newMessage,
        false
      );

      setNewMessage("");

      // Reload ticket
      const updatedTicket = await supportTicketsService.getById(ticket.id);
      setTicket(updatedTicket);
    } catch (error) {
      eaError(EA.SUP_004, error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-5">
        <GlassPanel padding="lg" className="max-w-md w-full text-center">
          <p className="text-base text-muted-foreground">Ticket not found</p>
          <Link href="/patient/support" className="inline-block mt-4">
            <PremiumButton>View Support Tickets</PremiumButton>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  const canReply = ticket.status === "open" || ticket.status === "in_progress";

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/patient/support"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Support Ticket</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Ticket #{ticket.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <StatusBadge variant={statusVariantMap[ticket.status] || "pending"} size="md">
          {statusLabelMap[ticket.status] || ticket.status}
        </StatusBadge>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Ticket Details */}
        <DashboardCard disableHover>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-foreground mb-2">{ticket.subject}</h2>
              <p className="text-base text-muted-foreground capitalize">{ticket.category}</p>
            </div>
            <StatusBadge variant={priorityVariantMap[ticket.priority] || "pending"} size="sm">
              {ticket.priority}
            </StatusBadge>
          </div>

          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-primary/3">
              <p className="text-base text-foreground leading-relaxed">{ticket.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                label="Created"
                value={new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
              <InfoRow
                label="Last Updated"
                value={new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>

            {assignedTo && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/5">
                <User className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] font-medium text-muted-foreground">Assigned to</p>
                  <p className="text-base font-semibold text-foreground">{assignedTo.displayName}</p>
                </div>
              </div>
            )}

            {ticket.resolvedAt && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <AlertCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">Resolved on</p>
                  <p className="text-base text-foreground/80">
                    {new Date(ticket.resolvedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Responses */}
        <DashboardCard disableHover staggerIndex={1}>
          <SectionHeader title="Conversation" className="mt-0 mb-4" />
          <div className="space-y-4">
            {ticket.responses.length === 0 ? (
              <p className="text-base text-muted-foreground text-center py-8">
                No responses yet. Be the first to reply.
              </p>
            ) : (
              ticket.responses.map((response: any) => (
                <div
                  key={response.id}
                  className={`p-4 rounded-2xl ${
                    response.authorId === user?.id
                      ? "bg-secondary/10 ml-8"
                      : "bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-foreground">{response.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(response.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="text-base text-foreground leading-relaxed">{response.message}</p>
                </div>
              ))
            )}
          </div>
        </DashboardCard>

        {/* Reply Form */}
        {canReply && (
          <DashboardCard disableHover staggerIndex={2}>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Your Response</Label>
                <textarea
                  id="message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full h-32 rounded-2xl border border-border bg-card/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  required
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{newMessage.length}/1000</p>
              </div>
              <PremiumButton type="submit" disabled={submitting} icon={<Send className="h-5 w-5" />}>
                {submitting ? "Sending..." : "Send Response"}
              </PremiumButton>
            </form>
          </DashboardCard>
        )}

        {!canReply && (
          <GlassPanel padding="md" className="text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-base text-muted-foreground">
              This ticket is {ticket.status}. You cannot reply to closed or resolved tickets.
            </p>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
