"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { supportTicketsService, usersService } from "@/services/firestore";
import { v4 as uuidv4 } from "uuid";
import { MessageSquare, Plus, ArrowRight, Clock, CheckCircle, AlertCircle, HelpCircle, CreditCard, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionContainer } from "@/components/section-container";

const categories = [
  { id: "billing", label: "Billing", icon: CreditCard, description: "Payment and refund issues" },
  { id: "technical", label: "Technical", icon: HelpCircle, description: "Platform or app issues" },
  { id: "appointment", label: "Appointment", icon: CalendarIcon, description: "Booking and scheduling" },
  { id: "prescription", label: "Prescription", icon: CheckCircle, description: "Prescription related" },
  { id: "general", label: "General", icon: MessageSquare, description: "Other inquiries" },
] as const;

const priorities = [
  { id: "low", label: "Low", color: "bg-gray-100 text-gray-800 border-gray-200" },
  { id: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { id: "high", label: "High", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { id: "urgent", label: "Urgent", color: "bg-red-100 text-red-800 border-red-200" },
] as const;

const statusConfig = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800 border-blue-200" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 border-green-200" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function PatientSupportPage() {
  const { user } = useAuth();
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
        console.error("Error loading tickets:", error);
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
      console.error("Error creating ticket:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-primary sm:text-4xl">Support Center</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Get help with your questions and concerns
              </p>
            </div>
            {!showNewTicket && (
              <Button size="lg" onClick={() => setShowNewTicket(true)} className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                New Ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      <SectionContainer>
        <div className="mx-auto max-w-6xl">
          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-green-50 text-green-700 border border-green-200 flex items-center gap-3">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-bold">Support ticket created successfully</span>
            </div>
          )}

          {showNewTicket ? (
            <Card className="border-primary/10 mb-6">
              <CardHeader>
                <CardTitle>Create New Support Ticket</CardTitle>
              </CardHeader>
              <CardContent>
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
                                : "border-primary/10 bg-white/50 hover:bg-white"
                            }`}
                          >
                            <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                            <p className="text-sm font-bold text-primary">{cat.label}</p>
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
                              : "border-primary/10 bg-white/50 hover:bg-white"
                          }`}
                        >
                          <span className={`text-sm font-bold ${newTicket.priority === prio.id ? "text-primary" : "text-muted-foreground"}`}>
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
                      className="w-full h-40 rounded-2xl border border-primary/20 bg-white/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary/50"
                      required
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground text-right">{newTicket.description.length}/1000</p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewTicket(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Ticket"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              {tickets.length === 0 ? (
                <Card className="border-primary/10 bg-primary/5">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-display text-xl text-primary mb-2">No Support Tickets Yet</h3>
                    <p className="text-base text-muted-foreground mb-6">
                      Have a question or concern? Create a new support ticket and we'll help you out.
                    </p>
                    <Button size="lg" onClick={() => setShowNewTicket(true)} className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Create New Ticket
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <Card key={ticket.id} className="border-primary/10 transition hover:-translate-y-1 hover:shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-display text-lg text-primary mb-1">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{ticket.category}</p>
                          </div>
                          <Badge className={statusConfig[ticket.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                            {statusConfig[ticket.status as keyof typeof statusConfig]?.label || ticket.status}
                          </Badge>
                        </div>
                        <p className="text-base text-muted-foreground mb-4 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </div>
                            <Badge className={priorities.find((p) => p.id === ticket.priority)?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <Link href={`/patient/support/${ticket.id}`}>
                            <Button variant="outline" className="flex items-center gap-2">
                              View Details
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SectionContainer>
    </div>
  );
}
