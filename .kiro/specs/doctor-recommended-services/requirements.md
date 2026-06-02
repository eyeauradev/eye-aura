# Requirements Document

## Introduction

The "Doctor Recommended Services" feature enables doctors to recommend clinically relevant services to patients after consultation, creating a guided post-consultation workflow. Patients receive notifications, review recommendations, and either accept (triggering payment and booking) or decline. The system manages a complete lifecycle (PENDING → ACCEPTED/DECLINED/CANCELLED/EXPIRED) with soft slot reservations, 7-day expiration, and full audit capabilities. This integrates with the existing Eye Aura platform's payment (Razorpay), booking request, doctor availability, and notification infrastructure.

## Glossary

- **Recommendation_System**: The Doctor Recommended Services feature as a whole, encompassing all backend services and UI components
- **ServiceRecommendation**: The primary Firestore entity representing a doctor's recommendation of a service to a patient
- **RecommendationsService**: The backend service responsible for CRUD operations and state machine enforcement on the service_recommendations collection
- **SlotReservationService**: The backend service managing soft slot reservations to prevent double-booking
- **NotificationService**: The backend service handling in-app and email notifications for recommendation lifecycle events
- **ExpirationService**: The service responsible for identifying and transitioning expired PENDING recommendations
- **Doctor_Portal**: The Next.js web interface used by doctors to create, edit, and cancel recommendations
- **Patient_Portal**: The Next.js web interface used by patients to view, accept, and decline recommendations
- **Admin_Portal**: The Next.js web interface used by administrators to oversee metrics, manage recommendations, and view audit logs
- **Soft_Reservation**: A temporary slot hold in the slot_reservations collection that prevents double-booking without fully blocking the doctor's availability
- **Hard_Block**: A permanent time block in the doctor_blocks collection created upon acceptance, fully reserving the time slot
- **State_Machine**: The finite state machine governing valid transitions of a ServiceRecommendation's status
- **Audit_Log**: A record of all actions and state transitions on a ServiceRecommendation for traceability

## Requirements

### Requirement 1: ServiceRecommendation Entity and State Machine

**User Story:** As a system developer, I want a well-defined ServiceRecommendation entity with enforced state transitions, so that recommendation lifecycle is consistent and predictable.

#### Acceptance Criteria

1. THE RecommendationsService SHALL store each ServiceRecommendation with the fields: id, patientId, doctorId, serviceId, recommendedSlotStart, recommendedSlotEnd, status, recommendationNote, createdAt, updatedAt, expiresAt, and reservationId
2. WHEN a ServiceRecommendation is created, THE RecommendationsService SHALL set status to PENDING and calculate expiresAt as createdAt plus 7 days
3. WHEN a state transition is attempted, THE State_Machine SHALL only permit transitions from PENDING to ACCEPTED, DECLINED, CANCELLED, or EXPIRED
4. WHEN an invalid state transition is attempted, THE RecommendationsService SHALL reject the operation and return an error indicating the invalid transition
5. WHEN a ServiceRecommendation transitions to ACCEPTED, THE RecommendationsService SHALL record acceptedAt timestamp and bookingId
6. WHEN a ServiceRecommendation transitions to DECLINED, THE RecommendationsService SHALL record declinedAt timestamp and optional declineReason
7. WHEN a ServiceRecommendation transitions to CANCELLED, THE RecommendationsService SHALL record cancelledAt timestamp and cancelledBy actor identifier
8. IF a transition is attempted on a ServiceRecommendation that is not in PENDING status, THEN THE RecommendationsService SHALL reject the transition with an INVALID_STATE_TRANSITION error

### Requirement 2: Doctor Creates Recommendations

**User Story:** As a doctor, I want to recommend clinically relevant services to my patients after consultation, so that patients receive guided post-consultation care.

#### Acceptance Criteria

1. WHEN a doctor submits a recommendation with patientId, serviceId, recommendedSlotStart, recommendedSlotEnd, and recommendationNote, THE RecommendationsService SHALL create a new ServiceRecommendation in PENDING status
2. WHEN creating a recommendation, THE RecommendationsService SHALL validate that the referenced service is active and assigned to the doctor
3. WHEN creating a recommendation, THE RecommendationsService SHALL validate that recommendedSlotStart is in the future
4. WHEN creating a recommendation, THE RecommendationsService SHALL validate that recommendedSlotEnd minus recommendedSlotStart equals the service duration
5. WHEN creating a recommendation, THE SlotReservationService SHALL verify no overlapping active reservation or hard block exists for the doctor at the requested time
6. IF the requested time slot conflicts with an existing reservation or block, THEN THE Recommendation_System SHALL reject creation with a 409 Conflict error
7. WHEN a recommendation is successfully created, THE SlotReservationService SHALL create a Soft_Reservation for the recommended time slot
8. WHEN a recommendation is successfully created, THE Recommendation_System SHALL create an Audit_Log entry recording the creation action, actor, and timestamp

### Requirement 3: Doctor Edits and Cancels Recommendations

