import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type {
  RecommendationAuditEntry,
  RecommendationAuditAction,
  RecommendationStatus,
} from "@/types/recommendations";

const COLLECTION_NAME = "recommendation_audit_log";

class RecommendationAuditService {
  private db = getFirebaseDb();

  async createEntry(params: {
    recommendationId: string;
    action: RecommendationAuditAction;
    actorId: string;
    actorRole: "doctor" | "patient" | "admin" | "system";
    previousStatus?: RecommendationStatus;
    newStatus?: RecommendationStatus;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const id = `audit_${params.recommendationId}_${Date.now()}`;
    const entry: RecommendationAuditEntry = {
      id,
      recommendationId: params.recommendationId,
      action: params.action,
      actorId: params.actorId,
      actorRole: params.actorRole,
      timestamp: new Date(),
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      metadata: params.metadata,
    };
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await setDoc(docRef, entry);
  }

  async getByRecommendationId(
    recommendationId: string
  ): Promise<RecommendationAuditEntry[]> {
    const q = query(
      collection(this.db, COLLECTION_NAME),
      where("recommendationId", "==", recommendationId),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as RecommendationAuditEntry)
    );
  }
}

export const recommendationAuditService = new RecommendationAuditService();
