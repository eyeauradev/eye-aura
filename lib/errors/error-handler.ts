import type { AppError } from "./app-error";
import { isAppError } from "./app-error";
import type { EACode } from "./error-codes";
import { ERROR_CODES } from "./error-codes";
import { ERROR_MESSAGES } from "./error-messages";
import { mapFirebaseAuthError, mapFirestoreError, mapNetworkError } from "./firebase-error-mapper";

// ── Private helper ────────────────────────────────────────────────────────────

/**
 * Builds an AppError from a known EACode using the ERROR_MESSAGES registry.
 */
function makeAppError(code: EACode): AppError {
  const entry = ERROR_MESSAGES[code];
  return { code, title: entry.title, message: entry.message, suggestion: entry.suggestion };
}

// ── Production flag ───────────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Converts any thrown value into a structured AppError.
 *
 * Dispatch chain (in priority order):
 * 1. Already an AppError → return unchanged (idempotent)
 * 2. null / undefined / non-object non-string primitive → return makeAppError(fallbackCode)
 * 3. Try Firebase Auth mapper
 * 4. Try Firestore mapper
 * 5. Try Network mapper
 * 6. Fallback → return makeAppError(fallbackCode)
 *
 * Never throws. The entire body is wrapped in try/catch.
 */
export function getDisplayError(
  error: unknown,
  fallbackCode: EACode = ERROR_CODES.SYSTEM.UNEXPECTED
): AppError {
  try {
    // 1. Already an AppError — return unchanged (idempotent)
    if (isAppError(error)) return error;

    // 2. Null / undefined / non-object non-string primitive → system fallback
    if (
      error === null ||
      error === undefined ||
      (typeof error !== "object" && typeof error !== "string")
    ) {
      return makeAppError(fallbackCode);
    }

    // 3. Try Firebase Auth mapper
    const authResult = mapFirebaseAuthError(error);
    if (authResult) return authResult;

    // 4. Try Firestore mapper
    const firestoreResult = mapFirestoreError(error);
    if (firestoreResult) return firestoreResult;

    // 5. Try Network mapper
    const networkResult = mapNetworkError(error);
    if (networkResult) return networkResult;

    // 6. Unrecognized error → use fallbackCode
    return makeAppError(fallbackCode);
  } catch {
    // If anything throws internally, return the fallback AppError
    return makeAppError(fallbackCode);
  }
}

/**
 * Formats an AppError into a human-readable display string.
 *
 * Format: `[code] title — message`
 * If suggestion is present: `[code] title — message suggestion`
 *
 * Example: "[EA-AUTH-001] Unable to Sign In — Please check your email address and password and try again."
 */
export function formatDisplayError(error: AppError): string {
  const base = `[${error.code}] ${error.title} \u2014 ${error.message}`;
  return error.suggestion ? `${base} ${error.suggestion}` : base;
}

/**
 * Logs a structured error line to the console.
 *
 * Format: `[code][context?] title | Original: originalMessage`
 *
 * - In production: console.error(logLine, stack or raw error)
 * - In development: console.error(logLine), then stack trace on a separate line
 *
 * Never throws — the entire body is wrapped in try/catch.
 */
export function logError(code: string, error: unknown, context?: string): void {
  try {
    const entry = ERROR_MESSAGES[code as EACode];
    const title = entry?.title ?? "Unknown Error";

    const originalMessage =
      error === null || error === undefined
        ? "(no error object)"
        : error instanceof Error
        ? error.message
        : String(error);

    const contextPrefix = context ? ` [${context.slice(0, 100)}]` : "";
    const logLine = `[${code}]${contextPrefix} ${title} | Original: ${originalMessage}`;

    if (IS_PRODUCTION) {
      // In production: single console.error call (captured by Sentry / error tracking)
      console.error(logLine, error instanceof Error ? error.stack : error);
    } else {
      // In development: log line first, then stack trace separately for readability
      console.error(logLine);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  } catch {
    // Silently swallow — if console.error itself throws, we cannot do anything
  }
}