**User Story:** As a doctor, I want to edit or cancel my recommendations before the patient accepts, so that I can adjust care plans based on new information.

#### Acceptance Criteria

1. WHILE a ServiceRecommendation is in PENDING status, THE Doctor_Portal SHALL allow the recommending doctor to edit the serviceId, recommendedSlotStart, recommendedSlotEnd, and recommendationNote
2. WHEN a doctor edits the recommended slot, THE SlotReservationService SHALL release the previous Soft_Reservation and create a new one for the updated slot
3. WHEN a doctor edits the recommended slot, THE SlotReservationService SHALL verify no overlapping active reservation or hard block exists for the new time
4. IF the edited slot conflicts with an existing reservation or block, THEN THE Recommendation_System SHALL reject the edit, keeping the original reservation active
5. WHILE a ServiceRecommendation is in PENDING status, THE Doctor_Portal SHALL allow the recommending doctor to cancel the recommendation
6. WHEN a doctor cancels a recommendation, THE RecommendationsService SHALL transition the status to CANCELLED and record cancelledBy as the doctor's identifier
7. WHEN a recommendation is cancelled, THE SlotReservationService SHALL release the associated Soft_Reservation
8. WHEN a recommendation is edited, THE Recommendation_System SHALL create an Audit_Log entry recording the edit action and changed fields
9. WHEN a recommendation is cancelled by a doctor, THE NotificationService SHALL notify the patient of the cancellation

### Requirement 4: Patient Views, Accepts, and Declines Recommendations

**User Story:** As a patient, I want to view my recommendations and choose to accept or decline them, so that I can make informed decisions about my care.

#### Acceptance Criteria

1. WHEN a patient accesses the Patient_Portal dashboard, THE Patient_Portal SHALL display a section showing all PENDING recommendations with service name, doctor name, recommended date/time, and clinical note
2. WHEN a patient navigates to the recommendations page, THE Patient_Portal SHALL display tabs for filtering by status: Pending, Confirmed, Declined, and All
3. WHEN a patient accepts a recommendation, THE Recommendation_System SHALL initiate the Razorpay payment flow with pre-selected service and slot parameters
4. WHEN a patient declines a recommendation, THE Patient_Portal SHALL present an optional text field for providing a decline reason
5. WHEN a patient submits a decline, THE RecommendationsService SHALL transition the status to DECLINED and store the optional decline reason
6. WHEN a patient declines a recommendation, THE SlotReservationService SHALL release the associated Soft_Reservation
7. WHEN a patient declines a recommendation, THE NotificationService SHALL notify the recommending doctor of the decline
8. IF a patient attempts to accept an expired recommendation, THEN THE Recommendation_System SHALL reject the action with a message indicating the recommendation has expired

### Requirement 5: Payment and Booking Flow Integration

**User Story:** As a patient, I want to pay for and book a recommended service in a single flow, so that accepting a recommendation is seamless and convenient.

#### Acceptance Criteria

1. WHEN a patient initiates acceptance, THE Recommendation_System SHALL create a Razorpay order for the service price and present the checkout interface
2. WHEN Razorpay payment is completed, THE Recommendation_System SHALL verify the payment signature server-side before proceeding
3. IF payment verification fails, THEN THE Recommendation_System SHALL keep the recommendation in PENDING status and inform the patient of the failure
4. WHEN payment is verified, THE RecommendationsService SHALL transition the status to ACCEPTED, set acceptedAt, and link the bookingId
5. WHEN payment is verified, THE Recommendation_System SHALL create a booking request with the recommendation's patientId, doctorId, serviceId, requestedTime, and payment details
6. WHEN a recommendation is accepted, THE SlotReservationService SHALL convert the Soft_Reservation to a Hard_Block in the doctor_blocks collection
7. IF payment is cancelled or fails, THEN THE Recommendation_System SHALL retain the Soft_Reservation and keep the recommendation in PENDING status for retry

### Requirement 6: Soft Slot Reservation and Release

**User Story:** As a system operator, I want time slots to be soft-reserved when recommendations are created, so that the same slot is not recommended to multiple patients simultaneously.

#### Acceptance Criteria

1. WHEN a recommendation is created, THE SlotReservationService SHALL create a Soft_Reservation document with doctorId, start, end, recommendationId, and status set to active
2. THE SlotReservationService SHALL prevent creation of overlapping active Soft_Reservations for the same doctor
3. WHEN checking availability, THE SlotReservationService SHALL verify no Hard_Block and no active Soft_Reservation overlaps the requested time range for the doctor
4. WHEN checking availability, THE SlotReservationService SHALL verify the requested time falls within the doctor's defined availability schedule for that day
5. WHEN a recommendation transitions to DECLINED, CANCELLED, or EXPIRED, THE SlotReservationService SHALL set the reservation status to released and record releasedAt
6. WHEN a recommendation transitions to ACCEPTED, THE SlotReservationService SHALL set the reservation status to converted, record convertedAt, and create a corresponding Hard_Block
7. THE SlotReservationService SHALL only permit reservation status transitions from active to released, or from active to converted

