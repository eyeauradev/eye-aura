/**
 * Property 3 — Empty or whitespace-only cancellation reasons are rejected.
 *
 * For any string composed entirely of whitespace characters (including empty
 * string), the cancellation request submission SHALL be blocked and the
 * appointment status SHALL remain unchanged.
 *
 * **Validates: Requirements 2.4**
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ─── Mock transaction service ───────────────────────────────────────────────

/**
 * We mock the transactionService to verify that
 * `requestCancellationWithTransaction` is NEVER called when the reason is
 * empty or whitespace-only. The BookingService validation should reject
 * before reaching the transaction layer.
 */

const mockRequestCancellation = vi.fn();

vi.mock("@/services/booking/transaction.service", () => ({
  transactionService: {
    requestCancellationWithTransaction: (...args: any[]) =>
      mockRequestCancellation(...args),
  },
}));

// Mock appointmentsService (not expected to be called for invalid reasons)
const mockGetById = vi.fn();

vi.mock("@/services/firestore", () => ({
  appointmentsService: {
    getById: (...args: any[]) => mockGetById(...args),
  },
  servicesService: {},
  doctorSlotsService: {},
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { BookingService } from "../booking.service";

// ─── Generators ─────────────────────────────────────────────────────────────

/** Whitespace characters: space, tab, newline, carriage return, form feed. */
const whitespaceChars = [" ", "\t", "\n", "\r", "\f", "\v"];

/**
 * Generate strings composed entirely of whitespace characters.
 * Includes the empty string (minLength: 0).
 */
const whitespaceOnlyArb = fc.stringOf(
  fc.constantFrom(...whitespaceChars),
  { minLength: 0, maxLength: 50 }
);

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 3: Empty or whitespace-only cancellation reasons are rejected", () => {
  let service: BookingService;

  beforeEach(() => {
    service = new BookingService();
    mockRequestCancellation.mockClear();
    mockGetById.mockClear();
  });

  test("property: whitespace-only reasons throw 'Cancellation reason is required'", async () => {
    await fc.assert(
      fc.asyncProperty(whitespaceOnlyArb, async (reason) => {
        // Act & Assert — should throw with the expected message
        await expect(
          service.cancelBooking("any-appointment-id", reason)
        ).rejects.toThrow("Cancellation reason is required");

        // The transaction method should never be called
        expect(mockRequestCancellation).not.toHaveBeenCalled();

        // The appointmentsService.getById should never be called
        expect(mockGetById).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  test("property: empty string is rejected", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(""), async (reason) => {
        await expect(
          service.cancelBooking("apt-123", reason)
        ).rejects.toThrow("Cancellation reason is required");

        expect(mockRequestCancellation).not.toHaveBeenCalled();
      }),
      { numRuns: 1 }
    );
  });
});
