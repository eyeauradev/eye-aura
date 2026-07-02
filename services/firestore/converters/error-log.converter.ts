import type { FirestoreDataConverter, DocumentData } from "firebase/firestore";
import type { ErrorLogDocument } from "@/types/error-log";

export const errorLogConverter: FirestoreDataConverter<ErrorLogDocument> = {
  toFirestore(errorLog: ErrorLogDocument): DocumentData {
    return {
      ...errorLog,
      timestamp: errorLog.timestamp,
    };
  },
  fromFirestore(snapshot): ErrorLogDocument {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      code: data.code,
      title: data.title,
      message: data.message,
      originalError: data.originalError,
      errorType: data.errorType,
      firebaseCode: data.firebaseCode,
      stack: data.stack,
      context: data.context,
      userId: data.userId,
      userRole: data.userRole,
      userEmail: data.userEmail,
      action: data.action,
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      userAgent: data.userAgent,
      url: data.url,
      timestamp: data.timestamp?.toDate() || new Date(),
      resolved: data.resolved ?? false,
      notes: data.notes,
    };
  },
};
