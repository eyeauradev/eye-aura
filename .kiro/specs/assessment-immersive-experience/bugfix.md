# Bugfix Requirements Document

## Introduction

The visual acuity assessment in the Eye Aura tele-optometry platform currently presents as a standard dashboard page rather than a dedicated, premium ophthalmic testing application. The assessment inherits dashboard chrome (sidebar, navigation, headers, breadcrumbs, card containers), wastes screen real estate on margins, padding, and decorative UI elements, and lacks an immersive clinical testing experience. On compact viewports (< 1024px), the assessment does not launch in a dedicated environment, does not enforce landscape orientation, and does not attempt fullscreen mode. During the reading phase, header elements (timer, progress) remain at full opacity competing with optotypes, and there is no overflow menu for assessment controls (pause, resume, exit). This is a presentation-layer defect only — all clinical logic, sizing calculations, and progression algorithms must remain unchanged.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the visual acuity assessment is active THEN the system renders dashboard chrome (sidebar, navigation, headers, breadcrumbs, GlassPanel card container with rounded-[32px], max-w-2xl constraint, page padding) around the assessment content, reducing available optotype display area

1.2 WHEN a compact viewport (< 1024px) loads the assessment THEN the system renders it inline within the dashboard layout without launching a dedicated immersive environment, without enforcing landscape orientation, and without attempting fullscreen mode

1.3 WHEN the assessment is in reading phase THEN the system dedicates only ~60% of viewport height to optotype content due to progress bars, stage dots, eye icons, level indicators, doctor note sections, and card padding consuming the remaining space

1.4 WHEN the assessment reading phase is active THEN the timer ring, progress bar, eye info badges, and Snellen notation labels remain at full opacity permanently, visually competing with the optotypes that should be the primary focus

1.5 WHEN a user needs to pause, resume, or exit the assessment THEN the system only provides an inline pause/resume button within the card and offers no overflow menu with additional actions (return to details, return to dashboard, exit assessment)

1.6 WHEN the assessment is displayed THEN the system renders decorative elements (eye icons in colored squares, doctor note with eye icon, heavy glassmorphism container, large heading text, step dots, stage labels) that break clinical testing immersion

### Expected Behavior (Correct)

2.1 WHEN the visual acuity assessment is active THEN the system SHALL render an immersive shell (AssessmentImmersiveShell) that removes all dashboard chrome and dedicates 90-95% of viewport area to clinical assessment content with a clean medical-grade background

2.2 WHEN a compact viewport (< 1024px) loads the assessment THEN the system SHALL launch an immersive mode (new tab/window), display a landscape orientation gate (AssessmentOrientationGate) with rotate instruction when in portrait, and attempt fullscreen mode (AssessmentFullscreenController) with graceful fallback if denied

2.3 WHEN the assessment is in reading phase THEN the system SHALL present optotypes as the hero element occupying 90-95% of the viewport, with only a minimal top bar containing timer (left) and progress indicator (right)

2.4 WHEN the assessment reading phase is active and 1.5 seconds have elapsed without user interaction THEN the system SHALL auto-fade the minimal top bar (timer and progress) to 30% opacity, restoring full opacity on user interaction (touch, mouse move, keyboard)

2.5 WHEN a user needs assessment controls during reading phase THEN the system SHALL provide a minimal floating overflow menu (AssessmentOverflowMenu) positioned at bottom-right with actions: Pause, Resume, Return to Details, Return to Dashboard, and Exit

2.6 WHEN the assessment is displayed in immersive mode THEN the system SHALL use a clean medical-grade background without busy gradients, heavy glassmorphism, or decorative elements, while preserving accessibility (keyboard navigation, focus visibility, screen reader support, high contrast optotypes)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN CalibrationStep renders or SnellenRenderer calculates sizing THEN the system SHALL CONTINUE TO use existing pxPerMm calculations, SVG dimensions, Sloan spacing, and letter height mathematics without modification

3.2 WHEN useCalibrationSync, useVisionProgression, or useLetterTimer hooks execute THEN the system SHALL CONTINUE TO produce identical calibration data, progression decisions, and timer behavior as before the presentation upgrade

3.3 WHEN an assessment completes THEN the system SHALL CONTINUE TO calculate results, persist to Firestore using the existing schema, and execute assessment completion logic identically

3.4 WHEN a large viewport (>= 1024px) loads the assessment THEN the system SHALL CONTINUE TO render within the current route (no new tab), without forced landscape or fullscreen, using the immersive layout in-place

3.5 WHEN globals.css, design-tokens.ts, shared layout wrappers, or global padding systems are evaluated THEN the system SHALL CONTINUE TO function without any modifications from this bugfix

3.6 WHEN the assessment is navigated via keyboard or accessed by screen readers THEN the system SHALL CONTINUE TO provide full keyboard navigation, focus visibility indicators, and appropriate ARIA attributes for all interactive elements
