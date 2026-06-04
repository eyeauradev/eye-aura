# Requirements Document

## Introduction

This feature redesigns the booking wizard to support multi-service selection in a single booking. Currently, a patient selects one service and proceeds through a 5-step wizard (Service → Doctor → Time → Notes → Request). The new design allows patients to select multiple compatible services, filters doctors to those who provide all selected services, combines payment into a single order, and replaces auto-advance behavior with explicit "Continue" buttons for better control.

## Glossary

- **Booking_Wizard**: The 5-step patient-facing wizard for creating appointment requests (Service → Doctor → Time → Notes → Request)
- **Service**: A consultation type offered by the clinic (e.g., visual acuity assessment, video consultation) with a price, duration, and list of providing doctors
- **Service_Selector**: The Step 1 UI component displaying service cards in a grid with multi-select capability
- **Compatible_Service**: A service that shares at least one common doctor with all currently selected services
- **Doctor_Filter**: The logic that computes the intersection of doctorIds across all selected services to determine which doctors can perform the entire combination
- **Summary_Bar**: A UI element in Step 1 showing the count of selected services and their total price
- **Continue_Button**: An explicit navigation button replacing auto-advance behavior in Steps 1 and 2
- **Combined_Payment**: A single Razorpay payment order whose amount equals the sum of all selected service prices
- **Combined_Duration**: The total appointment duration calculated as the sum of durations of all selected services

## Requirements

### Requirement 1: Multi-Service Selection in Step 1

**User Story:** As a patient, I want to select multiple services in a single booking, so that I can combine related consultations into one appointment without booking separately.

#### Acceptance Criteria

1. WHEN the patient is on Step 1, THE Service_Selector SHALL display all active services as selectable cards with a checkbox/selected state indicator
2. WHEN the patient selects a service, THE Service_Selector SHALL toggle the service's selected state without advancing to the next step
3. WHEN one or more services are selected, THE Service_Selector SHALL disable all services that are not Compatible_Services by greying them out visually
4. WHEN all services are deselected, THE Service_Selector SHALL re-enable all services
5. WHEN one or more services are selected, THE Summary_Bar SHALL display the count of selected services and the total combined price in the format "N services selected · Total: ₹X"
6. WHEN one or more services are selected, THE Continue_Button SHALL become enabled and visible for the patient to proceed to Step 2
7. IF no services are selected, THEN THE Continue_Button SHALL remain disabled

### Requirement 2: Service Compatibility Logic

**User Story:** As a patient, I want to see only combinable services highlighted, so that I don't accidentally select services that cannot be performed by a single doctor.

#### Acceptance Criteria

1. THE Service_Selector SHALL determine compatibility by checking whether a service shares at least one common doctor with every currently selected service (intersection of doctorIds is non-empty)
2. WHEN a service is disabled due to incompatibility, THE Service_Selector SHALL display the card in a greyed-out state with a visual indicator explaining the reason (tooltip or inline note stating no common doctor is available)
3. WHEN the patient deselects a service, THE Service_Selector SHALL recompute compatibility based on the remaining selected services
4. IF only one service is selected, THEN THE Service_Selector SHALL disable only those services that share zero doctors with the selected service

### Requirement 3: Doctor Filtering by Selected Services

**User Story:** As a patient, I want Step 2 to only show doctors who can perform all my selected services, so that I can be confident my chosen doctor handles the entire appointment.

#### Acceptance Criteria

1. WHEN the patient proceeds to Step 2, THE Doctor_Filter SHALL compute the intersection of doctorIds across all selected services
2. THE Booking_Wizard SHALL display only doctors whose ID appears in the computed intersection
3. IF the intersection is empty (no single doctor provides all selected services), THEN THE Booking_Wizard SHALL display an informational message and allow the patient to go back to Step 1 to adjust their selection

### Requirement 4: Step 2 Doctor Selection Without Auto-Advance

**User Story:** As a patient, I want to review doctor details and additional services before moving forward, so that I have full control over my booking choices.

#### Acceptance Criteria

1. WHEN the patient selects a doctor in Step 2, THE Booking_Wizard SHALL highlight the selected doctor card without advancing to Step 3
2. WHEN a doctor is selected, THE Booking_Wizard SHALL display an "Also available from this doctor" section showing other services offered by the selected doctor that are not already selected
3. WHEN the patient clicks an "Add" button on an additional service, THE Booking_Wizard SHALL add that service to the selected services list and update the total price and duration
4. WHEN one or more services are selected and a doctor is selected, THE Continue_Button SHALL become enabled for the patient to proceed to Step 3

### Requirement 5: Combined Payment

**User Story:** As a patient, I want to pay a single combined amount for all selected services, so that I complete one transaction instead of multiple separate payments.

#### Acceptance Criteria

1. THE Combined_Payment SHALL calculate the total amount as the sum of prices of all selected services (primary selection from Step 1 plus any additions from Step 2)
2. WHEN the patient confirms the booking, THE Booking_Wizard SHALL create a single Razorpay order with the combined total amount
3. WHEN payment is verified, THE Booking_Wizard SHALL create a single booking request referencing all selected service IDs
4. THE Combined_Payment SHALL use the currency from the first selected service for the entire order

### Requirement 6: Data Model Support for Multiple Services

**User Story:** As a system administrator, I want the data model to store multiple service references per booking, so that downstream processes (appointments, prescriptions, refunds) correctly reflect multi-service bookings.

#### Acceptance Criteria

1. THE BookingRequestDocument SHALL store an array of service IDs in a `serviceIds` field to reference all selected services
2. THE BookingRequestDocument SHALL store the combined payment amount in the `paymentAmount` field as the sum of all selected service prices
3. THE AppointmentDocument SHALL store an array of service IDs in a `serviceIds` field when created from a multi-service booking request
4. THE AppointmentDocument SHALL calculate the scheduled appointment duration as the Combined_Duration of all referenced services
5. THE BookingState SHALL track an array of selected services instead of a single service reference

### Requirement 7: Backward Compatibility

**User Story:** As a patient, I want single-service bookings to continue working as before, so that existing behavior is preserved for simple consultations.

#### Acceptance Criteria

1. WHEN the patient selects only one service, THE Booking_Wizard SHALL proceed through the full wizard flow identically to the current behavior (except for the explicit Continue button)
2. THE BookingRequestDocument SHALL maintain the existing `serviceId` field populated with the first service ID for backward compatibility with existing queries and views
3. IF a BookingRequestDocument has no `serviceIds` array, THEN THE Booking_Wizard SHALL treat the single `serviceId` field as the sole service

### Requirement 8: UX Indicators and Navigation Controls

**User Story:** As a patient, I want clear visual feedback about my selections and explicit control over navigation, so that I feel confident in my booking choices at every step.

#### Acceptance Criteria

1. THE Service_Selector SHALL display a checkmark indicator in the top-right corner of each selected service card
2. THE Booking_Wizard SHALL display a Continue_Button at the bottom of Step 1 and Step 2 as the only mechanism to advance
3. WHEN a disabled service card is hovered or tapped, THE Service_Selector SHALL display an explanation such as "No common doctor available for this combination"
4. THE Summary_Bar SHALL update in real-time as services are selected or deselected
5. WHEN the patient navigates back from Step 2 to Step 1, THE Booking_Wizard SHALL preserve the previously selected services
