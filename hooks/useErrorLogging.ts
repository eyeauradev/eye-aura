import { useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logError, ERROR_CODES } from "@/lib/errors";
import type { EACode } from "@/lib/errors";

/**
 * Hook for consistent error logging with user context
 * 
 * @example
 * const { logErrorWithContext } = useErrorLogging();
 * 
 * try {
 *   await saveData();
 * } catch (error) {
 *   logErrorWithContext(
 *     ERROR_CODES.PRESCRIPTION.OPERATION_FAILED,
 *     error,
 *     "PrescriptionForm",
 *     { action: "update_prescription", resourceId: prescriptionId }
 *   );
 * }
 */
export function useErrorLogging() {
  const { user } = useAuth();

  const logErrorWithContext = useCallback(
    (
      code: EACode,
      error: unknown,
      context: string,
      options?: {
        action?: string;
        resourceId?: string;
        resourceType?: string;
        logToFirestore?: boolean;
      }
    ) => {
      logError(
        code,
        error,
        context,
        options?.logToFirestore !== false, // Default to true
        {
          user: user ? { id: user.id, role: user.role, email: user.email } : undefined,
          action: options?.action,
          resourceId: options?.resourceId,
          resourceType: options?.resourceType,
        }
      );
    },
    [user]
  );

  return { logErrorWithContext, user };
}
