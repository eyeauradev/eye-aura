# Bugfix Requirements Document

## Introduction

This document addresses four interconnected bugs across the Eye Aura platform: (1) the Snellen test 3-column layout becomes cramped and unreadable on small mobile screens, (2) the visual acuity optotype sizing lacks proper recalculation on DPR/zoom/orientation/resize changes making it medically inaccurate across devices, (3) the doctor and admin module layouts have no navigation path back to the public home page creating dead-ends, and (4) the architecture documentation is out of sync with the current implementation after recent commits.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Snellen test is displayed on a mobile viewport (width < 768px) THEN the system renders a 3-column layout (left eye info | Snellen chart | timer/distance) that compresses the chart area, making optotypes cramped and unreadable

1.2 WHEN the device pixel ratio (DPR) changes (e.g., moving browser window between monitors, pinch-zoom, or orientation change) THEN the system does NOT recalculate the calibrated pxPerMm value, causing optotype physical sizing to become inaccurate

1.3 WHEN the viewport is resized or device orientation changes after calibration THEN the system does NOT trigger a recalibration or recalculation, leaving the SnellenRenderer using stale calibration data that no longer reflects the physical display characteristics

1.4 WHEN a user is inside the doctor module (/doctor/*) THEN the system provides no visible navigation action to return to the public home page (/)

1.5 WHEN a user is inside the admin module (/admin/*) THEN the system provides no visible navigation action to return to the public home page (/)

1.6 WHEN a developer or stakeholder reads the architecture documentation (docs/EYE_AURA_MASTER_ARCHITECTURE.md, docs/EYE_AURA_MASTER_REFERENCE.md) THEN the system presents outdated information that does not reflect the current implementation including premium design system, doctor/admin revamp, assessment architecture, payment flows, navigation changes, responsive behavior, and calibration architecture

### Expected Behavior (Correct)

2.1 WHEN the Snellen test is displayed on a mobile viewport (width < 768px) THEN the system SHALL transform the layout into two rows: Row 1 containing [Eye Info] and [Timer/Distance] side by side, and Row 2 containing the Snellen chart at full width, giving the optotype area maximum horizontal space for readability

2.2 WHEN the device pixel ratio changes, or the viewport is resized, or the device orientation changes THEN the system SHALL recalculate the physical sizing parameters (pxPerMm) and re-render optotypes with updated dimensions, applying a smooth CSS transition to avoid jarring visual jumps

2.3 WHEN the SnellenRenderer recalculates sizing due to environment changes THEN the system SHALL use SVG rendering with mathematically calculated physical dimensions that remain pixel-ratio-aware and medically accurate regardless of the device or zoom level

2.4 WHEN a user is inside the doctor module (/doctor/*) THEN the system SHALL display a "Public Home" navigation action (linking to /) visible in both the desktop sidebar and mobile navigation, consistent with the patient module's existing implementation

2.5 WHEN a user is inside the admin module (/admin/*) THEN the system SHALL display a "Public Home" navigation action (linking to /) visible in both the desktop sidebar/drawer and mobile navigation, consistent with the patient module's existing implementation

2.6 WHEN a developer or stakeholder reads the architecture documentation THEN the system SHALL present documentation that accurately reflects the current implementation state including: premium design system tokens, doctor/admin layout revamp, visual acuity assessment architecture (calibration, SVG rendering, session flow), payment flows, navigation structure, responsive behavior, and all module structures

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the Snellen test is displayed on a large viewport (width >= 768px) THEN the system SHALL CONTINUE TO render the 3-column layout (left eye info | Snellen chart | timer/distance) as currently implemented

3.2 WHEN calibration is performed via the credit card matching step THEN the system SHALL CONTINUE TO produce accurate pxPerMm values using the ISO/IEC 7810 ID-1 card dimensions (85.60mm x 53.98mm)

3.3 WHEN the SnellenRenderer renders optotypes THEN the system SHALL CONTINUE TO use SVG with exact numeric width/height, cap-height-compensated font sizing (CAP_HEIGHT_RATIO = 0.711), Sloan chart spacing, and geometricPrecision text rendering

3.4 WHEN a user navigates within the doctor module THEN the system SHALL CONTINUE TO display all existing navigation items (Dashboard, Appointments, Requests, Patients, Prescriptions, Slots, Profile) without modification

3.5 WHEN a user navigates within the admin module THEN the system SHALL CONTINUE TO display all existing navigation items (Dashboard, Doctors, Services, Assessments, Appointments, Users, Payments, Analytics, Settings) without modification

3.6 WHEN a user navigates within the patient module THEN the system SHALL CONTINUE TO display the existing "Public Home" link in the sidebar and maintain all current navigation behavior

3.7 WHEN the premium design system tokens are used THEN the system SHALL CONTINUE TO use the centralized theme-token system (GLASS, SHADOWS, TYPOGRAPHY, SPACING, RADIUS, DEPTH_LAYERS) without hardcoded colors or inconsistent components

3.8 WHEN the visual acuity test progresses through phases (type_select → instructions → calibration → duration_select → testing → results) THEN the system SHALL CONTINUE TO follow the existing phase flow, timer engine, and self-report mechanism without alteration
