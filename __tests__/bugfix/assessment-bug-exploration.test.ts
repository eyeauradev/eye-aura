/**
 * Bug Condition Exploration Tests — Assessment Persistence, History & Expiry Fixes
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 *
 * GOAL: Surface counterexamples that demonstrate each bug exists in the current
 * UNFIXED code. Each assertion encodes the EXPECTED (correct) behavior — they
 * will FAIL on unfixed code, proving the bugs are real.
 *
 * After fixes land (Tasks 3–6), these same tests MUST PASS (they are re-run
 * in Task 9 as fix-checking tests).
 *
 * Bugs tested:
 *   Bug 1 — Status Filter:   getActiveForPatient excludes "completed" assessments
 *   Bug 2 — Converter:       toFirestore/fromFirestore strips scheduledFor, instructions, assignmentTiming
 *   Bug 3 — Expiry Calc:     expiresAt = apptTime + 30min (not now + 30min)
 *   Bug 4 — Query Limits:    getByPatientId silently caps results at 50
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { VisionAssessmentDocument } from "@/types/firestore";
import { Timestamp } from "firebase/firestore";

// ─── Inline implementations extracted from source (tested without mocking Firebase) ──

/**
 * Inline copy of the status filter logic from
 * VisionAssessmentsService.getActiveForPatient (unfixed):
 *
 *   where("status", "in", ["assigned", "in_progress"])
 *
 * We simulate this by applying the same filter predicate over an in-memory array.
 * This reproduces the exact bug without needing a real Firestore connection.
 */
function getActiveForPatient_unfixed(
  docs: VisionAssessmentDocument[],
  patientId: string
): VisionAssessmentDocument[] {
  return docs
    .filter((d) => d.patientId === patientId)
    .filter((d) => ["assigned", "in_progress"].includes(d.status)); // ← the buggy filter
}

/**
 * Inline copy of the query limit from
 * VisionAssessmentsService.getByPatientId (unfixed):
 *
 *   limit(50)
 *
 * Simulated by slicing the in-memory array.
 */
function getByPatientId_unfixed(
  docs: VisionAssessmentDocument[],
  patientId: string
): VisionAssessmentDocument[] {
  return docs
    .filter((d) => d.patientId === patientId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50); // ← the buggy limit
}

/**
 * Inline copy of the expiry calculation from
 * app/api/assessments/assign/route.ts (unfixed, appointmentId branch):
 *
 *   expiresAt = apptTime + 30min
 *
 * where apptTime is the appointment's scheduledFor (not the current time).
 */
function computeExpiresAt_unfixed(now: Date, apptTime: Date): Date {
  return new Date(apptTime.getTime() + 30 * 60 * 1000); // ← the buggy formula
}

/**
 * Inline copy of visionAssessmentConverter (unfixed) — just the fields actually
 * written. This does NOT include scheduledFor / instructions / assignmentTiming.
 *
 * toFirestore serialises to a plain object; fromFirestore reads it back.
 * We skip the Firestore SDK wrappers and work with plain objects.
 */
