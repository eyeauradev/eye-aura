import { collection, doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type { Notification } from "@/types/notifications";

const COLLECTION_NAME = "notifications";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * NotificationDeliveryService
 *
 * Wraps notification persistence to Firestore with retry logic and exponential backoff.
 * On delivery failure after all retries, persists the notification in an "undelivered"
 * state for later retrieval.
 */
class NotificationDeliveryService {
  /**
   * Deliver (persist) a notification to Firestore.
   * Retries up to 3 times with exponential backoff (1s, 2s, 4s) on failure.
   * After 3rd failure: persists notification with deliveryStatus: "undelivered".
   */
  async deliver(notification: Notification): Promise<void> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.persistNotification(notification);
        return; // Success — exit early
      } catch (error) {
        lastError = error;
        console.error(
          `[NotificationDeliveryService] Delivery attempt ${attempt + 1}/${MAX_RETRIES} failed for notification ${notification.id}:`,
          error
        );

        // Wait with exponential backoff before next retry (skip wait after last attempt)
        if (attempt < MAX_RETRIES - 1) {
          await this.delay(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    // All retries exhausted — persist as undelivered and log failure
    console.error(
      `[NotificationDeliveryService] All ${MAX_RETRIES} delivery attempts failed for notification ${notification.id}. Persisting as undelivered.`
    );

    await this.persistAsUndelivered(notification);
    this.logFailureToAudit(notification, lastError);
  }

  /**
   * Persist a notification to the "notifications" Firestore collection.
   */
  private async persistNotification(notification: Notification): Promise<void> {
    const db = getFirebaseDb();
    const docRef = doc(collection(db, COLLECTION_NAME), notification.id);
    await setDoc(docRef, {
      ...notification,
      createdAt: notification.createdAt instanceof Date
        ? notification.createdAt.toISOString()
        : notification.createdAt,
    });
  }

  /**
   * Persist the notification with deliveryStatus: "undelivered" so it can be
   * retrieved later (e.g., next time the user logs in).
   */
  private async persistAsUndelivered(notification: Notification): Promise<void> {
    try {
      const db = getFirebaseDb();
      const docRef = doc(collection(db, COLLECTION_NAME), notification.id);
      await setDoc(docRef, {
        ...notification,
        createdAt: notification.createdAt instanceof Date
          ? notification.createdAt.toISOString()
          : notification.createdAt,
        deliveryStatus: "undelivered",
      });
    } catch (error) {
      // Last-resort failure: log but don't throw — the caller should not be blocked
      console.error(
        `[NotificationDeliveryService] Failed to persist undelivered notification ${notification.id}:`,
        error
      );
    }
  }

  /**
   * Log the notification delivery failure in the audit service.
   */
  private logFailureToAudit(notification: Notification, error: unknown): void {
    console.error(
      `[NotificationDeliveryService] [AUDIT] Notification delivery failed permanently`,
      {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Wait for a specified duration.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const notificationDeliveryService = new NotificationDeliveryService();
