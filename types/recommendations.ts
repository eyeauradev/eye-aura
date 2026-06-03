// Recommendation Status Types
export type RecommendationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED" | "RECOMMENDED";

// ServiceRecommendation Interface
export interface ServiceRecommendation {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  recommendedSlotStart: Date;
  recommendedSlotEnd: Date;
  status: RecommendationStatus;
  recommendationNote?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  reservationId?: string;
  acceptedAt?: Date;
  declinedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  declineReason?: string;
  bookingId?: string;
}

// Slot Reservation Types
export type SlotReservationStatus = "active" | "released" | "converted";

export interface SlotReservation {
  id: string;
  doctorId: string;
  recommendationId: string;
  start: Date;
  end: Date;
  status: SlotReservationStatus;
  createdAt: Date;
  releasedAt?: Date;
  convertedAt?: Date;
}

// Recommendation Audit Types
export type RecommendationAuditAction =
  | "created"
  | "edited"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired"
  | "slot_reserved"
  | "slot_released"
  | "slot_converted";

export interface RecommendationAuditEntry {
  id: string;
  recommendationId: string;
  action: RecommendationAuditAction;
  actorId: string;
  actorRole: "doctor" | "patient" | "admin" | "system";
  timestamp: Date;
  previousStatus?: RecommendationStatus;
  newStatus?: RecommendationStatus;
  metadata?: Record<string, unknown>;
}

// Recommendation Metrics
export interface RecommendationMetrics {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  cancelled: number;
  expired: number;
  conversionRate: number;
}

// Input Types
export interface CreateRecommendationInput {
  patientId: string;
  doctorId: string;
  serviceId: string;
  recommendedSlotStart: Date;
  recommendedSlotEnd: Date;
  recommendationNote?: string;
}

export interface UpdateRecommendationInput {
  serviceId?: string;
  recommendedSlotStart?: Date;
  recommendedSlotEnd?: Date;
  recommendationNote?: string;
}
