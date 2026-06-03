# Implementation Plan: Doctor Portal Quick Actions

## Overview

This plan implements contextual quick actions for the doctor portal: shared dialog components for service recommendations and assessment assignments, a redesigned Recent Patients section with richer cards and inline actions, a Patient Summary Card for appointment details, and extended notification/audit systems. All components use TypeScript with Next.js 15 App Router, React 19, Tailwind CSS 4, and the existing PremiumModal/design-token infrastructure.

## Tasks

- [x] 1. Extend types and data models
  - [x] 1.1 Extend VisionAssessmentType and add assessment scheduling types
    - Add `"color_vision" | "contrast_sensitivity" | "custom"` to the `VisionAssessmentType` union in `types/firestore.ts`
    - Create `ExtendedAssessmentType` type and `mapExtendedToVisionType` mapping function in a new `lib/assessment-type-mapping.ts`
    - Add `scheduledFor`, `instructions`, and `assignmentTiming` fields to `VisionAssessmentDocument` interface
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 1.2 Add assessment notification types to `types/notifications.ts`
    - Add `"assessment_assigned" | "assessment_completed"` to the `NotificationType` union
    - _Requirements: 9.6, 9.8_

  - [x] 1.3 Add assessment audit types
    - Create `types/audit.ts` with `AssessmentAuditAction` type and `AssessmentAuditEntry` interface
    - Include `AuditEntryBase` interface shared between recommendation and assessment audit entries
    - _Requirements: 10.4, 10.7, 10.8_

  - [ ]* 1.4 Write property test for assessment type mapping (round-trip correctness)
    - **Property: mapExtendedToVisionType covers all ExtendedAssessmentType values and produces valid output**
    - **Validates: Requirements 3.1**
    - Test file: `lib/__tests__/assessment-type-mapping.test.ts`

- [x] 2. Implement Patient Summary Card
  - [x] 2.1 Create `components/doctor/patient-summary-card.tsx`
    - Fetch patient data by `patientId` using `usersService.getById`
    - Display profile photo (or `Users` icon placeholder), name, age, gender, phone, email
    - Show "—" placeholder for missing phone/email
    - Omit age/gender entirely (label + value hidden) when null/undefined with no visual gap
    - Include "View Full Profile" button linking to `/doctor/patients/{patientId}`
    - Implement error state with retry button; do not block sibling content
    - Use existing `Card`, `CardContent` components and design tokens
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 2.2 Write property test for patient card placeholder logic
    - **Property 5: Patient card renders all required fields with dash placeholders for missing data**
    - **Validates: Requirements 5.2, 5.3, 6.5**
    - Test file: `components/doctor/__tests__/patient-summary-card.test.ts`

  - [ ]* 2.3 Write property test for patient card age/gender omission
    - **Property 6: Patient card omits unavailable age/gender without visual gap**
    - **Validates: Requirements 6.7**
    - Test file: `components/doctor/__tests__/patient-summary-card.test.ts`

- [x] 3. Implement RecommendServiceDialog
  - [x] 3.1 Create `components/doctor/recommend-service-dialog.tsx`
    - Wrap existing `RecommendServiceForm` inside a `PremiumModal`
    - Accept props: `open`, `onClose`, `patientId`, `doctorId`, `appointmentId?`
    - When `appointmentId` is provided: fetch appointment data, show "Use appointment schedule" checkbox (checked by default), pre-fill date/time from `scheduledFor`, disable date/time when checked
    - When unchecked: enable date picker (today or future) and time slot picker
    - When `appointmentId` is omitted: disable "Use appointment schedule" checkbox, require manual patient selection if needed
    - Guard: if `patientId` or `doctorId` is missing, log error and do not render
    - On success: close dialog, show success toast
    - On error: keep dialog open, preserve data, show inline error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 3.2 Write property test for past date rejection in RecommendServiceDialog
    - **Property 2: Past date rejection in dialogs**
    - **Validates: Requirements 2.9**
    - Test file: `components/doctor/__tests__/recommend-service-dialog.test.ts`

  - [ ]* 3.3 Write property test for required field validation
    - **Property 3: Required field validation produces correct errors**
    - **Validates: Requirements 2.7**
    - Test file: `components/doctor/__tests__/recommend-service-dialog.test.ts`

