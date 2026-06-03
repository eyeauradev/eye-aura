import { v4 as uuidv4 } from "uuid";
import type { Notification, NotificationType } from "@/types/notifications";

/**
 * AssessmentNotificationsService
 *
 * Handles all in-app notification events for the assessment lifecycle.
 * Routes notifications to the correct recipient based on event type.
 */

export interface AssessmentNotificationContext {
  assessmentId: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  patientName?: string;
  assessmentType: string;
  timing: "now" | "schedule_later";
  scheduledDate?: Date;
}

class AssessmentNotificationsService {
  /**
   * Notify patient that a doctor has assigned an assessment.
   * Recipient: Patient
   */
  notifyAssessmentAssigned(context: AssessmentNotificationContext): Notification {
    const { assessmentId, patientId, doctorName, assessmentType, timing, scheduledDate } = context;

    let timingDetails: string;
    if (timing === "now") {
      timingDetails = "available now for completion";
    } else if (scheduledDate) {
      const dateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      timingDetails = `scheduled for ${dateStr}`;
    } else {
      timingDetails = "scheduled for a later date";
    }

    return {
      id: uuidv4(),
      userId: patientId,
      type: "assessment_assigned" as NotificationType,
      title: "New Assessment Assigned",
      message: `Dr. ${doctorName || "Your doctor"} has assigned a ${assessmentType} assessment, ${timingDetails}.`,
      data: { assessmentId },
      read: false,
      createdAt: new Date(),
      actionUrl: `/patient/assessments`,
    };
  }

  /**
   * Notify doctor that a patient has completed the assessment.
   * Recipient: Doctor
   */
  notifyAssessmentCompleted(context: AssessmentNotificationContext): Notification {
    const { assessmentId, patientId, doctorId, patientName, assessmentType } = context;

    return {
      id: uuidv4(),
      userId: doctorId,
      type: "assessment_completed" as NotificationType,
      title: "Assessment Completed",
      message: `${patientName || "Your patient"} has completed the ${assessmentType} assessment.`,
      data: { assessmentId },
      read: false,
      createdAt: new Date(),
      actionUrl: `/doctor/patients/${patientId}`,
    };
  }
}

export const assessmentNotificationsService = new AssessmentNotificationsService();
