# Design Document: Critical Bugfixes - Vision, Doctor, Prescription

## Overview

This document provides technical design solutions for four critical issues in the Eye Aura application:

1. **Far Vision Assessment Timer Flow**: Reordering the assessment flow to place eye selection before the countdown timer
2. **Pending Requests Badge**: Displaying a real-time badge with pending request counts across all UI breakpoints
3. **Prescription Editing**: Enabling doctors to edit existing prescriptions
4. **Edit History & Timestamps**: Tracking prescription changes and displaying timestamps to patients

All four fixes are independent and can be implemented separately, though they share some common patterns (badge implementation, timestamp display).

## Architecture

### System Components

The application uses Next.js with React Server Components and Client Components, Firebase/Firestore for data persistence, and a modular component architecture with shared design tokens.

**Key Modules:**
- **Visual Acuity Module** (`modules/visual-acuity/`): Handles vision assessment flows
- **Doctor Portal** (`app/doctor/`): Doctor-facing interfaces with navigation and prescription management
- **Patient Portal** (`app/patient/`): Patient-facing prescription views
- **Premium Components** (`components/premium/`): Shared navigation and UI components
- **Firestore Services** (`services/firestore/`): Data access layer for prescriptions and requests

### Data Flow

```
User Interface (Client Components)
        ↓
    Services Layer
        ↓
  Firebase/Firestore
```

For real-time data (pending requests badge), we'll use Firestore's `onSnapshot` for live updates.

## Components and Interfaces

### 1. Far Vision Assessment Flow Reordering

**Current Flow (Issue):**
```
Duration Selection → Countdown Timer → Eye Selection → Testing
```

**Fixed Flow:**
```
Duration Selection → Eye Selection → Countdown Timer → Testing
```

#### Modified Components

**File:** `modules/visual-acuity/AcuitySession.tsx`

**Changes Required:**
1. Update `PHASE_ORDER` array to move eye selection before countdown
2. Update `handleDurationContinue()` logic to navigate to eye selection for far vision
3. Create new handler for eye selection completion

**Current Phase Order:**
```typescript
const PHASE_ORDER: TestPhase[] = [
  "type_select",
  "instructions",
  "calibration",
  "duration_select",
  "countdown",      // Currently before testing
  "testing",
  "results",
];
```

**New Phase Order:**
```typescript
const PHASE_ORDER: TestPhase[] = [
  "type_select",
  "instructions",
  "calibration",
  "duration_select",
  "eye_selection",  // NEW: Added before countdown
  "countdown",
  "testing",
  "results",
];
```

**New Component:** `modules/visual-acuity/steps/EyeSelectionStep.tsx`

This component will:
- Display two buttons: "Test Right Eye First" and "Test Left Eye First"
- Store the selected eye in session state
- Display instructions for covering the opposite eye
- Show a "Continue" button to proceed to countdown
- Follow the existing design system (glass panels, premium buttons)

**Props Interface:**
```typescript
interface EyeSelectionStepProps {
  /** Called when user selects an eye and confirms readiness */
  onContinue: (selectedEye: "right" | "left") => void;
}
```

#### Type System Updates

**File:** `modules/visual-acuity/types.ts`

Add new phase to `TestPhase` union:
```typescript
export type TestPhase =
  | "type_select"
  | "instructions"
  | "calibration"
  | "duration_select"
  | "eye_selection"  // NEW
  | "countdown"
  | "testing"
  | "results";
```

### 2. Pending Requests Badge

#### Component Architecture

**Enhanced NavItem Interface:**

```typescript
// File: components/premium/floating-sidebar.tsx
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  badge?: number | null;  // NEW: Optional badge count
}
```

#### Real-time Badge Hook

**New File:** `hooks/usePendingRequestsCount.ts`

```typescript
export interface UsePendingRequestsCountResult {
  count: number;
  loading: boolean;
  error: Error | null;
}

export function usePendingRequestsCount(doctorId: string | null): UsePendingRequestsCountResult;
```

**Implementation Strategy:**
- Uses Firestore `onSnapshot` for real-time updates
- Queries `booking-requests` collection with:
  - `where("doctorId", "==", doctorId)`
  - `where("status", "==", "pending")`
