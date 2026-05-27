/**
 * Property 1 — Cancellation request transaction preserves data integrity.
 *
 * For any appointment in a cancellable state (pending or confirmed) and for any
 * non-empty reason string, after `requestCancellationWithTransaction` completes,
 * the appointment document SHALL have:
 *   - status `cancellation_requested`
 *   - the provided cancellation reason stored
 *   - a `cancellationRequestedAt` timestamp set
 *   - the `previousStatus` field matching the original status
 *
 * **Validates: Requirements 2.1, 2.5**
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { AppointmentDocument, AppointmentStatus } from "@/types/firestore";

// ─── Mock Firestore transaction infrastructure ──────────────────────────────

/**
 * We mock `firebase/firestore` to capture the transaction logic without
 * needing a real Firestore instance. The mock `runTransaction` executes the
 * callback with a fake transaction object that records updates.
 *
 * Each property iteration sets up its own docData/capturedUpdates via closure
 * to avoid cross-iteration contamination.
 */

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

/** Cancellable statuses per the design: pending or confirmed. */
const cancellableStatusArb = fc.constantFrom<"pending" | "confirmed">(
  "pending",
  "confirmed"
);

/** Non-empty reason string: at least one non-whitespace character. */
const nonEmptyReasonArb = fc.stringOf(
  fc.char().filter((c) => c.trim().length > 0),
  { minLength: 1, maxLength: 100 }
);

/** Generate a minimal valid appointment document in a cancellable state. */
function makeAppointment(status: "pending" | "confirmed"): AppointmentDocument {
  return {
    id: "apt-test-123",
    patientId: "patient-1",
    doctorId: "doctor-1",
    serviceId: "service-1",
    slotId: "slot-1",
    status,
    consultationPlatform: "google_meet",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    scheduledFor: new Date("2024-02-01"),
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 1: Cancellation request transaction preserves data integrity", () => {
  let service: TransactionService;

  beforeEach(() => {
    service = new TransactionService();
    mockDocData = {};
    capturedUpdates = {};
    vi.clearAllMocks();
  });

  test("property: for any cancellable status and non-empty reason, post-conditions hold", async () => {
    await fc.assert(
      fc.asyncProperty(
        cancellableStatusArb,
        nonEmptyReasonArb,
        async (originalStatus, reason) => {
          // Arrange
          const appointmentId = "apt-test-123";
          const appointment = makeAppointment(originalStatus);
          mockDocData = { [`appointments/${appointmentId}`]: appointment };
          capturedUpdates = {};

          // Act
          await service.requestCancellationWithTransaction(appointmentId, reason);

          // Assert — verify all post-conditions
          const update = capturedUpdates[`appointments/${appointmentId}`];

          // 1. Status is set to cancellation_requested
          expect(update.status).toBe("cancellation_requested");

          // 2. Cancellation reason is stored exactly as provided
          expect(update.cancellationReason).toBe(reason);

          // 3. cancellationRequestedAt is a Date (timestamp set)
          expect(update.cancellationRequestedAt).toBeInstanceOf(Date);

          // 4. previousStatus matches the original status
          expect(update.previousStatus).toBe(originalStatus);

          // 5. updatedAt is refreshed
          expect(update.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("property: non-cancellable statuses are rejected", async () => {
    const nonCancellableStatusArb = fc.constantFrom<AppointmentStatus>(
      "cancelled",
      "completed",
      "cancellation_requested"
    );

    await fc.assert(
      fc.asyncProperty(
        nonCancellableStatusArb,
        nonEmptyReasonArb,
        async (status, reason) => {
          // Arrange
          const appointmentId = "apt-test-123";
          mockDocData = {
            [`appointments/${appointmentId}`]: {
              ...makeAppointment("pending"),
              status,
            },
          };
          capturedUpdates = {};

          // Act & Assert — should throw
          await expect(
            service.requestCancellationWithTransaction(appointmentId, reason)
          ).rejects.toThrow();

          // No update should have been applied (transaction.update not called
          // because the error is thrown before it)
          expect(capturedUpdates[`appointments/${appointmentId}`]).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  test("property: non-existent appointment throws", async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyReasonArb, async (reason) => {
        // Arrange — no document in mock store
        mockDocData = {};
        capturedUpdates = {};

        // Act & Assert
        await expect(
          service.requestCancellationWithTransaction("non-existent-id", reason)
        ).rejects.toThrow("Appointment not found");
      }),
      { numRuns: 10 }
    );
  });

  test("property: cancellationRequestedAt is bounded by call time", async () => {
    await fc.assert(
      fc.asyncProperty(
        cancellableStatusArb,
        nonEmptyReasonArb,
        async (originalStatus, reason) => {
          const appointmentId = "apt-test-123";
          mockDocData = {
            [`appointments/${appointmentId}`]: makeAppointment(originalStatus),
          };
          capturedUpdates = {};

          const before = new Date();
          await service.requestCancellationWithTransaction(appointmentId, reason);
          const after = new Date();

          const update = capturedUpdates[`appointments/${appointmentId}`];
          const timestamp = update.cancellationRequestedAt as Date;

          // Timestamp should be between before and after the call
          expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        }
      ),
      { numRuns: 50 }
    );
  });
});
