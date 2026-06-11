# Design Document

## Overview

This feature adds slot booking validation to prevent double-booking in the EyeAura appointment system. It introduces a `SlotFilterService` with duration-aware time-range overlap detection, integrates frontend filtering to hide unavailable slots, and adds backend server-side validation within Firestore transactions to reject conflicting bookings atomically.

## Architecture

This feature introduces a `SlotFilterService` that computes available time slots by cross-referencing three Firestore collections (`booking_requests`, `appointments`, `doctor_blocks`) against the doctor's weekly availability schedule. The same overlap-detection logic is shared between the frontend (hiding unavailable slots) and backend (rejecting conflicting bookings within a Firestore transaction).

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│  Patient Booking Page (/booking)                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ TimeSelectionStep                                     │  │
│  │  → calls SlotFilterService.getAvailableSlots()        │  │
│  │  → renders only non-conflicting slots                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │ (payment → verify-payment API)
          ▼
┌─────────────────────────────────────────────────────────────┐
│  /api/payments/verify-payment (Backend)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Firestore Transaction:                                │  │
│  │  1. Query conflicts (booking_requests, appointments,  │  │
│  │     doctor_blocks) using hasTimeRangeConflict()        │  │
│  │  2. If conflict → reject + mark refund                │  │
│  │  3. If clear → create booking_request                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │ (booking_request created)
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Doctor Panel (/doctor/slots)                               │
│  → Shows pending booking_requests as blocked time           │
│  → Shows doctor_blocks and confirmed appointments           │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. SlotFilterService (`services/booking/slot-filter.service.ts`)

A pure-logic service responsible for computing available slots. Separates data fetching from overlap computation for testability.

```typescript
import type {
  BookingRequestDocument,
  AppointmentDocument,
  DoctorBlockDocument,
  DoctorAvailabilityDocument,
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
      // Advance by the doctor's base slot duration (not the booking duration)
      current = new Date(current.getTime() + slotDurationMinutes * 60_000);
    }
  }

  return slots;
}
```

### 2. SlotFilterDataFetcher (`services/booking/slot-filter-data.service.ts`)

Handles Firestore queries to fetch occupied ranges for a given doctor and date. Keeps I/O separate from logic.

```typescript
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type {
  BookingRequestDocument,
  AppointmentDocument,
  DoctorBlockDocument,
} from "@/types/firestore";
import { buildOccupiedRanges, type OccupiedRange } from "./slot-filter.service";

export class SlotFilterDataFetcher {
  private db = getFirebaseDb();

  /**
   * Fetch all occupied ranges for a doctor on a given date.
   * Queries booking_requests (pending/accepted), appointments (confirmed/pending),
   * and doctor_blocks that overlap with the day.
   */
  async getOccupiedRanges(doctorId: string, date: Date): Promise<OccupiedRange[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [bookingRequests, appointments, doctorBlocks] = await Promise.all([
      this.fetchBookingRequests(doctorId, dayStart, dayEnd),
      this.fetchAppointments(doctorId, dayStart, dayEnd),
      this.fetchDoctorBlocks(doctorId, dayStart, dayEnd),
    ]);

    return buildOccupiedRanges(bookingRequests, appointments, doctorBlocks);
  }

  private async fetchBookingRequests(
    doctorId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<BookingRequestDocument[]> {
    const q = query(
      collection(this.db, "booking_requests"),
      where("doctorId", "==", doctorId),
      where("status", "in", ["pending", "accepted"]),
      where("requestedTime", ">=", Timestamp.fromDate(dayStart)),
      where("requestedTime", "<=", Timestamp.fromDate(dayEnd))
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BookingRequestDocument);
  }

  private async fetchAppointments(
    doctorId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<AppointmentDocument[]> {
    const q = query(
      collection(this.db, "appointments"),
      where("doctorId", "==", doctorId),
      where("status", "in", ["confirmed", "pending"]),
      where("scheduledFor", ">=", Timestamp.fromDate(dayStart)),
      where("scheduledFor", "<=", Timestamp.fromDate(dayEnd))
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AppointmentDocument);
  }

  private async fetchDoctorBlocks(
    doctorId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<DoctorBlockDocument[]> {
    const q = query(
      collection(this.db, "doctor_blocks"),
      where("doctorId", "==", doctorId),
      where("start", "<=", Timestamp.fromDate(dayEnd)),
      where("end", ">=", Timestamp.fromDate(dayStart))
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DoctorBlockDocument);
  }
}

export const slotFilterDataFetcher = new SlotFilterDataFetcher();
```