- Returns count, loading state, and error
- Automatically unsubscribes on unmount

#### Modified Components

**File:** `components/premium/floating-sidebar.tsx`

**Changes:**
1. Add badge rendering logic to nav items
2. Position badge absolutely in top-right of nav link
3. Use design system colors (primary background, white text)
4. Apply responsive styling for all breakpoints

**Badge Styling:**
```typescript
{item.badge !== undefined && item.badge > 0 && (
  <span className="
    absolute -top-1 -right-1
    h-5 min-w-[20px] px-1.5
    rounded-full
    bg-primary text-primary-foreground
    text-[10px] font-bold
    flex items-center justify-center
  ">
    {item.badge > 99 ? "99+" : item.badge}
  </span>
)}
```

**File:** `app/doctor/layout.tsx`

**Changes:**
1. Import and use `usePendingRequestsCount` hook
2. Update `doctorNavItems` array to include badge count for "Requests" item
3. Update mobile navigation to show badge on "Requests" button

**Integration Pattern:**
```typescript
const { count: pendingCount } = usePendingRequestsCount(user?.id ?? null);

const doctorNavItems: NavItem[] = [
  // ... other items
  { 
    label: "Requests", 
    href: "/doctor/requests", 
    icon: Bell, 
    group: "main",
    badge: pendingCount  // Dynamic badge
  },
  // ... other items
];
```

#### Mobile Navigation Badge

For mobile bottom navigation, add badge to the Bell icon button:

```typescript
<Link href="/doctor/requests" className="relative">
  <Icon className="h-5 w-5" />
  {pendingCount > 0 && (
    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[8px] text-white flex items-center justify-center">
      {pendingCount > 9 ? "9+" : pendingCount}
    </span>
  )}
</Link>
```

### 3. Prescription Editing

#### Current State Analysis

The application already has:
- `prescriptionsService.updateWithHistory()` method
- History tracking infrastructure in Firestore types
- An "Edit Prescription" button that navigates to the create form

**What's Missing:**
- The create form at `/doctor/prescriptions/create/[appointmentId]` expects an appointment ID
- Direct prescription editing (without appointment context) is not supported
- The UI flow is unclear for standalone prescription edits

#### Solution: Edit Route & Form Reuse

**New Route:** `app/doctor/prescriptions/[id]/edit/page.tsx`

This page will:
1. Load the existing prescription by ID
2. Pre-fill the prescription creation form with existing data
3. Submit updates via `prescriptionsService.updateWithHistory()`
4. Track previous state for history entry

**Route Structure:**
```
/doctor/prescriptions/[id]        -> Detail view (read-only)
/doctor/prescriptions/[id]/edit   -> Edit form (NEW)
```

#### Shared Form Component

**Refactor:** Extract form logic from `app/doctor/prescriptions/create/[appointmentId]/page.tsx` into a reusable component.

**New File:** `components/prescription/PrescriptionForm.tsx`

```typescript
interface PrescriptionFormProps {
  mode: "create" | "edit";
  prescriptionId?: string;
  appointmentId?: string;
  patientId?: string;
  onSuccess?: (prescriptionId: string) => void;
}
```

**Form Behavior:**
- **Create mode**: Creates new prescription, links to appointment if provided
- **Edit mode**: Loads existing prescription, submits via `updateWithHistory()`
- Validates all required fields (rightEye, leftEye, findings, diagnosis)
- Shows success toast and redirects on completion

#### Modified Components

**File:** `app/doctor/prescriptions/[id]/page.tsx`

Update "Edit Prescription" button to navigate to new edit route:

```typescript
<Link href={`/doctor/prescriptions/${prescription.id}/edit`} className="block">
  <PremiumButton variant="outline" fullWidth icon={<Edit2 className="h-4 w-4" />}>
    Edit Prescription
  </PremiumButton>
</Link>
```

### 4. Edit History & Timestamp Display

#### History Display (Doctors & Admins Only)

**File:** `components/prescription/EditHistory.tsx` (NEW)

