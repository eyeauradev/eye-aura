# Implementation Plan: Appointment Flow Revamp

## Overview

Implement three areas of the appointment flow revamp: (1) dark premium header for patient appointment detail, (2) cancellation-request workflow with doctor/admin approval and Razorpay refund, and (3) Firestore composite index for `getAvailableSlots()`. Implementation uses Next.js App Router client components, Firestore transactions, and a new API route for server-side refund processing.

## Tasks

- [x] 1. Extend types and add Firestore index
  - [x] 1.1 Extend AppointmentDocument interface with cancellation and refund fields
    - Add `cancellationRequestedAt`, `previousStatus`, `cancellationApprovedBy`, `cancellationApprovedByRole`, `cancellationApprovedAt`, `cancellationRejectedBy`, `cancellationRejectedByRole`, `cancellationRejectedAt`, `cancellationRejectionReason`, `refundId`, `refundAmount`, `refundedAt`, `bookingRequestId` fields to the interface
    - Add `"cancellation_requested"` to the status union type
    - _Requirements: 2.5, 3.3, 3.4, 5.3_

  - [x] 1.2 Add Firestore composite index to firestore.indexes.json
    - Add composite index on `doctor_slots` collection with fields: `doctorId` (ASC), `isAvailable` (ASC), `isBlocked` (ASC), `startTime` (ASC)
    - _Requirements: 6.1, 6.3_

- [x] 2. Implement cancellation transaction methods
  - [x] 2.1 Implement `requestCancellationWithTransaction` in TransactionService
    - Validate appointment exists and is in a cancellable state (pending or confirmed)
    - Reject if already cancelled, completed, or cancellation_requested
    - Atomically update status to `cancellation_requested`, store reason, timestamp, and previousStatus
    - _Requirements: 2.1, 2.5_

  - [x] 2.2 Write property test for cancellation request transaction integrity
    - **Property 1: Cancellation request transaction preserves data integrity**
    - **Validates: Requirements 2.1, 2.5**

  - [x] 2.3 Implement `approveCancellationWithTransaction` in TransactionService
    - Validate appointment is in `cancellation_requested` state
    - Atomically set status to `cancelled`, release associated slot, record approval metadata
    - Return `paymentId` and `bookingRequestId` for refund processing
    - _Requirements: 3.3, 4.2_

  - [x] 2.4 Write property test for approval transaction atomicity
    - **Property 4: Approval transaction atomically cancels and releases slot**
    - **Validates: Requirements 3.3, 4.2**

  - [x] 2.5 Implement `rejectCancellationWithTransaction` in TransactionService
    - Validate appointment is in `cancellation_requested` state
    - Atomically restore `previousStatus`, record rejection metadata and reason
    - _Requirements: 3.4, 4.3_

  - [x] 2.6 Write property test for rejection transaction state restoration
    - **Property 5: Rejection transaction restores previous appointment state**
    - **Validates: Requirements 3.4, 4.3**

- [x] 3. Update BookingService and add input validation
  - [x] 3.1 Update `cancelBooking` in BookingService to use cancellation request flow
    - Change `cancelBooking` to call `requestCancellationWithTransaction` instead of directly cancelling
    - Add validation to reject empty or whitespace-only cancellation reasons before calling the transaction
    - _Requirements: 2.1, 2.4_

  - [x] 3.2 Write property test for empty/whitespace reason rejection
    - **Property 3: Empty or whitespace-only cancellation reasons are rejected**
    - **Validates: Requirements 2.4**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement refund API endpoint
  - [x] 5.1 Create `/api/payments/cancellation-refund/route.ts` API route
    - Implement token verification (doctor or admin role required)
    - Validate request body contains `appointmentId` and `paymentId`
    - Look up payment document; skip refund if no payment exists
    - Mark refund as `pending`, then process via Razorpay in background using `after()`
    - Use idempotency key `refund-apt-{appointmentId}` for Razorpay request
    - On success: update payment doc with `refundStatus: "processed"`, `refundId`, `refundedAt`; update appointment with refund metadata
    - On failure: update payment doc with `refundStatus: "failed"` and `refundFailureReason`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Write property test for refund with correct payment identifier and amount
    - **Property 7: Refund uses correct payment identifier and full amount**
    - **Validates: Requirements 5.1**

  - [x] 5.3 Write property test for refund API error handling
    - **Property 8: Refund API error results in failed status with reason**
    - **Validates: Requirements 5.2**

  - [x] 5.4 Write property test for successful refund metadata recording
    - **Property 9: Successful refund records all metadata**
    - **Validates: Requirements 5.3**

  - [x] 5.5 Write property test for no-payment cancellation skip
    - **Property 10: No-payment cancellation skips refund without error**
    - **Validates: Requirements 5.5**

