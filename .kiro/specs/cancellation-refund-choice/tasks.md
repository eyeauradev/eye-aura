# Implementation Plan: Cancellation Refund Choice

## Overview

Decouple the refund decision from the cancellation approval flow. Extend the `AppointmentDocument` with refund decision tracking fields, modify `TransactionService` to accept a refund decision parameter, add a client-side refund eligibility utility, enhance the Refund API with a server-side duplicate guard, and update both Doctor and Admin UIs to present explicit refund choices at approval time and post-approval refund actions.

## Tasks

- [x] 1. Extend data models and types
  - [x] 1.1 Add refund decision types and fields to `types/firestore.ts`
    - Add `RefundDecisionType` type alias (`"refund" | "no_refund"`)
    - Add `RefundAuditEntry` interface with fields: `action`, `decision`, `actorId`, `actorRole`, `timestamp`
    - Add `RefundStatus` type if not already present (`"none" | "pending" | "processed" | "failed"`)
    - Extend `AppointmentDocument` interface with: `refundDecision`, `refundDecisionBy`, `refundDecisionByRole`, `refundDecisionAt`, `refundAuditTrail`, `refundStatus`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Implement refund eligibility utility
  - [x] 2.1 Create `lib/refund-eligibility.ts` with `isRefundEligible` function
    - Implement eligibility logic: check refundId/refundStatus for duplicates, verify cancelled status, verify paymentId exists, apply 7-day window for doctors, bypass window for admins
    - Return `{ eligible: boolean; reason?: string }` shape
    - _Requirements: 2.1, 2.3, 2.4, 3.2, 3.3, 6.1, 6.2_

  - [ ]* 2.2 Write property test: Doctor refund window boundary
    - **Property 1: Doctor refund window boundary**
    - Generate random `cancellationApprovedAt` timestamps and current times; verify doctor eligibility matches the 7-day window rule
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [ ]* 2.3 Write property test: Admin bypasses time constraint
    - **Property 2: Admin bypasses time constraint**
    - Generate random old timestamps; verify admin is always eligible when appointment is cancelled with paymentId and no completed refund
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 2.4 Write property test: Duplicate refund prevention (eligibility)
    - **Property 3: Duplicate refund prevention (eligibility)**
    - Generate appointments with `refundId` set or `refundStatus: "processed"`; verify `isRefundEligible` returns `eligible: false` for both roles
    - **Validates: Requirements 6.1, 6.2**

- [x] 3. Modify TransactionService for refund decision
  - [x] 3.1 Update `approveCancellationWithTransaction` in `services/booking/transaction.service.ts`
    - Add `refundDecision: RefundDecision` parameter to the method signature
    - Within the transaction, write `refundDecision`, `refundDecisionBy`, `refundDecisionByRole`, `refundDecisionAt` fields to the appointment document
    - Append a `RefundAuditEntry` with `action: "decision_at_approval"` to the `refundAuditTrail` array
    - Continue returning `{ paymentId, bookingRequestId }` as before
    - _Requirements: 1.1, 1.3, 1.4, 4.1_

  - [ ]* 3.2 Write property test: Approval with "no_refund" records correct audit entry
    - **Property 7: Approval with "no_refund" records correct audit entry**
    - Generate random approvers and verify the first `refundAuditTrail` entry has correct `action`, `decision`, `actorId`, `actorRole`
    - **Validates: Requirements 1.4**

  - [ ]* 3.3 Write property test: Audit trail entry completeness
    - **Property 5: Audit trail entry completeness**
    - Generate random actors and decisions; verify all `RefundAuditEntry` fields are present and non-null
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 3.4 Write property test: Audit trail is append-only
    - **Property 6: Audit trail is append-only**
    - Generate sequences of refund actions; verify `refundAuditTrail` array length is monotonically increasing
    - **Validates: Requirements 4.3**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add server-side duplicate guard to Refund API
  - [x] 5.1 Enhance `/api/payments/cancellation-refund/route.ts` with appointment-level duplicate check
    - After loading the payment document, also load the appointment document
    - If `appointment.refundId` is already set, return 409 with error message "Refund already processed for this appointment"
    - Preserve all existing refund processing logic unchanged
    - _Requirements: 6.3, 5.1, 5.2, 5.3_

  - [x] 5.2 Add audit trail append on successful refund initiation
    - When refund is initiated post-approval, append a `RefundAuditEntry` with `action: "post_approval_refund"` to the appointment's `refundAuditTrail`
    - Update `refundStatus` on the appointment document to "pending"
    - _Requirements: 4.2, 4.3_

  - [ ]* 5.3 Write property test: Server-side duplicate guard
    - **Property 4: Server-side duplicate guard**
    - Generate refund requests for appointments with existing `refundId`; verify 409 response and no Razorpay call
    - **Validates: Requirements 6.3**

