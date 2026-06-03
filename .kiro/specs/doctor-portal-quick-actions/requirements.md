# Requirements Document

## Introduction

The "Doctor Portal Quick Actions" feature enhances the doctor portal by expanding the appointment details screen with new quick actions (Recommend Service, Assign Assessment), redesigning the Recent Patients dashboard section into actionable workspace cards, adding a Patient Summary Card to the appointment details view, and establishing shared reusable dialog components for service recommendations and assessment assignments. The feature prioritizes reducing navigation by enabling doctors to complete patient-related actions directly from their current context. All recommendation and assessment flows are powered by single shared components used across Appointment Details, Patient Profile, and Recent Patients surfaces.

## Glossary

- **Doctor_Portal**: The doctor-facing section of the EyeAura application (`/doctor/*` routes)
- **Appointment_Details_Screen**: The page displaying a specific appointment's information including status, patient, and available actions
- **Quick_Actions_Section**: The action card area within the Appointment Details screen where doctors trigger workflows (currently contains "Create Prescription")
- **RecommendServiceDialog**: The single shared modal component for creating service recommendations, usable from any entry point
- **AssignAssessmentDialog**: The single shared modal component for assigning assessments to patients, usable from any entry point
- **Recent_Patients_Section**: The dashboard section displaying cards for recently-seen patients
- **Recent_Patient_Card**: An individual card within the Recent Patients section displaying patient summary and quick actions
- **Patient_Summary_Card**: A compact patient information panel embedded within the Appointment Details screen
- **Assessment_Type**: A category of clinical assessment (Distance Visual Acuity, Near Vision, Color Vision, Contrast Sensitivity, or Custom)
- **Notification_System**: The backend service responsible for sending in-app notifications to users
- **Audit_Service**: The backend service responsible for logging all doctor and patient actions with metadata

## Requirements

### Requirement 1: Appointment Details Quick Action Cards

**User Story:** As a doctor, I want "Recommend Service" and "Assign Assessment" quick actions available on the appointment details screen alongside the existing "Create Prescription" action, so that I can initiate clinical workflows directly from the appointment context.

#### Acceptance Criteria

1. THE Quick_Actions_Section SHALL display "Recommend Service" and "Assign Assessment" action cards alongside the existing "Create Prescription" card
2. THE Quick_Actions_Section SHALL render all action cards with identical sizing, spacing, hover states, and visual design as the existing "Create Prescription" card
3. WHILE the appointment status is "cancelled", "no-show", or "completed" (with no active follow-up window), THE Quick_Actions_Section SHALL disable the "Recommend Service" and "Assign Assessment" cards by rendering them with reduced opacity and preventing click interaction
4. THE Quick_Actions_Section SHALL render action cards in a responsive layout: horizontal row on viewports 1024px and above, 2-column grid on viewports between 768px and 1023px, and single-column vertical stack on viewports below 768px
5. WHEN a doctor clicks "Recommend Service", THE Doctor_Portal SHALL open the RecommendServiceDialog pre-populated with the current appointment's patientId, doctorId, and appointmentId
6. WHEN a doctor clicks "Assign Assessment", THE Doctor_Portal SHALL open the AssignAssessmentDialog pre-populated with the current appointment's patientId, doctorId, and appointmentId
7. IF the RecommendServiceDialog or AssignAssessmentDialog fails to open after a doctor clicks a quick action card, THEN THE Doctor_Portal SHALL display an error message indicating the action could not be initiated and retain the appointment details screen state

### Requirement 2: Recommend Service Dialog

**User Story:** As a doctor, I want to recommend a service to a patient with scheduling options, so that the patient receives a guided recommendation tied to either the current appointment schedule or a new time.

#### Acceptance Criteria

