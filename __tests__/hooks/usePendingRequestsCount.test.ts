/**
 * Unit tests for usePendingRequestsCount hook
 * 
 * Tests real-time Firestore listener for pending booking requests count
 */

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePendingRequestsCount } from "@/hooks/usePendingRequestsCount";

// Mock Firestore
const mockOnSnapshot = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockCollection = vi.fn();
const mockGetFirebaseDb = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}));

vi.mock("@/services/firebase/client", () => ({
  getFirebaseDb: () => mockGetFirebaseDb(),
}));

describe("usePendingRequestsCount", () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeMock = vi.fn();

    // Default mock implementations
    mockGetFirebaseDb.mockReturnValue({ _type: "firestore" });
    mockCollection.mockReturnValue({ _type: "collection" });
    mockWhere.mockReturnValue({ _type: "where" });
    mockQuery.mockReturnValue({ _type: "query" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns count 0 and loading false when doctorId is null", () => {
    const { result } = renderHook(() => usePendingRequestsCount(null));

    expect(result.current.count).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("sets up Firestore listener with correct query constraints", async () => {
    const doctorId = "doctor-123";

    mockOnSnapshot.mockImplementation((query, onSuccess) => {
      // Simulate successful query with 3 pending requests
      onSuccess({ size: 3 });
      return unsubscribeMock;
    });

    renderHook(() => usePendingRequestsCount(doctorId));

    // Verify query was called with correct constraints
    await waitFor(() => {
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        "booking_requests"
      );
      expect(mockWhere).toHaveBeenCalledWith("doctorId", "==", doctorId);
      expect(mockWhere).toHaveBeenCalledWith("status", "==", "pending");
    });
  });

  test("returns correct count from Firestore snapshot", async () => {
    const doctorId = "doctor-123";
    const expectedCount = 5;

    mockOnSnapshot.mockImplementation((query, onSuccess) => {
      onSuccess({ size: expectedCount });
      return unsubscribeMock;
    });

    const { result } = renderHook(() => usePendingRequestsCount(doctorId));

    await waitFor(() => {
      expect(result.current.count).toBe(expectedCount);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  test("updates count when snapshot changes", async () => {
    const doctorId = "doctor-123";
    let snapshotCallback: ((snapshot: { size: number }) => void) | undefined;

    mockOnSnapshot.mockImplementation((query, onSuccess) => {
      snapshotCallback = onSuccess;
      // Initial count
      onSuccess({ size: 2 });
      return unsubscribeMock;
    });

    const { result } = renderHook(() => usePendingRequestsCount(doctorId));

    // Initial count
    await waitFor(() => {
      expect(result.current.count).toBe(2);
    });

    // Simulate real-time update
    if (snapshotCallback) {
      snapshotCallback({ size: 7 });
    }

    await waitFor(() => {
      expect(result.current.count).toBe(7);
    });
  });

  test("handles Firestore errors gracefully", async () => {
    const doctorId = "doctor-123";
    const expectedError = new Error("Firestore connection failed");

    mockOnSnapshot.mockImplementation((query, onSuccess, onError) => {
      onError(expectedError);
      return unsubscribeMock;
    });

    const { result } = renderHook(() => usePendingRequestsCount(doctorId));

    await waitFor(() => {
      expect(result.current.error).toEqual(expectedError);
      expect(result.current.loading).toBe(false);
      expect(result.current.count).toBe(0);
    });
  });

  test("unsubscribes from Firestore listener on unmount", async () => {
    const doctorId = "doctor-123";

    mockOnSnapshot.mockImplementation((query, onSuccess) => {
      onSuccess({ size: 3 });
      return unsubscribeMock;
    });

    const { unmount } = renderHook(() => usePendingRequestsCount(doctorId));

    unmount();

    await waitFor(() => {
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  test("cleans up and re-subscribes when doctorId changes", async () => {
    const doctorId1 = "doctor-123";
    const doctorId2 = "doctor-456";

    mockOnSnapshot.mockImplementation((query, onSuccess) => {
      onSuccess({ size: 3 });
      return unsubscribeMock;
    });

    const { rerender } = renderHook(
      ({ id }) => usePendingRequestsCount(id),
      { initialProps: { id: doctorId1 } }
    );

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    });

    // Change doctorId
    rerender({ id: doctorId2 });

    await waitFor(() => {
      expect(unsubscribeMock).toHaveBeenCalled();
      expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
    });
  });

  test("shows loading state initially", () => {
    const doctorId = "doctor-123";

    mockOnSnapshot.mockImplementation(() => {
      // Don't call callback immediately to simulate loading
      return unsubscribeMock;
    });

    const { result } = renderHook(() => usePendingRequestsCount(doctorId));

    expect(result.current.loading).toBe(true);
    expect(result.current.count).toBe(0);
  });

  test("handles count of zero correctly", async () => {
    const doctorId = "doctor-123";

    mockOnSnapshot.mockImplementation((query, onSuccess) => {
      onSuccess({ size: 0 });
      return unsubscribeMock;
    });

    const { result } = renderHook(() => usePendingRequestsCount(doctorId));

    await waitFor(() => {
      expect(result.current.count).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
