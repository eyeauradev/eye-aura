# Bugfix Requirements Document

## Introduction

The Eye Aura platform lacks a consistent brand logo across authenticated sections (Patient, Doctor, Admin portals). Where logos exist, they navigate to internal dashboards instead of the public homepage. Assessment pages have no branding whatsoever. This results in a disconnected user experience with no way to return to the public website via a familiar logo interaction, violating standard web navigation conventions.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user is in the Patient portal THEN the system displays no Eye Aura brand logo in the header

1.2 WHEN a user is in the Doctor portal and clicks the Eye Aura logo THEN the system navigates to `/doctor/dashboard` instead of the public homepage (`/`)

1.3 WHEN a user is in the Admin portal and clicks the Eye Aura logo THEN the system navigates to `/admin/dashboard` instead of the public homepage (`/`)

1.4 WHEN a user is on any assessment page (visual acuity test) THEN the system displays no brand logo or branding element

1.5 WHEN a user wants to return to the public Eye Aura website from any authenticated section THEN the system provides no logo-based navigation to achieve this (only sidebar/nav links in some portals)

1.6 WHEN the logo is rendered in Doctor or Admin portals THEN each layout implements its own inline logo markup with inconsistent sizing and no shared component

### Expected Behavior (Correct)

2.1 WHEN a user is in the Patient portal THEN the system SHALL display the Eye Aura brand logo in the header with `alt="Eye Aura Home"` and clicking it SHALL navigate to the public homepage (`/`)

2.2 WHEN a user is in the Doctor portal and clicks the Eye Aura logo THEN the system SHALL navigate to the public homepage (`/`) instead of the doctor dashboard

2.3 WHEN a user is in the Admin portal and clicks the Eye Aura logo THEN the system SHALL navigate to the public homepage (`/`) instead of the admin dashboard

2.4 WHEN a user is on an assessment page during an active test THEN the system SHALL display a compact/minimal Eye Aura logo that preserves test space

2.5 WHEN a user clicks the logo during an active assessment THEN the system SHALL display a confirmation dialog with title "Exit Assessment?", message "You have an assessment in progress. Leaving now may result in losing your progress.", and actions "Continue Assessment" | "Exit to Home" — navigating to `/` only after explicit confirmation

2.6 WHEN a user clicks the logo on an assessment page with no active test (e.g., results screen) THEN the system SHALL navigate directly to the public homepage (`/`) without confirmation

2.7 WHEN the logo is rendered in any portal THEN the system SHALL use a single shared `HeaderLogo` component with consistent appearance, responsive sizing (mobile/tablet/desktop), proper accessibility (`alt="Eye Aura Home"`, keyboard navigable, screen reader compatible), and support for a `compact` mode

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user interacts with existing back buttons, breadcrumbs, or page-level navigation THEN the system SHALL CONTINUE TO function as before — the logo is global navigation and coexists with contextual navigation

3.2 WHEN a user is in the Doctor portal THEN the system SHALL CONTINUE TO display the doctor name and sign-out button in the header alongside the logo

3.3 WHEN a user is in the Admin portal THEN the system SHALL CONTINUE TO display the admin user info, hamburger menu toggle, and sign-out button in the header alongside the logo

3.4 WHEN a user is on an assessment page THEN the system SHALL CONTINUE TO provide the existing exit/pause controls and overflow menu without interference from the logo

3.5 WHEN a user is on a mobile device THEN the system SHALL CONTINUE TO display the bottom navigation bar without any layout shift caused by the logo addition

3.6 WHEN a user navigates within any portal via sidebar or breadcrumbs THEN the system SHALL CONTINUE TO route to the correct internal pages as before
