# Implementation Plan: Doctor Recommended Services

## Overview

This plan implements the Doctor Recommended Services feature across 7 phases: data layer (Firestore types and services), API routes, Doctor Portal UI, Patient Portal UI, Admin Portal UI, supporting systems (notifications, expiration, audit), and integration verification. The implementation uses TypeScript with Next.js, Firestore, and the existing premium component system.

## Tasks

- [x] 1. Phase 1: Data Layer
  - [x] 1.1 Create Firestore types and interfaces
    - Create `types/recommendations.ts` with `ServiceRecommendation`, `SlotReservation`, `RecommendationAuditEntry`, `RecommendationStatus`, `RecommendationAuditAction`, and `RecommendationMetrics` interfaces
    - Define `CreateRecommendationInput` and `UpdateRecommendationInput` types
    - Extend `NotificationType` in `types/notifications.ts` with recommendation event types
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Implement RecommendationsService
    - Create `services/firestore/recommendations.service.ts`
    - Implement CRUD: `create`, `getById`, `update`, `getByPatientId`, `getByDoctorId`, `getAll`
    - Implement state transitions: `accept`, `decline`, `cancel`, `expire` with state machine enforcement (only PENDING → terminal states)
    - Implement `getExpired` query (status=PENDING AND expiresAt < now)
    - Implement `getMetrics` for aggregate counts and conversion rate calculation
    - Implement `getByFilters` with status, doctor, patient, date range, service filtering and cursor-based pagination
    - Set timestamps on transitions (acceptedAt, declinedAt, cancelledAt) and enforce cancelledBy
    - Generate recommendation IDs in format `rec_{patientId}_{doctorId}_{timestamp}`
    - Export from `services/firestore/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 9.1, 9.2, 9.4, 9.7_

  - [x] 1.3 Implement SlotReservationService
    - Create `services/firestore/slot-reservations.service.ts`
    - Implement `checkAvailability` checking both `slot_reservations` (active) and `doctor_blocks` for overlaps, plus doctor availability schedule for the day
    - Implement `softReserve` to create reservation with status=active
    - Implement `release` to set status=released and releasedAt
    - Implement `convertToHardBlock` to set status=converted, convertedAt, and create a `doctor_blocks` entry
    - Implement `getByDoctorId` for time range queries
    - Enforce no overlapping active reservations for same doctor
    - Only permit transitions: active→released, active→converted
    - Export from `services/firestore/index.ts`
    - _Requirements: 2.5, 2.6, 2.7, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 1.4 Update Firestore security rules
    - Update `firestore.rules` to add rules for `service_recommendations` collection:
      - Doctors can create where `doctorId == request.auth.uid`
      - Patients can read where `patientId == request.auth.uid`
      - Admins have full read access
      - No direct client writes to `status` field (transitions only via API)
    - Add rules for `slot_reservations` collection (server-side access only via admin SDK)
    - Add rules for `recommendation_audit_log` collection (read by admin, write by server)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Checkpoint - Data layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase 2: API Routes
  - [x] 3.1 Implement POST /api/recommendations/create
    - Create `app/api/recommendations/create/route.ts`
    - Verify Firebase auth token and doctor role
    - Validate: service is active and assigned to doctor, slot is in the future, slot duration matches service duration
    - Enforce rate limit: max 10 pending recommendations per doctor-patient pair
    - Sanitize recommendationNote (max 500 chars, strip HTML)
    - Call SlotReservationService.checkAvailability, return 409 on conflict
    - Call SlotReservationService.softReserve
    - Call RecommendationsService.create
    - Create audit log entry
    - Trigger notification to patient
    - Return 201 with recommendation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 10.1, 10.2, 10.6, 10.7_

  - [x] 3.2 Implement PATCH /api/recommendations/[id]
    - Create `app/api/recommendations/[id]/route.ts` with PATCH handler
    - Verify Firebase auth token and doctor role, ensure doctor owns the recommendation
    - Validate recommendation is in PENDING status
    - If slot changed: release old reservation, check new slot availability, create new reservation (rollback on conflict)
    - Sanitize recommendationNote if updated
    - Update recommendation via RecommendationsService.update
    - Create audit log entry with changed fields
    - Trigger notification to patient about edit
    - Return 200 with updated recommendation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.8, 10.2, 10.7_

  - [x] 3.3 Implement POST /api/recommendations/[id]/cancel
    - Create `app/api/recommendations/[id]/cancel/route.ts`
    - Verify Firebase auth token and doctor or admin role
    - Validate recommendation is in PENDING status
    - Call RecommendationsService.cancel with cancelledBy identifier
    - Call SlotReservationService.release
    - Create audit log entry
    - Trigger notification to patient
    - Return 200 with cancelled recommendation
    - _Requirements: 3.5, 3.6, 3.7, 3.9, 9.5, 10.2, 10.4_

  - [x] 3.4 Implement POST /api/recommendations/[id]/accept
    - Create `app/api/recommendations/[id]/accept/route.ts`
    - Verify Firebase auth token and patient role, ensure patient owns the recommendation
    - Validate recommendation is PENDING and not expired
    - Verify Razorpay payment signature server-side
    - Create booking request with recommendation data (patientId, doctorId, serviceId, requestedTime, payment details)
    - Call SlotReservationService.convertToHardBlock
    - Call RecommendationsService.accept with bookingId
    - Create audit log entry
    - Trigger notification to doctor
    - Return 200 with bookingRequestId
    - On payment failure: keep PENDING status, keep soft reservation active
    - _Requirements: 4.3, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 10.3, 10.8_

  - [x] 3.5 Implement POST /api/recommendations/[id]/decline
    - Create `app/api/recommendations/[id]/decline/route.ts`
    - Verify Firebase auth token and patient role, ensure patient owns the recommendation
    - Validate recommendation is PENDING and not expired
    - Sanitize declineReason (max 500 chars, strip HTML)
    - Call RecommendationsService.decline with optional reason
    - Call SlotReservationService.release
    - Create audit log entry
    - Trigger notification to doctor
    - Return 200 with declined recommendation
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 10.3, 10.7_

  - [x] 3.6 Implement GET /api/recommendations
    - Add GET handler to `app/api/recommendations/route.ts`
    - Verify Firebase auth token
    - For doctors: return their recommendations (filter by doctorId)
    - For patients: return their recommendations (filter by patientId)
    - For admins: return all with filters (status, doctorId, patientId, dateRange, serviceId)
    - Support cursor-based pagination ordered by createdAt descending
    - Support status tab filtering (pending, confirmed, declined, all)
    - Return recommendations with count metadata
    - _Requirements: 4.1, 4.2, 9.3, 9.4, 9.7, 10.2, 10.3, 10.4_

  - [x] 3.7 Implement GET /api/recommendations/metrics
    - Create `app/api/recommendations/metrics/route.ts`
    - Verify Firebase auth token and admin role
    - Call RecommendationsService.getMetrics
    - Return total, pending, accepted, declined, cancelled, expired counts and conversionRate
    - _Requirements: 9.1, 9.2, 10.4_

- [x] 4. Checkpoint - API routes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Phase 3: Doctor Portal UI
  - [x] 5.1 Implement RecommendServiceForm component
    - Create `components/doctor/recommend-service-form.tsx`
    - Build form with: service selector dropdown (from doctor's assigned services), date picker, time slot selector (filtered by doctor availability), recommendation note textarea
    - Implement edit mode (prefill from existing recommendation)
    - Show slot availability status (check against soft reservations + blocks)
    - Validate slot duration matches selected service duration
    - Character counter for note (max 500)
    - Submit calls POST /api/recommendations/create (or PATCH for edit)
    - Show loading state during submission
    - Handle 409 conflict error with user-friendly message
    - Use existing premium components (PremiumButton, PremiumInput, GlassPanel)
    - _Requirements: 2.1, 3.1, 11.4_

  - [x] 5.2 Add Recommended Services tab to patient details page
    - Update `app/doctor/patients/[patientId]` page to add a "Recommended Services" tab
    - Display list of recommendations for this patient by this doctor
    - Show status badge, service name, slot date/time, and clinical note for each
    - Include "Recommend Service" button that opens the RecommendServiceForm
    - Show edit and cancel actions for PENDING recommendations
    - Use PremiumTabs, DashboardCard, StatusBadge components
    - _Requirements: 2.1, 3.1, 3.5_

  - [x] 5.3 Implement Edit and Cancel functionality
    - Add edit button on PENDING recommendation cards that opens RecommendServiceForm in edit mode
    - Add cancel button with confirmation dialog (PremiumModal)
    - Cancel calls POST /api/recommendations/[id]/cancel
    - Show success/error toast notifications
    - Refresh list after successful edit or cancel
    - _Requirements: 3.1, 3.5, 3.6, 3.9_

- [x] 6. Checkpoint - Doctor Portal complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Phase 4: Patient Portal UI
  - [x] 7.1 Implement Recommendations dashboard section
    - Update `app/patient/dashboard/page.tsx` to add a "Recommended Services" section
    - Fetch PENDING recommendations for current patient
    - Display recommendation cards with: doctor name, service name, recommended date/time, clinical note, expiration countdown
    - Show Accept and Decline action buttons on each card
    - Display expiration date prominently
    - Link to full recommendations page
    - Use DashboardCard, StatusBadge, PremiumButton components
    - _Requirements: 4.1, 11.1, 11.2_

  - [x] 7.2 Create dedicated /patient/recommendations page
    - Create `app/patient/recommendations/page.tsx`
    - Implement tabs: Pending, Confirmed, Declined, All using PremiumTabs
    - Fetch recommendations filtered by status tab
    - Display cards with full details: doctor name, service name, date/time, note, status, timestamps
    - Show action buttons (Accept/Decline) for PENDING items
    - Show booking reference for ACCEPTED items
    - Show decline reason for DECLINED items
    - Implement empty states for each tab
    - _Requirements: 4.1, 4.2, 11.1, 11.2_

  - [x] 7.3 Implement Accept flow with payment integration
    - On Accept click, call POST /api/recommendations/[id]/accept to get payment details
    - Initiate Razorpay checkout with pre-filled service and amount
    - On payment success, verify payment server-side via existing payment verification flow
    - On payment success, show confirmation with booking reference
    - On payment failure/cancel, show error message and keep recommendation in PENDING
    - Handle expired recommendation error (show expiry message, refresh list)
    - _Requirements: 4.3, 4.8, 5.1, 5.2, 5.3, 5.7_

  - [x] 7.4 Implement Decline flow
    - On Decline click, show confirmation dialog (PremiumModal) with optional reason textarea
    - Confirm dialog warns "Are you sure you want to decline this recommendation?"
    - Sanitize reason input (max 500 chars)
    - Call POST /api/recommendations/[id]/decline with optional reason
    - On success, refresh recommendations list
    - Show success toast notification
    - _Requirements: 4.4, 4.5, 4.6, 11.3_

- [x] 8. Checkpoint - Patient Portal complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Phase 5: Admin Portal UI
  - [x] 9.1 Create /admin/recommendations page with metrics
    - Create `app/admin/recommendations/page.tsx`
    - Fetch and display metrics section: total, pending, accepted, declined, cancelled, expired counts using MetricCard components
    - Display conversion rate metric (accepted / (accepted + declined + expired) × 100)
    - Layout metrics in responsive grid (1/2/3 columns)
    - _Requirements: 9.1, 9.2_

  - [x] 9.2 Implement recommendations table with filters
    - Add PremiumTable below metrics showing: patient name, doctor name, service name, recommended date, suggested slot, status, actions
    - Implement filter controls: status dropdown, doctor search, patient search, date range picker, service filter
    - Implement cursor-based pagination (ordered by createdAt descending)
    - Implement cancel action button for PENDING recommendations (with confirmation dialog)
    - Cancel calls POST /api/recommendations/[id]/cancel with admin's ID
    - Show audit log details on row expansion or detail view
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 10. Checkpoint - Admin Portal complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Phase 6: Supporting Systems
  - [x] 11.1 Implement recommendation notification events
    - Create `services/notifications/recommendation-notifications.service.ts`
    - Implement notification handlers for all lifecycle events: created, accepted, declined, cancelled, expired, edited
    - Create in-app notifications in Firestore `notifications` collection
    - Use professional clinical language (use "recommended" not "prescribed")
    - Route notifications to correct recipient (patient for created/cancelled/expired/edited, doctor for accepted/declined/expired)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 11.5_

  - [x] 11.2 Implement email templates for recommendation events
    - Create email templates for: recommendation created (to patient), accepted (to doctor), declined (to doctor), cancelled (to patient), expired (to both), edited (to patient)
    - Integrate with existing email service (`lib/send-email.ts`) pattern
    - Include relevant details: service name, doctor/patient name, date/time, clinical note excerpt
    - Use clinical terminology consistent with requirement 11.5
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 11.5_

  - [x] 11.3 Implement expiration check on page load
    - Create `hooks/useRecommendationExpiration.ts` hook
    - On patient dashboard and recommendations page load, call a utility that checks for expired recommendations
    - Query PENDING recommendations where expiresAt < now
    - For each expired: call RecommendationsService.expire, release slot, create audit entry, send notifications
    - Run expiration check as part of GET /api/recommendations query (server-side batch)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 11.4 Implement audit logging
    - Create `services/firestore/recommendation-audit.service.ts`
    - Implement `createAuditEntry` function writing to `recommendation_audit_log` collection
    - Record: recommendationId, action, actorId, actorRole, timestamp, previousStatus, newStatus, metadata
    - Integrate audit logging into all API route handlers (create, edit, accept, decline, cancel, expire)
    - _Requirements: 2.8, 3.8, 7.6, 9.6_

  - [x] 11.5 Update navigation (sidebar and bottom nav)
    - Add "Recommendations" link to patient portal sidebar and bottom navigation
    - Add "Recommended Services" link to admin portal sidebar
    - Update `app/patient/layout.tsx` navigation items
    - Update `app/admin/layout.tsx` navigation items
    - Use appropriate icons for the navigation items
    - _Requirements: 4.1, 4.2, 9.1_

- [x] 12. Checkpoint - Supporting systems complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Phase 7: Integration and Verification
  - [x] 13.1 TypeScript compilation check
    - Run `npx tsc --noEmit` to verify zero type errors across all new files
    - Fix any type mismatches between services, API routes, and UI components
    - Ensure all imports resolve correctly
    - Verify type exports from barrel files
    - _Requirements: All_

  - [x] 13.2 End-to-end flow verification
    - Verify create recommendation flow: form → API → Firestore → notification
    - Verify accept flow: accept → payment → booking request → hard block → notification
    - Verify decline flow: decline → slot released → notification
    - Verify cancel flow: cancel → slot released → notification
    - Verify expiration flow: expired recommendations are identified and transitioned
    - Verify admin metrics and table rendering
    - Ensure all components wire together correctly with no orphaned code
    - _Requirements: All_

- [x] 14. Final Checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No optional test tasks included per user request — focus is on implementation only
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between phases
- The design uses TypeScript with Next.js, Firestore, and the existing premium component system
- Existing services (payments, booking requests, doctor blocks, notifications) are reused where possible
- New Firestore collections: `service_recommendations`, `slot_reservations`, `recommendation_audit_log`
- All API routes use Firebase Auth token verification with role-based access control
- Client-side expiration check pattern avoids need for Cloud Functions initially

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["3.1", "3.6", "3.7"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "3.5"] },
    { "id": 5, "tasks": ["5.1", "11.4"] },
    { "id": 6, "tasks": ["5.2", "5.3", "11.1", "11.2"] },
    { "id": 7, "tasks": ["7.1", "7.2", "9.1"] },
    { "id": 8, "tasks": ["7.3", "7.4", "9.2"] },
    { "id": 9, "tasks": ["11.3", "11.5"] },
    { "id": 10, "tasks": ["13.1"] },
    { "id": 11, "tasks": ["13.2"] }
  ]
}
```