1. WHEN the RecommendServiceDialog opens from an appointment context, THE RecommendServiceDialog SHALL auto-populate the Patient field with the current appointment patient, the Doctor field with the logged-in doctor, and the Appointment field with the current appointment identifier
2. THE RecommendServiceDialog SHALL display a required Service selection field listing only active services assigned to the logged-in doctor, a required Suggested Date field, a required Suggested Time field, and a Clinical Recommendation Note text field limited to 500 characters
3. THE RecommendServiceDialog SHALL display a "Use appointment schedule" checkbox that is checked by default
4. WHILE the "Use appointment schedule" checkbox is checked, THE RecommendServiceDialog SHALL set Suggested Date and Suggested Time to the current appointment date and time and disable manual date/time editing
5. WHEN a doctor unchecks the "Use appointment schedule" checkbox, THE RecommendServiceDialog SHALL enable a Date Picker allowing selection of today or future dates and a Time Slot Picker displaying only slots within the doctor's defined availability that have no existing active reservation or hard block
6. WHEN a doctor submits the recommendation form with all required fields valid, THE RecommendServiceDialog SHALL create a service recommendation, display a success confirmation message, and close the dialog
7. IF a required field is empty when the doctor clicks "Send Recommendation", THEN THE RecommendServiceDialog SHALL display an inline validation error message directly below each empty required field without closing the dialog
8. WHEN a doctor clicks "Cancel", THE RecommendServiceDialog SHALL close without creating a recommendation and discard any entered data
9. IF the selected Suggested Date is in the past, THEN THE RecommendServiceDialog SHALL display a validation error on the Suggested Date field indicating the date must be today or later and prevent form submission
10. WHEN the RecommendServiceDialog opens without an appointment context, THE RecommendServiceDialog SHALL require the doctor to manually select a patient from a search field, auto-populate the Doctor field with the logged-in doctor, and leave the "Use appointment schedule" checkbox unchecked and disabled

### Requirement 3: Assign Assessment Dialog

**User Story:** As a doctor, I want to assign a clinical assessment to a patient with flexible timing, so that the patient can complete the assessment either immediately or at a scheduled time.

#### Acceptance Criteria

1. WHEN the AssignAssessmentDialog opens, THE AssignAssessmentDialog SHALL display an Assessment Type selector with options: Distance Visual Acuity, Near Vision, Color Vision, Contrast Sensitivity, and Custom Future Assessments
2. THE AssignAssessmentDialog SHALL display Assignment Timing options: "Assign Now" (default selected) and "Schedule Later"
3. WHEN a doctor selects "Schedule Later", THE AssignAssessmentDialog SHALL display Date Picker and Time Picker fields for scheduling
4. THE AssignAssessmentDialog SHALL display an optional Instructions text field for doctor-provided guidance, with a maximum length of 500 characters
5. WHEN a doctor submits the assessment form with an Assessment Type selected and valid timing, THE AssignAssessmentDialog SHALL create the assessment assignment and close the dialog
6. IF no Assessment Type is selected when the doctor clicks "Assign Assessment", THEN THE AssignAssessmentDialog SHALL display a validation error indicating Assessment Type is required
7. WHEN a doctor clicks "Cancel", THE AssignAssessmentDialog SHALL close without creating an assignment and discard any entered data
8. IF a doctor submits the form with "Schedule Later" selected and the scheduled date is in the past, THEN THE AssignAssessmentDialog SHALL display a validation error indicating the scheduled date must be a future date and SHALL NOT create the assignment
9. WHEN the AssignAssessmentDialog opens from an appointment context, THE AssignAssessmentDialog SHALL auto-populate the patient and appointment fields from the current context
10. IF a doctor submits the form with "Schedule Later" selected and either the Date Picker or Time Picker field is empty, THEN THE AssignAssessmentDialog SHALL display a validation error indicating both scheduled date and time are required
11. IF assessment assignment creation fails due to a server or network error, THEN THE AssignAssessmentDialog SHALL remain open, preserve all entered data, and display an error message indicating the assignment could not be created

### Requirement 4: Post-Assessment-Assignment Effects

**User Story:** As a patient, I want to be notified when my doctor assigns an assessment, so that I know what clinical steps to take next.

#### Acceptance Criteria