```typescript
interface EditHistoryProps {
  history: PrescriptionHistoryEntry[];
  doctors: Map<string, UserDocument>;  // Map of doctorId -> doctor details
}
```

**Component Features:**
- Displays edit history in reverse chronological order (newest first)
- Shows: timestamp, doctor name, and which fields were changed
- Collapsible accordion UI for each history entry
- Shows "Original" label for the first entry
- Uses GlassPanel for consistent styling

**Field Change Detection:**
Compare previous entry's `data` with current history entry's `data` to determine changed fields.

**UI Structure:**
```
Edit History (3 entries)
  ┌─ January 15, 2025 at 2:30 PM — Dr. Sarah Johnson
  │  Fields updated: Right Eye SPH, Diagnosis, Medications
  │  [View Details ▼]
  │
  ├─ January 10, 2025 at 10:15 AM — Dr. Sarah Johnson  
  │  Fields updated: Recommendations, Follow-up Date
  │  [View Details ▼]
  │
  └─ January 8, 2025 at 3:45 PM — Dr. Sarah Johnson (Original)
     [View Details ▼]
```

#### Timestamp Display (All Users)

**File:** `app/patient/prescriptions/[id]/page.tsx`

**Changes:**
1. Add timestamp section at top of prescription display
2. Show creation date if never edited
3. Show "Last updated" date if edited
4. Format: "Created on December 15, 2024" or "Last updated on January 10, 2025"

**Implementation:**
```typescript
const displayTimestamp = prescription.history && prescription.history.length > 0
  ? prescription.history[0].savedAt  // Most recent edit
  : prescription.createdAt;

const timestampLabel = prescription.history && prescription.history.length > 0
  ? "Last updated"
  : "Created";
```

**UI Placement:**
Add timestamp banner after doctor/meta banner, before vision prescription table:

```typescript
<GlassPanel padding="sm" className="flex items-center gap-2 text-sm text-muted-foreground">
  <Calendar className="h-4 w-4" />
  <span>
    {timestampLabel} on {formatDate(displayTimestamp)}
  </span>
</GlassPanel>
```

**File:** `app/doctor/prescriptions/[id]/page.tsx`

**Changes:**
1. Add EditHistory component below prescription display (doctors/admins only)
2. Load doctor details for all history entries
3. Hide from patients (already doctor-only route)

## Data Models

### Updated PrescriptionDocument (No Changes Needed)

The existing `PrescriptionDocument` interface already supports:
- `history?: PrescriptionHistoryEntry[]` for edit tracking
- `createdAt: Date` for creation timestamp
- `updatedAt: Date` for last modification timestamp

### PrescriptionHistoryEntry (Existing)

```typescript
interface PrescriptionHistoryEntry {
  savedAt: Date;
  savedBy: string;  // doctorId
  data: Partial<PrescriptionDocument>;  // Previous state before this edit
}
```

### BookingRequestDocument (No Changes Needed)

Already has:
- `status: BookingRequestStatus` (including "pending")
- `doctorId: string` for filtering

## Error Handling

### Far Vision Assessment Flow

**Error Scenarios:**
1. Session state corruption (phase out of sync)
2. Orientation lock issues on mobile

**Mitigation:**
- SessionStorage persistence already handles orientation changes
- Add validation in phase transitions to prevent invalid states
- Fall back to "instructions" phase if invalid phase detected

### Pending Requests Badge

**Error Scenarios:**
1. Firestore connection failure
2. Permission denied
3. Slow network (stale count)

**Mitigation:**
- Display last known count during loading
- Show "0" if query fails (silent failure)
- Add 5-second timeout for initial load
- Log errors for monitoring

### Prescription Editing

**Error Scenarios:**
1. Concurrent edits (two doctors editing same prescription)
2. Validation failures
3. Network timeout during save

**Mitigation:**
- Use Firestore transactions for `updateWithHistory`
- Show validation errors inline
- Display retry option on network failure
- Optimistic UI updates with rollback on error

### Edit History Display

**Error Scenarios:**
1. Missing doctor records (deleted accounts)
2. Corrupted history data
3. Permission issues

