"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { notificationsService } from "@/services/notifications/notifications.service";
import { Bell, Calendar, FileText, MessageSquare, Check, X, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/section-container";
import Link from "next/link";

const notificationIcons: Record<string, any> = {
  booking_confirmed: Calendar,
  booking_cancelled: X,
  booking_reminder: Clock,
  appointment_completed: Check,
  prescription_created: FileText,
  prescription_updated: FileText,
  support_ticket_response: MessageSquare,
  support_ticket_resolved: Check,
  profile_updated: Check,
  general: Bell,
};

const notificationColors: Record<string, string> = {
  booking_confirmed: "bg-green-100 text-green-800 border-green-200",
  booking_cancelled: "bg-red-100 text-red-800 border-red-200",
  booking_reminder: "bg-yellow-100 text-yellow-800 border-yellow-200",
  appointment_completed: "bg-blue-100 text-blue-800 border-blue-200",
  prescription_created: "bg-purple-100 text-purple-800 border-purple-200",
  prescription_updated: "bg-purple-100 text-purple-800 border-purple-200",
  support_ticket_response: "bg-orange-100 text-orange-800 border-orange-200",
  support_ticket_resolved: "bg-green-100 text-green-800 border-green-200",
  profile_updated: "bg-gray-100 text-gray-800 border-gray-200",
  general: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function PatientNotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      if (!user) return;

      try {
        setLoading(true);
        const userNotifications = await notificationsService.getByUserId(user.id);
        setNotifications(userNotifications);
        
        const unread = await notificationsService.getUnreadCount(user.id);
        setUnreadCount(unread);
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationsService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await notificationsService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (notificationId: string) => {
    await notificationsService.delete(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading notifications...</p>
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
              <h1 className="font-display text-3xl text-primary sm:text-4xl">Notifications</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Stay updated with your account activity
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead} className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>
      </div>

      <SectionContainer>
        <div className="mx-auto max-w-4xl">
          {notifications.length === 0 ? (
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-12 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display text-xl text-primary mb-2">No Notifications</h3>
                <p className="text-base text-muted-foreground">
                  You're all caught up! New notifications will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const color = notificationColors[notification.type] || notificationColors.general;

                return (
                  <Card
                    key={notification.id}
                    className={`border-primary/10 transition hover:shadow-lg ${
                      !notification.read ? "bg-white/80" : "bg-white/50"
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className={`font-bold text-primary ${!notification.read ? "text-lg" : "text-base"}`}>
                                {notification.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(notification.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            {!notification.read && (
                              <Badge className="bg-secondary text-white">New</Badge>
                            )}
                          </div>
                          <p className="text-base text-muted-foreground mb-4">{notification.message}</p>
                          <div className="flex items-center gap-3">
                            {notification.actionUrl && (
                              <Link href={notification.actionUrl}>
                                <Button variant="outline">
                                  View Details
                                </Button>
                              </Link>
                            )}
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                Mark as Read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              onClick={() => handleDelete(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </SectionContainer>
    </div>
  );
}
