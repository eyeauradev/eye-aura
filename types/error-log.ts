/**
 * Error Log Document
 * Stores application errors in Firestore for monitoring and debugging
 */
export interface ErrorLogDocument {
  id: string;
  
  // Error identification
  code: string; // EA error code (e.g., "EA-PRESCRIPTION-001")
  title: string; // Error title from ERROR_MESSAGES
  message: string; // User-facing error message
  
  // Error details
  originalError: string; // Original error message from caught error
  errorType: string; // typeof error or error.constructor.name
  firebaseCode?: string; // Firebase error code if applicable (e.g., "permission-denied")
  stack?: string; // Stack trace if available
  
  // Context
  context?: string; // Where the error occurred (e.g., "PrescriptionForm")
  userId?: string; // User who encountered the error
  userRole?: string; // User's role
  userEmail?: string; // User's email (for tracking)
  
  // Request/Action details
  action?: string; // What action was being performed (e.g., "update_prescription")
  resourceId?: string; // ID of resource being acted upon
  resourceType?: string; // Type of resource (e.g., "prescription", "appointment")
  
  // Environment
  userAgent?: string; // Browser user agent
  url?: string; // Current page URL
  timestamp: Date;
  
  // Metadata
  resolved?: boolean; // Has this error been addressed?
  notes?: string; // Admin notes about the error
}

/**
 * Parameters for creating an error log
 */
export interface CreateErrorLogParams {
  code: string;
  title: string;
  message: string;
  originalError: unknown;
  context?: string;
  action?: string;
  resourceId?: string;
  resourceType?: string;
}
