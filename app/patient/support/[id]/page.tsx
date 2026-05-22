"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { supportTicketsService, usersService } from "@/services/firestore";
import { EA, eaError } from "@/lib/errors";
import { MessageSquare, ArrowLeft, Send, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


const statusConfig = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800 border-blue-200" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 border-green-200" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

const priorityConfig = {
  low: { color: "bg-gray-100 text-gray-800 border-gray-200" },
  medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  high: { color: "bg-orange-100 text-orange-800 border-orange-200" },
  urgent: { color: "bg-red-100 text-red-800 border-red-200" },
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF] px-5">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-8 text-center">
            <p className="text-base text-muted-foreground">Ticket not found</p>
            <Link href="/patient/support" className="inline-block mt-4">
              <Button>View Support Tickets</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canReply = ticket.status === "open" || ticket.status === "in_progress";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
      {/* Header */}
      <div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <Link
            href="/patient/support"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Support
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-primary sm:text-4xl">Support Ticket</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Ticket #{ticket.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <Badge className={statusConfig[ticket.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
              {statusConfig[ticket.status as keyof typeof statusConfig]?.label || ticket.status}
            </Badge>
          </div>
        </div>
      </div>

      
        <div className="mx-auto max-w-4xl">
          <div className="space-y-6">
            {/* Ticket Details */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{ticket.subject}</CardTitle>
                    <p className="text-base text-muted-foreground capitalize">{ticket.category}</p>
                  </div>
                  <Badge className={priorityConfig[ticket.priority as keyof typeof priorityConfig]?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                    {ticket.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-2xl bg-primary/5">
                  <p className="text-base text-primary leading-relaxed">{ticket.description}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Created</p>
                    <p className="text-base text-primary">
                      {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Last Updated</p>
                    <p className="text-base text-primary">
                      {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {assignedTo && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/5">
                    <User className="h-5 w-5 text-secondary" />
                    <div>
                      <p className="text-sm font-bold text-muted-foreground">Assigned to</p>
                      <p className="text-base text-primary">{assignedTo.displayName}</p>
                    </div>
                  </div>
                )}

                {ticket.resolvedAt && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
                    <AlertCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-bold text-green-800">Resolved on</p>
                      <p className="text-base text-green-700">
                        {new Date(ticket.resolvedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Responses */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle>Conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          : "bg-white/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-primary">{response.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(response.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className="text-base text-primary leading-relaxed">{response.message}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Reply Form */}
            {canReply && (
              <Card className="border-primary/10">
                <CardContent className="p-3 sm:p-6">
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message">Your Response</Label>
                      <textarea
                        id="message"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full h-32 rounded-2xl border border-primary/20 bg-white/70 p-4 text-base transition placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:border-secondary/50"
                        required
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground text-right">{newMessage.length}/1000</p>
                    </div>
                    <Button type="submit" disabled={submitting} className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      {submitting ? "Sending..." : "Send Response"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {!canReply && (
              <Card className="border-primary/10 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-base text-muted-foreground">
                    This ticket is {ticket.status}. You cannot reply to closed or resolved tickets.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      
    </div>
  );
}
