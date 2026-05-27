# Requirements Document

## Introduction

Revamp the appointment flow in EyeAura to address three areas: (1) fix the visual inconsistency in the patient appointment detail header by applying a dark premium theme using the primary color, (2) implement a cancellation-request workflow requiring doctor/admin approval before refunds are processed via Razorpay, and (3) add the missing Firestore composite index for the `getAvailableSlots()` query to resolve reschedule page errors.

## Glossary

- **System**: The EyeAura Next.js web application
- **Patient_Portal**: The patient-facing section of the application (`/patient/*` routes)
- **Doctor_Portal**: The doctor-facing section of the application (`/doctor/*` routes)
- **Admin_Dashboard**: The admin-facing section of the application (`/admin/*` routes)
- **Appointment_Detail_Header**: The top section of the patient appointment detail page containing navigation and title
- **Cancellation_Request**: A pending cancellation initiated by a patient that requires approval from a doctor or admin before the appointment is fully cancelled and a refund is issued
- **Refund_Service**: The server-side service responsible for issuing refunds through the Razorpay payment gateway
- **Transaction_Service**: The existing Firestore transaction service that handles atomic appointment state changes
- **Slot_Query_Index**: The Firestore composite index required for querying available doctor slots by `doctorId`, `isAvailable`, `isBlocked`, and `startTime`

## Requirements

### Requirement 1: Dark Premium Header Theme

**User Story:** As a patient, I want the appointment detail header to have a visually consistent dark premium appearance, so that the page looks polished and the header contrasts clearly with the content cards below.

#### Acceptance Criteria

1. THE Appointment_Detail_Header SHALL use the primary color (`#0f4f4b`) as a solid background with white text for all header content.
2. THE Appointment_Detail_Header SHALL remove the `bg-white/50 backdrop-blur-sm` styling and replace it with the solid primary color background.
3. THE Appointment_Detail_Header SHALL render the back-link text and the page title in white (`text-white`) to ensure readability against the dark background.
4. THE Appointment_Detail_Header SHALL provide a clear visual transition between the dark header and the light content cards below.
5. WHILE the page is loading, THE System SHALL maintain the dark header background color consistently without flicker or style shift.

### Requirement 2: Patient Cancellation Request Initiation

**User Story:** As a patient, I want to request a cancellation for my upcoming appointment, so that the doctor can review my request before the appointment is fully cancelled and a refund is processed.

#### Acceptance Criteria

1. WHEN a patient submits a cancellation request with a reason, THE Patient_Portal SHALL set the appointment status to `cancellation_requested` instead of `cancelled`.
2. WHEN the appointment status is `cancellation_requested`, THE Patient_Portal SHALL display a "Cancellation Requested" badge with orange styling on the appointment detail page.
3. WHILE the appointment status is `cancellation_requested`, THE Patient_Portal SHALL disable the cancel button and the reschedule button for that appointment.
4. THE Patient_Portal SHALL require the patient to provide a cancellation reason before submitting the request.
5. WHEN a cancellation request is submitted, THE Transaction_Service SHALL atomically update the appointment status to `cancellation_requested` and store the cancellation reason and request timestamp.

### Requirement 3: Doctor Cancellation Approval

**User Story:** As a doctor, I want to review and approve or reject patient cancellation requests, so that I can control whether appointments are cancelled and refunds are issued.

#### Acceptance Criteria

1. WHEN a patient submits a cancellation request, THE Doctor_Portal SHALL display the request in the appointment detail Quick Actions section.
2. WHILE an appointment has status `cancellation_requested`, THE Doctor_Portal SHALL show "Approve Cancellation" and "Reject Cancellation" action buttons.
3. WHEN the doctor approves a cancellation request, THE Transaction_Service SHALL atomically set the appointment status to `cancelled`, release the associated slot, record the approval timestamp, and trigger the refund process.
4. WHEN the doctor rejects a cancellation request, THE Transaction_Service SHALL atomically set the appointment status back to its previous active state (`pending` or `confirmed`) and record the rejection timestamp and reason.
5. WHEN the doctor rejects a cancellation request, THE Patient_Portal SHALL display a notification or status update indicating the request was rejected.

### Requirement 4: Admin Cancellation Fallback

**User Story:** As an admin, I want to approve or reject cancellation requests as a fallback, so that patients are not left waiting indefinitely if the doctor does not respond.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a list of all appointments with status `cancellation_requested`.
2. WHEN an admin approves a cancellation request, THE Transaction_Service SHALL atomically set the appointment status to `cancelled`, release the associated slot, record the admin approval, and trigger the refund process.
3. WHEN an admin rejects a cancellation request, THE Transaction_Service SHALL atomically set the appointment status back to its previous active state and record the admin rejection with a reason.
4. THE Admin_Dashboard SHALL display the patient name, doctor name, appointment date, cancellation reason, and request timestamp for each pending cancellation request.
5. THE Admin_Dashboard SHALL allow filtering cancellation requests by status (pending, approved, rejected).

### Requirement 5: Razorpay Refund Processing

**User Story:** As a system operator, I want refunds to be automatically processed through Razorpay when a cancellation is approved, so that patients receive their money back without manual intervention.

#### Acceptance Criteria

1. WHEN a cancellation is approved by a doctor or admin, THE Refund_Service SHALL initiate a full refund through the Razorpay API using the original payment identifier.
2. IF the Razorpay refund API returns an error, THEN THE Refund_Service SHALL record the failure reason, set the refund status to `failed`, and surface the error in the Admin_Dashboard.
3. WHEN a refund is successfully processed, THE Refund_Service SHALL update the appointment document with the refund identifier, refund amount, and refund timestamp.
4. THE Refund_Service SHALL store refund status as one of: `pending`, `processed`, `failed`.
5. IF no payment record exists for the appointment, THEN THE Refund_Service SHALL skip the refund step and proceed with cancellation only.

### Requirement 6: Firestore Composite Index for Available Slots

**User Story:** As a patient, I want the reschedule page to load available slots without errors, so that I can pick a new time for my appointment.

#### Acceptance Criteria

1. THE System SHALL define a Firestore composite index on the `doctor_slots` collection with fields: `doctorId` (ASC), `isAvailable` (ASC), `isBlocked` (ASC), `startTime` (ASC).
2. WHEN the `getAvailableSlots()` method queries for available slots, THE System SHALL execute the query using the composite index without triggering a missing-index error.
3. THE System SHALL include the new index definition in the `firestore.indexes.json` configuration file for deployment.
