/**
 * Unit tests for NotificationDeliveryService
 *
 * Tests the retry mechanism with exponential backoff:
 * - Successful delivery on first attempt
 * - Retry up to 3 times with backoff (1s, 2s, 4s)
 * - After 3rd failure: persist as "undelivered"
 * - Log failure in audit
 *
 * **Validates: Requirements 4.6, 9.7**
 */

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import type { Notification } from "@/types/notifications";

// ─── Mock Firestore ─────────────────────────────────────────────────────────

let mockSetDoc: ReturnType<typeof vi.fn>;
let setDocCallCount: number;
let setDocShouldFail: boolean;
let setDocFailUntilAttempt: number;
let setDocCallArgs: any[];

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: any, name: string) => ({ _name: name })),
  doc: vi.fn((_col: any, id: string) => ({ _path: `notifications/${id}` })),
  setDoc: vi.fn(async (...args: any[]) => {
    setDocCallCount++;
    setDocCallArgs.push(args);
    if (setDocShouldFail && setDocCallCount <= setDocFailUntilAttempt) {
      throw new Error(`Firestore write failed (attempt ${setDocCallCount})`);
    }
  }),
}));

vi.mock("@/services/firebase/client", () => ({
  getFirebaseDb: vi.fn(() => ({})),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { notificationDeliveryService } from "../notification-delivery.service";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeNotification(overrides?: Partial<Notification>): Notification {
  return {
    id: "notif-test-001",
    userId: "patient-123",
    type: "assessment_assigned",
    title: "New Assessment",
    message: "You have a new assessment",
    read: false,
    createdAt: new Date("2024-06-01T10:00:00Z"),
    ...overrides,
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("NotificationDeliveryService", () => {
  beforeEach(() => {
    setDocCallCount = 0;
    setDocShouldFail = false;
    setDocFailUntilAttempt = 0;
    setDocCallArgs = [];
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("delivers notification successfully on first attempt", async () => {
    const notification = makeNotification();

    await notificationDeliveryService.deliver(notification);

    expect(setDocCallCount).toBe(1);
    expect(setDocCallArgs[0][1]).toMatchObject({
      id: "notif-test-001",
      userId: "patient-123",
      type: "assessment_assigned",
    });
  });

  test("retries with exponential backoff on failure", async () => {
    setDocShouldFail = true;
    setDocFailUntilAttempt = 2; // Fail first 2 attempts, succeed on 3rd

    const notification = makeNotification();

    const deliverPromise = notificationDeliveryService.deliver(notification);

    // First attempt fails, then waits 1s
    await vi.advanceTimersByTimeAsync(1000);

    // Second attempt fails, then waits 2s
    await vi.advanceTimersByTimeAsync(2000);

    // Third attempt succeeds
    await deliverPromise;

    // setDoc was called 3 times (2 failures + 1 success)
    expect(setDocCallCount).toBe(3);
  });

  test("persists notification as undelivered after 3 failed attempts", async () => {
    setDocShouldFail = true;
    setDocFailUntilAttempt = 3; // Fail all 3 attempts

    const notification = makeNotification();

    const deliverPromise = notificationDeliveryService.deliver(notification);

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(1000); // After 1st failure
    await vi.advanceTimersByTimeAsync(2000); // After 2nd failure

    await deliverPromise;

    // 3 failed attempts + 1 "undelivered" persist call = 4 setDoc calls
    expect(setDocCallCount).toBe(4);

    // The last call should include deliveryStatus: "undelivered"
    const lastCallData = setDocCallArgs[3][1];
    expect(lastCallData.deliveryStatus).toBe("undelivered");
    expect(lastCallData.id).toBe("notif-test-001");
  });

  test("logs failure in console.error (audit log)", async () => {
    setDocShouldFail = true;
    setDocFailUntilAttempt = 3; // Fail all 3 attempts

    const notification = makeNotification();

    const deliverPromise = notificationDeliveryService.deliver(notification);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await deliverPromise;

    // Check that the audit log was called
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[AUDIT]"),
      expect.objectContaining({
        notificationId: "notif-test-001",
        userId: "patient-123",
        type: "assessment_assigned",
      })
    );
  });

  test("succeeds on second attempt after first failure", async () => {
    setDocShouldFail = true;
    setDocFailUntilAttempt = 1; // Fail only first attempt

    const notification = makeNotification();

    const deliverPromise = notificationDeliveryService.deliver(notification);

    // Advance past the 1s delay after first failure
    await vi.advanceTimersByTimeAsync(1000);

    await deliverPromise;

    // 1 failure + 1 success = 2 calls
    expect(setDocCallCount).toBe(2);
  });

  test("serializes createdAt as ISO string in the persisted document", async () => {
    const notification = makeNotification({
      createdAt: new Date("2024-06-15T14:30:00Z"),
    });

    await notificationDeliveryService.deliver(notification);

    const persistedData = setDocCallArgs[0][1];
    expect(persistedData.createdAt).toBe("2024-06-15T14:30:00.000Z");
  });
});
