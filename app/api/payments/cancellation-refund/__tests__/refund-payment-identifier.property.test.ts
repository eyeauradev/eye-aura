/**
 * Property 7 — Refund uses correct payment identifier and full amount.
 *
 * For any approved cancellation with a valid payment record containing a
 * `razorpayPaymentId` and `amount`, the refund request sent to Razorpay SHALL
 * use that exact `razorpayPaymentId` and the full `amount` (converted to paise).
 *
 * **Validates: Requirements 5.1**
 */

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

// ─── Captured fetch calls ───────────────────────────────────────────────────

let capturedFetchUrl: string | undefined;
let capturedFetchBody: any;

// ─── Mock global fetch ──────────────────────────────────────────────────────

const mockFetch = vi.fn(async (url: string, options?: any) => {
  capturedFetchUrl = url;
  capturedFetchBody = JSON.parse(options?.body || "{}");
  return {
    ok: true,
    json: async () => ({ id: "rfnd_mock_123" }),
  };
});

vi.stubGlobal("fetch", mockFetch);

// ─── Mock next/server ───────────────────────────────────────────────────────

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status || 200 }),
  },
  after: vi.fn((fn: () => void) => fn()), // Execute immediately for testing
}));

// ─── Mock firebase admin ────────────────────────────────────────────────────

const mockUpdate = vi.fn(async () => {});
const mockGet = vi.fn();

vi.mock("@/services/firebase/admin", () => ({
  getAdminAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(async () => ({ uid: "doctor-1" })),
  })),
  getAdminDb: vi.fn(() => ({
    collection: vi.fn((collectionName: string) => ({
      doc: vi.fn((docId: string) => ({
        get: mockGet,
        update: mockUpdate,
      })),
    })),
  })),
}));

// ─── Mock environment variables ─────────────────────────────────────────────

vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_key");
vi.stubEnv("RAZORPAY_KEY_SECRET", "rzp_test_secret");

// ─── Import the module under test (after mocks) ────────────────────────────

import { POST } from "../route";

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generates a valid Razorpay payment ID: starts with "pay_" followed by
 * alphanumeric characters (mimics real Razorpay IDs).
 */
const razorpayPaymentIdArb = fc
  .stringOf(
    fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
    { minLength: 8, maxLength: 24 }
  )
  .map((s) => `pay_${s}`);

/**
 * Generates a positive amount in INR (rupees).
 * Uses realistic range: 1 to 100000 with up to 2 decimal places.
 */
const amountInrArb = fc
  .double({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true })
  .map((n) => Math.round(n * 100) / 100); // Ensure max 2 decimal places

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 7: Refund uses correct payment identifier and full amount", () => {
  beforeEach(() => {
    capturedFetchUrl = undefined;
    capturedFetchBody = undefined;
    mockFetch.mockClear();
    mockUpdate.mockClear();
    mockGet.mockClear();
  });

  test("property: refund request URL contains exact razorpayPaymentId and body amount equals Math.round(amountInr * 100)", async () => {
    await fc.assert(
      fc.asyncProperty(
        razorpayPaymentIdArb,
        amountInrArb,
        async (razorpayPaymentId, amountInr) => {
          // Reset captures for each iteration
          capturedFetchUrl = undefined;
          capturedFetchBody = undefined;
          mockFetch.mockClear();
          mockUpdate.mockClear();

          // Configure mockGet to return appropriate documents
          mockGet
            .mockResolvedValueOnce({
              // users doc (for verifyToken)
              exists: true,
              data: () => ({ role: "doctor" }),
            })
            .mockResolvedValueOnce({
              // payment doc
              exists: true,
              data: () => ({
                razorpayPaymentId,
                amount: amountInr,
              }),
            })
            .mockResolvedValueOnce({
              // appointment doc
              exists: true,
              data: () => ({
                cancellationReason: "Patient requested",
                patientId: "patient-1",
              }),
            });

          // Create a mock request
          const mockRequest = {
            headers: {
              get: (name: string) =>
                name === "Authorization" ? "Bearer mock-token" : null,
            },
            json: async () => ({
              appointmentId: "apt-123",
              paymentId: "pay-doc-123",
            }),
          } as any;

          // Act
          await POST(mockRequest);

          // Assert — URL contains the exact razorpayPaymentId
          expect(capturedFetchUrl).toBeDefined();
          expect(capturedFetchUrl).toContain(razorpayPaymentId);
          expect(capturedFetchUrl).toBe(
            `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`
          );

          // Assert — body amount equals Math.round(amountInr * 100) (paise conversion)
          expect(capturedFetchBody).toBeDefined();
          expect(capturedFetchBody.amount).toBe(Math.round(amountInr * 100));
        }
      ),
      { numRuns: 100 }
    );
  });
});