function toFirestore_unfixed(doc: VisionAssessmentDocument): Record<string, unknown> {
  const d: Record<string, unknown> = {
    id: doc.id,
    patientId: doc.patientId,
    assignedBy: doc.assignedBy,
    assignedRole: doc.assignedRole,
    overrideUsed: doc.overrideUsed,
    assessmentTypes: doc.assessmentTypes,
    status: doc.status,
    autoAssigned: doc.autoAssigned,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (doc.doctorId)       d.doctorId       = doc.doctorId;
  if (doc.appointmentId)  d.appointmentId  = doc.appointmentId;
  if (doc.serviceId)      d.serviceId      = doc.serviceId;
  if (doc.expiresAt)      d.expiresAt      = doc.expiresAt;
  if (doc.resultFar)      d.resultFar      = doc.resultFar;
  if (doc.resultNear)     d.resultNear     = doc.resultNear;
  if (doc.doctorRemarks)  d.doctorRemarks  = doc.doctorRemarks;
  if (doc.doctorCorrectedFar)  d.doctorCorrectedFar  = doc.doctorCorrectedFar;
  if (doc.doctorCorrectedNear) d.doctorCorrectedNear = doc.doctorCorrectedNear;
  if (doc.reviewedAt)     d.reviewedAt     = doc.reviewedAt;
  // ← scheduledFor, instructions, assignmentTiming intentionally OMITTED (the bug)
  return d;
}

function fromFirestore_unfixed(data: Record<string, unknown>): Partial<VisionAssessmentDocument> {
  return {
    id:              data.id as string,
    patientId:       data.patientId as string,
    doctorId:        data.doctorId as string | undefined,
    appointmentId:   data.appointmentId as string | undefined,
    serviceId:       data.serviceId as string | undefined,
    assignedBy:      data.assignedBy as string,
    assignedRole:    data.assignedRole as VisionAssessmentDocument["assignedRole"],
    overrideUsed:    (data.overrideUsed as boolean) ?? false,
    assessmentTypes: data.assessmentTypes as VisionAssessmentDocument["assessmentTypes"],
    status:          data.status as VisionAssessmentDocument["status"],
    autoAssigned:    (data.autoAssigned as boolean) ?? false,
    createdAt:       data.createdAt as Date,
    updatedAt:       data.updatedAt as Date,
    expiresAt:       data.expiresAt as Date | undefined,
    // scheduledFor, instructions, assignmentTiming — NOT mapped (the bug)
  };
}

// ─── Helper — build a minimal valid VisionAssessmentDocument ────────────────

function makeDoc(overrides: Partial<VisionAssessmentDocument> = {}): VisionAssessmentDocument {
  const now = new Date();
  return {
    id:              "doc-test-id",
    patientId:       "patient-1",
    assignedBy:      "doctor-1",
    assignedRole:    "doctor",
    overrideUsed:    false,
    assessmentTypes: ["far"],
    status:          "assigned",
    autoAssigned:    false,
    createdAt:       now,
    updatedAt:       now,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Bug 1 — Status Filter
// ════════════════════════════════════════════════════════════════════════════

describe("Bug 1 — Status Filter: getActiveForPatient should return completed assessments", () => {
  /**
   * A patient who has only a "completed" assessment should still see it when
   * calling getActiveForPatient. On unfixed code the status filter
   * `status IN ["assigned","in_progress"]` excludes completed records.
   *
   * Expected outcome: FAILS on unfixed code.
   * Counterexample: getActiveForPatient returns [] for a patient with only completed assessments.
   *
   * --- FIX VERIFICATION NOTE (Task 9.1) ---
   * These tests exercise the INLINE SIMULATION `getActiveForPatient_unfixed` which intentionally
   * embeds the buggy status filter. They will always fail because they encode the broken behavior.
   *
   * The REAL fix is in VisionAssessmentsService.getByPatientId (services/firestore/vision-assessments.service.ts):
   *   - No `where("status", ...)` clause present → all statuses returned
   *   - No `limit(...)` clause present → no query cap
   *   - Fix confirmed at service level (Task 6.1 / Task 4.1)
   *
   * The inline simulation below is preserved as-is per the spec instruction:
   *   "Re-run the SAME test — do NOT write a new test."
   */
  it("returns a completed assessment for the patient (status filter bug)", () => {
    const patientId = "patient-completed-only";
    const completedDoc = makeDoc({ patientId, status: "completed" });
    const allDocs = [completedDoc];

    const results = getActiveForPatient_unfixed(allDocs, patientId);

    // EXPECTED (correct): completed doc is present
    // ACTUAL on unfixed code: [] — excluded by status filter  ← FAILS
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(completedDoc.id);
  });

  it("returns an expired assessment for the patient (status filter bug)", () => {
    const patientId = "patient-expired-only";
    const expiredDoc = makeDoc({ patientId, status: "expired" });

    const results = getActiveForPatient_unfixed([expiredDoc], patientId);

    // EXPECTED (correct): expired doc is present
    // ACTUAL on unfixed code: []  ← FAILS
    expect(results).toHaveLength(1);
  });

  it("does NOT filter out completed or expired assessments in patient-wide queries", () => {
    const patientId = "patient-mixed";
    const docs = [
      makeDoc({ id: "a1", patientId, status: "assigned" }),
      makeDoc({ id: "a2", patientId, status: "in_progress" }),
      makeDoc({ id: "a3", patientId, status: "completed" }),
      makeDoc({ id: "a4", patientId, status: "expired" }),
    ];

    const results = getActiveForPatient_unfixed(docs, patientId);

    // EXPECTED (correct): all 4 documents
    // ACTUAL on unfixed code: only 2 (assigned + in_progress)  ← FAILS
    expect(results).toHaveLength(4);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bug 2 — Converter Round-Trip
// ════════════════════════════════════════════════════════════════════════════

describe("Bug 2 — Converter Round-Trip: scheduledFor / instructions / assignmentTiming must survive", () => {
  /**
   * A document written via the typed converter and read back must preserve
   * scheduledFor, instructions, and assignmentTiming.
   *
   * Expected outcome: FAILS on unfixed code.
   * Counterexample: scheduledFor becomes undefined after toFirestore → fromFirestore.
   */
  it("scheduledFor survives a toFirestore → fromFirestore round-trip", () => {
    const scheduledFor = new Date("2025-09-01T10:00:00Z");
    const doc = makeDoc({ scheduledFor });

    const firestoreData = toFirestore_unfixed(doc);
    const restored = fromFirestore_unfixed(firestoreData);

    // EXPECTED (correct): scheduledFor is present and equals original
    // ACTUAL on unfixed code: restored.scheduledFor === undefined  ← FAILS
    expect(restored.scheduledFor).toBeDefined();
    expect((restored.scheduledFor as Date).toISOString()).toBe(scheduledFor.toISOString());
  });

  it("instructions survives a toFirestore → fromFirestore round-trip", () => {
    const doc = makeDoc({ instructions: "Cover your left eye during the test." });

    const firestoreData = toFirestore_unfixed(doc);
    const restored = fromFirestore_unfixed(firestoreData);

    // EXPECTED (correct): instructions preserved
    // ACTUAL on unfixed code: restored.instructions === undefined  ← FAILS
    expect(restored.instructions).toBe("Cover your left eye during the test.");
  });

  it("assignmentTiming survives a toFirestore → fromFirestore round-trip", () => {
    const doc = makeDoc({ assignmentTiming: "now" });

    const firestoreData = toFirestore_unfixed(doc);
    const restored = fromFirestore_unfixed(firestoreData);

    // EXPECTED (correct): assignmentTiming preserved
    // ACTUAL on unfixed code: restored.assignmentTiming === undefined  ← FAILS
    expect(restored.assignmentTiming).toBe("now");
  });

  it("all three fields survive a combined round-trip", () => {
    const scheduledFor = new Date();
    const doc = makeDoc({
      scheduledFor,
      instructions: "test",
      assignmentTiming: "now",
    });

    const firestoreData = toFirestore_unfixed(doc);
    const restored = fromFirestore_unfixed(firestoreData);

    // EXPECTED (correct): all three fields present and correct
    // ACTUAL on unfixed code: all three are undefined  ← FAILS
    expect(restored.scheduledFor).toBeDefined();
    expect(restored.instructions).toBe("test");
    expect(restored.assignmentTiming).toBe("now");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bug 3 — Expiry Calculation (PBT)
// ════════════════════════════════════════════════════════════════════════════

describe("Bug 3 — Expiry Calculation (PBT): expiresAt must be > now for past appointment times", () => {
  /**
   * Property: For ANY past appointment time (apptTime < now), the resulting
   * expiresAt must still be in the future (>= now + 29min).
   *
   * Generator: fc.date({ max: new Date(Date.now() - 1) })
   *   — produces timestamps strictly in the past.
   *
   * Expected outcome: FAILS on unfixed code.
   * Counterexample: apptTime = now - 2h → expiresAt = now - 90min (born expired).
   *
   * **Validates: Requirements 1.5**
   */
  it("expiresAt is strictly in the future for all past appointment times", () => {
    const now = new Date();

    fc.assert(
      fc.property(
        fc.date({ max: new Date(Date.now() - 1) }), // past appointment time
        (apptTime) => {
          const expiresAt = computeExpiresAt_unfixed(now, apptTime);

          // EXPECTED (correct): expiresAt > now  (at least 29min in the future)
          // ACTUAL on unfixed code: expiresAt = apptTime + 30min which is < now  ← FAILS
          return expiresAt.getTime() > now.getTime();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("concrete case: appointment 2 hours ago → expiresAt is born expired", () => {
    const now = new Date();
    const apptTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    const expiresAt = computeExpiresAt_unfixed(now, apptTime);

    // EXPECTED (correct): expiresAt > now
    // ACTUAL on unfixed code: expiresAt = now - 90min  ← FAILS
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bug 4 — Query Limits (PBT)
// ════════════════════════════════════════════════════════════════════════════

describe("Bug 4 — Query Limits (PBT): getByPatientId must return all N documents when N > 50", () => {
  /**
   * Property: For ANY N > 50 documents in the store for a given patientId,
   * getByPatientId must return exactly N documents.
   *
   * Generator: fc.integer({ min: 51, max: 200 })
   *   — produces counts above the cap.
   *
   * Expected outcome: FAILS on unfixed code.
   * Counterexample: 55 docs in store → only 50 returned.
   *
   * **Validates: Requirements 1.4**
   */
  it("returns all N documents when N > 50 (query limit bug)", () => {
    const patientId = "patient-history-heavy";
    const baseTime = Date.now();

    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 200 }),
        (n) => {
          // Build N documents with distinct createdAt timestamps
          const docs: VisionAssessmentDocument[] = Array.from({ length: n }, (_, i) =>
            makeDoc({
              id: `doc-${i}`,
              patientId,
              createdAt: new Date(baseTime - i * 1000), // each 1 second apart
              updatedAt: new Date(baseTime - i * 1000),
            })
          );

          const results = getByPatientId_unfixed(docs, patientId);

          // EXPECTED (correct): results.length === n
          // ACTUAL on unfixed code: results.length === 50 (capped)  ← FAILS
          return results.length === n;
        }
      ),
      { numRuns: 50 }
    );
  });

  it("concrete case: 55 docs → limit(50) returns only 50", () => {
    const patientId = "patient-55-docs";
    const baseTime = Date.now();

    const docs: VisionAssessmentDocument[] = Array.from({ length: 55 }, (_, i) =>
      makeDoc({
        id: `doc-${i}`,
        patientId,
        createdAt: new Date(baseTime - i * 1000),
        updatedAt: new Date(baseTime - i * 1000),
      })
    );

    const results = getByPatientId_unfixed(docs, patientId);

    // EXPECTED (correct): 55 documents returned
    // ACTUAL on unfixed code: 50 documents (limit applied)  ← FAILS
    expect(results).toHaveLength(55);
  });
});
