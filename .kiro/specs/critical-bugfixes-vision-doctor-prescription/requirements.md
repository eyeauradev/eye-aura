# Requirements Document

## Introduction

This document specifies the requirements for fixing three critical issues in the Eye Aura application: the far vision assessment timer flow bug, missing pending requests badge in the doctor's module, and prescription editing with history tracking.

## Glossary

- **Far_Vision_Assessment**: The vision test that evaluates visual acuity at 3 metres distance
- **Countdown_Timer**: The 10-second countdown displayed before the far vision assessment begins
- **Eye_Selection_Screen**: The interface where users choose which eye to test (right or left)
- **Testing_Phase**: The active assessment phase where Snellen chart letters are displayed
- **Doctor_Portal**: The web interface used by doctors to manage appointments, patients, and prescriptions
- **Requests_Tab**: The navigation item in the doctor portal that displays pending consultation requests
- **Badge**: A visual indicator showing a count of pending items
- **Pending_Request**: A consultation request that has status "pending" and awaits doctor action
- **Prescription**: A medical document created by a doctor containing eye examination results and recommendations
- **Edit_History**: A chronological log of all changes made to a prescription document
- **Timestamp**: The date and time when a prescription was created or last modified

## Requirements

### Requirement 1: Fix Far Vision Assessment Timer Flow

**User Story:** As a patient taking a far vision assessment, I want the eye selection to happen before the countdown timer, so that the timer is the final step before the assessment begins.

#### Acceptance Criteria

1. WHEN a patient completes the duration selection step THEN THE Far_Vision_Assessment SHALL display the Eye_Selection_Screen
2. WHEN a patient selects an eye on the Eye_Selection_Screen THEN THE Far_Vision_Assessment SHALL display instructions for covering the opposite eye
3. WHEN a patient confirms they are ready on the Eye_Selection_Screen THEN THE Far_Vision_Assessment SHALL start the Countdown_Timer
4. WHEN the Countdown_Timer reaches zero THEN THE Far_Vision_Assessment SHALL immediately begin the Testing_Phase without any intermediate screens
5. THE Eye_Selection_Screen SHALL NOT appear after the Countdown_Timer completes

### Requirement 2: Display Pending Requests Badge

**User Story:** As a doctor, I want to see a badge with the number of pending requests on the Requests tab, so that I can quickly identify when patients need my attention.

#### Acceptance Criteria

1. WHEN there are pending requests THEN THE Doctor_Portal SHALL display a Badge on the Requests_Tab showing the count
2. THE Badge SHALL display the exact number of Pending_Request items
3. WHEN there are zero pending requests THEN THE Doctor_Portal SHALL NOT display a Badge on the Requests_Tab
4. THE Badge SHALL be visible on phone breakpoints (screen width < 768px)
5. THE Badge SHALL be visible on tablet breakpoints (768px ≤ screen width < 1024px)
6. THE Badge SHALL be visible on desktop breakpoints (screen width ≥ 1024px)
7. WHEN the pending request count changes THEN THE Badge SHALL update to reflect the new count within 5 seconds
8. THE Badge SHALL appear on both the sidebar navigation (desktop) and mobile bottom navigation bar

### Requirement 3: Enable Prescription Editing

**User Story:** As a doctor, I want to edit existing prescriptions, so that I can correct errors or update patient information.

#### Acceptance Criteria

1. WHEN a doctor views a prescription detail page THEN THE Doctor_Portal SHALL display an "Edit Prescription" button
2. WHEN a doctor clicks "Edit Prescription" THEN THE Doctor_Portal SHALL navigate to an editable form with the current prescription data pre-filled
3. WHEN a doctor submits edited prescription data THEN THE Doctor_Portal SHALL validate all required fields
4. WHEN validation passes THEN THE Doctor_Portal SHALL save the updated prescription to the database
5. WHEN a prescription is successfully updated THEN THE Doctor_Portal SHALL display a success confirmation message

### Requirement 4: Track Prescription Edit History

**User Story:** As a doctor, I want to see when prescriptions were edited, so that I can maintain accountability and track changes.

#### Acceptance Criteria

1. WHEN a prescription is edited THEN THE Doctor_Portal SHALL create an Edit_History entry with the timestamp, doctor ID, and changed fields
2. WHEN a doctor views a prescription THEN THE Doctor_Portal SHALL display an "Edit History" section (visible to doctors and admins only)
3. THE Edit_History section SHALL list all edits in reverse chronological order (newest first)
4. WHEN an admin views a prescription THEN THE Doctor_Portal SHALL display the Edit_History section
5. WHEN a patient views a prescription THEN THE Doctor_Portal SHALL NOT display the Edit_History section

### Requirement 5: Display Prescription Timestamp to Patients

**User Story:** As a patient, I want to see when my prescription was created or last updated, so that I know if I'm viewing the most current version.

#### Acceptance Criteria

1. WHEN a patient views a prescription that has never been edited THEN THE Doctor_Portal SHALL display the original creation timestamp
2. WHEN a patient views a prescription that has been edited THEN THE Doctor_Portal SHALL display the most recent edit timestamp
3. THE Timestamp SHALL be formatted in a human-readable format (e.g., "December 15, 2024")
4. THE Timestamp SHALL include a label indicating whether it is the creation date or last updated date
5. THE Timestamp SHALL be displayed prominently near the prescription header
