# Implementation Plan: Critical Bugfixes - Vision, Doctor, Prescription

## Overview

This implementation plan addresses four critical issues in the Eye Aura application:

1. **Far Vision Assessment Flow**: Reorder the assessment to place eye selection before the countdown timer
2. **Pending Requests Badge**: Display real-time badge with pending request counts across all breakpoints
3. **Prescription Editing**: Enable doctors to edit existing prescriptions with form reuse
4. **Edit History & Timestamps**: Track prescription changes and display timestamps to all users

Each section can be implemented independently, with tasks organized to ensure incremental progress and early validation.

## Tasks

- [x] 1. Fix Far Vision Assessment Timer Flow
  - [x] 1.1 Create EyeSelectionStep component
    - Create `modules/visual-acuity/steps/EyeSelectionStep.tsx`
    - Implement two-button interface: "Test Right Eye First" and "Test Left Eye First"
    - Display instructions for covering the opposite eye
    - Add "Continue" button to proceed to countdown
    - Follow existing design system (glass panels, premium buttons)
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Update TestPhase type definition
    - Modify `modules/visual-acuity/types.ts`
    - Add "eye_selection" to TestPhase union type
    - Add phase label to PHASE_LABELS record
    - _Requirements: 1.1_
  
  - [x] 1.3 Update AcuitySession phase order and handlers
    - Modify `modules/visual-acuity/AcuitySession.tsx`
    - Update PHASE_ORDER array to include "eye_selection" before "countdown"
    - Update handleDurationContinue to navigate to eye_selection for far vision
    - Add handler for eye selection completion that navigates to countdown
    - Add conditional rendering for EyeSelectionStep phase
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 1.4 Write unit tests for eye selection flow
    - Test phase transition order (duration → eye selection → countdown → testing)
    - Test eye selection state persistence
    - Test that near vision skips eye selection phase
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Checkpoint - Verify far vision flow works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Pending Requests Badge Infrastructure
  - [x] 3.1 Create usePendingRequestsCount hook
    - Create `hooks/usePendingRequestsCount.ts`
    - Implement Firestore onSnapshot listener for real-time updates
    - Query booking-requests collection filtered by doctorId and status="pending"
    - Return count, loading state, and error
    - Add automatic cleanup on unmount
    - _Requirements: 2.1, 2.2, 2.7_
  
  - [x] 3.2 Update FloatingSidebar to support badges
    - Modify `components/premium/floating-sidebar.tsx`
    - Add optional badge property to NavItem interface
    - Implement badge rendering with absolute positioning
    - Style badge with primary background, white text, rounded-full
    - Handle badge > 99 with "99+" display
    - Ensure badge hides when count is 0
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 3.3 Integrate badge in doctor layout
    - Modify `app/doctor/layout.tsx`
    - Import and use usePendingRequestsCount hook
    - Pass pending count to "Requests" nav item badge property
    - Update mobile bottom navigation to show badge on Bell icon
    - Ensure badge appears at all breakpoints (phone, tablet, desktop)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_
  
  - [ ]* 3.4 Write unit tests for pending badge
    - Mock Firestore onSnapshot
    - Test count updates
    - Test loading and error states
    - Test badge visibility (hide when 0, show when > 0)
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

- [x] 4. Checkpoint - Verify badge updates in real-time
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Prescription Editing Foundation
  - [x] 5.1 Extract reusable PrescriptionForm component
    - Create `components/prescription/PrescriptionForm.tsx`
    - Extract form logic from `app/doctor/prescriptions/create/[appointmentId]/page.tsx`
    - Support both "create" and "edit" modes via props
    - Implement form validation for all required fields
    - Add loading states and success/error handling
    - Call prescriptionsService.updateWithHistory() for edit mode
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 5.2 Create prescription edit route
    - Create `app/doctor/prescriptions/[id]/edit/page.tsx`
    - Load existing prescription by ID
    - Pre-fill PrescriptionForm with existing data
    - Handle submission via updateWithHistory service
    - Display success toast and redirect on completion
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.3 Update prescription detail page with Edit button
    - Modify `app/doctor/prescriptions/[id]/page.tsx`
    - Change "Edit Prescription" button to link to new edit route
    - Ensure button is only visible to doctors/admins
    - _Requirements: 3.1_
  
  - [ ]* 5.4 Write unit tests for prescription editing
    - Test form validation
    - Test pre-fill logic
    - Mock updateWithHistory service call
    - Test success and error handling
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 6. Checkpoint - Verify prescription editing works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Edit History Display
  - [x] 7.1 Create EditHistory component
    - Create `components/prescription/EditHistory.tsx`
    - Display edit history in reverse chronological order (newest first)
    - Show timestamp, doctor name, and changed fields for each entry
    - Implement collapsible accordion UI
    - Mark first entry as "Original"
    - Use GlassPanel for consistent styling
    - _Requirements: 4.2, 4.3_
  
  - [x] 7.2 Add EditHistory to doctor prescription detail page
    - Modify `app/doctor/prescriptions/[id]/page.tsx`
    - Import and render EditHistory component below prescription display
    - Load doctor details for all history entries
    - Ensure only visible to doctors and admins
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [ ]* 7.3 Write unit tests for edit history
    - Test history entry ordering
    - Test field change detection
    - Test with missing doctor records
    - Test visibility (doctors/admins only)
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 8. Implement Timestamp Display for Patients
  - [x] 8.1 Add timestamp display to patient prescription view
    - Modify `app/patient/prescriptions/[id]/page.tsx`
    - Add timestamp banner with Calendar icon
    - Show "Created on [date]" if never edited
    - Show "Last updated on [date]" if edited
    - Format date in human-readable format
    - Position after doctor/meta banner, before vision prescription table
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 8.2 Write unit tests for timestamp display
    - Test date formatting
    - Test label selection (Created vs Last updated)
    - Test with prescriptions that have history
    - Test with prescriptions without history
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Final Checkpoint - Integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create Firestore index for pending badge queries
  - [x] 10.1 Add composite index for booking-requests
    - Create or verify index on booking-requests collection
    - Fields: doctorId (Ascending), status (Ascending)
    - Use Firebase console or firestore.indexes.json
    - _Requirements: 2.7_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster delivery
- All four features are independent and can be implemented in any order
- The pending badge uses Firestore real-time listeners for immediate updates
- Prescription editing reuses the existing updateWithHistory infrastructure
- Edit history is only visible to doctors/admins; patients see only timestamps
- Far vision flow fix is isolated to the visual acuity module
- Each checkpoint provides an opportunity to verify functionality before proceeding

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "10.1"] },
    { "id": 1, "tasks": ["1.2", "3.2"] },
    { "id": 2, "tasks": ["1.3", "3.3", "5.1"] },
    { "id": 3, "tasks": ["1.4", "3.4", "5.2"] },
    { "id": 4, "tasks": ["5.3", "7.1", "8.1"] },
    { "id": 5, "tasks": ["5.4", "7.2", "8.2"] },
    { "id": 6, "tasks": ["7.3"] }
  ]
}
```
