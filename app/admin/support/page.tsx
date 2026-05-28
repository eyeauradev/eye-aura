"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supportTicketsService, usersService } from "@/services/firestore";
import { Search, Filter, MessageSquare } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";

import Link from "next/link";
import type { SupportTicketDocument } from "@/types/firestore";

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicketDocument[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function loadTickets() {
      try {
        setLoading(true);
        const allTickets = await supportTicketsService.getAll();
        setTickets(allTickets);

        // Load users
        const allUsers = await usersService.getAll();
        const userMap: Record<string, any> = {};
        allUsers.forEach((u) => {
          userMap[u.id] = u;
        });
        setUsers(userMap);
      } catch (error) {
        console.error("Error loading tickets:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      users[ticket.userId]?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      users[ticket.userId]?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className={TYPOGRAPHY.heading}>Support Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Manage platform support tickets
        </p>
      </div>

      
        <Card className="border-primary/10">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">All Tickets</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-52"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-primary/10 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" 
                    ? "No tickets found matching your filters" 
                    : "No support tickets yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    user={users[ticket.userId]}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      
    </div>
  );
}

function TicketCard({ 
  ticket, 
  user 
}: { 
  ticket: SupportTicketDocument; 
  user: any; 
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-primary/5 hover:border-primary/10 transition">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <MessageSquare className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary truncate">{ticket.subject}</p>
        <p className="text-sm text-muted-foreground truncate">{user?.displayName || "Unknown"} • {ticket.priority}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {ticket.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>
      <Link href={`/admin/support/${ticket.id}`} className="shrink-0">
        <PremiumButton variant="ghost" size="icon" className="h-8 w-8">
          <MessageSquare className="h-3.5 w-3.5" />
        </PremiumButton>
      </Link>
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
