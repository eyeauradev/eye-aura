/**
 * Property 6 — Admin cancellation filter returns correct subset.
 *
 * For any collection of appointments with mixed statuses and for any selected
 * filter value from {pending, approved, rejected}, the filtered results SHALL
 * contain only appointments matching that filter criterion, and the count SHALL
 * equal the number of matching items in the original collection.
 *
 * **Validates: Requirements 4.5**
 */

import { describe, expect, test } from "vitest";
import fc from "fast-check";
import {
  filterCancellationRequests,
  type EnrichedCancellation,
  type FilterStatus,
} from "../filter-utils";
import type { AppointmentDocument } from "@/types/firestore";

// ─── Generators ─────────────────────────────────────────────────────────────

/** Base appointment fields shared across all generated appointments. */
function baseAppointment(): Partial<AppointmentDocument> {
  return {
    id: "",
    patientId: "patient-1",
    doctorId: "doctor-1",
    serviceId: "service-1",
    slotId: "slot-1",
    notes: "",
    consultationPlatform: "google_meet" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduledFor: new Date(),
  };
}

/**
 * Generate a "pending cancellation" appointment:
 * status === "cancellation_requested"
 */
const pendingAppointmentArb: fc.Arbitrary<AppointmentDocument> = fc
  .record({
    id: fc.uuid(),
    cancellationReason: fc.string({ minLength: 1, maxLength: 50 }),
    cancellationRequestedAt: fc.date(),
  })
  .map(({ id, cancellationReason, cancellationRequestedAt }) => ({
    ...baseAppointment(),
    id,
    status: "cancellation_requested" as const,
    cancellationReason,
    cancellationRequestedAt,
  })) as fc.Arbitrary<AppointmentDocument>;

/**
 * Generate an "approved cancellation" appointment:
 * status === "cancelled" AND cancellationApprovedAt is set
 */
const approvedAppointmentArb: fc.Arbitrary<AppointmentDocument> = fc
  .record({
    id: fc.uuid(),
    cancellationApprovedAt: fc.date(),
    cancellationApprovedBy: fc.uuid(),
  })
  .map(({ id, cancellationApprovedAt, cancellationApprovedBy }) => ({
    ...baseAppointment(),
    id,
    status: "cancelled" as const,
    cancellationApprovedAt,
    cancellationApprovedBy,
    cancellationApprovedByRole: "doctor" as const,
    cancelledAt: new Date(),
  })) as fc.Arbitrary<AppointmentDocument>;

/**
 * Generate a "rejected cancellation" appointment:
 * has cancellationRejectedAt set (status reverts to pending/confirmed)
 */
const rejectedAppointmentArb: fc.Arbitrary<AppointmentDocument> = fc
  .record({
    id: fc.uuid(),
    cancellationRejectedAt: fc.date(),
    cancellationRejectedBy: fc.uuid(),
    cancellationRejectionReason: fc.string({ minLength: 1, maxLength: 50 }),
    status: fc.constantFrom("pending" as const, "confirmed" as const),
  })
  .map(({ id, cancellationRejectedAt, cancellationRejectedBy, cancellationRejectionReason, status }) => ({
    ...baseAppointment(),
    id,
    status,
    cancellationRejectedAt,
    cancellationRejectedBy,
    cancellationRejectedByRole: "admin" as const,
    cancellationRejectionReason,
  })) as fc.Arbitrary<AppointmentDocument>;

/**
 * Generate a "cancelled without approval" appointment:
 * status === "cancelled" but NO cancellationApprovedAt (e.g. direct cancellation)
 * This should NOT match "approved" filter.
 */
const cancelledNoApprovalArb: fc.Arbitrary<AppointmentDocument> = fc
  .record({
    id: fc.uuid(),
  })
  .map(({ id }) => ({
    ...baseAppointment(),
    id,
    status: "cancelled" as const,
    cancelledAt: new Date(),
  })) as fc.Arbitrary<AppointmentDocument>;

/**
 * Generate a "normal" appointment that doesn't match any cancellation filter
 * (except "all").
 */
