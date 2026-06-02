import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { recommendationConverter } from "./converters";
import type {
  ServiceRecommendation,
  RecommendationStatus,
  RecommendationMetrics,
  CreateRecommendationInput,
} from "@/types/recommendations";

const COLLECTION_NAME = "service_recommendations";

export class RecommendationsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(recommendationConverter);

  /**
   * Create a new recommendation with PENDING status.
   * ID format: rec_{patientId}_{doctorId}_{timestamp}
   */
  async create(
    data: CreateRecommendationInput & { reservationId: string; expiresAt: Date }
  ): Promise<ServiceRecommendation> {
    const now = new Date();
    const id = `rec_${data.patientId}_${data.doctorId}_${Date.now()}`;

    const recommendation: ServiceRecommendation = {
      id,
      patientId: data.patientId,
      doctorId: data.doctorId,
      serviceId: data.serviceId,
      recommendedSlotStart: data.recommendedSlotStart,
      recommendedSlotEnd: data.recommendedSlotEnd,
      status: "PENDING",
      recommendationNote: data.recommendationNote,
      reservationId: data.reservationId,
      expiresAt: data.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = doc(this.db, COLLECTION_NAME, id).withConverter(recommendationConverter);
    await setDoc(docRef, recommendation);
    return recommendation;
  }

  /**
   * Get a recommendation by ID.
   */
  async getById(id: string): Promise<ServiceRecommendation | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id).withConverter(recommendationConverter);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  /**
   * Update a recommendation. Sets updatedAt to now.
   */
  async update(id: string, updates: Partial<ServiceRecommendation>): Promise<ServiceRecommendation> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Recommendation not found after update");
    return updated;
  }

  /**
   * Query recommendations with given constraints.
   */
  private async query(constraints: QueryConstraint[]): Promise<ServiceRecommendation[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => d.data());
  }

  /**
   * Get recommendations for a patient, ordered by createdAt desc.
   */
  async getByPatientId(patientId: string, limitCount?: number): Promise<ServiceRecommendation[]> {
    const constraints: QueryConstraint[] = [
      where("patientId", "==", patientId),
      orderBy("createdAt", "desc"),
    ];
    if (limitCount) constraints.push(limit(limitCount));
    return this.query(constraints);
  }

  /**
   * Get recommendations for a doctor, ordered by createdAt desc.
   */
  async getByDoctorId(doctorId: string, limitCount?: number): Promise<ServiceRecommendation[]> {
    const constraints: QueryConstraint[] = [
      where("doctorId", "==", doctorId),
      orderBy("createdAt", "desc"),
    ];
    if (limitCount) constraints.push(limit(limitCount));
    return this.query(constraints);
  }

  /**
   * Get all recommendations, ordered by createdAt desc.
   */
  async getAll(limitCount?: number): Promise<ServiceRecommendation[]> {
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    if (limitCount) constraints.push(limit(limitCount));
    return this.query(constraints);
  }

  /**
   * Get recommendations by status.
   */
  async getByStatus(status: RecommendationStatus): Promise<ServiceRecommendation[]> {
    return this.query([where("status", "==", status)]);
  }

  /**
   * Get expired recommendations: status=PENDING AND expiresAt < now.
   */
  async getExpired(): Promise<ServiceRecommendation[]> {
    const now = Timestamp.now();
    return this.query([
      where("status", "==", "PENDING"),
      where("expiresAt", "<", now),
    ]);
  }

  /**
   * Get aggregate metrics for admin dashboard.
   * Conversion rate = accepted / (accepted + declined + expired) * 100
   */
  async getMetrics(): Promise<RecommendationMetrics> {
    const all = await this.query([]);
    const counts = {
      total: all.length,
      pending: 0,
      accepted: 0,
      declined: 0,
      cancelled: 0,
      expired: 0,
    };

    for (const rec of all) {
      switch (rec.status) {
        case "PENDING":
          counts.pending++;
          break;
        case "ACCEPTED":
          counts.accepted++;
          break;
        case "DECLINED":
          counts.declined++;
          break;
        case "CANCELLED":
          counts.cancelled++;
          break;
        case "EXPIRED":
          counts.expired++;
          break;
      }
    }

    const denominator = counts.accepted + counts.declined + counts.expired;
    const conversionRate = denominator > 0 ? (counts.accepted / denominator) * 100 : 0;

    return { ...counts, conversionRate };
  }

  /**
   * Accept a recommendation. Validates current status is PENDING.
   * Sets status=ACCEPTED, acceptedAt, and bookingId.
   */
  async accept(id: string, bookingId: string): Promise<ServiceRecommendation> {
    const recommendation = await this.getById(id);
    if (!recommendation) throw new Error("Recommendation not found");
    if (recommendation.status !== "PENDING") {
      throw new Error(
        `Invalid state transition: cannot accept recommendation with status ${recommendation.status}. Only PENDING recommendations can be accepted.`
      );
    }

    return this.update(id, {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      bookingId,
    });
  }

  /**
   * Decline a recommendation. Validates current status is PENDING.
   * Sets status=DECLINED, declinedAt, and optional declineReason.
   */
  async decline(id: string, reason?: string): Promise<ServiceRecommendation> {
    const recommendation = await this.getById(id);
    if (!recommendation) throw new Error("Recommendation not found");
    if (recommendation.status !== "PENDING") {
      throw new Error(
        `Invalid state transition: cannot decline recommendation with status ${recommendation.status}. Only PENDING recommendations can be declined.`
      );
    }

    const updates: Partial<ServiceRecommendation> = {
      status: "DECLINED",
      declinedAt: new Date(),
    };
    if (reason) updates.declineReason = reason;

    return this.update(id, updates);
  }

  /**
   * Cancel a recommendation. Validates current status is PENDING.
   * Sets status=CANCELLED, cancelledAt, and cancelledBy.
   */
  async cancel(id: string, cancelledBy: string): Promise<ServiceRecommendation> {
    const recommendation = await this.getById(id);
    if (!recommendation) throw new Error("Recommendation not found");
    if (recommendation.status !== "PENDING") {
      throw new Error(
        `Invalid state transition: cannot cancel recommendation with status ${recommendation.status}. Only PENDING recommendations can be cancelled.`
      );
    }

    return this.update(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy,
    });
  }

  /**
   * Expire a recommendation. Validates current status is PENDING.
   * Sets status=EXPIRED.
   */
  async expire(id: string): Promise<ServiceRecommendation> {
    const recommendation = await this.getById(id);
    if (!recommendation) throw new Error("Recommendation not found");
    if (recommendation.status !== "PENDING") {
      throw new Error(
        `Invalid state transition: cannot expire recommendation with status ${recommendation.status}. Only PENDING recommendations can be expired.`
      );
    }

    return this.update(id, {
      status: "EXPIRED",
    });
  }

  /**
   * Get pending recommendations for a specific doctor-patient pair.
   * Used for rate limiting (max 10 pending per pair).
   */
  async getByDoctorAndPatientPending(
    doctorId: string,
    patientId: string
  ): Promise<ServiceRecommendation[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      where("patientId", "==", patientId),
      where("status", "==", "PENDING"),
    ]);
  }
}

export const recommendationsService = new RecommendationsService();