1. WHEN an assessment is assigned, THE Notification_System SHALL send an in-app notification to the patient within 30 seconds, indicating the assessment type, assigned timing, and the assigning doctor's name
2. WHEN an assessment is assigned, THE Doctor_Portal SHALL display the assigned assessment under the doctor's assigned assessments list with the assessment type, patient name, assigned timing, and a status of "Pending"
3. WHEN an assessment is assigned, THE Audit_Service SHALL create an audit log entry recording the doctor, patient, assessment type, timing, and timestamp
4. WHEN an assessment is assigned with "Assign Now" timing, THE Doctor_Portal SHALL make the assessment visible in the patient portal's assessments section with a status of "Ready" without requiring the patient to refresh the page
5. WHEN an assessment is assigned with "Schedule Later" timing, THE Doctor_Portal SHALL make the assessment visible in the patient portal's assessments section with a status of "Scheduled" at the beginning of the scheduled date (00:00 in the patient's local timezone)
6. IF the Notification_System fails to deliver the in-app notification for an assigned assessment, THEN THE Notification_System SHALL retry delivery up to 3 times and log the failure in the Audit_Service
7. WHILE an assessment is assigned with "Schedule Later" timing and the scheduled date has not yet arrived, THE Doctor_Portal SHALL not display the assessment in the patient portal's active assessments list

### Requirement 5: Recent Patients Section Redesign

**User Story:** As a doctor, I want my Recent Patients dashboard cards to be larger and more informative, so that I can see patient context and take actions directly without opening each patient's profile.

#### Acceptance Criteria

1. THE Recent_Patients_Section SHALL display a maximum of 5 patient cards, each with a minimum height of 180px and minimum width of 320px on desktop viewports (1024px and above)
2. EACH Recent_Patient_Card SHALL display: Patient Name (maximum 60 characters, truncated with ellipsis if exceeded), Age, Gender, Last Appointment date, Last Assessment Date, Upcoming Appointment (if one exists), and a Patient Status Badge showing one of the following statuses: active, completed, or pending
3. IF a Recent_Patient_Card has no Last Assessment Date or no Upcoming Appointment, THEN THE Recent_Patient_Card SHALL display a placeholder dash character for the missing field
4. EACH Recent_Patient_Card SHALL display quick action buttons: View Profile, Prescription, Recommend Service, and Assign Assessment
5. EACH Recent_Patient_Card SHALL display an optional secondary action: Book Follow-up
6. THE Recent_Patients_Section SHALL render cards in a horizontal grid layout with a maximum of 3 columns and visible action buttons on viewports of 1024px and above
7. THE Recent_Patients_Section SHALL stack card content and actions vertically in a single-column layout on viewports below 1024px without horizontal scrolling
8. WHEN a doctor clicks "Recommend Service" on a Recent_Patient_Card, THE Doctor_Portal SHALL open the RecommendServiceDialog pre-populated with the patientId and doctorId from that card, with the appointmentId parameter omitted
9. WHEN a doctor clicks "Assign Assessment" on a Recent_Patient_Card, THE Doctor_Portal SHALL open the AssignAssessmentDialog pre-populated with the patientId and doctorId from that card, with the appointmentId parameter omitted

### Requirement 6: Patient Summary Card in Appointment Details

**User Story:** As a doctor, I want to see a patient summary directly within the appointment details, so that I have immediate access to patient context and can navigate to the full profile without leaving the appointment workflow.

#### Acceptance Criteria

1. THE Appointment_Details_Screen SHALL display a Patient Summary Card containing: Profile Photo (or avatar placeholder), Patient Name, Age, Gender, Phone number, Email address, and a "View Full Profile" button
2. WHEN a doctor clicks "View Full Profile", THE Doctor_Portal SHALL navigate to the patient's full profile page
3. THE Patient_Summary_Card SHALL be positioned within the Appointment Details layout above the fold on desktop viewports so that the complete card is visible without scrolling
4. THE Patient_Summary_Card SHALL render responsively: full width on mobile viewports, and as a sidebar or inline panel on desktop viewports, where either layout is acceptable provided all fields remain visible without truncation
5. IF patient phone or email is not available, THEN THE Patient_Summary_Card SHALL display a placeholder dash character ("—") for the missing field while displaying all other available fields normally
6. IF patient data fails to load, THEN THE Patient_Summary_Card SHALL display an error indication with a retry option, and SHALL NOT block the remaining Appointment Details content from rendering
7. IF patient age or gender is not available, THEN THE Patient_Summary_Card SHALL omit the unavailable field label and value from the card layout without leaving a visible empty gap

### Requirement 7: Shared Recommendation Component Reusability

**User Story:** As a developer, I want a single RecommendServiceDialog component used across all entry points, so that recommendation logic is not duplicated and behavior is consistent everywhere.

#### Acceptance Criteria

