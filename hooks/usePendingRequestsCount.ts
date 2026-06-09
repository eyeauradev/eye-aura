"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";

export interface UsePendingRequestsCountResult {
  count: number;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook that provides real-time count of pending booking requests for a doctor.
 * 
 * @param doctorId - The ID of the doctor to query pending requests for
 * @returns Object containing count, loading state, and any error
 * 
 * @example
 * ```tsx
 * const { count, loading, error } = usePendingRequestsCount(user?.id);
 * ```
 */
export function usePendingRequestsCount(
  doctorId: string | null
): UsePendingRequestsCountResult {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If no doctorId provided, reset state and return
    if (!doctorId) {
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirebaseDb();
      const bookingRequestsRef = collection(db, "booking_requests");

      // Query for pending requests for this doctor
      const q = query(
        bookingRequestsRef,
        where("doctorId", "==", doctorId),
        where("status", "==", "pending")
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          setCount(querySnapshot.size);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching pending requests count:", err);
          setError(err as Error);
          setLoading(false);
          // Keep last known count on error
        }
      );

      // Cleanup subscription on unmount
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error("Error setting up pending requests listener:", err);
      setError(err as Error);
      setLoading(false);
      setCount(0);
    }
  }, [doctorId]);

  return { count, loading, error };
}