- [x] 4. Implement AssignAssessmentDialog
  - [x] 4.1 Create `components/doctor/assign-assessment-dialog.tsx`
    - Use `PremiumModal` as the dialog wrapper
    - Accept props: `open`, `onClose`, `patientId`, `doctorId`, `appointmentId?`
    - Assessment Type selector with 5 options (Distance Visual Acuity, Near Vision, Color Vision, Contrast Sensitivity, Custom)
    - Assignment Timing: "Assign Now" (default) and "Schedule Later"
    - When "Schedule Later": reveal Date Picker + Time Picker
    - Optional Instructions textarea (500 char limit)
    - Validation: type required, future date when scheduled, both date and time required for "Schedule Later"
    - On submit: call `POST /api/assessments/assign` with mapped type, timing, instructions
    - Auto-populate patient/appointment fields when context provided
    - On error: keep dialog open, preserve data, show inline error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 4.2 Write property test for past date rejection in AssignAssessmentDialog
    - **Property 2: Past date rejection in dialogs**
    - **Validates: Requirements 3.8**
    - Test file: `components/doctor/__tests__/assign-assessment-dialog.test.ts`

  - [ ]* 4.3 Write property test for dialog validation entry-point independence
    - **Property 4: Dialog validation is entry-point independent**
    - **Validates: Requirements 7.6, 8.5, 11.6, 11.7**
    - Test file: `components/doctor/__tests__/dialog-validation-independence.test.ts`

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Extend Appointment Details with Quick Actions and Patient Summary
  - [x] 6.1 Add Patient Summary Card to `app/doctor/appointments/[id]/page.tsx`
    - Import and render `PatientSummaryCard` component with the appointment's `patientId`
    - Position above the fold on desktop (sidebar or inline panel)
    - Render full-width on mobile
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 6.2 Add Quick Action cards for "Recommend Service" and "Assign Assessment"
    - Add action cards alongside existing "Create Prescription" in the Quick Actions section
    - Match existing card sizing, spacing, hover states using current design patterns
    - Disabled state (reduced opacity, non-interactive) when status is `cancelled`, `completed` (no active follow-up), or `no-show`
    - Responsive layout: horizontal row ≥1024px, 2-column grid 768–1023px, single-column <768px
    - On click "Recommend Service": open `RecommendServiceDialog` with patientId, doctorId, appointmentId
    - On click "Assign Assessment": open `AssignAssessmentDialog` with patientId, doctorId, appointmentId
    - Show toast error if dialog fails to open
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 11.1, 11.2, 11.4, 11.5_

  - [ ]* 6.3 Write property test for quick action disabled state
    - **Property 1: Quick Action disabled state follows appointment status**
    - **Validates: Requirements 1.3**
    - Test file: `app/doctor/appointments/[id]/__tests__/quick-actions.test.ts`

- [x] 7. Redesign Recent Patients Section
  - [x] 7.1 Create `components/doctor/recent-patient-card.tsx`
    - Implement `RecentPatientCardProps` interface with all patient fields
    - Minimum height 180px, minimum width 320px on desktop
    - Display: Patient Name (truncated at 60 chars with ellipsis), Age, Gender, Last Appointment, Last Assessment Date, Upcoming Appointment, Status Badge
    - Show "—" placeholder for missing optional fields (Last Assessment Date, Upcoming Appointment)
    - Quick action buttons: View Profile, Prescription, Recommend Service, Assign Assessment
    - Secondary action: Book Follow-up
    - Call `onRecommendService(patientId)` and `onAssignAssessment(patientId)` handlers on button click
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.2 Integrate Recent Patient Cards into `app/doctor/dashboard/page.tsx`
    - Replace existing minimal `DashboardCard` usage in Recent Patients section with new `RecentPatientCard`
    - Fetch enriched patient data (age, gender, last assessment date, upcoming appointment)
    - Responsive grid: max 3 columns ≥1024px, single-column stack <1024px
    - Wire "Recommend Service" and "Assign Assessment" buttons to open shared dialogs with patientId and doctorId (no appointmentId)
    - _Requirements: 5.6, 5.7, 5.8, 5.9, 11.3_

  - [ ]* 7.3 Write property test for patient name truncation
    - **Property 12: Recent Patient Card name truncation**
    - **Validates: Requirements 5.2**
    - Test file: `components/doctor/__tests__/recent-patient-card.test.ts`