1. THE RecommendServiceDialog SHALL be a single reusable component invocable from Appointment Details, Patient Profile, and Recent Patient Cards
2. THE RecommendServiceDialog SHALL require patientId and doctorId as mandatory input parameters, and accept appointmentId as an optional input parameter
3. WHEN the RecommendServiceDialog opens with an appointmentId provided, THE RecommendServiceDialog SHALL auto-populate the Patient field, Doctor field, and Appointment field from the appointment context, and enable the "Use appointment schedule" checkbox checked by default
4. WHEN the RecommendServiceDialog opens without an appointmentId (from Patient Profile or Recent Patient Card), THE RecommendServiceDialog SHALL auto-populate the Patient field from the provided patientId, leave the Appointment field empty, and disable the "Use appointment schedule" checkbox
5. IF the RecommendServiceDialog is invoked without a patientId or without a doctorId, THEN THE RecommendServiceDialog SHALL not open and SHALL log an error indicating the missing required parameter
6. THE RecommendServiceDialog SHALL use identical validation rules (required Service, required Suggested Date, required Suggested Time, date not in the past), identical submission logic, and identical visual design regardless of the entry point

### Requirement 8: Shared Assessment Component Reusability

**User Story:** As a developer, I want a single AssignAssessmentDialog component used across all entry points, so that assessment assignment logic is consistent and maintainable.

#### Acceptance Criteria

1. THE AssignAssessmentDialog SHALL be a single reusable component invocable from Appointment Details, Patient Profile, and Recent Patient Cards
2. THE AssignAssessmentDialog SHALL accept context parameters (patientId, doctorId, appointmentId) as inputs, where patientId and doctorId are required and appointmentId is optional
3. WHEN the AssignAssessmentDialog opens with all three context parameters provided (from Appointment Details), THE AssignAssessmentDialog SHALL auto-populate the patient field, doctor field, and appointment field from the provided context
4. WHEN the AssignAssessmentDialog opens without an appointmentId (from Patient Profile or Recent Patient Card), THE AssignAssessmentDialog SHALL auto-populate the patient and doctor fields from provided context and leave the appointment field empty
5. THE AssignAssessmentDialog SHALL use identical validation rules, submission logic, and visual design regardless of the entry point
6. THE AssignAssessmentDialog SHALL expose a single component interface such that entry points differ only in the context parameters passed, with no entry-point-specific logic branches visible to callers

### Requirement 9: Notification Lifecycle

**User Story:** As a patient or doctor, I want to receive notifications for all recommendation and assessment lifecycle events, so that I stay informed about care actions taken on my behalf or my patients.

#### Acceptance Criteria

1. WHEN a service recommendation is created, THE Notification_System SHALL send an in-app notification to the patient within 30 seconds, including the recommending doctor's name, service name, and recommended date and time
2. WHEN a service recommendation is updated by the doctor, THE Notification_System SHALL send an in-app notification to the patient within 30 seconds, identifying which fields changed (service, recommended slot, or note)
3. WHEN a service recommendation is cancelled by the doctor, THE Notification_System SHALL send an in-app notification to the patient within 30 seconds, including the doctor's name and the service that was cancelled
4. WHEN a patient accepts a recommendation, THE Notification_System SHALL send an in-app notification to the recommending doctor within 30 seconds, including the patient's name and the accepted service name
5. WHEN a patient declines a recommendation, THE Notification_System SHALL send an in-app notification to the recommending doctor within 30 seconds, including the patient's name and the decline reason if one was provided
6. WHEN an assessment is assigned, THE Notification_System SHALL send an in-app notification to the patient within 30 seconds, including the assessment type, scheduled date, and scheduled start time
7. IF notification delivery fails, THEN THE Notification_System SHALL retry delivery up to 3 times with exponential backoff, and persist the notification in an undelivered state for later retrieval
8. THE Notification_System SHALL persist each notification with a read or unread status and a creation timestamp, so that recipients can view missed notifications upon next login

### Requirement 10: Audit Logging

**User Story:** As a system administrator, I want all recommendation and assessment actions to be tracked in an audit log, so that there is a complete traceable record of clinical workflow actions.

#### Acceptance Criteria

