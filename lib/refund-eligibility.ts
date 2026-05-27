import type { AppointmentDocument } from "@/types/firestore";

/**
 * Determines whether a refund can be issued for a given appointment.
 * Pure function used by both Doctor and Admin UIs to control refund button visibility.
 *
 * Rules:
 * - Already refunded (refundId set or refundStatus "processed") → not eligible
 * - Refund in progress (refundStatus "pending") → not eligible
 * - Appointment not in "cancelled" status → not eligible
 * - No paymentId on appointment → not eligible
 * - Admin → always eligible (no time limit)
 * - Doctor → eligible only within 7 calendar days of cancellationApprovedAt
 */
export function isRefundEligible(
  appointment: AppointmentDocument,
  actorRole: "doctor" | "admin"
): { eligible: boolean; reason?: string } {
  // Already refunded → not eligible
  if (appointment.refundId || appointment.refundStatus === "processed") {
    return { eligible: false, reason: "Already refunded" };
  }

  // Refund in progress → not eligible
  if (appointment.refundStatus === "pending") {
    return { eligible: false, reason: "Refund in progress" };
  }

  // Not cancelled → not eligible
  if (appointment.status !== "cancelled") {
    return { eligible: false, reason: "Appointment not cancelled" };
  }

  // No payment → not eligible (check both direct paymentId and bookingRequestId)
  if (!appointment.paymentId && !appointment.bookingRequestId) {
    return { eligible: false, reason: "No payment to refund" };
  }

  // Admin → always eligible (no time limit)
  if (actorRole === "admin") {
    return { eligible: true };
  }

  // Doctor → check 7-day window
  if (appointment.cancellationApprovedAt) {
    const windowEnd = new Date(appointment.cancellationApprovedAt);
    windowEnd.setDate(windowEnd.getDate() + 7);
    if (new Date() > windowEnd) {
      return { eligible: false, reason: "7-day refund window expired" };
    }
  }

  return { eligible: true };
}
