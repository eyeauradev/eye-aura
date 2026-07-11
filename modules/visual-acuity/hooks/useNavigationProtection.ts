"use client";

import { useEffect } from "react";

/**
 * Hook to prevent accidental navigation during active assessment.
 * 
 * Protects against:
 * - Accidental page refresh (Cmd+R / Ctrl+R)
 * - Browser tab close
 * - Browser back button
 * - Navigating away
 * 
 * Shows browser confirmation dialog where supported.
 * Only active when enabled=true.
 */
export function useNavigationProtection(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    /**
     * Handler for beforeunload event.
     * Shows browser confirmation dialog.
     */
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Modern browsers require returnValue to be set
      event.preventDefault();
      // Chrome requires returnValue to be set
      event.returnValue = "";
      // Some browsers show custom message (though most ignore it now)
      return "";
    };

    // Add listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount or when disabled
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);
}