### Requirement 7: Expiration System

**User Story:** As a system operator, I want recommendations to automatically expire after 7 days, so that stale recommendations do not indefinitely hold slot reservations.

#### Acceptance Criteria

1. WHEN a ServiceRecommendation is created, THE RecommendationsService SHALL calculate expiresAt as createdAt plus the configured expiration period of 7 days
2. WHEN the ExpirationService runs, THE ExpirationService SHALL query all ServiceRecommendations where status is PENDING and expiresAt is less than the current time
3. WHEN an expired recommendation is identified, THE ExpirationService SHALL transition its status to EXPIRED
4. WHEN a recommendation expires, THE SlotReservationService SHALL release the associated Soft_Reservation
5. WHEN a recommendation expires, THE NotificationService SHALL notify both the patient and the recommending doctor of the expiration
6. WHEN a recommendation expires, THE Recommendation_System SHALL create an Audit_Log entry recording the expiration with actor set to system

### Requirement 8: Notifications

**User Story:** As a user (doctor or patient), I want to receive timely notifications about recommendation status changes, so that I stay informed about care decisions.

#### Acceptance Criteria

1. WHEN a recommendation is created, THE NotificationService SHALL send an in-app notification and queue an email to the patient
2. WHEN a recommendation is accepted, THE NotificationService SHALL send an in-app notification and queue an email to the recommending doctor
3. WHEN a recommendation is declined, THE NotificationService SHALL send an in-app notification and queue an email to the recommending doctor
4. WHEN a recommendation is cancelled, THE NotificationService SHALL send an in-app notification and queue an email to the patient
5. WHEN a recommendation expires, THE NotificationService SHALL send in-app notifications and queue emails to both the patient and the recommending doctor
6. WHEN a recommendation is edited by the doctor, THE NotificationService SHALL send an in-app notification and queue an email to the patient informing them of the changes
7. THE NotificationService SHALL use professional clinical language in all recommendation notification content

### Requirement 9: Admin Oversight

**User Story:** As an administrator, I want to view metrics, manage recommendations, and access audit logs, so that I can monitor and maintain the recommendation system.

#### Acceptance Criteria

1. WHEN an administrator accesses the Admin_Portal recommendations page, THE Admin_Portal SHALL display aggregate metrics: total, pending, accepted, declined, cancelled, expired counts, and conversion rate
2. THE Admin_Portal SHALL calculate conversion rate as accepted divided by the sum of accepted, declined, and expired, expressed as a percentage
3. WHEN an administrator views the recommendations table, THE Admin_Portal SHALL display patient name, doctor name, service name, recommended date, suggested slot, status, and available actions
4. THE Admin_Portal SHALL support filtering the recommendations table by status, doctor, patient, date range, and service
5. WHEN an administrator cancels a recommendation, THE RecommendationsService SHALL transition the status to CANCELLED and record cancelledBy as the admin's identifier
6. WHEN an administrator views a recommendation's audit log, THE Admin_Portal SHALL display all historical actions with actor, timestamp, previous status, and new status
7. THE Admin_Portal SHALL support cursor-based pagination for the recommendations table ordered by creation date descending

### Requirement 10: Access Control and Security

**User Story:** As a system architect, I want strict access control on all recommendation operations, so that users can only perform actions they are authorized for.

#### Acceptance Criteria

1. WHEN any recommendation API endpoint is called, THE Recommendation_System SHALL verify the Firebase ID token and extract the caller's role
2. THE Recommendation_System SHALL permit only users with the doctor role to create, edit, and cancel their own recommendations
3. THE Recommendation_System SHALL permit only the patient referenced in patientId to accept or decline a recommendation
4. THE Recommendation_System SHALL permit users with the admin role to read all recommendations and cancel any recommendation
5. IF an unauthorized user attempts any recommendation action, THEN THE Recommendation_System SHALL reject the request with a 403 Forbidden response
6. THE Recommendation_System SHALL enforce a maximum of 10 pending recommendations per doctor-patient pair to prevent spam
7. THE Recommendation_System SHALL sanitize recommendationNote and declineReason fields to a maximum of 500 characters with no HTML content
8. WHEN a patient accepts a recommendation, THE Recommendation_System SHALL verify the Razorpay payment signature server-side before any state transition

### Requirement 11: Clinical Language and UX

**User Story:** As a patient, I want recommendation communications to use clear, professional clinical language, so that I understand the medical context of what is being recommended.

#### Acceptance Criteria

1. WHEN displaying a recommendation to a patient, THE Patient_Portal SHALL show the doctor's clinical note in a clearly labelled section
2. THE Patient_Portal SHALL display the expiration date prominently on each pending recommendation so patients understand the time constraint
3. WHEN a patient declines a recommendation, THE Patient_Portal SHALL present a confirmation dialog before processing the decline
4. THE Doctor_Portal SHALL provide a structured form for recommendation creation that guides the doctor to include clinically relevant details in the note
5. THE Recommendation_System SHALL use the term "recommended" rather than "prescribed" in all user-facing communications to convey professional guidance without legal obligation
