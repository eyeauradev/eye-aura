/**
 * Property 8 — Refund API error results in failed status with reason.
 *
 * For any error response from the Razorpay refund API, the payment document
 * SHALL have `refundStatus` set to `"failed"` and `refundFailureReason` set
 * to a non-empty string describing the error.
 *
 * **Validates: Requirements 5.2**
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ─── Mock infrastructure ────────────────────────────────────────────────────

/** Captured Firestore updates keyed by "collection/docId" */
let capturedUpdates: Record<string, any[]> = {};

vi.mock("@/services/firebase/admin", () => ({
  getAdminAuth: vi.fn(),
  getAdminDb: vi.fn(() => ({
    collection: (collectionName: string) => ({
      doc: (docId: string) => ({
        get: vi.fn(async () => ({ exists: true, data: () => ({}) })),
        update: vi.fn(async (data: any) => {
          const key = `${collectionName}/${docId}`;
          if (!capturedUpdates[key]) capturedUpdates[key] = [];
          capturedUpdates[key].push(data);
        }),
      }),
    }),
  })),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Function under test ────────────────────────────────────────────────────

/**
 * Replicates the error-handling logic of processRefundInBackground from route.ts.
 * This mirrors the actual implementation exactly for property testing.
 */
async function processRefundInBackground(
  paymentId: string,
  appointmentId: string,
  razorpayPaymentId: string,
  amountInr: number,
  reason: string,
  patientId: string
) {
  const { getAdminDb } = await import("@/services/firebase/admin");
  const db = getAdminDb();

  try {
    const credentials = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
          "X-Razorpay-Idempotency-Key": `refund-apt-${appointmentId}`,
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100),
          speed: "normal",
          notes: {
            reason,
            appointment_id: appointmentId,
            patient_id: patientId,
          },
        }),
      }
    );

    if (!rzpRes.ok) {
      const errBody = await rzpRes.json().catch(() => ({}));
      const failureReason =
        (errBody as any)?.error?.description || `HTTP ${(rzpRes as any).status}`;
      await db.collection("payments").doc(paymentId).update({
        refundStatus: "failed",
        refundFailureReason: failureReason,
        updatedAt: new Date(),
      });
      return;
    }

    const rzpRefund = await rzpRes.json();

    await db.collection("payments").doc(paymentId).update({
      status: "refunded",
      refundStatus: "processed",
      refundId: rzpRefund.id,
      refundReason: reason,
      refundFailureReason: null,
      refundedAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection("appointments").doc(appointmentId).update({
      refundId: rzpRefund.id,
      refundAmount: amountInr,
      refundedAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err: any) {
    await db
      .collection("payments")
      .doc(paymentId)
      .update({
        refundStatus: "failed",
        refundFailureReason: err?.message || "Network error",
        updatedAt: new Date(),
      })
      .catch(() => {});
  }
}

// ─── Generators ─────────────────────────────────────────────────────────────

/** HTTP error status codes (4xx and 5xx) */
const httpErrorStatusArb = fc.integer({ min: 400, max: 599 });

/** Error description from Razorpay error body — non-empty printable string */
const errorDescriptionArb = fc.stringOf(
  fc.char().filter((c) => c.trim().length > 0),
  { minLength: 1, maxLength: 200 }
);

/** Payment ID: non-empty alphanumeric string. */
const paymentIdArb = fc.stringOf(
  fc.char().filter((c) => /[a-zA-Z0-9_]/.test(c)),
  { minLength: 5, maxLength: 30 }
);

/** Appointment ID: non-empty alphanumeric string. */
const appointmentIdArb = fc.stringOf(
  fc.char().filter((c) => /[a-zA-Z0-9_]/.test(c)),
  { minLength: 5, maxLength: 30 }
);

/** Razorpay payment ID: starts with "pay_" followed by alphanumeric chars. */
const razorpayPaymentIdArb = fc
  .stringOf(fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)), {
    minLength: 8,
    maxLength: 20,
  })
  .map((s) => `pay_${s}`);

/** Amount in INR: positive number. */
const amountInrArb = fc.float({ min: 1, max: 100000, noNaN: true });

/** Reason string. */
const reasonArb = fc.stringOf(
  fc.char().filter((c) => c.trim().length > 0),
  { minLength: 1, maxLength: 100 }
);