### 3. Backend Validation in verify-payment Route

The `/api/payments/verify-payment/route.ts` is updated to perform conflict checking within a Firestore Admin transaction before creating the `booking_request`.

```typescript
// New function added to verify-payment/route.ts
import { getAdminDb } from "@/services/firebase/admin";
import { hasTimeRangeOverlap, computeEndTime } from "@/services/booking/slot-filter.service";

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictSource?: "booking_request" | "appointment" | "doctor_block";
  conflictId?: string;
}

async function checkSlotConflictInTransaction(
  transaction: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  doctorId: string,
  requestedTime: Date,
  combinedDuration: number
): Promise<ConflictCheckResult> {
  const requestStart = requestedTime;
  const requestEnd = computeEndTime(requestedTime, combinedDuration);

  // Check booking_requests (pending or accepted)
  const brSnap = await transaction.get(
    db.collection("booking_requests")
      .where("doctorId", "==", doctorId)
      .where("status", "in", ["pending", "accepted"])
  );

  for (const doc of brSnap.docs) {
    const br = doc.data();
    const brStart = br.requestedTime.toDate();
    const brEnd = computeEndTime(brStart, br.combinedDuration ?? 30);
    if (hasTimeRangeOverlap(requestStart, requestEnd, brStart, brEnd)) {
      return { hasConflict: true, conflictSource: "booking_request", conflictId: doc.id };
    }
  }

  // Check appointments (confirmed or pending)
  const aptSnap = await transaction.get(
    db.collection("appointments")
      .where("doctorId", "==", doctorId)
      .where("status", "in", ["confirmed", "pending"])
  );

  for (const doc of aptSnap.docs) {
    const apt = doc.data();
    const aptStart = apt.scheduledFor.toDate();
    const aptEnd = computeEndTime(aptStart, apt.combinedDuration ?? 30);
    if (hasTimeRangeOverlap(requestStart, requestEnd, aptStart, aptEnd)) {
      return { hasConflict: true, conflictSource: "appointment", conflictId: doc.id };
    }
  }

  // Check doctor_blocks
  const blockSnap = await transaction.get(
    db.collection("doctor_blocks")
      .where("doctorId", "==", doctorId)
  );

  for (const doc of blockSnap.docs) {
    const block = doc.data();
    const blockStart = block.start.toDate();
    const blockEnd = block.end.toDate();
    if (hasTimeRangeOverlap(requestStart, requestEnd, blockStart, blockEnd)) {
      return { hasConflict: true, conflictSource: "doctor_block", conflictId: doc.id };
    }
  }

  return { hasConflict: false };
}
```

### 4. Integration into Booking Page (`TimeSelectionStep`)

The `TimeSelectionStep` component is updated to use `SlotFilterDataFetcher` to fetch occupied ranges and `filterAvailableSlots` to compute the visible slots.

```typescript
// Inside TimeSelectionStep component — new data fetching hook
import { slotFilterDataFetcher } from "@/services/booking/slot-filter-data.service";
import {
  generateCandidateSlots,
  filterAvailableSlots,
  type TimeSlot,
} from "@/services/booking/slot-filter.service";

function useAvailableSlots(
  doctorId: string | undefined,
  date: Date | null,
  availability: DoctorAvailabilityDocument[],
  bookingDuration: number
) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doctorId || !date) return;

    const dayOfWeek = getDayOfWeek(date);
    const dayAvail = availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (!dayAvail || dayAvail.isOff || dayAvail.timeRanges.length === 0) {
      setAvailableSlots([]);
      return;
    }

    setLoading(true);

    // Generate candidates using booking duration (combined service duration)
    const candidates = generateCandidateSlots(date, dayAvail.timeRanges, bookingDuration);

    // Fetch occupied ranges and filter
    slotFilterDataFetcher
      .getOccupiedRanges(doctorId, date)
      .then((occupied) => {
        setAvailableSlots(filterAvailableSlots(candidates, occupied));
      })
      .finally(() => setLoading(false));
  }, [doctorId, date, availability, bookingDuration]);

  return { availableSlots, loading };
}
```

### 5. Doctor Panel Updates (`/doctor/slots/page.tsx`)

The doctor slots page is updated to also fetch pending `booking_requests` for the selected day and display them alongside existing `doctor_blocks`.

```typescript
// Additional data fetch in DoctorSlotsPage
import { bookingRequestsService } from "@/services/firestore/booking-requests.service";

// Inside the useEffect that loads schedule data:
const pendingRequests = await bookingRequestsService.getByDoctorIdAndStatus(
  user.id,
  "pending"
);

// Filter to selected day and render as "Pending Booking" blocks
// in the same visual style as doctor_blocks but with a distinct color (amber)
```

