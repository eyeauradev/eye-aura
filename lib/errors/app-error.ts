import type { EACode } from "./error-codes";

export interface AppError {
  code: EACode;
  title: string;
  message: string;
  suggestion?: string;
}

/**
 * Type guard — true when the value has all three required AppError fields
 * and code is a string (does not validate that code is a valid EACode at runtime).
 * Used by getDisplayError to short-circuit.
 */
export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "title" in value &&
    "message" in value &&
    typeof (value as AppError).code === "string" &&
    typeof (value as AppError).title === "string" &&
    typeof (value as AppError).message === "string"
  );
}
