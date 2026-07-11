"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook to prevent screen from dimming/sleeping during assessment.
 * Uses the Screen Wake Lock API where supported.
 * 
 * Features:
 * - Requests wake lock when enabled
 * - Automatically releases on disable
 * - Reacquires when page becomes visible again
 * - Releases when page becomes hidden
 * - No errors shown if unsupported
 * - Proper cleanup on unmount
 * 
 * @param enabled - Whether wake lock should be active
 * @returns Object with isSupported and isActive status
 */
export function useScreenWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);

  // Check if Wake Lock API is supported
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      setIsSupported(false);
      return;
    }

    setIsSupported("wakeLock" in navigator);
  }, []);

  // Request wake lock
  const requestWakeLock = async () => {
    if (!isSupported || !enabled) return;

    try {
      // Release existing lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }

      // Request new wake lock
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);

      // Listen for release (can happen if user switches tabs, battery saver, etc.)
      wakeLockRef.current.addEventListener("release", () => {
        setIsActive(false);
      });
    } catch (err) {
      // Wake lock request can fail for various reasons:
      // - User denied permission
      // - Battery saver mode
      // - Page not visible
      // Fail silently - assessment continues without wake lock
      console.debug("[WakeLock] Failed to acquire:", err);
      setIsActive(false);
    }
  };

  // Release wake lock
  const releaseWakeLock = async () => {
    if (!wakeLockRef.current) return;

    try {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsActive(false);
    } catch (err) {
      console.debug("[WakeLock] Failed to release:", err);
    }
  };

  // Request/release based on enabled state
  useEffect(() => {
    if (!isSupported) return;

    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount
    return () => {
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSupported]);

  // Handle visibility changes
  useEffect(() => {
    if (!isSupported || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Page became visible - reacquire wake lock if enabled
        if (enabled && !wakeLockRef.current) {
          requestWakeLock();
        }
      }
      // Note: We don't manually release on hidden - browser handles it automatically
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSupported]);

  return {
    isSupported,
    isActive,
  };
}
