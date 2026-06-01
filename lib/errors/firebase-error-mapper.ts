import type { AppError } from "./app-error";
import type { EACode } from "./error-codes";
import { ERROR_MESSAGES } from "./error-messages";

// ── Private helper ────────────────────────────────────────────────────────────

function makeAppError(code: EACode): AppError {
  const entry = ERROR_MESSAGES[code];
  return { code, title: entry.title, message: entry.message, suggestion: entry.suggestion };
}

// ── Firebase Auth Mapper ──────────────────────────────────────────────────────

/**
 * Maps Firebase Auth errors to AppError.
 * Returns null if the error is not a Firebase Auth error (code does not start with "auth/").
 */
export function mapFirebaseAuthError(error: unknown): AppError | null {
  // Guard: must be an object with a code property that is a string starting with "auth/"
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof (error as { code: unknown }).code !== "string" ||
    !(error as { code: string }).code.startsWith("auth/")
  ) {
    return null;
  }

  const code = (error as { code: string }).code;

  // Priority 1 — highest: rate limiting
  if (code === "auth/too-many-requests") {
    return makeAppError("EA-AUTH-006");
  }
  // Priority 2: invalid credentials (two Firebase codes map to same EA code)
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return makeAppError("EA-AUTH-001");
  }
  // Priority 3
  if (code === "auth/user-not-found") {
    return makeAppError("EA-AUTH-002");
  }
  // Priority 4
  if (code === "auth/email-already-in-use") {
    return makeAppError("EA-AUTH-003");
  }
  // Priority 5
  if (code === "auth/weak-password") {
    return makeAppError("EA-AUTH-004");
  }
  // Priority 6: popup cancelled (two codes)
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return makeAppError("EA-AUTH-005");
  }
  // Priority 7 — fallback for any unrecognized auth/ code
  return makeAppError("EA-AUTH-007");
}

// ── Firestore Mapper ──────────────────────────────────────────────────────────

/**
 * Maps Firestore errors to AppError.
 * Returns null if the error has no code property at all.
 * Code-based rules take priority over message-based rules.
 */
export function mapFirestoreError(error: unknown): AppError | null {
  // Guard: must be an object with a code property
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code: unknown }).code;
  const message = (error as { message?: unknown }).message;
  const msgStr = typeof message === "string" ? message.toLowerCase() : "";

  // Code-based rules take priority (checked first)
  if (code === "permission-denied") {
    return makeAppError("EA-FIRESTORE-002");
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return makeAppError("EA-FIRESTORE-003");
  }
  if (code === "not-found") {
    return makeAppError("EA-FIRESTORE-004");
  }

  // Message-based rule (lower priority)
  if (msgStr.includes("requires an index")) {
    return makeAppError("EA-FIRESTORE-001");
  }

  // Fallback: unrecognized but non-empty string code → generic Firestore error
  if (typeof code === "string" && code.length > 0) {
    return makeAppError("EA-FIRESTORE-001");
  }

  return null;
}

// ── Network Mapper ────────────────────────────────────────────────────────────

/**
 * Maps network-related errors to AppError.
 * Returns null if the error has no non-empty string message property.
 * Timeout is checked before generic network patterns (more specific first).
 */
export function mapNetworkError(error: unknown): AppError | null {
  // Guard: must be an object with a non-empty string message property
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string" || message.trim() === "") {
    return null;
  }

  const msg = message.toLowerCase();

  // Timeout is more specific — checked before generic network patterns
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return makeAppError("EA-NETWORK-002");
  }

  // Generic network patterns
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("networkerror") ||
    msg.includes("failed to fetch")
  ) {
    return makeAppError("EA-NETWORK-001");
  }

  return null;
}
