/**
 * Property 4 — Approval transaction atomically cancels and releases slot.
 *
 * For any appointment with status `cancellation_requested` and an associated slot
 * where `slot.appointmentId` matches the appointment ID, after
 * `approveCancellationWithTransaction` completes:
 *   - the appointment status SHALL be `cancelled`
 *   - the slot's `isAvailable` SHALL be `true`
 *   - the slot's `appointmentId` SHALL be `null`
 *   - `cancellationApprovedAt` SHALL be set
 *   - the returned paymentId/bookingRequestId match the appointment's values
 *
 * **Validates: Requirements 3.3, 4.2**
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { AppointmentDocument, DoctorSlotDocument, RefundDecision } from "@/types/firestore";

// ─── Mock Firestore transaction infrastructure ──────────────────────────────

let mockDocData: Record<string, any> = {};
let capturedUpdates: Record<string, any> = {};

vi.mock("firebase/firestore", () => ({
  runTransaction: vi.fn(async (_db: any, callback: any) => {
    const transaction = {
      get: vi.fn(async (ref: any) => ({
        exists: () => mockDocData[ref._path] !== undefined,
        data: () => mockDocData[ref._path],
      })),
      update: vi.fn((ref: any, data: any) => {
        capturedUpdates[ref._path] = data;
      }),
      set: vi.fn(),
    };
    return callback(transaction);
  }),
  doc: vi.fn((_db: any, collection: string, id: string) => ({
    _path: `${collection}/${id}`,
  })),
  getDoc: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock("@/services/firebase/client", () => ({
  getFirebaseDb: vi.fn(() => ({})),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { TransactionService } from "../transaction.service";

// ─── Generators ─────────────────────────────────────────────────────────────

/** Random approver UID: non-empty alphanumeric string. */
const approverUidArb = fc
  .stringOf(
    fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
    { minLength: 1, maxLength: 30 }
  )
  .filter((s) => s.length > 0);

/** Approver role: doctor or admin. */
const approverRoleArb = fc.constantFrom<"doctor" | "admin">("doctor", "admin");

/** Optional paymentId: either undefined or a non-empty string. */
const optionalPaymentIdArb = fc.option(
  fc
    .stringOf(
      fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
      { minLength: 5, maxLength: 30 }
    )
    .filter((s) => s.length >= 5),
  { nil: undefined }
);

/** Optional bookingRequestId: either undefined or a non-empty string. */
const optionalBookingRequestIdArb = fc.option(
  fc
    .stringOf(
      fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
      { minLength: 5, maxLength: 30 }
    )
    .filter((s) => s.length >= 5),
  { nil: undefined }
);

/** Previous status stored on the appointment (pending or confirmed). */
const previousStatusArb = fc.constantFrom<"pending" | "confirmed">(
  "pending",
  "confirmed"
);

/** Generate a minimal appointment in cancellation_requested state. */
function makeAppointment(
  appointmentId: string,
  slotId: string,
  opts: {
    previousStatus: "pending" | "confirmed";
    paymentId?: string;
    bookingRequestId?: string;
  }
): AppointmentDocument {
  return {
    id: appointmentId,
    patientId: "patient-1",
    doctorId: "doctor-1",
    serviceId: "service-1",
    slotId,
    status: "cancellation_requested",
    previousStatus: opts.previousStatus,
    cancellationReason: "Need to reschedule",
    cancellationRequestedAt: new Date("2024-01-15"),
    consultationPlatform: "google_meet",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    scheduledFor: new Date("2024-02-01"),
    paymentId: opts.paymentId,
    bookingRequestId: opts.bookingRequestId,
  };
}