const normalAppointmentArb: fc.Arbitrary<AppointmentDocument> = fc
  .record({
    id: fc.uuid(),
    status: fc.constantFrom("pending" as const, "confirmed" as const, "in_progress" as const, "completed" as const),
  })
  .map(({ id, status }) => ({
    ...baseAppointment(),
    id,
    status,
  })) as fc.Arbitrary<AppointmentDocument>;

/** Generate a mixed collection of appointments. */
const appointmentCollectionArb: fc.Arbitrary<AppointmentDocument[]> = fc.array(
  fc.oneof(
    { weight: 3, arbitrary: pendingAppointmentArb },
    { weight: 2, arbitrary: approvedAppointmentArb },
    { weight: 2, arbitrary: rejectedAppointmentArb },
    { weight: 1, arbitrary: cancelledNoApprovalArb },
    { weight: 2, arbitrary: normalAppointmentArb }
  ),
  { minLength: 0, maxLength: 30 }
);

/** Generate a filter value (excluding "all" for subset tests). */
const filterStatusArb: fc.Arbitrary<FilterStatus> = fc.constantFrom(
  "pending" as FilterStatus,
  "approved" as FilterStatus,
  "rejected" as FilterStatus
);

/** Wrap appointments into EnrichedCancellation objects. */
function enrichAppointments(appointments: AppointmentDocument[]): EnrichedCancellation[] {
  return appointments.map((apt) => ({
    appointment: apt,
    patientName: "Test Patient",
    doctorName: "Test Doctor",
  }));
}

// ─── Predicate helpers (mirror the filter logic for verification) ───────────

function matchesPending(apt: AppointmentDocument): boolean {
  return apt.status === "cancellation_requested";
}

function matchesApproved(apt: AppointmentDocument): boolean {
  return apt.status === "cancelled" && !!apt.cancellationApprovedAt;
}

function matchesRejected(apt: AppointmentDocument): boolean {
  return !!apt.cancellationRejectedAt;
}

function getMatchPredicate(filter: FilterStatus): (apt: AppointmentDocument) => boolean {
  switch (filter) {
    case "pending":
      return matchesPending;
    case "approved":
      return matchesApproved;
    case "rejected":
      return matchesRejected;
    case "all":
      return () => true;
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 6: Admin cancellation filter returns correct subset", () => {
  test("property: filtered results contain ONLY items matching the filter criterion", () => {
    fc.assert(
      fc.property(appointmentCollectionArb, filterStatusArb, (appointments, filter) => {
        const enriched = enrichAppointments(appointments);
        const filtered = filterCancellationRequests(enriched, filter);
        const predicate = getMatchPredicate(filter);

        // Every item in the filtered result must match the predicate
        for (const item of filtered) {
          expect(predicate(item.appointment)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  test("property: filtered count equals the number of matching items in the original collection", () => {
    fc.assert(
      fc.property(appointmentCollectionArb, filterStatusArb, (appointments, filter) => {
        const enriched = enrichAppointments(appointments);
        const filtered = filterCancellationRequests(enriched, filter);
        const predicate = getMatchPredicate(filter);

        // Count matching items in the original collection
        const expectedCount = appointments.filter(predicate).length;

        expect(filtered.length).toBe(expectedCount);
      }),
      { numRuns: 200 }
    );
  });

  test("property: 'all' filter returns the entire collection unchanged", () => {
    fc.assert(
      fc.property(appointmentCollectionArb, (appointments) => {
        const enriched = enrichAppointments(appointments);
        const filtered = filterCancellationRequests(enriched, "all");

        expect(filtered.length).toBe(enriched.length);
      }),
      { numRuns: 100 }
    );
  });

  test("property: filtered results are a subset of the original collection", () => {
    fc.assert(
      fc.property(appointmentCollectionArb, filterStatusArb, (appointments, filter) => {
        const enriched = enrichAppointments(appointments);
        const filtered = filterCancellationRequests(enriched, filter);

        // Every filtered item must exist in the original collection
        const originalIds = new Set(enriched.map((e) => e.appointment.id));
        for (const item of filtered) {
          expect(originalIds.has(item.appointment.id)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