## Data Models

### Existing Models (No Changes)

The feature uses existing Firestore collections without schema modifications:

| Collection | Key Fields Used | Status Filters |
|---|---|---|
| `booking_requests` | `doctorId`, `requestedTime`, `combinedDuration`, `status` | `"pending"`, `"accepted"` |
| `appointments` | `doctorId`, `scheduledFor`, `combinedDuration`, `status` | `"confirmed"`, `"pending"` |
| `doctor_blocks` | `doctorId`, `start`, `end` | All (no status) |

### New Interfaces

```typescript
// services/booking/slot-filter.service.ts
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

// Used in verify-payment route
export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictSource?: "booking_request" | "appointment" | "doctor_block";
  conflictId?: string;
}
```

## Error Handling

### Frontend (Booking Page)

| Scenario | Behavior |
|---|---|
| SlotFilterDataFetcher query fails | Show error toast, allow retry, display no slots |
| No available slots for selected date | Show "No available slots" message with suggestion to try another date |
| Slot becomes unavailable during selection | Payment verification will catch the conflict server-side |

### Backend (verify-payment)

| Scenario | Response | Side Effect |
|---|---|---|
| Time range conflict detected | `409 Conflict` with `{ error: "Slot no longer available", conflictSource }` | Payment marked `refundStatus: "pending"`, `failureReason` recorded |
| Firestore transaction contention | Retry (Firestore auto-retries transactions) | None |
| Combined duration = 0 (no valid services) | `400 Bad Request` | None |

### Refund Flow on Conflict

When the backend detects a conflict after payment verification:

1. The payment document is updated with `refundStatus: "pending"` and `conflictReason`
2. The API returns a `409` response to the client
3. The client displays an error message explaining the slot was taken
4. Refund processing happens asynchronously (existing refund infrastructure)

## Testing Strategy

### Property-Based Tests

The core overlap logic (`hasTimeRangeOverlap`, `computeEndTime`, `filterAvailableSlots`, `buildOccupiedRanges`) is composed of pure functions ideal for property-based testing. These functions handle arbitrary date/time inputs and durations, making them suitable for testing across many generated inputs.

- **Framework**: Use `fast-check` with TypeScript
- **Minimum iterations**: 100 per property
- **Focus**: Overlap detection, duration math, slot filtering logic, status-based exclusion

### Unit Tests (Example-Based)

- Specific duration examples (e.g., 60-min service at 10:00 blocking 10:30 candidate)
- Doctor panel rendering of pending booking requests
- Conflict error response format validation
- Refund marking on conflict detection

### Integration Tests

- Firestore transaction atomicity under concurrent requests
- Query correctness for booking_requests/appointments/doctor_blocks
- End-to-end payment → conflict → refund flow
- Real-time data refresh on doctor panel

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time Range Overlap Detection Correctness

*For any* two half-open time ranges [startA, endA) and [startB, endB) where all timestamps are valid dates and startA < endA and startB < endB, the `hasTimeRangeOverlap` function SHALL return `true` if and only if `startA < endB AND startB < endA`.

**Validates: Requirements 1.4, 4.2**

### Property 2: Duration Computation Correctness

*For any* valid start time and positive integer duration in minutes, `computeEndTime(start, duration)` SHALL return a Date exactly `duration * 60000` milliseconds after `start`.

**Validates: Requirements 2.6, 4.1**

### Property 3: Slot Exclusion Invariant

*For any* list of candidate time slots and any list of occupied ranges, `filterAvailableSlots` SHALL return only slots where no overlap exists with any occupied range. Equivalently: for all slots in the output, and for all occupied ranges, `hasTimeRangeOverlap(slot.start, slot.end, occ.start, occ.end)` is `false`.

**Validates: Requirements 1.5, 2.4**

### Property 4: Cancelled/Rejected Bookings Are Excluded

*For any* booking request with status "cancelled" or "rejected", `buildOccupiedRanges` SHALL NOT include that booking request in the returned occupied ranges, regardless of its time range or duration.

**Validates: Requirements 5.1**

### Property 5: Conflict Detection Implies Refund Marking

*For any* payment verification request where a time range conflict exists with an existing booking request, appointment, or doctor block, the system SHALL mark the payment with `refundStatus: "pending"` and record the conflict source in the payment document.

**Validates: Requirements 2.5, 5.3**
