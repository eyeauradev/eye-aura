"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { canShowReminder, recordDismissal, recordShown } from "./blinkStorage";

/**
 * Smart reminder logic:
 * - Only shows card once every 30–60 minutes
 * - Never interrupts form filling (checks for focused inputs)
 * - Pauses when tab is hidden
 * - Respects user dismissals
 */
export function useBlinkReminder() {
  const [isCardOpen, setIsCardOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTabVisibleRef = useRef(true);

  /** Check if user is currently filling a form. */
  const isUserBusy = useCallback((): boolean => {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if ((active as HTMLElement).isContentEditable) return true;
    // Check if any payment/booking page is active
    const path = window.location.pathname;
    if (
      path.includes("/booking") ||
      path.includes("/payment") ||
      path.includes("/consultation")
    ) {
      return true;
    }
    return false;
  }, []);

  /** Schedule the next reminder check. */
  const scheduleReminder = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Random interval between 30–60 minutes
    const delay = (30 + Math.random() * 30) * 60 * 1000;

    timerRef.current = setTimeout(() => {
      if (!isTabVisibleRef.current) {
        // Reschedule if tab not visible
        scheduleReminder();
        return;
      }
      if (isUserBusy()) {
        // Retry in 5 minutes if user is busy
        timerRef.current = setTimeout(() => scheduleReminder(), 5 * 60 * 1000);
        return;
      }
      if (canShowReminder()) {
        setIsCardOpen(true);
        recordShown();
      }
      scheduleReminder();
    }, delay);
  }, [isUserBusy]);

  /** Dismiss the card. */
  const dismissCard = useCallback(() => {
    setIsCardOpen(false);
    recordDismissal();
  }, []);

  /** Manually open the card (on click). */
  const openCard = useCallback(() => {
    setIsCardOpen(true);
  }, []);

  useEffect(() => {
    // Track tab visibility
    const handleVisibility = () => {
      isTabVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Start reminder timer
    scheduleReminder();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleReminder]);

  return { isCardOpen, openCard, dismissCard };
}
