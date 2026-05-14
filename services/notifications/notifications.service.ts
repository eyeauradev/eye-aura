import { v4 as uuidv4 } from "uuid";
import type { Notification, NotificationType } from "@/types/notifications";

export class NotificationsService {
  private notifications: Map<string, Notification> = new Map();

  async create(notification: Omit<Notification, "id" | "createdAt">): Promise<Notification> {
    const newNotification: Notification = {
      id: uuidv4(),
      ...notification,
      createdAt: new Date(),
    };

    this.notifications.set(newNotification.id, newNotification);
    
    // In production, this would save to Firestore
    // await addDoc(collection(db, "notifications"), newNotification);

    return newNotification;
  }

  async getByUserId(userId: string): Promise<Notification[]> {
    // In production, this would query Firestore
    // const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    // const snapshot = await getDocs(q);
    // return snapshot.docs.map(doc => doc.data() as Notification);

    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return userNotifications;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }

    // In production, this would update Firestore
    // await updateDoc(doc(db, "notifications", notificationId), { read: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);
    
    userNotifications.forEach(n => n.read = true);

    // In production, this would batch update Firestore
    // const batch = writeBatch(db);
    // userNotifications.forEach(n => {
    //   batch.update(doc(db, "notifications", n.id), { read: true });
    // });
    // await batch.commit();
  }

  async delete(notificationId: string): Promise<void> {
    this.notifications.delete(notificationId);

    // In production, this would delete from Firestore
    // await deleteDoc(doc(db, "notifications", notificationId));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.read);
    
    return userNotifications.length;
  }

  groupNotifications(notifications: Notification[]): Map<NotificationType, Notification[]> {
    const groups = new Map<NotificationType, Notification[]>();
    
    notifications.forEach(notification => {
      if (!groups.has(notification.type)) {
        groups.set(notification.type, []);
      }
      groups.get(notification.type)!.push(notification);
    });

    return groups;
  }

  // Helper methods to create specific notification types
  createBookingConfirmed(userId: string, appointmentId: string): Notification {
    return {
      id: uuidv4(),
      userId,
      type: "booking_confirmed",
      title: "Booking Confirmed",
      message: "Your appointment has been successfully confirmed.",
      data: { appointmentId },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/appointments/${appointmentId}`,
    };
  }

  createBookingReminder(userId: string, appointmentId: string, date: Date): Notification {
    return {
      id: uuidv4(),
      userId,
      type: "booking_reminder",
      title: "Appointment Reminder",
      message: `Your appointment is scheduled for ${date.toLocaleDateString()}.`,
      data: { appointmentId },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/appointments/${appointmentId}`,
    };
  }

  createPrescriptionCreated(userId: string, prescriptionId: string): Notification {
    return {
      id: uuidv4(),
      userId,
      type: "prescription_created",
      title: "New Prescription",
      message: "A new prescription has been added to your account.",
      data: { prescriptionId },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/prescriptions/${prescriptionId}`,
    };
  }

  createSupportTicketResponse(userId: string, ticketId: string): Notification {
    return {
      id: uuidv4(),
      userId,
      type: "support_ticket_response",
      title: "Support Ticket Update",
      message: "You have a new response to your support ticket.",
      data: { ticketId },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/support/${ticketId}`,
    };
  }
}

export const notificationsService = new NotificationsService();
