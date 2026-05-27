import type { AppointmentDocument } from "@/types/firestore";

export type FilterStatus = "all" | "pending" | "approved" | "rejected";

export interface EnrichedCancellation {
  appointment: AppointmentDocument;
  patientName: string;
  doctorName: string;
}

/**
 * Filters cancellation requests based on the selected filter status.
 *
 * - "pending": appointments with status === "cancellation_requested"
 * - "approved": appointments with status === "cancelled" AND cancellationApprovedAt set
 * - "rejected": appointments with cancellationRejectedAt set
 * - "all": returns all items unfiltered
 */
export function filterCancellationRequests(
  requests: EnrichedCancellation[],
  filter: FilterStatus
): EnrichedCancellation[] {
  return requests.filter((item) => {
    const apt = item.appointment;
    switch (filter) {
      case "pending":
        return apt.status === "cancellation_requested";
      case "approved":
        return apt.status === "cancelled" && !!apt.cancellationApprovedAt;
      case "rejected":
        return !!apt.cancellationRejectedAt;
      case "all":
      default:
        return true;
    }
  });
}
