import { collection, doc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getFirebaseDb } from "@/services/firebase/client";
import type {
  AssessmentAuditEntry,
  AssessmentAuditAction,
  AuditEntryBase,
} from "@/types/audit";
import type { AssignmentTiming } from "@/types/firestore";

const COLLECTION_NAME = "audit_logs";

interface BuildAssignedEntryParams {
  assessmentId: string;
  actor: string;
  actorRole: AuditEntryBase["actorRole"];
  patientId: string;
  doctorId: string;
  assessmentType: string;
  timing: AssignmentTiming;
  scheduledDate?: string;
}

interface BuildCompletedEntryParams {
  assessmentId: string;
  actor: string;
  actorRole: AuditEntryBase["actorRole"];
  patientId: string;
  doctorId: string;
  assessmentType?: string;
}

interface BuildCancelledEntryParams {
  assessmentId: string;
  actor: string;
  actorRole: AuditEntryBase["actorRole"];
  patientId: string;
  doctorId: string;
  reason?: string;
}

class AssessmentAuditService {
  /**
   * Build an audit entry for assessment_assigned action.
   */
  buildAssignedEntry(params: BuildAssignedEntryParams): AssessmentAuditEntry {
    return {
      id: uuidv4(),
      assessmentId: params.assessmentId,
      action: "assessment_assigned",
      actor: params.actor,
      actorRole: params.actorRole,
      timestamp: new Date(),
      patientId: params.patientId,
      doctorId: params.doctorId,
      metadata: {
        assessmentType: params.assessmentType,
        timing: params.timing,
        scheduledDate: params.scheduledDate,
      },
    };
  }

  /**
   * Build an audit entry for assessment_completed action.
   */
  buildCompletedEntry(params: BuildCompletedEntryParams): AssessmentAuditEntry {
    return {
      id: uuidv4(),
      assessmentId: params.assessmentId,
      action: "assessment_completed",
      actor: params.actor,
      actorRole: params.actorRole,
      timestamp: new Date(),
      patientId: params.patientId,
      doctorId: params.doctorId,
      metadata: {
        assessmentType: params.assessmentType,
      },
    };
  }

  /**
   * Build an audit entry for assessment_cancelled action.
   */
  buildCancelledEntry(params: BuildCancelledEntryParams): AssessmentAuditEntry {
    return {
      id: uuidv4(),
      assessmentId: params.assessmentId,
      action: "assessment_cancelled",
      actor: params.actor,
      actorRole: params.actorRole,
      timestamp: new Date(),
      patientId: params.patientId,
      doctorId: params.doctorId,
      metadata: {
        reason: params.reason,
      },
    };
  }

  /**
   * Persist an audit entry to Firestore.
   * On failure: logs the error and queues for retry within 60 seconds.
   * The originating action is never blocked by audit persistence failure.
   */
  async persistEntry(entry: AssessmentAuditEntry): Promise<void> {
    try {
      const db = getFirebaseDb();
      const docRef = doc(collection(db, COLLECTION_NAME), entry.id);
      await setDoc(docRef, {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      });
    } catch (error) {
      console.error(
        `[AssessmentAuditService] Failed to persist audit entry ${entry.id}:`,
        error
      );
      this.queueRetry(entry);
    }
  }

  /**
   * Queue a failed audit entry for retry within 60 seconds.
   * Uses setTimeout as a simple retry mechanism — does not block the caller.
   */
  private queueRetry(entry: AssessmentAuditEntry): void {
    setTimeout(async () => {
      try {
        const db = getFirebaseDb();
        const docRef = doc(collection(db, COLLECTION_NAME), entry.id);
        await setDoc(docRef, {
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        });
      } catch (retryError) {
        console.error(
          `[AssessmentAuditService] Retry failed for audit entry ${entry.id}:`,
          retryError
        );
      }
    }, 60_000);
  }
}

export const assessmentAuditService = new AssessmentAuditService();
