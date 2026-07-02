import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type { ErrorLogDocument, CreateErrorLogParams } from "@/types/error-log";

const COLLECTION_NAME = "error_logs";

/**
 * Service for logging application errors to Firestore
 */
class ErrorLogService {
  private db = getFirebaseDb();

  /**
   * Log an error to Firestore
   * This runs fire-and-forget - we don't want logging failures to crash the app
   */
  async logError(params: CreateErrorLogParams, user?: { id: string; role?: string; email?: string }): Promise<void> {
    try {
      // Extract error details
      const originalError = params.originalError;
      const errorType = this.getErrorType(originalError);
      const firebaseCode = this.getFirebaseCode(originalError);
      const stack = this.getStackTrace(originalError);
      const originalMessage = this.getOriginalMessage(originalError);

      // Get browser context
      const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : undefined;
      const url = typeof window !== "undefined" ? window.location.href : undefined;

      const errorLog: Omit<ErrorLogDocument, "id"> = {
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
        userAgent,
        url,
        timestamp: new Date(),
        resolved: false,
      };

      // Save to Firestore (fire-and-forget)
      const collectionRef = collection(this.db, COLLECTION_NAME);
      await addDoc(collectionRef, {
        ...errorLog,
        timestamp: serverTimestamp(), // Use server timestamp
      });

      // Log success in dev mode
      if (process.env.NODE_ENV !== "production") {
        console.log("[ErrorLogService] Error logged to Firestore:", params.code);
      }
    } catch (loggingError) {
      // Silently fail - we don't want error logging to crash the app
      // Only log to console in development
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ErrorLogService] Failed to log error to Firestore:", loggingError);
      }
    }
  }

  /**
   * Get the type of the error
   */
  private getErrorType(error: unknown): string {
    if (error === null) return "null";
    if (error === undefined) return "undefined";
    if (typeof error !== "object") return typeof error;
    if (error instanceof Error) return error.constructor.name;
    return "object";
  }

  /**
   * Extract Firebase error code if present
   */
  private getFirebaseCode(error: unknown): string | undefined {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code: unknown }).code;
      if (typeof code === "string") return code;
    }
    return undefined;
  }

  /**
   * Extract stack trace if available
   */
  private getStackTrace(error: unknown): string | undefined {
    if (error instanceof Error && error.stack) {
      // Truncate stack trace to first 2000 characters to avoid huge documents
      return error.stack.substring(0, 2000);
    }
    return undefined;
  }

  /**
   * Get original error message
   */
  private getOriginalMessage(error: unknown): string {
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
}

export const errorLogService = new ErrorLogService();
