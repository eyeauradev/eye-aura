# Requirements Document

## Introduction

This feature adds slot booking validation to the EyeAura appointment system to prevent double-booking. Currently, the patient-facing booking page only checks the doctor's weekly availability schedule (doctorAvailability) but does not filter out existing booking_requests, appointments, or doctor_blocks. This allows two patients to request the same time slot. The solution implements both frontend filtering (hiding unavailable slots) and backend server-side validation (rejecting conflicting bookings) using duration-aware time range overlap detection.

## Glossary

- **Booking_Page**: The patient-facing Next.js page at `/booking` where patients select a doctor, service, time slot, and complete payment
- **Slot_Filter_Service**: A service responsible for computing which time slots are available by cross-referencing booking_requests, appointments, and doctor_blocks against the doctor's weekly schedule
- **Payment_Verification_API**: The Next.js API route at `/api/payments/verify-payment` that verifies Razorpay payment signatures and creates booking_request documents in Firestore
- **Doctor_Panel**: The doctor-facing page at `/doctor/slots` that displays the doctor's schedule and blocked time ranges
- **Booking_Request**: A Firestore document in the `booking_requests` collection representing a patient's paid booking that is pending doctor acceptance
- **Doctor_Block**: A Firestore document in the `doctor_blocks` collection representing a time range during which the doctor is unavailable
- **Appointment**: A Firestore document in the `appointments` collection representing a confirmed appointment after doctor acceptance
- **Time_Range_Overlap**: A conflict detection method where two time ranges [startA, endA) and [startB, endB) overlap if startA < endB AND startB < endA, accounting for service duration
- **Combined_Duration**: The total duration in minutes calculated by summing the durations of all selected services for a booking

## Requirements

### Requirement 1: Frontend Slot Filtering

**User Story:** As a patient, I want to only see time slots that are genuinely available, so that I do not pay for a slot that is already taken.

#### Acceptance Criteria

1. WHEN the Booking_Page loads available time slots for a selected doctor and date, THE Slot_Filter_Service SHALL query all Booking_Request documents with status "pending" or "accepted" for that doctor on that date.
2. WHEN the Booking_Page loads available time slots for a selected doctor and date, THE Slot_Filter_Service SHALL query all Appointment documents with status "confirmed" or "pending" for that doctor on that date.
3. WHEN the Booking_Page loads available time slots for a selected doctor and date, THE Slot_Filter_Service SHALL query all Doctor_Block documents that overlap with that date's time range.
4. WHEN computing available slots, THE Slot_Filter_Service SHALL use Time_Range_Overlap detection to determine conflicts, comparing the candidate slot's full duration range [slotStart, slotStart + Combined_Duration) against each existing booking's time range.
5. WHEN a candidate time slot overlaps with any existing Booking_Request, Appointment, or Doctor_Block, THE Booking_Page SHALL exclude that slot from the list presented to the patient.
6. WHEN a 60-minute service is booked at 10:00 AM, THE Slot_Filter_Service SHALL mark all candidate slots starting between 10:00 AM and 10:59 AM (inclusive) as unavailable if their duration overlaps with the 10:00–11:00 range.

### Requirement 2: Backend Double-Booking Prevention

**User Story:** As a system operator, I want the server to reject booking requests for already-taken time slots, so that no double-booking can occur even if the frontend filter is bypassed.

#### Acceptance Criteria

1. WHEN the Payment_Verification_API receives a verified payment and prepares to create a Booking_Request, THE Payment_Verification_API SHALL check for Time_Range_Overlap conflicts against existing Booking_Request documents (status "pending" or "accepted") for the same doctor.
2. WHEN the Payment_Verification_API receives a verified payment and prepares to create a Booking_Request, THE Payment_Verification_API SHALL check for Time_Range_Overlap conflicts against existing Doctor_Block documents for the same doctor.
3. WHEN the Payment_Verification_API receives a verified payment and prepares to create a Booking_Request, THE Payment_Verification_API SHALL check for Time_Range_Overlap conflicts against existing Appointment documents (status "confirmed" or "pending") for the same doctor.
4. IF a Time_Range_Overlap conflict is detected during booking request creation, THEN THE Payment_Verification_API SHALL reject the booking request and return an error response indicating the slot is no longer available.
5. IF a Time_Range_Overlap conflict is detected after payment verification, THEN THE Payment_Verification_API SHALL mark the payment for refund processing and return a conflict error to the patient.
6. WHEN checking for conflicts, THE Payment_Verification_API SHALL use the Combined_Duration from the selected services to compute the full time range [requestedTime, requestedTime + Combined_Duration) for overlap detection.
7. THE Payment_Verification_API SHALL perform the conflict check and Booking_Request creation within a single Firestore transaction to prevent race conditions between concurrent requests.

### Requirement 3: Doctor Panel Slot Visibility

**User Story:** As a doctor, I want to see all booked and blocked slots on my panel, so that I have an accurate view of my schedule.

#### Acceptance Criteria

1. WHEN the Doctor_Panel loads the schedule for a selected date, THE Doctor_Panel SHALL display all Booking_Request documents with status "pending" as blocked time ranges on the schedule.
2. WHEN the Doctor_Panel loads the schedule for a selected date, THE Doctor_Panel SHALL display all Doctor_Block documents as unavailable time ranges on the schedule.
3. WHEN the Doctor_Panel loads the schedule for a selected date, THE Doctor_Panel SHALL display all Appointment documents with status "confirmed" as booked time ranges on the schedule.
4. WHEN a new Booking_Request is created (after payment verification), THE Doctor_Panel SHALL reflect the newly blocked time range on the next data fetch without requiring a manual page refresh beyond normal data polling or real-time listener updates.

### Requirement 4: Duration-Aware Overlap Detection

**User Story:** As a patient, I want the system to account for service duration when determining slot availability, so that appointments do not partially overlap.

#### Acceptance Criteria

1. THE Slot_Filter_Service SHALL calculate the end time of a booking as requestedTime plus Combined_Duration in minutes.
2. WHEN comparing two time ranges for overlap, THE Slot_Filter_Service SHALL determine a conflict exists if startA is less than endB AND startB is less than endA.
3. WHEN a patient selects multiple services with a Combined_Duration of N minutes, THE Slot_Filter_Service SHALL block all candidate slots whose time range [candidateStart, candidateStart + candidateDuration) overlaps with [bookedStart, bookedStart + N minutes).
4. WHEN the doctor has a booking from 10:00 to 11:00, THE Slot_Filter_Service SHALL mark a 30-minute candidate slot at 10:30 as unavailable because [10:30, 11:00) overlaps with [10:00, 11:00).

### Requirement 5: Booking Status Transition Handling

**User Story:** As a system operator, I want slots to become available again when bookings are cancelled or rejected, so that the schedule accurately reflects real availability.

#### Acceptance Criteria

1. WHEN a Booking_Request status changes to "cancelled" or "rejected", THE Slot_Filter_Service SHALL no longer consider that Booking_Request as occupying a time range during availability computation.
2. WHEN a Booking_Request is accepted and a Doctor_Block is created, THE Slot_Filter_Service SHALL use the Doctor_Block as the authoritative source of unavailability for that time range.
3. IF the Payment_Verification_API detects a conflict and rejects a booking, THEN THE Payment_Verification_API SHALL record the conflict reason in the payment document for audit purposes.
