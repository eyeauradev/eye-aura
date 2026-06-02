"use client";
import { useEffect } from "react";
import { getFirebaseAuth } from "@/services/firebase/client";

/**
 * Hook that checks for and expires stale PENDING recommendations.
 * Call on patient dashboard and recommendations page load.
 * Triggers a server-side endpoint that handles the actual expiration logic.
 */
export function useRecommendationExpiration() {
  useEffect(() => {
    async function checkExpired() {
      try {
        const auth = getFirebaseAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const idToken = await currentUser.getIdToken();

        // Call a dedicated expiration endpoint
        await fetch("/api/recommendations/expire-stale", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch {
        // Non-critical — don't block page load
      }
    }
    checkExpired();
  }, []);
}