/** Generate a slot that is booked by the given appointment. */
function makeSlot(slotId: string, appointmentId: string): DoctorSlotDocument {
  return {
    id: slotId,
    doctorId: "doctor-1",
    startTime: new Date("2024-02-01T10:00:00Z"),
    endTime: new Date("2024-02-01T10:30:00Z"),
    isAvailable: false,
    appointmentId,
    isBlocked: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

/** Generate a default refund decision for testing. */
function makeRefundDecision(uid: string, role: "doctor" | "admin"): RefundDecision {
  return {
    decision: "no_refund",
    decidedBy: uid,
    decidedByRole: role,
    decidedAt: new Date(),
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 4: Approval transaction atomically cancels and releases slot", () => {
  let service: TransactionService;

  beforeEach(() => {
    service = new TransactionService();
    mockDocData = {};
    capturedUpdates = {};
    vi.clearAllMocks();
  });

  test("property: for any approver uid/role, approval sets cancelled status, releases slot, sets timestamp, and returns correct ids", async () => {
    await fc.assert(
      fc.asyncProperty(
        approverUidArb,
        approverRoleArb,
        optionalPaymentIdArb,
        optionalBookingRequestIdArb,
        previousStatusArb,
        async (uid, role, paymentId, bookingRequestId, previousStatus) => {
          // Arrange
          const appointmentId = "apt-test-456";
          const slotId = "slot-test-789";
          const appointment = makeAppointment(appointmentId, slotId, {
            previousStatus,
            paymentId,
            bookingRequestId,
          });
          const slot = makeSlot(slotId, appointmentId);

          mockDocData = {
            [`appointments/${appointmentId}`]: appointment,
            [`doctor_slots/${slotId}`]: slot,
          };
          capturedUpdates = {};

          // Act
          const result = await service.approveCancellationWithTransaction(
            appointmentId,
            { uid, role },
            makeRefundDecision(uid, role)
          );

          // Assert — appointment post-conditions
          const aptUpdate = capturedUpdates[`appointments/${appointmentId}`];
          expect(aptUpdate.status).toBe("cancelled");
          expect(aptUpdate.cancellationApprovedBy).toBe(uid);
          expect(aptUpdate.cancellationApprovedByRole).toBe(role);
          expect(aptUpdate.cancellationApprovedAt).toBeInstanceOf(Date);
          expect(aptUpdate.cancelledAt).toBeInstanceOf(Date);
          expect(aptUpdate.updatedAt).toBeInstanceOf(Date);

          // Assert — slot post-conditions
          const slotUpdate = capturedUpdates[`doctor_slots/${slotId}`];
          expect(slotUpdate.isAvailable).toBe(true);
          expect(slotUpdate.appointmentId).toBeNull();
          expect(slotUpdate.updatedAt).toBeInstanceOf(Date);

          // Assert — returned values match appointment's payment/booking info
          expect(result.paymentId).toBe(paymentId);
          expect(result.bookingRequestId).toBe(bookingRequestId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("property: non-cancellation_requested statuses are rejected", async () => {
    const nonCancellationRequestedArb = fc.constantFrom(
      "pending",
      "confirmed",
      "cancelled",
      "completed"
    );

    await fc.assert(
      fc.asyncProperty(
        nonCancellationRequestedArb,
        approverUidArb,
        approverRoleArb,
        async (status, uid, role) => {
          // Arrange
          const appointmentId = "apt-test-456";
          const slotId = "slot-test-789";
          mockDocData = {
            [`appointments/${appointmentId}`]: {
              ...makeAppointment(appointmentId, slotId, {
                previousStatus: "pending",
              }),
              status, // Override to non-cancellation_requested
            },
            [`doctor_slots/${slotId}`]: makeSlot(slotId, appointmentId),
          };
          capturedUpdates = {};

          // Act & Assert — should throw
          await expect(
            service.approveCancellationWithTransaction(appointmentId, {
              uid,
              role,
            }, makeRefundDecision(uid, role))
          ).rejects.toThrow(
            "Appointment is not in cancellation_requested state"
          );

          // No updates should have been applied
          expect(
            capturedUpdates[`appointments/${appointmentId}`]
          ).toBeUndefined();
          expect(capturedUpdates[`doctor_slots/${slotId}`]).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("property: non-existent appointment throws", async () => {
    await fc.assert(
      fc.asyncProperty(approverUidArb, approverRoleArb, async (uid, role) => {
        // Arrange — no document in mock store
        mockDocData = {};
        capturedUpdates = {};

        // Act & Assert
        await expect(
          service.approveCancellationWithTransaction("non-existent-id", {
            uid,
            role,
          }, makeRefundDecision(uid, role))
        ).rejects.toThrow("Appointment not found");
      }),
      { numRuns: 10 }
    );
  });

  test("property: cancellationApprovedAt is bounded by call time", async () => {
    await fc.assert(
      fc.asyncProperty(
        approverUidArb,
        approverRoleArb,
        async (uid, role) => {
          // Arrange
          const appointmentId = "apt-test-456";
          const slotId = "slot-test-789";
          mockDocData = {
            [`appointments/${appointmentId}`]: makeAppointment(
              appointmentId,
              slotId,
              { previousStatus: "confirmed" }
            ),
            [`doctor_slots/${slotId}`]: makeSlot(slotId, appointmentId),
          };
          capturedUpdates = {};

          const before = new Date();
          await service.approveCancellationWithTransaction(appointmentId, {
            uid,
            role,
          }, makeRefundDecision(uid, role));
          const after = new Date();

          const aptUpdate = capturedUpdates[`appointments/${appointmentId}`];
          const timestamp = aptUpdate.cancellationApprovedAt as Date;

          expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        }
      ),
      { numRuns: 50 }
    );
  });

  test("property: slot with mismatched appointmentId is not released", async () => {
    await fc.assert(
      fc.asyncProperty(
        approverUidArb,
        approverRoleArb,
        async (uid, role) => {
          // Arrange — slot belongs to a different appointment
          const appointmentId = "apt-test-456";
          const slotId = "slot-test-789";
          mockDocData = {
            [`appointments/${appointmentId}`]: makeAppointment(
              appointmentId,
              slotId,
              { previousStatus: "pending" }
            ),
            [`doctor_slots/${slotId}`]: {
              ...makeSlot(slotId, "different-appointment-id"),
            },
          };
          capturedUpdates = {};

          // Act
          await service.approveCancellationWithTransaction(appointmentId, {
            uid,
            role,
          }, makeRefundDecision(uid, role));

          // Assert — appointment is still cancelled
          const aptUpdate = capturedUpdates[`appointments/${appointmentId}`];
          expect(aptUpdate.status).toBe("cancelled");

          // Assert — slot is NOT updated (mismatched appointmentId)
          expect(capturedUpdates[`doctor_slots/${slotId}`]).toBeUndefined();
        }
      ),
      { numRuns: 30 }
    );
  });
});
