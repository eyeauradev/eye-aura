# Requirements Document

## Introduction

This feature changes the cancellation approval flow so that refunds are no longer triggered automatically when a doctor approves a cancellation request. Instead, the doctor is presented with an explicit choice to refund or not refund the patient. The doctor has a 7-day window after approval to issue the refund, while admins can issue refunds at any time. All refund decisions are tracked for audit purposes.

## Glossary

- **Cancellation_Approval_System**: The system responsible for processing cancellation approvals and managing refund decisions for appointments
- **Doctor_UI**: The doctor-facing appointment detail page at `app/doctor/appointments/[id]/page.tsx`
- **Admin_UI**: The admin-facing cancellation management page at `app/admin/appointments/cancellations/page.tsx`
- **Refund_API**: The existing API endpoint at `/api/payments/cancellation-refund` that processes refunds via Razorpay
- **Refund_Window**: The 7-day period after cancellation approval during which a doctor can issue a refund
- **Appointment_Document**: The Firestore document representing an appointment, including cancellation and refund metadata

## Requirements

### Requirement 1: Decouple Refund from Cancellation Approval

**User Story:** As a doctor, I want cancellation approval to be separate from the refund decision, so that I can approve a cancellation without automatically refunding the patient.

#### Acceptance Criteria

1. WHEN a doctor approves a cancellation request, THE Cancellation_Approval_System SHALL approve the cancellation without triggering a refund
2. WHEN a doctor approves a cancellation request for an appointment with a payment, THE Doctor_UI SHALL present two options: "Approve with Refund" and "Approve without Refund"
3. WHEN the doctor selects "Approve with Refund", THE Cancellation_Approval_System SHALL approve the cancellation and immediately issue a refund via the Refund_API
4. WHEN the doctor selects "Approve without Refund", THE Cancellation_Approval_System SHALL approve the cancellation and record that the refund was declined at approval time

### Requirement 2: Doctor Refund Window

**User Story:** As a doctor, I want to be able to issue a refund within 7 days after approving a cancellation, so that I can reconsider my refund decision if needed.

#### Acceptance Criteria

1. WHILE the Refund_Window has not expired, THE Doctor_UI SHALL display a "Issue Refund" action on the cancelled appointment
2. WHEN the doctor triggers "Issue Refund" within the Refund_Window, THE Cancellation_Approval_System SHALL process the refund via the Refund_API
3. WHEN the Refund_Window has expired, THE Doctor_UI SHALL hide the "Issue Refund" action from the doctor
4. THE Cancellation_Approval_System SHALL calculate the Refund_Window as 7 calendar days from the `cancellationApprovedAt` timestamp on the Appointment_Document

### Requirement 3: Admin Refund Without Time Limit

**User Story:** As an admin, I want to issue a refund for any cancelled appointment at any time, so that I can handle escalations and edge cases without time constraints.

#### Acceptance Criteria

1. WHEN an admin approves a cancellation request, THE Admin_UI SHALL present the same "Approve with Refund" and "Approve without Refund" options as the Doctor_UI
2. WHILE an appointment is in cancelled status and has not been refunded, THE Admin_UI SHALL display an "Issue Refund" action regardless of elapsed time
3. WHEN an admin triggers "Issue Refund", THE Cancellation_Approval_System SHALL process the refund via the Refund_API without checking the Refund_Window

### Requirement 4: Refund Audit Trail

**User Story:** As an admin, I want to see a complete history of refund decisions for each appointment, so that I can audit who made refund decisions and when.

#### Acceptance Criteria

1. WHEN a refund decision is made at approval time, THE Cancellation_Approval_System SHALL record the decision type, the actor identifier, the actor role, and the timestamp on the Appointment_Document
2. WHEN a refund is issued after approval, THE Cancellation_Approval_System SHALL record the refund actor identifier, the actor role, and the timestamp on the Appointment_Document
3. THE Cancellation_Approval_System SHALL preserve all previous refund decision records when new refund actions occur
4. WHEN viewing a cancelled appointment, THE Admin_UI SHALL display the refund audit history including all recorded decisions and actions

### Requirement 5: Existing Refund API Compatibility

**User Story:** As a developer, I want the refund processing to continue using the existing Refund_API endpoint, so that Razorpay integration and background processing remain unchanged.

#### Acceptance Criteria

1. THE Cancellation_Approval_System SHALL use the existing `/api/payments/cancellation-refund` endpoint for all refund processing
2. THE Refund_API SHALL continue to accept the same request format with `appointmentId` and `paymentId` fields
3. THE Refund_API SHALL continue to process refunds in the background using the `after()` pattern
4. IF the Refund_API returns a non-success response, THEN THE Cancellation_Approval_System SHALL display an error message to the user and retain the ability to retry

### Requirement 6: Prevent Duplicate Refunds

**User Story:** As a system operator, I want to prevent duplicate refunds from being issued for the same appointment, so that patients are not refunded more than once.

#### Acceptance Criteria

1. WHILE a refund has already been processed for an appointment, THE Doctor_UI SHALL hide the "Issue Refund" action
2. WHILE a refund has already been processed for an appointment, THE Admin_UI SHALL hide the "Issue Refund" action
3. IF a refund request is submitted for an appointment that already has a completed refund, THEN THE Cancellation_Approval_System SHALL reject the request and return an error indicating a refund already exists
