/**
 * Property 5 — Rejection transaction restores previous appointment state.
 *
 * For any appointment with status `cancellation_requested` and a stored
 * `previousStatus` value, after `rejectCancellationWithTransaction` completes,
 * the appointment status SHALL equal the stored `previousStatus`, and
 * `cancellationRejectedAt` and `cancellationRejectionReason` SHALL be set.
 *
 * **Validates: Requirements 3.4, 4.3**
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { AppointmentDocument } from "@/types/firestore";

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

/** Previous status values that can be restored: pending or confirmed. */
const previousStatusArb = fc.constantFrom<"pending" | "confirmed">(
  "pending",
  "confirmed"
);

/** Rejector UID: non-empty alphanumeric string. */
const rejectorUidArb = fc.stringOf(
  fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
  { minLength: 1, maxLength: 30 }
);

/** Rejector role: doctor or admin. */
const rejectorRoleArb = fc.constantFrom<"doctor" | "admin">("doctor", "admin");

/** Non-empty rejection reason string. */
const rejectionReasonArb = fc.stringOf(
  fc.char().filter((c) => c.trim().length > 0),
  { minLength: 1, maxLength: 200 }
);

/** Generate a minimal appointment document in cancellation_requested state. */
function makeAppointmentInCancellationRequested(
  previousStatus: "pending" | "confirmed"
): AppointmentDocument {
  return {
    id: "apt-test-123",
    patientId: "patient-1",
    doctorId: "doctor-1",
    serviceId: "service-1",
    slotId: "slot-1",
    status: "cancellation_requested",
    previousStatus,
    cancellationReason: "Need to reschedule",
    cancellationRequestedAt: new Date("2024-01-15"),
    consultationPlatform: "google_meet",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    scheduledFor: new Date("2024-02-01"),
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 5: Rejection transaction restores previous appointment state", () => {
  let service: TransactionService;

  beforeEach(() => {
    service = new TransactionService();
    mockDocData = {};
    capturedUpdates = {};
    vi.clearAllMocks();
  });

  test("property: for any previousStatus, rejector, and reason, status is restored and rejection metadata is set", async () => {
    await fc.assert(
      fc.asyncProperty(
        previousStatusArb,
        rejectorUidArb,
        rejectorRoleArb,
        rejectionReasonArb,
        async (previousStatus, rejectorUid, rejectorRole, rejectionReason) => {
          // Arrange
          const appointmentId = "apt-test-123";
          const appointment =
            makeAppointmentInCancellationRequested(previousStatus);
          mockDocData = { [`appointments/${appointmentId}`]: appointment };
          capturedUpdates = {};

          // Act
          await service.rejectCancellationWithTransaction(
            appointmentId,
            { uid: rejectorUid, role: rejectorRole },
            rejectionReason
          );

          // Assert — verify all post-conditions
          const update = capturedUpdates[`appointments/${appointmentId}`];

          // 1. Status is restored to previousStatus
          expect(update.status).toBe(previousStatus);

          // 2. cancellationRejectedAt is a Date (timestamp set)
          expect(update.cancellationRejectedAt).toBeInstanceOf(Date);

          // 3. cancellationRejectionReason matches the provided reason
          expect(update.cancellationRejectionReason).toBe(rejectionReason);

          // 4. cancellationRejectedBy matches the rejector UID
          expect(update.cancellationRejectedBy).toBe(rejectorUid);

          // 5. cancellationRejectedByRole matches the rejector role
          expect(update.cancellationRejectedByRole).toBe(rejectorRole);

          // 6. updatedAt is refreshed
          expect(update.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("property: rejection of non-cancellation_requested appointment throws", async () => {
    const nonCancellationRequestedStatusArb = fc.constantFrom(
      "pending",
      "confirmed",
      "cancelled",
      "completed"
    );

    await fc.assert(
      fc.asyncProperty(
        nonCancellationRequestedStatusArb,
        rejectorUidArb,
        rejectorRoleArb,
        rejectionReasonArb,
        async (status, rejectorUid, rejectorRole, rejectionReason) => {
          // Arrange
          const appointmentId = "apt-test-123";
          mockDocData = {
            [`appointments/${appointmentId}`]: {
              ...makeAppointmentInCancellationRequested("pending"),
              status,
            },
          };
          capturedUpdates = {};

          // Act & Assert — should throw
          await expect(
            service.rejectCancellationWithTransaction(
              appointmentId,
              { uid: rejectorUid, role: rejectorRole },
              rejectionReason
            )
          ).rejects.toThrow(
            "Appointment is not in cancellation_requested state"
          );

          // No update should have been applied
          expect(
            capturedUpdates[`appointments/${appointmentId}`]
          ).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("property: non-existent appointment throws", async () => {
    await fc.assert(
      fc.asyncProperty(
        rejectorUidArb,
        rejectorRoleArb,
        rejectionReasonArb,
        async (rejectorUid, rejectorRole, rejectionReason) => {
          // Arrange — no document in mock store
          mockDocData = {};
          capturedUpdates = {};

          // Act & Assert
          await expect(
            service.rejectCancellationWithTransaction(
              "non-existent-id",
              { uid: rejectorUid, role: rejectorRole },
              rejectionReason
            )
          ).rejects.toThrow("Appointment not found");
        }
      ),
      { numRuns: 10 }
    );
  });

  test("property: cancellationRejectedAt is bounded by call time", async () => {
    await fc.assert(
      fc.asyncProperty(
        previousStatusArb,
        rejectorUidArb,
        rejectorRoleArb,
        rejectionReasonArb,
        async (previousStatus, rejectorUid, rejectorRole, rejectionReason) => {
          const appointmentId = "apt-test-123";
          mockDocData = {
            [`appointments/${appointmentId}`]:
              makeAppointmentInCancellationRequested(previousStatus),
          };
          capturedUpdates = {};

          const before = new Date();
          await service.rejectCancellationWithTransaction(
            appointmentId,
            { uid: rejectorUid, role: rejectorRole },
            rejectionReason
          );
          const after = new Date();

          const update = capturedUpdates[`appointments/${appointmentId}`];
          const timestamp = update.cancellationRejectedAt as Date;

          // Timestamp should be between before and after the call
          expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        }
      ),
      { numRuns: 50 }
    );
  });
});
