import { v4 as uuidv4 } from "uuid";
import type { ServiceRecommendation } from "@/types/recommendations";
import type { Notification, NotificationType } from "@/types/notifications";

/**
 * RecommendationNotificationsService
 *
 * Handles all in-app notification events for the recommendation lifecycle.
 * Uses professional clinical language ("recommended" not "prescribed").
 * Routes notifications to the correct recipient based on event type.
 */

export interface RecommendationNotificationContext {
  recommendation: ServiceRecommendation;
  doctorName?: string;
  patientName?: string;
  serviceName?: string;
}

class RecommendationNotificationsService {
  /**
   * Notify patient that a doctor has recommended a service.
   * Recipient: Patient
   */
  notifyRecommendationCreated(context: RecommendationNotificationContext): Notification {
    const { recommendation, doctorName, serviceName } = context;
    const slotDate = new Date(recommendation.recommendedSlotStart).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const slotTime = new Date(recommendation.recommendedSlotStart).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      id: uuidv4(),
      userId: recommendation.patientId,
      type: "recommendation_created" as NotificationType,
      title: "New Service Recommended",
      message: `Dr. ${doctorName || "Your doctor"} has recommended ${serviceName || "a service"} for you on ${slotDate} at ${slotTime}. Please review and respond within 7 days.`,
      data: { recommendationId: recommendation.id },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/recommendations`,
    };
  }

  /**
   * Notify doctor that a patient has accepted the recommendation.
   * Recipient: Doctor
   */
  notifyRecommendationAccepted(context: RecommendationNotificationContext): Notification {
    const { recommendation, patientName, serviceName } = context;

    return {
      id: uuidv4(),
      userId: recommendation.doctorId,
      type: "recommendation_accepted" as NotificationType,
      title: "Recommendation Accepted",
      message: `${patientName || "Your patient"} has accepted your recommended ${serviceName || "service"} and completed payment. The appointment has been confirmed.`,
      data: { recommendationId: recommendation.id },
      read: false,
      createdAt: new Date(),
      actionUrl: `/doctor/patients/${recommendation.patientId}`,
    };
  }

  /**
   * Notify doctor that a patient has declined the recommendation.
   * Recipient: Doctor
   */
  notifyRecommendationDeclined(context: RecommendationNotificationContext): Notification {
    const { recommendation, patientName, serviceName } = context;
    const reasonSuffix = recommendation.declineReason
      ? ` Reason: "${recommendation.declineReason}"`
      : "";

    return {
      id: uuidv4(),
      userId: recommendation.doctorId,
      type: "recommendation_declined" as NotificationType,
      title: "Recommendation Declined",
      message: `${patientName || "Your patient"} has declined your recommended ${serviceName || "service"}.${reasonSuffix}`,
      data: { recommendationId: recommendation.id },
      read: false,
      createdAt: new Date(),
      actionUrl: `/doctor/patients/${recommendation.patientId}`,
    };
  }

  /**
   * Notify patient that the doctor has cancelled the recommendation.
   * Recipient: Patient
   */
  notifyRecommendationCancelled(context: RecommendationNotificationContext): Notification {
    const { recommendation, doctorName, serviceName } = context;

    return {
      id: uuidv4(),
      userId: recommendation.patientId,
      type: "recommendation_cancelled" as NotificationType,
      title: "Recommendation Cancelled",
      message: `Dr. ${doctorName || "Your doctor"} has cancelled the recommended ${serviceName || "service"}. The reserved time slot has been released.`,
      data: { recommendationId: recommendation.id },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/recommendations`,
    };
  }

  /**
   * Notify both patient and doctor that a recommendation has expired.
   * Returns an array with notifications for both parties.
   * Recipients: Patient AND Doctor
   */
  notifyRecommendationExpired(context: RecommendationNotificationContext): Notification[] {
    const { recommendation, doctorName, patientName, serviceName } = context;

    const patientNotification: Notification = {
      id: uuidv4(),
      userId: recommendation.patientId,
      type: "recommendation_expired" as NotificationType,
      title: "Recommendation Expired",
      message: `Your recommended ${serviceName || "service"} from Dr. ${doctorName || "your doctor"} has expired after 7 days. Please contact your doctor if you would still like to schedule this service.`,
      data: { recommendationId: recommendation.id },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/recommendations`,
    };

    const doctorNotification: Notification = {
      id: uuidv4(),
      userId: recommendation.doctorId,
      type: "recommendation_expired" as NotificationType,
      title: "Recommendation Expired",
      message: `Your recommended ${serviceName || "service"} for ${patientName || "your patient"} has expired without a response. The reserved time slot has been released.`,
      data: { recommendationId: recommendation.id },
      read: false,
      createdAt: new Date(),
      actionUrl: `/doctor/patients/${recommendation.patientId}`,
    };

    return [patientNotification, doctorNotification];
  }

  /**
   * Notify patient that the doctor has edited the recommendation.
   * Recipient: Patient
   */
  notifyRecommendationEdited(context: RecommendationNotificationContext): Notification {
    const { recommendation, doctorName, serviceName } = context;
    const slotDate = new Date(recommendation.recommendedSlotStart).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const slotTime = new Date(recommendation.recommendedSlotStart).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      id: uuidv4(),
      userId: recommendation.patientId,
      type: "recommendation_edited" as NotificationType,
      title: "Recommendation Updated",
      message: `Dr. ${doctorName || "Your doctor"} has updated the recommended ${serviceName || "service"}. New appointment: ${slotDate} at ${slotTime}. Please review the updated details.`,
      data: { recommendationId: recommendation.id },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/recommendations`,
    };
  }
}

export const recommendationNotificationsService = new RecommendationNotificationsService();
