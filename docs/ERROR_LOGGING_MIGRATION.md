# Error Logging System - Migration Guide

## Overview
We've implemented a comprehensive error logging system similar to Firebase Crashlytics that automatically captures and stores all application errors to Firestore.

## What's Already Implemented ✅

### 1. **Automatic Crash Reporting**
- ✅ Global error boundary catches React rendering errors
- ✅ Window error handler catches uncaught JavaScript errors
- ✅ Unhandled promise rejection handler
- ✅ All crashes automatically logged to Firestore

### 2. **Admin Dashboard**
- ✅ View all errors at `/admin/error-logs`
- ✅ Filter by resolved/unresolved
- ✅ See error details, stack traces, user info
- ✅ Mark errors as resolved

### 3. **Infrastructure**
- ✅ Firestore collection: `error_logs`
- ✅ Security rules deployed
- ✅ Indexes configured
- ✅ Error log service
- ✅ `useErrorLogging()` hook

### 4. **Already Updated**
- ✅ `PrescriptionForm` - Updated with full context
- ✅ Global error boundaries
- ✅ Root layout integration

## Migration Pattern

### Old Way (Still Works)
```typescript
try {
  await someOperation();
} catch (error) {
  const appError = getDisplayError(error, ERROR_CODES.SOME_ERROR);
  logError(appError.code, error, "ComponentName");
  errorFromAppError(appError);
}
```

### New Way (Recommended)
```typescript
import { useErrorLogging } from "@/hooks/useErrorLogging";

const { logErrorWithContext } = useErrorLogging();

try {
  await someOperation();
} catch (error) {
  const appError = getDisplayError(error, ERROR_CODES.SOME_ERROR);
  logErrorWithContext(
    appError.code,
    error,
    "ComponentName",
    {
      action: "operation_name",
      resourceId: resourceId,
      resourceType: "resource_type",
    }
  );
  errorFromAppError(appError);
}
```

## Files That Need Migration

### Patient Module
- [ ] `app/patient/appointments/page.tsx`
- [ ] `app/patient/appointments/[id]/page.tsx`
- [ ] `app/patient/booking-requests/page.tsx`
- [ ] `app/patient/dashboard/page.tsx`
- [ ] `app/patient/notifications/page.tsx` 
- [ ] `app/patient/prescriptions/page.tsx`
- [ ] `app/patient/prescriptions/[id]/page.tsx`
- [ ] `app/patient/profile/page.tsx`
- [ ] `app/patient/services/page.tsx`
- [ ] `app/patient/visual-acuity/page.tsx`

### Doctor Module
- [ ] `app/doctor/appointments/page.tsx`
- [ ] `app/doctor/appointments/[id]/page.tsx`
- [ ] `app/doctor/availability/page.tsx`
- [ ] `app/doctor/booking-requests/page.tsx`
- [ ] `app/doctor/dashboard/page.tsx`
- [ ] `app/doctor/prescriptions/page.tsx`
- [ ] `app/doctor/prescriptions/[id]/page.tsx`
- [ ] `app/doctor/prescriptions/create/[appointmentId]/page.tsx`
- [ ] `app/doctor/profile/page.tsx`
- [ ] `app/doctor/visual-acuity/page.tsx`

### Admin Module
- [ ] `app/admin/appointments/page.tsx`
- [ ] `app/admin/appointments/[id]/page.tsx`
- [ ] `app/admin/appointments/cancellations/page.tsx`
- [ ] `app/admin/dashboard/page.tsx`
- [ ] `app/admin/doctors/page.tsx`
- [ ] `app/admin/doctors/[id]/page.tsx`
- [ ] `app/admin/doctors/invite/page.tsx`
- [ ] `app/admin/doctors/invites/page.tsx`
- [ ] `app/admin/services/page.tsx`
- [ ] `app/admin/services/create/page.tsx`
- [ ] `app/admin/services/[id]/page.tsx`
- [ ] `app/admin/settings/page.tsx`
- [ ] `app/admin/support/page.tsx`
- [ ] `app/admin/support/[id]/page.tsx`

### Other Pages
- [ ] `app/booking/page.tsx`
- [ ] `app/invite/[token]/page.tsx`
- [ ] `app/services/ServicesClient.tsx`

