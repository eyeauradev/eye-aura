# Implementation Plan

## Overview

This task list implements the Assessment Immersive Experience bugfix using the bug condition methodology. The workflow follows an exploratory approach: first write tests to understand and confirm the bug, then write preservation tests to capture existing correct behavior, then implement the fix, and finally validate everything passes.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Dashboard Chrome Renders During Active Assessment
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - render AcuitySession in testing phase at various viewport widths and assert immersive shell conditions
  - Test that for any assessment session where `assessmentActive == true` AND `phase ∈ ['instructions', 'calibration', 'duration_select', 'testing', 'results']`:
    - No dashboard chrome is rendered (no sidebar, no header, no breadcrumbs, no GlassPanel card container, no `max-w-2xl` constraint)
    - Optotype area occupies ≥ 90% of viewport
    - During reading phase: top bar auto-fades to 30% opacity after 1500ms of inactivity
    - During reading phase: overflow menu trigger button exists at bottom-right
    - For viewport < 1024px: immersive launch mode is active (from Bug Condition `isBugCondition` in design)
  - Run test on UNFIXED code - expect FAILURE (this confirms the bug exists)
  - **EXPECTED OUTCOME**: Test FAILS because:
    - Assessment renders inside `GlassPanel` with `max-w-2xl` and `AssessmentWrapper` chrome (step dots, stage labels)
    - Optotype area is ~60% of viewport due to decorative elements
    - Timer/progress elements never change opacity (no auto-fade mechanism)
    - No overflow menu element exists in DOM during reading phase
  - Document counterexamples found (e.g., "AcuitySession in testing phase renders GlassPanel instead of AssessmentImmersiveShell")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Clinical Logic and Global Systems Invariance
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Run clinical hooks (`useCalibrationSync`, `useVisionProgression`, `useLetterTimer`, `useAssessmentProgress`) on UNFIXED code with various inputs and record outputs
  - Observe: Render `SnellenRenderer` with random `(letters, exactHeightMm, calibration)` tuples on UNFIXED code and record SVG dimensions (`width`, `height`, `viewBox`, letter positions)
  - Observe: Verify `globals.css` and `design-tokens.ts` exports are unmodified
  - Write property-based tests:
    - For all `CalibrationData` objects (pxPerMm ∈ [1, 20], cardWidthPx ∈ [200, 600], dpr ∈ [1, 4]): `SnellenRenderer` produces identical SVG dimensions regardless of presentation shell
    - For all `(totalLetters, durationMs, pauseResumeSequence)` inputs: `useLetterTimer` progression sequence is identical
    - For all `(calibration, dprChange, viewportResize)` scenarios: `useCalibrationSync` output is identical
    - For all completed assessment payloads: Firestore persisted document has identical fields and values
  - Verify all tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - **EXPECTED OUTCOME**: Tests PASS (clinical logic is independent of presentation layer)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Implement immersive experience presentation layer

  - [x] 3.1 Create `useInactivityFade` hook (`modules/visual-acuity/immersive/useInactivityFade.ts`)
    - Implement hook with signature: `useInactivityFade(containerRef: RefObject<HTMLElement>, timeoutMs?: number) => { isIdle: boolean }`
    - Attach `mousemove`, `touchstart`, `keydown` event listeners to container element
    - Clear/reset `setTimeout` on each interaction event; set `isIdle = true` after `timeoutMs` (default 1500ms)
    - Respect `prefers-reduced-motion`: if active, never fade (`isIdle` always `false`)
    - Clean up listeners and timeout on unmount
    - _Bug_Condition: isBugCondition(input) where phase == 'testing' AND NOT topBarAutoFades(input)_
    - _Expected_Behavior: Top bar fades to 30% opacity after 1500ms inactivity, restores on interaction_
    - _Preservation: No modification to clinical hooks or global styles_
    - _Requirements: 2.4_

  - [x] 3.2 Create `AssessmentOrientationGate` component (`modules/visual-acuity/immersive/AssessmentOrientationGate.tsx`)
    - Detect orientation using `window.matchMedia('(orientation: portrait)')` listener
    - Render gate UI: centered card with rotate-device icon, instruction text ("Please rotate your device to landscape"), accessible messaging
    - Auto-dismiss when orientation changes to landscape (gate fades out, renders children)
    - Include appropriate ARIA attributes and keyboard-accessible dismiss
    - _Bug_Condition: isBugCondition(input) where viewportWidth < 1024 AND NOT immersiveLaunchMode(input)_
    - _Expected_Behavior: Orientation gate shown in portrait, dismissed in landscape_
    - _Preservation: No modification to clinical logic or global styles_
    - _Requirements: 2.2_

  - [x] 3.3 Create `AssessmentFullscreenController` component (`modules/visual-acuity/immersive/AssessmentFullscreenController.tsx`)
    - On mount (compact viewport only), call `document.documentElement.requestFullscreen()` wrapped in try/catch
    - Graceful fallback: if promise rejects (user denied, browser unsupported), log warning and continue without fullscreen
    - On unmount, call `document.exitFullscreen()` if currently fullscreen
    - _Bug_Condition: isBugCondition(input) where viewportWidth < 1024 AND NOT immersiveLaunchMode(input)_
    - _Expected_Behavior: Fullscreen attempted on compact viewport with graceful fallback_
    - _Preservation: No modification to clinical logic or global styles_
    - _Requirements: 2.2_

  - [x] 3.4 Create `AssessmentOverflowMenu` component (`modules/visual-acuity/immersive/AssessmentOverflowMenu.tsx`)
    - Render toggle trigger: 48×48px circular button with three-dot/ellipsis icon at fixed `bottom-6 right-6`
    - Animated menu panel (Framer Motion scale+fade) with 5 actions: Pause (when running), Resume (when paused), Return to Details, Return to Dashboard, Exit Assessment
    - Accessibility: `role="menu"`, `aria-expanded`, keyboard navigation with Escape to close, auto-focus first item on open
    - Accept props: `onPause`, `onResume`, `onReturnToDetails`, `onReturnToDashboard`, `onExit`, `isPaused`
    - _Bug_Condition: isBugCondition(input) where phase == 'testing' AND NOT overflowMenuAvailable(input)_
    - _Expected_Behavior: Floating overflow menu at bottom-right with Pause, Resume, Return to Details, Return to Dashboard, Exit_
    - _Preservation: No modification to clinical logic or timer behavior_
    - _Requirements: 2.5_

  - [x] 3.5 Create `AssessmentImmersiveShell` component (`modules/visual-acuity/immersive/AssessmentImmersiveShell.tsx`)
    - Full-viewport wrapper with `fixed inset-0 z-50` positioning, clean medical-grade background (subtle off-white/cool-gray)
    - Flexbox column layout dedicating 90–95% to content area
    - Integrate `ImmersiveTopBar` sub-component: timer (left) and progress indicator (right) with opacity controlled by `useInactivityFade` (`opacity: isIdle ? 0.3 : 1`, `transition: opacity 300ms ease`)
    - Integrate `AssessmentOverflowMenu` for reading phase
    - Viewport-aware: if < 1024px in original tab context, trigger new-tab launch; if ≥ 1024px, render in-place overlay
    - Pass through children (assessment step content) without modification
    - _Bug_Condition: isBugCondition(input) where assessmentActive AND dashboardChromeRendered OR optotypeAreaPercent < 0.90_
    - _Expected_Behavior: No dashboard chrome, 90-95% viewport for optotypes, auto-fade top bar, overflow menu_
    - _Preservation: Children (clinical components) rendered identically without prop modification_
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.6 Create barrel export (`modules/visual-acuity/immersive/index.ts`)
    - Export `AssessmentImmersiveShell`, `AssessmentOrientationGate`, `AssessmentFullscreenController`, `AssessmentOverflowMenu`, `useInactivityFade`
    - _Requirements: 2.1_

  - [x] 3.7 Modify `AcuitySession.tsx` to use `AssessmentImmersiveShell`
    - Replace `AssessmentWrapper` import with `AssessmentImmersiveShell` from `./immersive`
    - Pass timer state, progress state, phase info, and overflow menu callbacks to the shell
    - Preserve ALL existing logic: phase state machine, Firestore persistence, session ID generation — zero changes to clinical logic
    - _Bug_Condition: isBugCondition(input) where assessmentActive AND dashboardChromeRendered_
    - _Expected_Behavior: AssessmentImmersiveShell replaces AssessmentWrapper_
    - _Preservation: All clinical hooks, state machine, Firestore persistence unchanged_
    - _Requirements: 2.1, 3.1, 3.2, 3.3_

  - [x] 3.8 Modify `TestingShell.tsx` to remove decorative chrome
    - Remove doctor note section (eye icon + doctor note text)
    - Remove GlassPanel card wrapper (`max-w-2xl mx-auto` constraint and white card container)
    - Remove inline progress bar (moves to ImmersiveTopBar)
    - Remove inline pause/resume button (moves to AssessmentOverflowMenu)
    - Remove decorative elements (eye icons in colored squares, step dots, stage labels)
    - KEEP `SnellenRenderer` rendering unchanged — same props, same calibration data
    - KEEP timer/progress hook usage — hooks remain but UI representation moves to parent shell
    - _Bug_Condition: isBugCondition(input) where optotypeAreaPercent < 0.90 due to decorative elements_
    - _Expected_Behavior: Optotypes as hero element at 90-95% viewport_
    - _Preservation: SnellenRenderer props, calibration data, hook outputs unchanged_
    - _Requirements: 2.1, 2.3, 2.6, 3.1_

  - [x] 3.9 Modify `app/patient/assessment/visual-acuity/page.tsx` for viewport-aware launch
    - Add viewport check on mount: if `window.innerWidth < 1024` and URL does not contain `?immersive=1`, open `window.open()` with `?immersive=1` appended
    - When `?immersive=1` is present: render without `PatientLayout` chrome, wrap in `AssessmentOrientationGate` + `AssessmentFullscreenController`
    - Large viewport (≥ 1024px): render in-place with `AssessmentImmersiveShell` as overlay (z-50 fixed positioning)
    - _Bug_Condition: isBugCondition(input) where viewportWidth < 1024 AND NOT immersiveLaunchMode(input)_
    - _Expected_Behavior: Compact viewport launches new tab with immersive mode; large viewport renders in-place_
    - _Preservation: Route guards, authentication logic, non-assessment pages unchanged_
    - _Requirements: 2.2, 3.4_

  - [x] 3.10 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dashboard Chrome Replaced by Immersive Shell
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (no chrome, ≥90% optotype area, auto-fade, overflow menu)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.11 Verify preservation tests still pass
    - **Property 2: Preservation** - Clinical Logic and Global Systems Invariance
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions to clinical logic, global styles, or accessibility)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite (exploration + preservation + unit tests)
  - Verify Property 1 (Bug Condition) test passes after fix
  - Verify Property 2 (Preservation) tests still pass after fix
  - Verify no regressions in clinical logic hooks
  - Verify `globals.css` and `design-tokens.ts` are unmodified
  - Verify keyboard navigation and ARIA attributes on new components
  - Ensure all tests pass, ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "description": "Write exploration and preservation tests BEFORE implementation"
    },
    {
      "wave": 2,
      "tasks": ["3.1", "3.2", "3.3", "3.4"],
      "description": "Create new utility hook and standalone components (no dependencies between them)"
    },
    {
      "wave": 3,
      "tasks": ["3.5", "3.6"],
      "description": "Create shell component (depends on hook and overflow menu) and barrel export"
    },
    {
      "wave": 4,
      "tasks": ["3.7", "3.8"],
      "description": "Modify AcuitySession to use new shell and strip TestingShell decorative chrome"
    },
    {
      "wave": 5,
      "tasks": ["3.9"],
      "description": "Modify page.tsx for viewport-aware launch logic"
    },
    {
      "wave": 6,
      "tasks": ["3.10", "3.11"],
      "description": "Re-run exploration and preservation tests to verify fix and no regressions"
    },
    {
      "wave": 7,
      "tasks": ["4"],
      "description": "Final checkpoint - ensure all tests pass"
    }
  ]
}
```

## Notes

- Tasks 1 and 2 are standalone property-based tests that MUST be written and run BEFORE any implementation begins
- Task 1 is expected to FAIL on unfixed code (confirming the bug exists)
- Task 2 is expected to PASS on unfixed code (capturing baseline behavior to preserve)
- Tasks 3.10 and 3.11 re-run the same tests from tasks 1 and 2 — no new tests are written
- All clinical logic hooks remain completely untouched — zero modifications to `useCalibrationSync`, `useVisionProgression`, `useLetterTimer`, `useAssessmentProgress`
- `globals.css` and `design-tokens.ts` receive zero modifications
- New components are isolated in `modules/visual-acuity/immersive/` directory