- [x] 6. Implement patient appointment detail UI changes
  - [x] 6.1 Apply dark premium header theme to patient appointment detail page
    - Replace `bg-white/50 backdrop-blur-sm` with `bg-[#0f4f4b]`
    - Update border to `border-b border-white/10`
    - Set back-link and title text to white (`text-white`, `text-white/70`)
    - Ensure no flicker during page load with solid background
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 6.2 Add cancellation-requested status badge and disable actions
    - Display orange "Cancellation Requested" badge when status is `cancellation_requested`
    - Disable cancel and reschedule buttons when status is `cancellation_requested`
    - Show cancellation reason and request timestamp in the badge area
    - _Requirements: 2.2, 2.3_

  - [x] 6.3 Write property test for cancellation-requested status disabling patient actions
    - **Property 2: Cancellation-requested status disables patient actions**
    - **Validates: Requirements 2.3**

- [x] 7. Implement doctor cancellation approval UI
  - [x] 7.1 Add cancellation approval/rejection UI to doctor Quick Actions
    - Show cancellation request info card (reason, date) when status is `cancellation_requested`
    - Add "Approve Cancellation" button (green) that calls `approveCancellationWithTransaction` then triggers refund API
    - Add "Reject Cancellation" button (red outline) that opens rejection reason modal
    - Handle loading states and error toasts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Implement admin cancellation management page
  - [x] 8.1 Create admin cancellations list page at `/admin/appointments/cancellations`
    - Fetch appointments with `cancellation_requested` status
    - Display patient name, doctor name, appointment date, cancellation reason, request timestamp
    - Implement approve/reject actions (reuse transaction methods)
    - Trigger refund API on approval
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.2 Add status filter to admin cancellations page
    - Implement filter tabs/buttons for: pending, approved, rejected, all
    - Filter results client-side based on selected status
    - _Requirements: 4.5_

  - [x] 8.3 Write property test for admin cancellation filter correctness
    - **Property 6: Admin cancellation filter returns correct subset**
    - **Validates: Requirements 4.5**

- [x] 9. Wire components together and integration
  - [x] 9.1 Wire doctor approval flow to trigger refund API endpoint
    - After `approveCancellationWithTransaction` succeeds, call `/api/payments/cancellation-refund` with the returned `paymentId`
    - Handle refund API response and show appropriate toast messages
    - Wire admin approval flow to also trigger refund API endpoint
    - _Requirements: 3.3, 4.2, 5.1_

  - [x] 9.2 Add cancellation rejection notification display for patients
    - When appointment status reverts from `cancellation_requested` to previous state, show rejection reason
    - Display `cancellationRejectionReason` in the patient appointment detail page
    - _Requirements: 3.5_

- [x] 10. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The refund API uses `after()` from Next.js for background processing after response
- Firestore transactions ensure atomic state changes and prevent race conditions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "3.1"] },
    { "id": 3, "tasks": ["2.4", "2.6", "3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.5", "6.2"] },
    { "id": 5, "tasks": ["6.3", "7.1", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1", "9.2"] }
  ]
}
```
