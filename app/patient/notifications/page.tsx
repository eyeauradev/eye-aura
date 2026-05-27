"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { notificationsService } from "@/services/notifications/notifications.service";
import { EA, eaError } from "@/lib/errors";
import { Bell, Calendar, FileText, MessageSquare, Check, X, Clock, Trash2 } from "lucide-react";
import {
  DashboardCard,
  StatusBadge,
  PremiumButton,
  SectionHeader,
  GlassPanel,
} from "@/components/patient-portal";

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

const notificationVariants: Record<string, "confirmed" | "cancelled" | "pending" | "completed" | "in_progress" | "requested" | "active"> = {
  booking_confirmed: "confirmed",
  booking_cancelled: "cancelled",
  booking_reminder: "pending",
  appointment_completed: "completed",
  prescription_created: "in_progress",
  prescription_updated: "in_progress",
  support_ticket_response: "requested",
  support_ticket_resolved: "confirmed",
  profile_updated: "active",
  general: "pending",
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
        eaError(EA.GEN_001, error);
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="mt-4 text-base text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Notifications</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Stay updated with your account activity
          </p>
        </div>
        {unreadCount > 0 && (
          <PremiumButton variant="outline" onClick={handleMarkAllAsRead} icon={<Check className="h-5 w-5" />}>
            Mark All as Read
          </PremiumButton>
        )}
      </div>

      <div className="max-w-4xl">
        {notifications.length === 0 ? (
          <GlassPanel padding="lg" className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Bell className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Notifications</h3>
            <p className="text-base text-muted-foreground">
              You&apos;re all caught up! New notifications will appear here.
            </p>
          </GlassPanel>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification, i) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const variant = notificationVariants[notification.type] || "pending";

              return (
                <DashboardCard
                  key={notification.id}
                  staggerIndex={i}
                  className={!notification.read ? "bg-card/90" : "bg-card/60"}
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/8">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className={`font-bold text-foreground ${!notification.read ? "text-lg" : "text-base"}`}>
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
                          <StatusBadge variant="active" size="sm">New</StatusBadge>
                        )}
                      </div>
                      <p className="text-base text-muted-foreground mb-4">{notification.message}</p>
                      <div className="flex items-center gap-3">
                        {notification.actionUrl && (
                          <Link href={notification.actionUrl}>
                            <PremiumButton variant="outline" size="sm">
                              View Details
                            </PremiumButton>
                          </Link>
                        )}
                        {!notification.read && (
                          <PremiumButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark as Read
                          </PremiumButton>
                        )}
                        <PremiumButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </PremiumButton>
                      </div>
                    </div>
                  </div>
                </DashboardCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
