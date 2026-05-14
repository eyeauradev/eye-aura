export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "appointment_completed"
  | "prescription_created"
  | "prescription_updated"
  | "support_ticket_response"
  | "support_ticket_resolved"
  | "profile_updated"
  | "general";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface NotificationGroup {
  type: NotificationType;
  notifications: Notification[];
  count: number;
  latest: Notification;
}