**Mitigation:**
- Show "Unknown Doctor" if doctor record not found
- Validate history array before rendering
- Gracefully handle missing fields
- Hide component entirely if history is empty/invalid

## Testing Strategy

### Unit Tests

**Far Vision Flow:**
- Test phase transition order
- Verify eye selection state persistence
- Test countdown starts after eye selection

**Pending Badge:**
- Mock Firestore `onSnapshot`
- Test count updates
- Test loading/error states
- Verify badge hides when count is 0

**Prescription Edit:**
- Test form validation
- Test pre-fill logic
- Mock `updateWithHistory` service call
- Verify history entry creation

**Timestamp Display:**
- Test date formatting
- Test label selection (Created vs Last updated)
- Test with/without history

### Integration Tests

**Far Vision Flow:**
- Complete assessment flow from start to finish
- Verify eye selection appears before countdown
- Test with both far and near vision types

**Pending Badge:**
- Create pending request → verify badge updates
- Accept request → verify badge decrements
- Test across desktop, tablet, mobile breakpoints

**Prescription Edit:**
- Create prescription → edit → verify history
- Verify timestamp updates
- Test edit button visibility
- Verify patient cannot see edit history

### Manual Testing Checklist

**Responsive Testing:**
- [ ] Badge visible on phone (< 768px)
- [ ] Badge visible on tablet (768-1024px)
- [ ] Badge visible on desktop (≥ 1024px)
- [ ] Badge appears on mobile bottom nav
- [ ] Badge appears on desktop sidebar

**Prescription Edit:**
- [ ] Edit button visible on detail page
- [ ] Form pre-fills correctly
- [ ] History entry created on save
- [ ] Timestamp updates on patient view
- [ ] Edit history visible to doctors only

**Far Vision Flow:**
- [ ] Eye selection appears after duration
- [ ] Countdown appears after eye selection
- [ ] Testing begins immediately after countdown
- [ ] No intermediate screens after countdown

## Migration Strategy

### Phase 1: Far Vision Flow Fix

**Impact:** Low risk, isolated to visual acuity module

**Steps:**
1. Add `EyeSelectionStep` component
2. Update `TestPhase` type
3. Modify `AcuitySession` phase order and handlers
4. Test thoroughly on mobile and desktop
5. Deploy

**Rollback:** Revert phase order changes if issues detected

### Phase 2: Pending Badge

**Impact:** Medium risk, affects navigation rendering

**Steps:**
1. Create `usePendingRequestsCount` hook
2. Update `FloatingSidebar` to support badges
3. Update doctor layout to use hook
4. Test real-time updates
5. Deploy

**Rollback:** Remove badge prop from nav items

### Phase 3: Prescription Editing

**Impact:** Medium risk, modifies prescription data

**Steps:**
1. Extract `PrescriptionForm` component
2. Create edit route
3. Update "Edit Prescription" button
4. Test with various prescription data
5. Deploy

**Rollback:** Hide edit button if issues detected

### Phase 4: Edit History & Timestamps

**Impact:** Low risk, read-only display changes

**Steps:**
1. Create `EditHistory` component
2. Add timestamp display to patient view
3. Add edit history to doctor view
4. Test with prescriptions that have history
5. Deploy

**Rollback:** Remove components if display issues occur

## Performance Considerations

### Pending Badge Real-time Updates

**Optimization:**
- Use Firestore query index on `doctorId` + `status`
- Limit query to just count (no document data needed)
- Debounce updates if multiple changes occur rapidly
- Use count aggregation query (Firestore Count) if available

**Expected Load:**
- Average: 1-5 pending requests per doctor
- Query cost: ~1 read per page load + real-time updates
- Update frequency: Low (requests are infrequent)

### Edit History Loading

**Optimization:**
- Load doctor details in batch (single query per unique doctorId)
- Cache doctor details in component state
- Lazy load history (collapsed by default)
- Limit displayed history to last 20 entries

**Expected Load:**
- Average: 2-5 history entries per prescription
- Most prescriptions: 0-1 edits
- Doctor lookup: Cached after first load

### Form Pre-filling

