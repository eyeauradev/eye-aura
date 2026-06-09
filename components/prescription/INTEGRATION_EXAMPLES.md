# PrescriptionForm Integration Examples

## Example 1: Edit Route Usage (Task 5.2)

File: `app/doctor/prescriptions/[id]/edit/page.tsx`

```tsx
"use client";

import { PrescriptionForm } from "@/components/prescription";
import { useParams } from "next/navigation";

export default function PrescriptionEditPage() {
  const params = useParams();
  const prescriptionId = params.id as string;

  return (
    <div className="container mx-auto p-6">
      <PrescriptionForm 
        mode="edit" 
        prescriptionId={prescriptionId}
      />
    </div>
  );
}
```

## Example 2: Updating Existing Create Page

File: `app/doctor/prescriptions/create/[appointmentId]/page.tsx`

```tsx
"use client";

import { PrescriptionForm } from "@/components/prescription";
import { useParams } from "next/navigation";

export default function PrescriptionCreatePage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;

  // Handle "new" for standalone prescriptions
  if (appointmentId === "new") {
    return (
      <div className="container mx-auto p-6">
        {/* Add patient selection UI here, then render: */}
        <PrescriptionForm 
          mode="create" 
          patientId="selected-patient-id"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <PrescriptionForm 
        mode="create" 
        appointmentId={appointmentId}
      />
    </div>
  );
}
```

## Example 3: Custom Success Handler

```tsx
import { PrescriptionForm } from "@/components/prescription";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

export default function CustomPrescriptionPage() {
  const router = useRouter();
  const { success } = useToast();

  const handleSuccess = (prescriptionId: string) => {
    // Custom logic after save
    console.log("Prescription saved:", prescriptionId);
    
    // Show custom success message
    success("Your prescription has been saved successfully!");
    
    // Navigate to custom route
    router.push(`/doctor/prescriptions/${prescriptionId}`);
  };

  return (
    <PrescriptionForm 
      mode="create" 
      appointmentId="appt-123"
      onSuccess={handleSuccess}
    />
  );
}
```

## Key Features Demonstrated

1. **Mode Flexibility**: Component supports both "create" and "edit" modes
2. **Automatic History**: Edit mode automatically tracks changes using `updateWithHistory()`
3. **Validation**: All required fields are validated before submission
4. **Loading States**: Built-in loading spinners during fetch and save operations
5. **Error Handling**: Automatic error display with toast notifications
6. **Success Callbacks**: Optional `onSuccess` prop for custom post-save logic
7. **Patient Context**: Supports both appointment-linked and standalone prescriptions

## Requirements Satisfied

- ✅ **Requirement 3.2**: Form validation for all required fields
- ✅ **Requirement 3.3**: Validate required fields before submission
- ✅ **Requirement 3.4**: Save updated prescription to database
- ✅ **Requirement 4.1**: Track prescription edit history (via `updateWithHistory`)
