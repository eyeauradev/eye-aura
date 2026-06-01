// ── Internal imports (used by shims below) ────────────────────────────────────
import { getDisplayError, logError } from "./error-handler";
import { ERROR_CODES } from "./error-codes";
import type { EACode } from "./error-codes";

// ── Public API ────────────────────────────────────────────────────────────────
export type { AppError } from "./app-error";
export { isAppError } from "./app-error";
export { ERROR_CODES } from "./error-codes";
export type { EACode } from "./error-codes";
export { ERROR_MESSAGES } from "./error-messages";
export { getDisplayError, formatDisplayError, logError } from "./error-handler";
export { mapFirebaseAuthError, mapFirestoreError, mapNetworkError } from "./firebase-error-mapper";
export { mapApiError } from "./api-error-handler";

// ── Backward-compatible eaError shim ─────────────────────────────────────────
// The old lib/errors.ts exported eaError(code, error) which logged the error
// and returned a user-facing message string. This shim preserves that contract
// so existing call sites continue to compile without modification.
//
// @deprecated Use logError() for logging and getDisplayError() + formatDisplayError()
// for display strings. This shim exists only for backward compatibility.
export function eaError(code: string, error: unknown): string {
  logError(code, error);
  const appError = getDisplayError(error, code as EACode);
  return appError.message;
}

// ── Backward-compatible EA alias ─────────────────────────────────────────────
// The old lib/errors.ts exported a flat `EA` object with keys like AUTH_001.
// This alias maps each old key to its new ERROR_CODES value so existing
// import sites (`import { EA } from "@/lib/errors"`) continue to compile.
export const EA = {
  // Auth
  AUTH_001: ERROR_CODES.AUTH.INVALID_CREDENTIAL,
  AUTH_002: ERROR_CODES.AUTH.USER_NOT_FOUND,
  AUTH_003: ERROR_CODES.AUTH.EMAIL_IN_USE,
  AUTH_004: ERROR_CODES.AUTH.WEAK_PASSWORD,
  AUTH_005: ERROR_CODES.AUTH.POPUP_CANCELLED,
  AUTH_006: ERROR_CODES.AUTH.TOO_MANY_REQUESTS,
  AUTH_007: ERROR_CODES.AUTH.GENERIC,
  // Booking
  BKG_001: ERROR_CODES.BOOKING.SLOT_CONFLICT,
  BKG_002: ERROR_CODES.BOOKING.ALREADY_CANCELLED,
  BKG_003: ERROR_CODES.SYSTEM.UNEXPECTED,
  BKG_004: ERROR_CODES.SYSTEM.UNEXPECTED,
  // Payments
  PAY_001: ERROR_CODES.PAYMENT.CREATION_FAILED,
  PAY_002: ERROR_CODES.PAYMENT.VERIFICATION_FAILED,
  // Appointments
  APT_001: ERROR_CODES.APPOINTMENT.LOAD_FAILED,
  APT_002: ERROR_CODES.APPOINTMENT.CANCEL_FAILED,
  APT_003: ERROR_CODES.APPOINTMENT.CANCEL_FAILED,
  // Prescriptions
  PRE_001: ERROR_CODES.PRESCRIPTION.OPERATION_FAILED,
  PRE_002: ERROR_CODES.PRESCRIPTION.OPERATION_FAILED,
  // Support
  SUP_001: ERROR_CODES.SUPPORT.OPERATION_FAILED,
  SUP_002: ERROR_CODES.SUPPORT.OPERATION_FAILED,
  SUP_003: ERROR_CODES.SUPPORT.OPERATION_FAILED,
  SUP_004: ERROR_CODES.SUPPORT.OPERATION_FAILED,
  // Doctor
  DOC_001: ERROR_CODES.DOCTOR.OPERATION_FAILED,
  // Admin
  ADM_001: ERROR_CODES.ADMIN.OPERATION_FAILED,
  // API
  API_001: ERROR_CODES.API.SERVER_ERROR,
  API_002: ERROR_CODES.API.NOT_FOUND,
  API_003: ERROR_CODES.API.FORBIDDEN,
  API_004: ERROR_CODES.API.UNAUTHORIZED,
  // Patient / User
  PAT_001: ERROR_CODES.USER.LOAD_FAILED,
  PAT_003: ERROR_CODES.USER.SAVE_FAILED,
  // General → System
  GEN_001: ERROR_CODES.SYSTEM.UNEXPECTED,
  GEN_002: ERROR_CODES.NETWORK.CONNECTION_ISSUE,
  GEN_003: ERROR_CODES.FIRESTORE.NOT_FOUND,
} as const;