**Optimization:**
- Single Firestore read on route load
- Pre-fill happens client-side (no additional queries)
- Use React state for form management (no real-time sync needed)

## Security Considerations

### Prescription Editing Authorization

**Rules:**
- Only the prescribing doctor can edit their own prescriptions
- Admins can edit any prescription
- Patients cannot edit prescriptions

**Firestore Security Rules (Existing):**
```javascript
match /prescriptions/{prescriptionId} {
  allow read: if isAuthenticated() && 
    (resource.data.patientId == request.auth.uid || 
     isDoctorOrAdmin());
  allow create: if isDoctor() && 
    request.resource.data.doctorId == request.auth.uid;
  allow update: if isDoctor() && 
    (resource.data.doctorId == request.auth.uid || isAdmin());
}
```

**Application-level Checks:**
- Verify user role before showing edit button
- Verify user ID matches prescription doctorId before allowing edit
- Server-side validation via Firestore rules (defense in depth)

### Edit History Visibility

**Rules:**
- Doctors and admins can see edit history
- Patients cannot see edit history
- Patient view shows only timestamp (not full history)

**Implementation:**
- Conditional rendering based on user role
- No API endpoint for patients to fetch history
- History component only imported in doctor routes

### Pending Badge Authorization

**Rules:**
- Doctors see only their own pending request count
- Query filtered by doctorId on client and server

**Firestore Query:**
```typescript
query(
  collection(db, "booking-requests"),
  where("doctorId", "==", user.id),
  where("status", "==", "pending")
)
```

## Accessibility

### Far Vision Flow

- Add ARIA labels to eye selection buttons
- Announce phase changes to screen readers
- Ensure countdown timer is announced
- Keyboard navigation for all interactive elements

### Pending Badge

- Badge text readable by screen readers
- Use `aria-label` on nav items with badges: "Requests (3 pending)"
- Ensure color contrast meets WCAG AA standards
- Don't rely solely on color to convey meaning

### Prescription Forms

- Proper form labels for all inputs
- Error messages announced to screen readers
- Focus management on validation errors
- Clear indication of required fields

### Edit History

- Collapsible sections keyboard accessible
- Timestamps formatted for screen reader clarity
- Semantic HTML for history timeline
- ARIA labels for expand/collapse buttons

## Deployment Notes

### Environment Variables

No new environment variables required. All features use existing Firebase configuration.

### Database Indexes

**Required Index (if not exists):**
```
Collection: booking-requests
Fields: doctorId (Ascending), status (Ascending)
```

**Verification:**
```bash
firebase firestore:indexes
```

### Monitoring

**Metrics to Track:**
- Far vision assessment completion rate (before/after fix)
- Pending badge query performance
- Prescription edit success rate
- Edit history load times

**Logging:**
- Log prescription edits with timestamp and doctorId
- Log badge query errors
- Log phase transition errors in visual acuity

### Feature Flags (Optional)

Consider feature flags for gradual rollout:
- `ENABLE_FAR_VISION_FLOW_FIX`
- `ENABLE_PENDING_BADGE`
- `ENABLE_PRESCRIPTION_EDITING`
- `ENABLE_EDIT_HISTORY`

## Open Questions

1. **Far Vision Flow**: Should the eye selection be remembered across sessions for the same user? (Proposed: No, always ask)
2. **Pending Badge**: Should we show a different indicator for urgent/overdue requests? (Proposed: No, keep simple)
3. **Edit History**: Should we notify patients when their prescription is edited? (Proposed: Future enhancement)
4. **Prescription Editing**: Should there be a time limit after which prescriptions cannot be edited? (Proposed: No limit for now)

## Future Enhancements

1. **Audit Log**: Comprehensive audit trail for all prescription changes
2. **Version Comparison**: Side-by-side diff view of prescription versions
3. **Patient Notifications**: Email/SMS when prescription is created or updated
4. **Prescription Comments**: Allow doctors to add notes visible only to other doctors
5. **Badge Customization**: Allow doctors to set custom notification preferences
6. **Prescription Locking**: Lock prescriptions after a certain period or when shared externally
