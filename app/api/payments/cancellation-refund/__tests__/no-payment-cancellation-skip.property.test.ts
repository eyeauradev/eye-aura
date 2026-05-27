/**
 * Property 10 — No-payment cancellation skips refund without error.
 *
 * For any approved cancellation where no payment record exists for the
 * appointment, the cancellation SHALL complete successfully with
 * `{ success: true, refundStatus: "none" }`, and no Razorpay API call
 * (fetch) SHALL be made.
 *
 * **Validates: Requirements 5.5**
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ─── Mock global fetch ──────────────────────────────────────────────────────

const mockFetch = vi.fn();
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

const mockGet = vi.fn();
const mockUpdate = vi.fn(async () => {});

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
 * Generates a random appointmentId: non-empty alphanumeric string
 * prefixed with "apt-" to mimic real appointment IDs.
 */
const appointmentIdArb = fc
  .stringOf(
    fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
    { minLength: 5, maxLength: 30 }
  )
  .map((s) => `apt-${s}`);

/**
 * Generates a random paymentId: non-empty alphanumeric string
 * prefixed with "pay-" to mimic real payment document IDs.
 */
const paymentIdArb = fc
  .stringOf(
    fc.char().filter((c) => /[a-zA-Z0-9]/.test(c)),
    { minLength: 5, maxLength: 30 }
  )
  .map((s) => `pay-${s}`);

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 10: No-payment cancellation skips refund without error", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockGet.mockClear();
    mockUpdate.mockClear();
  });

  test("property: when no payment doc exists, response is { success: true, refundStatus: 'none' } and no fetch call is made", async () => {
    await fc.assert(
      fc.asyncProperty(
        appointmentIdArb,
        paymentIdArb,
        async (appointmentId, paymentId) => {
          // Reset mocks for each iteration
          mockFetch.mockClear();
          mockGet.mockClear();
          mockUpdate.mockClear();

          // Configure mockGet:
          // 1st call: users doc (for verifyToken) — exists with doctor role
          // 2nd call: payment doc — does NOT exist
          mockGet
            .mockResolvedValueOnce({
              exists: true,
              data: () => ({ role: "doctor" }),
            })
            .mockResolvedValueOnce({
              exists: false,
              data: () => undefined,
            });

          // Create a mock request with the generated IDs
          const mockRequest = {
            headers: {
              get: (name: string) =>
                name === "Authorization" ? "Bearer mock-token" : null,
            },
            json: async () => ({
              appointmentId,
              paymentId,
            }),
          } as any;

          // Act
          const response = await POST(mockRequest);

          // Assert — response indicates success with no refund
          expect(response.body).toEqual({
            success: true,
            refundStatus: "none",
          });
          expect(response.status).toBe(200);

          // Assert — no Razorpay API call was made (fetch not called for refund)
          expect(mockFetch).not.toHaveBeenCalled();

          // Assert — no update calls were made (no refund-related fields set)
          expect(mockUpdate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
