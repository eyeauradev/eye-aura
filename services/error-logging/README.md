# Error Logging System

## Overview
Comprehensive error tracking system that logs application errors to Firestore for monitoring, debugging, and analysis.

## Features
- ✅ Automatic error logging to Firestore in production
- ✅ Captures error context (user, action, resource)
- ✅ Stores Firebase error codes and stack traces
- ✅ Browser context (user agent, URL)
- ✅ Admin dashboard to view and resolve errors
- ✅ Fire-and-forget logging (doesn't crash app if logging fails)

## Architecture

### Components
1. **ErrorLogService** (`error-log.service.ts`) - Saves errors to Firestore
2. **Error Handler** (`lib/errors/error-handler.ts`) - Integrated logging
3. **Error Log Type** (`types/error-log.ts`) - TypeScript definitions
4. **Admin Dashboard** (`app/admin/error-logs/page.tsx`) - View errors
5. **Firestore Rules** (`firestore.rules`) - Security rules for error_logs collection

### Data Flow
```
Error Occurs
    ↓
getDisplayError() - Maps to user-friendly error
    ↓
logError() - Logs to console & Firestore
    ↓
errorLogService.logError() - Saves to Firestore
    ↓
Admin Dashboard - View & resolve
```

## Usage

### Basic Usage
```typescript
import { logError, ERROR_CODES } from "@/lib/errors";

try {
  // Your code
} catch (error) {
  logError(
    ERROR_CODES.PRESCRIPTION.OPERATION_FAILED,
    error,
    "PrescriptionForm" // context
  );
}
```

### With Additional Context
```typescript
logError(
  ERROR_CODES.PRESCRIPTION.OPERATION_FAILED,
  error,
  "PrescriptionForm",
  true, // log to Firestore
  {
    user: { id: user.id, role: user.role, email: user.email },
    action: "update_prescription",
    resourceId: prescriptionId,
    resourceType: "prescription",
  }
);
```

### Disable Firestore Logging (e.g., in tests)
```typescript
logError(
  ERROR_CODES.SOME_ERROR,
  error,
  "TestContext",
  false // don't log to Firestore
);
```

## Error Log Document Structure

```typescript
{
  id: string;
  code: string;              // EA-PRESCRIPTION-001
  title: string;             // "Prescription Error"
  message: string;           // User-facing message
  originalError: string;     // Original error.message
  errorType: string;         // "FirebaseError", "Error", etc.
  firebaseCode?: string;     // "permission-denied"
  stack?: string;            // Stack trace (truncated to 2000 chars)
  context?: string;          // "PrescriptionForm"
  userId?: string;
  userRole?: string;
  userEmail?: string;
  action?: string;           // "update_prescription"
  resourceId?: string;       // Prescription ID
  resourceType?: string;     // "prescription"
  userAgent?: string;
  url?: string;
  timestamp: Date;
  resolved?: boolean;        // Admin can mark as resolved
  notes?: string;            // Admin notes
}
```

## Admin Dashboard

Access at `/admin/error-logs`

Features:
- View all errors or filter by unresolved
- See error details, stack traces, and context
- Mark errors as resolved
- View user information and actions

## Firestore Security Rules

```javascript
match /error_logs/{errorLogId} {
  // Any authenticated user can create error logs
  allow create: if signedIn()
    && request.resource.data.userId == request.auth.uid;
  
  // Only admins can read/update/delete
  allow read, update, delete: if isAdmin();
}
```

## Deployment

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### 3. Verify Collection
Check Firebase Console → Firestore → `error_logs` collection

## Best Practices

### DO:
- ✅ Log errors in catch blocks with context
- ✅ Include user and action information
- ✅ Use specific error codes from ERROR_CODES
- ✅ Review error logs regularly in admin dashboard

### DON'T:
- ❌ Log sensitive information (passwords, tokens)
- ❌ Log PII without necessity
- ❌ Await error logging (it's fire-and-forget)
- ❌ Log expected/handled errors that don't need tracking

## Examples

### Prescription Update Error
```typescript
try {
  await prescriptionsService.updateWithHistory(id, updates, previous, userId);
} catch (error) {
  logError(
    ERROR_CODES.PRESCRIPTION.OPERATION_FAILED,
    error,
    "PrescriptionForm",
    true,
    {
      user: { id: user.id, role: user.role, email: user.email },
      action: "update_prescription",
      resourceId: prescriptionId,
      resourceType: "prescription",
    }
  );
  // Show error to user
  errorFromAppError(getDisplayError(error));
}
```

### Booking Creation Error
```typescript
try {
  await bookingService.create(booking);
} catch (error) {
  logError(
    ERROR_CODES.BOOKING.SLOT_CONFLICT,
    error,
    "BookingForm",
    true,
    {
      user: { id: user.id, role: "patient", email: user.email },
      action: "create_booking",
      resourceType: "booking",
    }
  );
}
```

## Monitoring

### Key Metrics to Track:
- Error frequency by code
- Errors per user
- Unresolved error count
- Common error patterns
- Peak error times

### Firebase Console Queries:
```javascript
// Get unresolved errors
db.collection('error_logs')
  .where('resolved', '==', false)
  .orderBy('timestamp', 'desc')
  .limit(100)

// Get errors by code
db.collection('error_logs')
  .where('code', '==', 'EA-PRESCRIPTION-001')
  .orderBy('timestamp', 'desc')
  .limit(50)

// Get errors by user
db.collection('error_logs')
  .where('userId', '==', 'user-id-here')
  .orderBy('timestamp', 'desc')
```

## Troubleshooting

### Error logs not appearing?
1. Check Firestore rules are deployed
2. Verify user is authenticated
3. Check browser console for logging service errors
4. Ensure `logToFirestore` parameter is `true`

### Permission denied errors?
1. Verify security rules allow user to create
2. Check that `userId` matches `request.auth.uid`
3. Ensure indexes are deployed

### Too many error logs?
1. Review and resolve common errors
2. Consider rate limiting in production
3. Add error log cleanup Cloud Function (auto-delete after 30 days)

## Future Enhancements
- [ ] Error aggregation and grouping
- [ ] Email alerts for critical errors
- [ ] Error trend analytics
- [ ] Auto-cleanup old error logs
- [ ] Integration with external monitoring (Sentry, DataDog)
- [ ] Error rate limiting per user
