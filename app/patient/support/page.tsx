"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { supportTicketsService, usersService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { v4 as uuidv4 } from "uuid";
import { MessageSquare, Plus, ArrowRight, Clock, CheckCircle, AlertCircle, HelpCircle, CreditCard, Calendar as CalendarIcon } from "lucide-react";
import { trackSupportTicketCreated } from "@/services/analytics/analytics.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
} from "@/components/patient-portal";


const categories = [
  { id: "billing", label: "Billing", icon: CreditCard, description: "Payment and refund issues" },
  { id: "technical", label: "Technical", icon: HelpCircle, description: "Platform or app issues" },
  { id: "appointment", label: "Appointment", icon: CalendarIcon, description: "Booking and scheduling" },
  { id: "prescription", label: "Prescription", icon: CheckCircle, description: "Prescription related" },
  { id: "general", label: "General", icon: MessageSquare, description: "Other inquiries" },
] as const;

const priorities = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
] as const;

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

export default function PatientSupportPage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    category: "general" as any,
    priority: "medium" as any,
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadTickets() {
      if (!user) return;

      try {
        setLoading(true);
        const ticketData = await supportTicketsService.getByUserId(user.id, 50);
        
        const enrichedTickets = await Promise.all(
          ticketData.map(async (ticket) => {
            const assignedTo = ticket.assignedTo ? await usersService.getById(ticket.assignedTo) : null;
            return { ...ticket, assignedTo };
          })
        );

        setTickets(enrichedTickets);
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.SUPPORT.OPERATION_FAILED);
        logError(appError.code, error, "SupportModule");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadTickets();
  }, [user]);

  const handleSubmitNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setSuccess(false);

    try {
      const ticket = await supportTicketsService.create({
        id: uuidv4(),
        userId: user.id,
        subject: newTicket.subject,
        message: newTicket.description,
        description: newTicket.description,
        category: newTicket.category,
        status: "open",
        priority: newTicket.priority,
        responses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        trackSupportTicketCreated({ category: newTicket.category });
      } catch { /* analytics is non-critical */ }

      setSuccess(true);
      setShowNewTicket(false);
      setNewTicket({
        subject: "",
        description: "",
        category: "general",
        priority: "medium",
      });

      // Reload tickets
      const ticketData = await supportTicketsService.getByUserId(user.id, 50);
      setTickets(ticketData);

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      const appError = getDisplayError(error, ERROR_CODES.SUPPORT.OPERATION_FAILED);
      logError(appError.code, error, "SupportModule");
      errorFromAppError(appError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Support Center</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Get help with your questions and concerns
          </p>
        </div>
        {!showNewTicket && (
          <PremiumButton size="lg" onClick={() => setShowNewTicket(true)} icon={<Plus className="h-5 w-5" />}>
            New Ticket
          </PremiumButton>
        )}
      </div>

      <div className="max-w-6xl">
        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/5 text-primary border border-primary/20 flex items-center gap-3">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-bold">Support ticket created successfully</span>
          </div>
        )}

        {showNewTicket ? (
          <DashboardCard disableHover className="mb-6">
            <SectionHeader title="Create New Support Ticket" className="mt-0 mb-6" />
            <form onSubmit={handleSubmitNewTicket} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewTicket({ ...newTicket, category: cat.id as any })}
                        className={`p-4 rounded-2xl border-2 transition ${
                          newTicket.category === cat.id
                            ? "border-secondary bg-secondary/5"
                            : "border-border/50 bg-card/50 hover:bg-card/80"
                        }`}
                      >
                        <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                        <p className="text-sm font-bold text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <div className="flex gap-3">
                  {priorities.map((prio) => (
                    <button
                      key={prio.id}
                      type="button"
                      onClick={() => setNewTicket({ ...newTicket, priority: prio.id as any })}
                      className={`px-4 py-2 rounded-xl border-2 transition ${
                        newTicket.priority === prio.id
                          ? "border-secondary bg-secondary/5"
                          : "border-border/50 bg-card/50 hover:bg-card/80"
                      }`}
                    >
                      <span className={`text-sm font-bold ${newTicket.priority === prio.id ? "text-foreground" : "text-muted-foreground"}`}>
                        {prio.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Brief summary of your issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Please provide detailed information about your issue..."
                  className="w-full h-40 rounded-2xl border border-border bg-card/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                  required
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{newTicket.description.length}/1000</p>
              </div>

              <div className="flex gap-3">
                <PremiumButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewTicket(false)}
                  disabled={submitting}
                >
                  Cancel
                </PremiumButton>
                <PremiumButton type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </PremiumButton>
              </div>
            </form>
          </DashboardCard>
        ) : (
          <>
            {tickets.length === 0 ? (
              <GlassPanel padding="lg" className="text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Support Tickets Yet</h3>
                <p className="text-base text-muted-foreground mb-6">
                  Have a question or concern? Create a new support ticket and we&apos;ll help you out.
                </p>
                <PremiumButton size="lg" onClick={() => setShowNewTicket(true)} icon={<Plus className="h-5 w-5" />}>
                  Create New Ticket
                </PremiumButton>
              </GlassPanel>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket, i) => (
                  <DashboardCard key={ticket.id} staggerIndex={i}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{ticket.category}</p>
                      </div>
                      <StatusBadge variant={statusVariantMap[ticket.status] || "pending"} size="sm">
                        {statusLabelMap[ticket.status] || ticket.status}
                      </StatusBadge>
                    </div>
                    <p className="text-base text-muted-foreground mb-4 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                        <StatusBadge variant={ticket.priority === "urgent" || ticket.priority === "high" ? "cancelled" : "pending"} size="sm">
                          {ticket.priority}
                        </StatusBadge>
                      </div>
                      <Link href={`/patient/support/${ticket.id}`}>
                        <PremiumButton variant="outline" size="sm" trailingIcon={<ArrowRight className="h-4 w-4" />}>
                          View Details
                        </PremiumButton>
                      </Link>
                    </div>
                  </DashboardCard>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