- [x] 6. Update Doctor UI with refund choice
  - [x] 6.1 Add approval modal with refund choice to `app/doctor/appointments/[id]/page.tsx`
    - When doctor clicks "Approve Cancellation" and appointment has a `paymentId`, show a modal/dialog with "Approve with Refund" and "Approve without Refund" buttons
    - When no `paymentId` exists, approve directly without showing refund options
    - Pass the selected `RefundDecision` to `approveCancellationWithTransaction`
    - If "Approve with Refund" is selected, call the Refund API after successful approval
    - _Requirements: 1.2, 1.3, 1.4, 5.1_

  - [x] 6.2 Add post-approval "Issue Refund" button to doctor appointment detail
    - On cancelled appointments, check `isRefundEligible(appointment, "doctor")`
    - If eligible, show "Issue Refund" button with remaining days countdown
    - On click, call the Refund API and handle success/error states
    - Hide button when window expires or refund is already processed
    - _Requirements: 2.1, 2.2, 2.3, 5.4_

- [x] 7. Update Admin UI with refund choice
  - [x] 7.1 Add approval modal with refund choice to `app/admin/appointments/cancellations/page.tsx`
    - Same dual-choice modal as doctor UI when approving cancellations with payments
    - Pass `RefundDecision` with `decidedByRole: "admin"` to `approveCancellationWithTransaction`
    - If "Approve with Refund" is selected, call the Refund API after successful approval
    - _Requirements: 3.1, 1.3, 1.4_

  - [x] 7.2 Add post-approval "Issue Refund" button to admin cancellations page
    - On cancelled appointments without completed refund, show "Issue Refund" button (no time limit)
    - Check `isRefundEligible(appointment, "admin")` for duplicate prevention
    - On click, call the Refund API and handle success/error states
    - _Requirements: 3.2, 3.3, 6.2_

  - [x] 7.3 Add refund audit trail display to admin appointment detail
    - Render the `refundAuditTrail` array as a timeline/list showing each entry's action, decision, actor, and timestamp
    - _Requirements: 4.4_

- [x] 8. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integration wiring and final validation
  - [x] 9.1 Wire doctor approval flow end-to-end
    - Ensure approval modal → TransactionService → (optional) Refund API flow works correctly
    - Verify UI updates after approval (status badge, refund button visibility)
    - _Requirements: 1.2, 1.3, 2.1, 5.1_

  - [x] 9.2 Wire admin approval flow end-to-end
    - Ensure admin approval modal → TransactionService → (optional) Refund API flow works correctly
    - Verify admin UI updates after approval (status, refund button, audit trail)
    - _Requirements: 3.1, 3.2, 4.4, 5.1_

  - [ ]* 9.3 Write integration tests for approval and refund flows
    - Test end-to-end approval with refund choice
    - Test post-approval refund within window
    - Test duplicate refund prevention across UI and API layers
    - _Requirements: 1.2, 1.3, 2.2, 3.2, 6.1, 6.2, 6.3_

- [x] 10. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing Refund API (`/api/payments/cancellation-refund`) request/response format remains unchanged — only a duplicate guard is added
- `isRefundEligible` is a pure function suitable for property-based testing with `fast-check`
- The `refundAuditTrail` is append-only by design; each action adds an entry without modifying previous ones

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "6.1", "7.1"] },
    { "id": 5, "tasks": ["6.2", "7.2", "7.3"] },
    { "id": 6, "tasks": ["9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3"] }
  ]
}
```
