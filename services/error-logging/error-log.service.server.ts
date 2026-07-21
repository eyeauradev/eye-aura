import { getAdminDb } from "@/services/firebase/admin";
import type { CreateErrorLogParams } from "@/types/error-log";

const COLLECTION_NAME = "error_logs";

/**
 * Server-side error logging service using Firebase Admin SDK.
 * Use this in API routes and server-side code.
 */
export async function logServerError(
  params: CreateErrorLogParams,
  user?: { id: string; role?: string; email?: string }
): Promise<void> {
  try {
    const db = getAdminDb();

    const originalError = params.originalError;
    const errorType = getErrorType(originalError);
    const firebaseCode = getFirebaseCode(originalError);
    const stack = getStackTrace(originalError);
    const originalMessage = getOriginalMessage(originalError);

    const errorLog = {
      code: params.code,
      title: params.title,
      message: params.message,
      originalError: originalMessage,
      errorType,
      firebaseCode,
      stack,
      context: params.context,
      action: params.action,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email,
      timestamp: new Date(),
      resolved: false,
    };

    const collectionRef = db.collection(COLLECTION_NAME);
    await collectionRef.add(errorLog);
  } catch (loggingError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[logServerError] Failed to log error to Firestore:", loggingError);
    }
  }
}

function getErrorType(error: unknown): string {
  if (error === null) return "null";
  if (error === undefined) return "undefined";
  if (typeof error !== "object") return typeof error;
  if (error instanceof Error) return error.constructor.name;
  return "object";
}

function getFirebaseCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function getStackTrace(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return error.stack.substring(0, 2000);
  }
  return undefined;
}

function getOriginalMessage(error: unknown): string {
  if (error === null) return "(null)";
  if (error === undefined) return "(undefined)";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
