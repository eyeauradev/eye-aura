"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { supportTicketsService, usersService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { ArrowLeft, MessageSquare, User, Clock, Send } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";

import Link from "next/link";
import type { SupportTicketDocument } from "@/types/firestore";

export default function AdminSupportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<SupportTicketDocument | null>(null);
  const [ticketUser, setTicketUser] = useState<any>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      if (!params.id) return;

      try {
        setLoading(true);
        const ticketData = await supportTicketsService.getById(params.id as string);
        setTicket(ticketData);

        if (ticketData) {
          const userData = await usersService.getById(ticketData.userId);
          setTicketUser(userData);
        }
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.SUPPORT.OPERATION_FAILED);
        logError(appError.code, error, "SupportModule");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [params.id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!ticket) return;

    try {
      await supportTicketsService.update(ticket.id, { status: newStatus as any });
      setTicket({ ...ticket, status: newStatus as any });
    } catch (error) {
      const appError = getDisplayError(error, ERROR_CODES.SUPPORT.OPERATION_FAILED);
      logError(appError.code, error, "SupportModule");
      errorFromAppError(appError);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !responseText.trim() || !user) return;

    try {
      setSubmitting(true);

      const newResponse = {
        message: responseText,
        authorId: user.id,
        createdAt: new Date(),
      };

      await supportTicketsService.update(ticket.id, {
        responses: [...ticket.responses, newResponse],
        status: "in_progress",
      });

      setTicket({
        ...ticket,
        responses: [...ticket.responses, newResponse],
        status: "in_progress",
      });
      setResponseText("");
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Ticket not found</p>
            <Link href="/admin/support">
              <PremiumButton variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Support
              </PremiumButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/support">
            <PremiumButton variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Support
            </PremiumButton>
          </Link>
          <h1 className={TYPOGRAPHY.heading}>{ticket.subject}</h1>
          <p className={TYPOGRAPHY.label}>
            {ticketUser?.displayName || "Unknown"} • {ticket.priority}
          </p>
        </div>
        <div className="flex gap-3">
          {ticket.status === "open" && (
            <PremiumButton onClick={() => handleUpdateStatus("in_progress")} variant="outline">
              Mark In Progress
            </PremiumButton>
          )}
          {ticket.status === "in_progress" && (
            <>
              <PremiumButton onClick={() => handleUpdateStatus("resolved")} variant="outline">
                Mark Resolved
              </PremiumButton>
              <PremiumButton onClick={() => handleUpdateStatus("closed")} variant="outline">
                Mark Closed
              </PremiumButton>
            </>
          )}
          {ticket.status === "resolved" && (
            <PremiumButton onClick={() => handleUpdateStatus("closed")} variant="outline">
              Close Ticket
            </PremiumButton>
          )}
        </div>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Ticket Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium text-primary">
                {ticket.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            {ticket.resolvedAt && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="font-medium text-primary">
                  {ticket.resolvedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Initial Message */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium text-primary">{ticketUser?.displayName || "Unknown"}</p>
                  <span className="text-xs text-muted-foreground">
                    {ticket.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </div>

            {/* Responses */}
            {ticket.responses.map((response, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 p-4 rounded-xl border ${
                  response.authorId === user?.id
                    ? "bg-secondary/5 border-secondary/10"
                    : "bg-white/50 border-primary/10"
                }`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  response.authorId === user?.id
                    ? "bg-secondary/10"
                    : "bg-primary/10"
                }`}>
                  <User className={`h-5 w-5 ${
                    response.authorId === user?.id
                      ? "text-secondary"
                      : "text-primary"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-primary">
                      {response.authorId === user?.id ? "You" : "User"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {response.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{response.message}</p>
                </div>
              </div>
            ))}

            {/* Response Form */}
            {ticket.status !== "closed" && (
              <form onSubmit={handleSubmitResponse} className="flex gap-3">
                <Input
                  placeholder="Type your response..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="flex-1"
                />
                <PremiumButton type="submit" disabled={submitting || !responseText.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Sending..." : "Send"}
                </PremiumButton>
              </form>
            )}
          </CardContent>
        </Card>
      
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in_progress":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-200";
    case "closed":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
