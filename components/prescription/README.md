# PrescriptionForm Component

Reusable prescription form component that supports both creating and editing prescriptions.

## Features

- **Create Mode**: Creates new prescriptions with optional appointment linkage
- **Edit Mode**: Edits existing prescriptions with automatic history tracking
- **Validation**: Required field validation for eye data, findings, and diagnosis
- **Preview**: Real-time prescription preview
- **Loading States**: Displays loading spinners during data fetching and saving
- **Success/Error Handling**: Toast notifications for user feedback
- **History Tracking**: Automatically calls `prescriptionsService.updateWithHistory()` in edit mode

## Props

```typescript
interface PrescriptionFormProps {
  mode: "create" | "edit";
  prescriptionId?: string;      // Required for edit mode
  appointmentId?: string;       // Optional for create mode
  patientId?: string;           // Optional for create mode (if no appointment)
  onSuccess?: (prescriptionId: string) => void;  // Optional callback after save
}
```

## Usage Examples

### Create Mode with Appointment

```tsx
import { PrescriptionForm } from "@/components/prescription";

<PrescriptionForm 
  mode="create" 
  appointmentId="appt-123"
  onSuccess={(id) => router.push(`/doctor/prescriptions/${id}`)}
/>
```

### Edit Mode

```tsx
import { PrescriptionForm } from "@/components/prescription";

<PrescriptionForm 
  mode="edit" 
  prescriptionId="rx-456"
  onSuccess={(id) => router.push(`/doctor/prescriptions/${id}`)}
/>
```

### Create Mode without Appointment (Standalone)

```tsx
import { PrescriptionForm } from "@/components/prescription";

<PrescriptionForm 
  mode="create" 
  patientId="patient-789"
/>
```

## Validation Rules (Requirements 3.2, 3.3, 3.4)

The form validates the following required fields:

1. **Right Eye**: At least SPH or CYL must be provided
2. **Left Eye**: At least SPH or CYL must be provided
3. **Findings**: Must not be empty
4. **Diagnosis**: Must not be empty

## History Tracking

In edit mode, the component automatically:
1. Captures the current prescription state as `previousData`
2. Calls `prescriptionsService.updateWithHistory(id, updates, previousData, userId)`
3. Preserves all editable fields in the history entry

This ensures compliance with **Requirement 4.1** (Track prescription edit history).
