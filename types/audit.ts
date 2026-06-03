import type { AssignmentTiming } from "@/types/firestore";

/**
 * Base interface shared between recommendation and assessment audit entries.
 * All audit log entries (regardless of action type) must contain these fields.
 *
 * Validates: Requirements 10.4, 10.7, 10.8
 */
export interface AuditEntryBase {
  id: string;
  /** The user ID of the actor, or "system" for automated actions */
  actor: string;
  actorRole: "doctor" | "patient" | "admin" | "system";
  action: string;
  patientId: string;
  doctorId: string;
  /** Timestamp in ISO 8601 UTC format */
  timestamp: Date;
  /** Action-specific details */
  metadata: Record<string, unknown>;
}

/**
 * Assessment-specific audit actions.
 */
export type AssessmentAuditAction =
  | "assessment_assigned"
  | "assessment_completed"
  | "assessment_cancelled";

/**
 * Audit entry for assessment lifecycle events.
 * Extends the base audit structure with assessment-specific fields.
 *
 * Validates: Requirements 10.4, 10.7, 10.8
 */
export interface AssessmentAuditEntry extends AuditEntryBase {
  assessmentId: string;
  action: AssessmentAuditAction;
  metadata: {
    assessmentType?: string;
    timing?: AssignmentTiming;
    scheduledDate?: string;
    [key: string]: unknown;
  };
}
