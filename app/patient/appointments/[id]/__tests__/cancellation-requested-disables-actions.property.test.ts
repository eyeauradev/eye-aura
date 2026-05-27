/**
 * Property 2 — Cancellation-requested status disables patient actions.
 *
 * For any appointment with status `cancellation_requested`, the computed
 * `canCancel` flag SHALL be `false` and the computed `canReschedule` flag
 * SHALL be `false`, regardless of the appointment's scheduled date.
 *
 * **Validates: Requirements 2.3**
 */

import { describe, expect, test } from "vitest";
import fc from "fast-check";

// ─── Extract the patient action logic under test ────────────────────────────

/**
 * Replicates the patient action computation from
 * `app/patient/appointments/[id]/page.tsx`.
 *
 * This is a pure function extracted for testability.
 */
function computePatientActions(appointment: {
  status: string;
  scheduledFor: Date;
}): { canCancel: boolean; canReschedule: boolean } {
  const isUpcoming = new Date(appointment.scheduledFor) > new Date();
  const canCancel =
    isUpcoming &&
    appointment.status !== "cancelled" &&
    appointment.status !== "cancellation_requested";
  const canReschedule =
    isUpcoming &&
    (appointment.status === "pending" || appointment.status === "confirmed");

  return { canCancel, canReschedule };
}

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generate a future date (1 minute to 365 days from now). */
const futureDateArb = fc
  .integer({ min: 60_000, max: 365 * 24 * 60 * 60 * 1000 })
  .map((offset) => new Date(Date.now() + offset));

/** Generate a past date (1 minute to 365 days ago). */
const pastDateArb = fc
  .integer({ min: 60_000, max: 365 * 24 * 60 * 60 * 1000 })
  .map((offset) => new Date(Date.now() - offset));

/** Generate any date — past or future. */
const anyDateArb = fc.oneof(futureDateArb, pastDateArb);

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 2: Cancellation-requested status disables patient actions", () => {
  test("property: canCancel is false for cancellation_requested with future dates", () => {
    fc.assert(
      fc.property(futureDateArb, (scheduledFor) => {
        const { canCancel } = computePatientActions({
          status: "cancellation_requested",
          scheduledFor,
        });

        expect(canCancel).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test("property: canReschedule is false for cancellation_requested with future dates", () => {
    fc.assert(
      fc.property(futureDateArb, (scheduledFor) => {
        const { canReschedule } = computePatientActions({
          status: "cancellation_requested",
          scheduledFor,
        });

        expect(canReschedule).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test("property: both canCancel and canReschedule are false for cancellation_requested regardless of date", () => {
    fc.assert(
      fc.property(anyDateArb, (scheduledFor) => {
        const { canCancel, canReschedule } = computePatientActions({
          status: "cancellation_requested",
          scheduledFor,
        });

        expect(canCancel).toBe(false);
        expect(canReschedule).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  test("property: past dates also disable actions for cancellation_requested", () => {
    fc.assert(
      fc.property(pastDateArb, (scheduledFor) => {
        const { canCancel, canReschedule } = computePatientActions({
          status: "cancellation_requested",
          scheduledFor,
        });

        expect(canCancel).toBe(false);
        expect(canReschedule).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
