"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { errorLogService } from "@/services/error-logging/error-log.service";
import { ERROR_CODES } from "@/lib/errors";

/**
 * Global Error Handler - Catches uncaught errors and promise rejections
 * Works like Firebase Crashlytics for automatic crash reporting
 */
export function GlobalErrorHandler() {
  const { user } = useAuth();

  useEffect(() => {
    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error("[GlobalErrorHandler] Uncaught error:", event.error);

      errorLogService.logError(
        {
          code: ERROR_CODES.SYSTEM.UNEXPECTED,
          title: "Uncaught Error",
          message: "An uncaught error occurred in the application",
          originalError: event.error || event.message,
          context: "window.onerror",
          action: "uncaught_error",
          resourceType: "application",
        },
        user ? { id: user.id, role: user.role, email: user.email } : undefined
      );
    };

    // Handle unhandled promise rejections
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      console.error("[GlobalErrorHandler] Unhandled promise rejection:", event.reason);

      errorLogService.logError(
        {
          code: ERROR_CODES.SYSTEM.UNEXPECTED,
          title: "Unhandled Promise Rejection",
          message: "An unhandled promise rejection occurred",
          originalError: event.reason,
          context: "window.onunhandledrejection",
          action: "unhandled_promise_rejection",
          resourceType: "application",
        },
        user ? { id: user.id, role: user.role, email: user.email } : undefined
      );
    };

    // Add listeners
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handlePromiseRejection);

    // Cleanup
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handlePromiseRejection);
    };
  }, [user]);

  return null; // This component doesn't render anything
}