1. WHEN a doctor creates a service recommendation, THE Audit_Service SHALL log an entry with fields: actor (doctor ID), action ("recommendation_created"), patientId, doctorId, serviceId, recommendedSlotStart, recommendedSlotEnd, and timestamp
2. WHEN a doctor updates a service recommendation, THE Audit_Service SHALL log an entry with fields: actor (doctor ID), action ("recommendation_updated"), recommendationId, previous values and new values for each changed field, and timestamp
3. WHEN a doctor cancels a service recommendation, THE Audit_Service SHALL log an entry with fields: actor (doctor ID), action ("recommendation_cancelled"), recommendationId, patientId, and timestamp
4. WHEN a doctor assigns an assessment, THE Audit_Service SHALL log an entry with fields: actor (doctor ID), action ("assessment_assigned"), patientId, assessmentType, timing, and timestamp
5. WHEN a patient accepts a recommendation, THE Audit_Service SHALL log an entry with fields: actor (patient ID), action ("recommendation_accepted"), recommendationId, doctorId, and timestamp
6. WHEN a patient declines a recommendation, THE Audit_Service SHALL log an entry with fields: actor (patient ID), action ("recommendation_declined"), recommendationId, doctorId, declineReason if provided, and timestamp
7. WHEN an assessment is completed by a patient, THE Audit_Service SHALL log an entry with fields: actor (patient ID), action ("assessment_completed"), assessmentId, doctorId, and timestamp
8. EACH audit log entry SHALL store: actor (user ID or "system"), timestamp in ISO 8601 UTC format, patientId, doctorId, action (string matching one of the defined action types), and a metadata object containing action-specific details as defined by criteria 1 through 7
9. WHEN an administrator cancels a recommendation, THE Audit_Service SHALL log an entry with fields: actor (admin ID), action ("recommendation_cancelled_by_admin"), recommendationId, patientId, doctorId, and timestamp
10. WHEN a recommendation expires, THE Audit_Service SHALL log an entry with fields: actor ("system"), action ("recommendation_expired"), recommendationId, patientId, doctorId, and timestamp
11. IF the Audit_Service fails to persist a log entry, THEN THE Recommendation_System SHALL still complete the originating action and queue the failed audit entry for retry within 60 seconds

### Requirement 11: Success Criteria Validation

**User Story:** As a product owner, I want to verify that all core workflows function end-to-end, so that the feature delivers on its stated goals.

#### Acceptance Criteria

1. WHEN a doctor clicks "Recommend Service" from the Appointment Details Quick_Actions_Section, THE Doctor_Portal SHALL open the RecommendServiceDialog as an overlay on the current page, allow the doctor to complete and submit the recommendation, and return to the appointment details view upon dialog close without a full page navigation occurring
2. WHEN a doctor clicks "Assign Assessment" from the Appointment Details Quick_Actions_Section, THE Doctor_Portal SHALL open the AssignAssessmentDialog as an overlay on the current page, allow the doctor to complete and submit the assignment, and return to the appointment details view upon dialog close without a full page navigation occurring
3. WHEN a doctor clicks "Recommend Service" or "Assign Assessment" on a Recent_Patient_Card, THE Doctor_Portal SHALL open the corresponding dialog pre-populated with that card's patient context and allow the doctor to complete the workflow without navigating away from the dashboard
4. WHEN a doctor uses the "Use appointment schedule" option, THE RecommendServiceDialog SHALL pre-fill the Suggested Date and Suggested Time fields with the appointment's scheduled date and time and disable manual editing of those fields
5. WHEN a doctor unchecks "Use appointment schedule", THE RecommendServiceDialog SHALL enable the Date Picker and Time Slot Picker for manual selection of an alternative date and time
6. THE RecommendServiceDialog SHALL produce identical validation rules, submission behavior, field layout, and visual design regardless of whether it is opened from Appointment Details, Patient Profile, or Recent Patient Cards
7. THE AssignAssessmentDialog SHALL produce identical validation rules, submission behavior, field layout, and visual design regardless of whether it is opened from Appointment Details, Patient Profile, or Recent Patient Cards
8. WHEN a doctor completes a Recommend Service workflow end-to-end, THE Doctor_Portal SHALL confirm success by closing the dialog, displaying a success indication to the doctor, and the recommendation appearing in the patient's recommendations list
9. WHEN a doctor completes an Assign Assessment workflow end-to-end, THE Doctor_Portal SHALL confirm success by closing the dialog, displaying a success indication to the doctor, and the assessment appearing in the patient's assigned assessments list
