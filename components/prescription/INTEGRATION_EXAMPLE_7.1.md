# EditHistory Component - Integration Example

This document shows how to integrate the EditHistory component into the doctor prescription detail page (Task 7.2).

## Integration in `/app/doctor/prescriptions/[id]/page.tsx`

### Step 1: Import the Component

```tsx
import { EditHistory } from "@/components/prescription";
```

### Step 2: Add State for Doctors Map

```tsx
const [doctors, setDoctors] = useState<Map<string, UserDocument>>(new Map());
```

### Step 3: Load Doctor Details in useEffect

Add this to the existing `loadPrescription` function or create a separate effect:

```tsx
useEffect(() => {
  async function loadPrescription() {
    if (!params.id) return;

    try {
      setLoading(true);
      const rx = await prescriptionsService.getById(params.id as string);
      setPrescription(rx);

      if (rx) {
        // ... existing appointment and patient loading code ...

        // NEW: Load doctor details for all history entries
        if (rx.history && rx.history.length > 0) {
          const doctorIds = [...new Set(rx.history.map(h => h.savedBy))];
          const doctorMap = new Map<string, UserDocument>();
          
          await Promise.all(
            doctorIds.map(async (id) => {
              try {
                const doctor = await usersService.getById(id);
                if (doctor) {
                  doctorMap.set(id, doctor);
                }
              } catch (error) {
                // Log error but don't fail - component handles missing doctors
                console.warn(`Failed to load doctor ${id}:`, error);
              }
            })
          );
          
          setDoctors(doctorMap);
        }
      }
    } catch (error) {
      const appError = getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
      logError(appError.code, error, "PrescriptionModule");
      errorFromAppError(appError);
    } finally {
      setLoading(false);
    }
  }

  loadPrescription();
}, [params.id]);
```

### Step 4: Add EditHistory Component to JSX

Add this section after the prescription display and before the actions section:

```tsx
return (
  <div className="space-y-8">
    {/* Header */}
    {/* ... existing header code ... */}

    {/* Prescription Display */}
    {/* ... existing prescription display ... */}

    {/* NEW: Edit History Section (Doctors/Admins Only) */}
    {prescription?.history && prescription.history.length > 0 && (
      <EditHistory 
        history={prescription.history} 
        doctors={doctors} 
      />
    )}

    {/* Actions */}
    {/* ... existing actions card ... */}
  </div>
);
```

## Complete Code Snippet

Here's the complete integration in context:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { prescriptionsService, appointmentsService, usersService } from "@/services/firestore";
import type { PrescriptionDocument, AppointmentDocument, UserDocument } from "@/types/firestore";
import { ArrowLeft, Eye, Download, Share2, Calendar, User, FileText, Edit2 } from "lucide-react";
import { PremiumButton } from "@/components/premium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { useToast } from "@/components/ui/toast-provider";
import { EditHistory } from "@/components/prescription"; // NEW IMPORT

import Link from "next/link";

export default function DoctorPrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<PrescriptionDocument | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDocument | null>(null);
  const [patient, setPatient] = useState<UserDocument | null>(null);
  const [doctors, setDoctors] = useState<Map<string, UserDocument>>(new Map()); // NEW STATE

  useEffect(() => {
    async function loadPrescription() {
      if (!params.id) return;

      try {
        setLoading(true);
        const rx = await prescriptionsService.getById(params.id as string);
        setPrescription(rx);

        if (rx) {
          // Load appointment
          if (rx.appointmentId) {
            const apt = await appointmentsService.getById(rx.appointmentId);
            setAppointment(apt);
          }

          // Load patient
          const pat = await usersService.getById(rx.patientId);
          setPatient(pat);

          // NEW: Load doctor details for history
          if (rx.history && rx.history.length > 0) {
            const doctorIds = [...new Set(rx.history.map(h => h.savedBy))];
            const doctorMap = new Map<string, UserDocument>();
            
            await Promise.all(
              doctorIds.map(async (id) => {
                try {
                  const doctor = await usersService.getById(id);
                  if (doctor) {
                    doctorMap.set(id, doctor);
                  }
                } catch (error) {
                  console.warn(`Failed to load doctor ${id}:`, error);
                }
              })
            );
            
            setDoctors(doctorMap);
          }
        }
      } catch (error) {
        const appError = getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED);
        logError(appError.code, error, "PrescriptionModule");
        errorFromAppError(appError);
      } finally {
        setLoading(false);
      }
    }

    loadPrescription();
  }, [params.id]);

  // ... existing handlers (handleExportPDF, handleExportPNG, handleShare) ...

  if (loading) {
    // ... existing loading state ...
  }

  if (!prescription) {
    // ... existing not found state ...
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      {/* ... existing header ... */}

      {/* Prescription Display */}
      <Card className="border-primary/10 bg-white">
        <CardContent className="p-4 sm:p-8">
          <PrescriptionDisplay 
            prescription={prescription} 
            patient={patient} 
            doctor={user} 
            appointment={appointment} 
          />
        </CardContent>
      </Card>

      {/* NEW: Edit History Section */}
      {prescription?.history && prescription.history.length > 0 && (
        <EditHistory 
          history={prescription.history} 
          doctors={doctors} 
        />
      )}

      {/* Actions */}
      <Card className="border-primary/10">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* ... existing action buttons ... */}
        </CardContent>
      </Card>
    </div>
  );
}

// ... rest of the component (PrescriptionDisplay function) ...
```

## Key Points

1. **Import**: Add `EditHistory` to imports from `@/components/prescription`
2. **State**: Add `doctors` state to store doctor details map
3. **Data Loading**: Load all unique doctors from history in the same effect
4. **Error Handling**: Gracefully handle missing doctor records
5. **Conditional Rendering**: Only show if history exists and has entries
6. **Placement**: Add between prescription display and actions card

## Performance Considerations

- Doctor details are loaded in parallel using `Promise.all`
- Only unique doctor IDs are loaded (using `Set`)
- Component handles missing doctors gracefully
- No blocking or error propagation if doctor lookup fails

## Access Control

The component is automatically restricted to doctors/admins because:
- It's in the `/app/doctor/` route (requires doctor role)
- Patients don't have access to this page
- No additional access control needed in the component itself

## Testing

After integration, verify:
1. ✅ Component renders when history exists
2. ✅ Component doesn't render when history is empty
3. ✅ Doctor names display correctly
4. ✅ Timestamps format correctly
5. ✅ Changed fields are detected accurately
6. ✅ Accordion expands/collapses smoothly
7. ✅ "Original" badge appears on first entry
8. ✅ Missing doctors show as "Unknown Doctor"

## Next Steps for Task 7.2

Task 7.2 involves:
1. Follow this integration guide
2. Test the component in the doctor prescription detail page
3. Verify access control (doctors/admins only)
4. Ensure proper error handling

This completes the implementation for Task 7.1! 🎉