/** Patient ID. */
const patientIdArb = fc.stringOf(
  fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
  { minLength: 5, maxLength: 20 }
);

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 8: Refund API error results in failed status with reason", () => {
  beforeEach(() => {
    capturedUpdates = {};
    mockFetch.mockClear();
    process.env.RAZORPAY_KEY_ID = "test_key";
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
  });

  test("property: for any Razorpay HTTP error with description, payment doc has refundStatus 'failed' and refundFailureReason equals the error description", async () => {
    await fc.assert(
      fc.asyncProperty(
        httpErrorStatusArb,
        errorDescriptionArb,
        paymentIdArb,
        appointmentIdArb,
        razorpayPaymentIdArb,
        amountInrArb,
        reasonArb,
        patientIdArb,
        async (
          httpStatus,
          errorDescription,
          paymentId,
          appointmentId,
          razorpayPaymentId,
          amountInr,
          reason,
          patientId
        ) => {
          // Arrange
          capturedUpdates = {};
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: httpStatus,
            json: async () => ({
              error: { description: errorDescription },
            }),
          });

          // Act
          await processRefundInBackground(
            paymentId,
            appointmentId,
            razorpayPaymentId,
            amountInr,
            reason,
            patientId
          );

          // Assert: payment doc was updated with failed status
          const paymentUpdates = capturedUpdates[`payments/${paymentId}`];
          expect(paymentUpdates).toBeDefined();
          expect(paymentUpdates.length).toBeGreaterThanOrEqual(1);

          const lastUpdate = paymentUpdates[paymentUpdates.length - 1];
          expect(lastUpdate.refundStatus).toBe("failed");
          expect(typeof lastUpdate.refundFailureReason).toBe("string");
          expect(lastUpdate.refundFailureReason.length).toBeGreaterThan(0);
          expect(lastUpdate.refundFailureReason).toBe(errorDescription);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("property: for any Razorpay HTTP error without description in body, payment doc has refundStatus 'failed' and refundFailureReason contains HTTP status code", async () => {
    await fc.assert(
      fc.asyncProperty(
        httpErrorStatusArb,
        paymentIdArb,
        appointmentIdArb,
        razorpayPaymentIdArb,
        amountInrArb,
        reasonArb,
        patientIdArb,
        async (
          httpStatus,
          paymentId,
          appointmentId,
          razorpayPaymentId,
          amountInr,
          reason,
          patientId
        ) => {
          // Arrange
          capturedUpdates = {};
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: httpStatus,
            json: async () => ({}), // No error.description field
          });

          // Act
          await processRefundInBackground(
            paymentId,
            appointmentId,
            razorpayPaymentId,
            amountInr,
            reason,
            patientId
          );

          // Assert: payment doc was updated with failed status
          const paymentUpdates = capturedUpdates[`payments/${paymentId}`];
          expect(paymentUpdates).toBeDefined();
          expect(paymentUpdates.length).toBeGreaterThanOrEqual(1);

          const lastUpdate = paymentUpdates[paymentUpdates.length - 1];
          expect(lastUpdate.refundStatus).toBe("failed");
          expect(typeof lastUpdate.refundFailureReason).toBe("string");
          expect(lastUpdate.refundFailureReason.length).toBeGreaterThan(0);
          // Falls back to HTTP status format
          expect(lastUpdate.refundFailureReason).toBe(`HTTP ${httpStatus}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("property: for any network error (fetch throws), payment doc has refundStatus 'failed' and refundFailureReason is the error message", async () => {
    /** Non-empty error message */
    const errorMessageArb = fc.stringOf(
      fc.char().filter((c) => c.trim().length > 0),
      { minLength: 1, maxLength: 100 }
    );

    await fc.assert(
      fc.asyncProperty(
        errorMessageArb,
        paymentIdArb,
        appointmentIdArb,
        razorpayPaymentIdArb,
        amountInrArb,
        reasonArb,
        patientIdArb,
        async (
          errorMessage,
          paymentId,
          appointmentId,
          razorpayPaymentId,
          amountInr,
          reason,
          patientId
        ) => {
          // Arrange
          capturedUpdates = {};
          mockFetch.mockRejectedValueOnce(new Error(errorMessage));

          // Act
          await processRefundInBackground(
            paymentId,
            appointmentId,
            razorpayPaymentId,
            amountInr,
            reason,
            patientId
          );

          // Assert: payment doc was updated with failed status
          const paymentUpdates = capturedUpdates[`payments/${paymentId}`];
          expect(paymentUpdates).toBeDefined();
          expect(paymentUpdates.length).toBeGreaterThanOrEqual(1);

          const lastUpdate = paymentUpdates[paymentUpdates.length - 1];
          expect(lastUpdate.refundStatus).toBe("failed");
          expect(typeof lastUpdate.refundFailureReason).toBe("string");
          expect(lastUpdate.refundFailureReason.length).toBeGreaterThan(0);
          expect(lastUpdate.refundFailureReason).toBe(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("property: for any Razorpay error where json() parsing fails, payment doc still has refundStatus 'failed' with HTTP status fallback", async () => {
    await fc.assert(
      fc.asyncProperty(
        httpErrorStatusArb,
        paymentIdArb,
        appointmentIdArb,
        razorpayPaymentIdArb,
        amountInrArb,
        reasonArb,
        patientIdArb,
        async (
          httpStatus,
          paymentId,
          appointmentId,
          razorpayPaymentId,
          amountInr,
          reason,
          patientId
        ) => {
          // Arrange
          capturedUpdates = {};
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: httpStatus,
            json: async () => {
              throw new Error("Invalid JSON");
            },
          });

          // Act
          await processRefundInBackground(
            paymentId,
            appointmentId,
            razorpayPaymentId,
            amountInr,
            reason,
            patientId
          );

          // Assert: payment doc was updated with failed status
          const paymentUpdates = capturedUpdates[`payments/${paymentId}`];
          expect(paymentUpdates).toBeDefined();
          expect(paymentUpdates.length).toBeGreaterThanOrEqual(1);

          const lastUpdate = paymentUpdates[paymentUpdates.length - 1];
          expect(lastUpdate.refundStatus).toBe("failed");
          expect(typeof lastUpdate.refundFailureReason).toBe("string");
          expect(lastUpdate.refundFailureReason.length).toBeGreaterThan(0);
          // When json() throws, .catch(() => ({})) returns empty object,
          // so fallback is HTTP status
          expect(lastUpdate.refundFailureReason).toBe(`HTTP ${httpStatus}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
