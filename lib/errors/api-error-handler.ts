import type { AppError } from "./app-error";
import type { EACode } from "./error-codes";
import { ERROR_MESSAGES } from "./error-messages";

/**
 * Builds an AppError from a known EACode using the ERROR_MESSAGES registry.
 * The raw HTTP status code is never included in any returned field.
 */
function makeAppError(code: EACode): AppError {
  const entry = ERROR_MESSAGES[code];
  return { code, title: entry.title, message: entry.message, suggestion: entry.suggestion };
}

/**
 * Maps an HTTP status code to an AppError.
 *
 * - `undefined` or `null`  → EA-NETWORK-001 (no HTTP response received — network failure before server responded)
 * - 401                    → EA-API-004 (session expired / unauthorized)
 * - 403                    → EA-API-003 (forbidden)
 * - 404                    → EA-API-002 (not found)
 * - 429                    → EA-API-005 (rate limited)
 * - 500                    → EA-API-001 (server error)
 * - any other status       → EA-API-001 (generic server error fallback)
 *
 * Always returns an AppError — never null.
 * The raw HTTP status code is never included in any returned field.
 */
export function mapApiError(status: number | undefined | null): AppError {
  if (status === undefined || status === null) {
    // No HTTP response received — network failure before server responded
    return makeAppError("EA-NETWORK-001");
  }

  switch (status) {
    case 401:
      return makeAppError("EA-API-004");
    case 403:
      return makeAppError("EA-API-003");
    case 404:
      return makeAppError("EA-API-002");
    case 429:
      return makeAppError("EA-API-005");
    case 500:
      return makeAppError("EA-API-001");
    default:
      // All unrecognized status codes → generic server error
      return makeAppError("EA-API-001");
  }
}