- [x] 8. Implement Assessment Notifications Service
  - [x] 8.1 Create `services/notifications/assessment-notifications.service.ts`
    - Follow the `recommendationNotificationsService` pattern (builder class, exported singleton)
    - Implement `notifyAssessmentAssigned(context)`: generates notification with assessment type, timing, doctor name, scheduled date
    - Implement `notifyAssessmentCompleted(context)`: generates notification for doctor when patient completes
    - All generated notifications must have `read: false` and valid `createdAt`
    - _Requirements: 4.1, 9.6, 9.8_

  - [ ]* 8.2 Write property test for notification lifecycle context
    - **Property 7: Notification lifecycle events contain required context**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
    - Test file: `services/notifications/__tests__/assessment-notifications.test.ts`

  - [ ]* 8.3 Write property test for notification persistence invariants
    - **Property 9: Notification persistence invariants**
    - **Validates: Requirements 9.8**
    - Test file: `services/notifications/__tests__/assessment-notifications.test.ts`

- [x] 9. Implement Audit Logging for Assessments
  - [x] 9.1 Create audit entry builder utility in `services/audit/assessment-audit.service.ts`
    - Build `AssessmentAuditEntry` objects for: assessment_assigned, assessment_completed, assessment_cancelled
    - Each entry includes: actor, actorRole, timestamp (ISO 8601 UTC), patientId, doctorId, action, metadata with assessment-specific details
    - On persistence failure: queue for retry within 60 seconds, do not block the originating action
    - _Requirements: 4.3, 10.4, 10.7, 10.8, 10.11_

  - [ ]* 9.2 Write property test for audit log structural invariants
    - **Property 10: Audit log structural invariants**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10**
    - Test file: `services/audit/__tests__/assessment-audit.test.ts`

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Wire post-assignment effects and integration
  - [x] 11.1 Update `POST /api/assessments/assign` endpoint to support new assessment types and scheduling
    - Accept extended assessment types and `assignmentTiming` field
    - When "Schedule Later": store `scheduledFor` on the assessment document
    - Trigger assessment notification via `assessmentNotificationsService.notifyAssessmentAssigned`
    - Create audit entry via assessment audit service
    - Validate scheduled date is in the future (server-side)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 11.2 Implement notification retry with exponential backoff
    - Retry up to 3 times with exponential backoff (1s, 2s, 4s) on notification delivery failure
    - After 3rd failure: persist notification in "undelivered" state for later retrieval
    - Log failure in audit service
    - _Requirements: 4.6, 9.7_

  - [ ]* 11.3 Write property test for notification retry mechanism
    - **Property 8: Notification retry mechanism**
    - **Validates: Requirements 4.6, 9.7**
    - Test file: `services/notifications/__tests__/notification-retry.test.ts`

  - [ ]* 11.4 Write property test for scheduled assessment visibility
    - **Property 11: Scheduled assessment visibility**
    - **Validates: Requirements 4.5, 4.7**
    - Test file: `services/firestore/__tests__/vision-assessments-scheduling.test.ts`

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `RecommendServiceForm` is wrapped, not rewritten — composition over modification
- All dialogs use `PremiumModal` to maintain visual consistency (glass effect, focus trap, backdrop click, Escape key)
- The notification service follows the existing `recommendationNotificationsService` singleton pattern
- Audit entries use Firestore subcollections mirroring the `RecommendationAuditEntry` pattern

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "4.3"] },
    { "id": 3, "tasks": ["6.1", "6.2", "7.1", "8.1", "9.1"] },
    { "id": 4, "tasks": ["6.3", "7.2", "7.3", "8.2", "8.3", "9.2"] },
    { "id": 5, "tasks": ["11.1", "11.2"] },
    { "id": 6, "tasks": ["11.3", "11.4"] }
  ]
}
```
