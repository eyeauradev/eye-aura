# EditHistory Component

## Overview

The `EditHistory` component displays the edit history of a prescription in a collapsible accordion interface. It shows when prescriptions were edited, by which doctor, and what fields were changed.

## Features

- **Reverse Chronological Order**: Displays edits with newest first
- **Collapsible Accordion**: Each history entry can be expanded/collapsed
- **Change Detection**: Automatically identifies which fields changed between edits
- **Original Marker**: Marks the first (oldest) entry as "Original"
- **Doctor Attribution**: Shows doctor name for each edit
- **GlassPanel Styling**: Uses consistent design system styling
- **Graceful Handling**: Handles missing doctor information gracefully

## Requirements

Implements requirements:
- **4.2**: Display edit history section with all edits in reverse chronological order
- **4.3**: Show timestamp, doctor name, and changed fields for each entry

## Usage

```tsx
import { EditHistory } from "@/components/prescription";
import type { PrescriptionHistoryEntry, UserDocument } from "@/types/firestore";

// In your component
const doctors = new Map<string, UserDocument>();
// ... populate doctors map

<EditHistory 
  history={prescription.history || []} 
  doctors={doctors} 
/>
```

## Props

### `EditHistoryProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `history` | `PrescriptionHistoryEntry[]` | Yes | Array of history entries in their original order (oldest first from Firestore) |
| `doctors` | `Map<string, UserDocument>` | Yes | Map of doctorId to doctor details for name resolution |

## Data Structure

### PrescriptionHistoryEntry

```typescript
interface PrescriptionHistoryEntry {
  savedAt: Date;
  savedBy: string; // doctorId
  data: Partial<PrescriptionDocument>;
}
```

## Behavior

### Display Order
- The component receives history in chronological order (oldest first)
- It reverses the array internally to display newest first
- The last item in the reversed array is marked as "Original"

### Change Detection
The component compares each history entry with the previous entry to detect changed fields:
- Right Eye
- Left Eye
- Distance PD
- Near PD
- Near Vision Right
- Near Vision Left
- Findings
- Diagnosis
- Medications
- Eye Drops
- Recommendations
- Exercises
- Review After
- Follow-up Required
- Follow-up Date
- Consultation Notes

### Empty State
If the history array is empty or undefined, the component returns `null` and renders nothing.

### Missing Doctor
If a doctor's information is not found in the `doctors` map, the component displays "Unknown Doctor" instead of failing.

## Styling

The component uses:
- **GlassPanel**: For the outer container with consistent glass morphism styling
- **Tailwind CSS**: For layout and responsive design
- **Design Tokens**: Colors like `text-primary`, `border-primary/10` from the design system
- **Icons**: Calendar, User, FileEdit, and ChevronDown from lucide-react

## Accessibility

- Semantic HTML structure with proper heading hierarchy
- Interactive elements are keyboard accessible (buttons)
- Clear visual indicators for expanded/collapsed state
- Readable contrast ratios for text

## Integration Example

### Loading History in a Page Component

```tsx
"use client";

import { useEffect, useState } from "react";
import { EditHistory } from "@/components/prescription";
import { usersService } from "@/services/firestore";
import type { UserDocument, PrescriptionDocument } from "@/types/firestore";

export default function PrescriptionDetailPage() {
  const [prescription, setPrescription] = useState<PrescriptionDocument | null>(null);
  const [doctors, setDoctors] = useState<Map<string, UserDocument>>(new Map());

  useEffect(() => {
    async function loadData() {
      // Load prescription...
      const rx = await prescriptionsService.getById(prescriptionId);
      setPrescription(rx);

      // Load all doctors who edited this prescription
      if (rx?.history) {
        const doctorIds = [...new Set(rx.history.map(h => h.savedBy))];
        const doctorMap = new Map<string, UserDocument>();
        
        await Promise.all(
          doctorIds.map(async (id) => {
            const doctor = await usersService.getById(id);
            if (doctor) {
              doctorMap.set(id, doctor);
            }
          })
        );
        
        setDoctors(doctorMap);
      }
    }

    loadData();
  }, [prescriptionId]);

  return (
    <div>
      {/* ... other content ... */}
      
      {prescription?.history && prescription.history.length > 0 && (
        <EditHistory 
          history={prescription.history} 
          doctors={doctors} 
        />
      )}
    </div>
  );
}
```

## Visual Testing

A visual test file is provided at `__tests__/EditHistory.visual.tsx` with various test cases:
1. Multiple edits (3 entries)
2. Single edit (2 entries)
3. Original only (1 entry)
4. Empty history
5. Missing doctor information

To use the visual test, import it in a development page and render it.

## Technical Notes

### State Management
- Uses local React state (`useState`) to track which entries are expanded
- Each entry has a unique index used as the key for the expanded state

### Date Formatting
- Dates are formatted using `toLocaleDateString` and `toLocaleTimeString`
- Format: "January 15, 2025 at 2:30 PM"
- Locale: "en-US"

### Performance
- Change detection runs on-demand when entries are expanded
- No expensive operations in the render loop
- Efficiently handles large history arrays

## Future Enhancements

Potential improvements for future iterations:
- Side-by-side diff view showing old vs new values
- Export history as PDF or CSV
- Filter history by date range or doctor
- Search within history entries
- Highlight specific field changes with color coding
- Undo functionality to restore previous versions
