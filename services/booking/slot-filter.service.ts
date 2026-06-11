import type {
  BookingRequestDocument,
  AppointmentDocument,
  DoctorBlockDocument,
  TimeRange,
} from "@/types/firestore";

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface OccupiedRange {
  start: Date;
  end: Date;
  source: "booking_request" | "appointment" | "doctor_block";
  sourceId: string;
}

/**
 * Core overlap detection: two half-open ranges [startA, endA) and [startB, endB)
 * conflict if and only if startA < endB AND startB < endA.
 */
export function hasTimeRangeOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

/**
 * Compute the end time from a start time and combined duration in minutes.
 */
export function computeEndTime(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + durationMinutes * 60_000);
}

/**
 * Given a list of candidate time slots and occupied ranges,
 * return only slots that do NOT conflict with any occupied range.
 */
export function filterAvailableSlots(
  candidates: TimeSlot[],
  occupied: OccupiedRange[]
): TimeSlot[] {
  return candidates.filter((candidate) =>
    !occupied.some((occ) =>
      hasTimeRangeOverlap(candidate.start, candidate.end, occ.start, occ.end)
    )
  );
}

/**
 * Build occupied ranges from booking requests, appointments, and doctor blocks.
 * Only includes active/relevant statuses.
 */
export function buildOccupiedRanges(
  bookingRequests: BookingRequestDocument[],
  appointments: AppointmentDocument[],
  doctorBlocks: DoctorBlockDocument[]
): OccupiedRange[] {
  const ranges: OccupiedRange[] = [];

  for (const br of bookingRequests) {
    if (br.status !== "pending" && br.status !== "accepted") continue;
    const duration = br.combinedDuration ?? 30;
    ranges.push({
      start: new Date(br.requestedTime),
      end: computeEndTime(new Date(br.requestedTime), duration),
      source: "booking_request",
      sourceId: br.id,
    });
  }

  for (const apt of appointments) {
    if (apt.status !== "confirmed" && apt.status !== "pending") continue;
    const duration = apt.combinedDuration ?? 30;
    ranges.push({
      start: new Date(apt.scheduledFor),
      end: computeEndTime(new Date(apt.scheduledFor), duration),
      source: "appointment",
      sourceId: apt.id,
    });
  }

  for (const block of doctorBlocks) {
    ranges.push({
      start: new Date(block.start),
      end: new Date(block.end),
      source: "doctor_block",
      sourceId: block.id,
    });
  }

  return ranges;
}

/**
 * Generate candidate time slots for a given day based on doctor availability.
 */
export function generateCandidateSlots(
  date: Date,
  timeRanges: TimeRange[],
  slotDurationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const range of timeRanges) {
    const [startH, startM] = range.startTime.split(":").map(Number);
    const [endH, endM] = range.endTime.split(":").map(Number);

    const rangeStart = new Date(date);
    rangeStart.setHours(startH, startM, 0, 0);

    const rangeEnd = new Date(date);
    rangeEnd.setHours(endH, endM, 0, 0);

    let current = new Date(rangeStart);
    while (current.getTime() + slotDurationMinutes * 60_000 <= rangeEnd.getTime()) {
      slots.push({
        start: new Date(current),
        end: new Date(current.getTime() + slotDurationMinutes * 60_000),
      });
      // Advance by the slot duration
      current = new Date(current.getTime() + slotDurationMinutes * 60_000);
    }
  }

  return slots;
}