## Step-by-Step Migration

### 1. Import the Hook
```typescript
import { useErrorLogging } from "@/hooks/useErrorLogging";
```

### 2. Use the Hook
```typescript
const { logErrorWithContext } = useErrorLogging();
```

### 3. Update Error Logging Calls
Replace:
```typescript
logError(appError.code, error, "ComponentName");
```

With:
```typescript
logErrorWithContext(
  appError.code,
  error,
  "ComponentName",
  {
    action: "create_appointment", // What was being done
    resourceId: appointmentId,     // ID of the resource (optional)
    resourceType: "appointment",   // Type of resource (optional)
  }
);
```

### Common Actions by Module

#### Patient Module
- `view_appointments`, `cancel_appointment`
- `view_prescriptions`
- `update_profile`
- `start_visual_acuity_test`
- `submit_booking_request`

#### Doctor Module
- `view_appointments`, `update_appointment`
- `create_prescription`, `update_prescription`
- `accept_booking_request`, `reject_booking_request`
- `update_availability`

#### Admin Module
- `create_service`, `update_service`, `delete_service`
- `invite_doctor`, `approve_doctor`
- `view_analytics`
- `respond_to_support_ticket`

## Deployment Steps

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### 3. Verify in Firebase Console
- Navigate to Firestore
- Check that `error_logs` collection exists
- Trigger an error to test logging

## Monitoring & Maintenance

### Daily Tasks
1. Check `/admin/error-logs` for new errors
2. Review unresolved errors
3. Mark resolved errors

### Weekly Tasks
1. Analyze error trends
2. Identify recurring issues
3. Create tickets for fixes

### Monthly Tasks
1. Review error logs cleanup strategy
2. Archive old resolved errors
3. Update error code descriptions

## Benefits

### For Development
- ✅ Instant visibility into production errors
- ✅ User context for every error
- ✅ Stack traces for debugging
- ✅ No more "it worked on my machine"

### For Operations
- ✅ Monitor application health
- ✅ Track error rates
- ✅ Identify problematic features
- ✅ Measure impact of deployments

### For Users
- ✅ Better support (we know what went wrong)
- ✅ Faster bug fixes
- ✅ Proactive issue resolution

## FAQs

### Q: Will this slow down my app?
A: No. Error logging is fire-and-forget and doesn't block the main thread.

### Q: What if Firestore logging fails?
A: The app continues normally. Logging failures are silently caught.

### Q: Do I need to update all files at once?
A: No. Old `logError` calls still work. Migrate incrementally.

### Q: Can I disable Firestore logging for certain errors?
A: Yes. Pass `logToFirestore: false` in the options.

### Q: How long are error logs stored?
A: Forever by default. Consider implementing auto-cleanup after 90 days.

### Q: Can patients see error logs?
A: No. Only admins can view error logs in Firestore.

## Example: Complete Migration

### Before
```typescript
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentsService.getByPatientId(user.id);
      // ... set state
    } catch (error) {
      const appError = getDisplayError(error, ERROR_CODES.APPOINTMENT.LOAD_FAILED);
      logError(appError.code, error, "AppointmentsPage");
      errorFromAppError(appError);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

### After
```typescript
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { appointmentsService } from "@/services/firestore";
import { getDisplayError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { useErrorLogging } from "@/hooks/useErrorLogging"; // ← Added

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const { logErrorWithContext } = useErrorLogging(); // ← Added
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentsService.getByPatientId(user.id);
      // ... set state
    } catch (error) {
      const appError = getDisplayError(error, ERROR_CODES.APPOINTMENT.LOAD_FAILED);
      logErrorWithContext( // ← Updated
        appError.code,
        error,
        "AppointmentsPage",
        {
          action: "load_appointments",
          resourceType: "appointments",
        }
      );
      errorFromAppError(appError);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

## Next Steps

1. Review this migration guide
2. Deploy Firestore rules and indexes
3. Test error logging in development
4. Gradually migrate high-priority pages
5. Monitor error logs dashboard
6. Iterate and improve

---

**Questions?** Check `/services/error-logging/README.md` or ask the team!
