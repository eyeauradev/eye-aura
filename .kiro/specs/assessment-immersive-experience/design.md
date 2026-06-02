# Assessment Immersive Experience Bugfix Design

## Overview

The visual acuity assessment currently renders inside the patient dashboard layout (`PatientLayout` → `FloatingSidebar` + `PremiumHeader` + `PageTransition`) and wraps content in an `AssessmentWrapper` with `GlassPanel`, `rounded-[32px]`, `max-w-2xl` constraint, step dots, stage labels, and decorative elements. This consumes ~40% of viewport area for chrome rather than clinical content.

The fix introduces a parallel presentation layer — `AssessmentImmersiveShell` — that bypasses dashboard chrome and dedicates 90–95% of viewport to optotype rendering. On compact viewports (< 1024px), the shell launches in a new tab/window with landscape orientation gating and fullscreen attempt. On large viewports (≥ 1024px), it renders in-place within the existing route. A minimal top bar auto-fades after inactivity, and a floating overflow menu provides assessment controls.

All clinical logic (`CalibrationStep`, `SnellenRenderer`, `pxPerMm`, `useCalibrationSync`, `useVisionProgression`, `useLetterTimer`, `useAssessmentProgress`) remains **completely untouched**. No modifications to `globals.css`, `design-tokens.ts`, shared layout wrappers, or global padding systems.

## Glossary

- **Bug_Condition (C)**: The assessment is active (any phase from `instructions` through `results`) and the presentation layer renders dashboard chrome, constrains optotype area, lacks immersive controls, and does not provide compact-viewport special handling
- **Property (P)**: The assessment renders in an immersive shell with 90–95% optotype area, minimal auto-fading top bar, floating overflow menu, and viewport-appropriate launch mode
- **Preservation**: All clinical calculation hooks, SnellenRenderer sizing, Firestore persistence, and completion logic produce bit-identical output; `globals.css`, `design-tokens.ts`, shared layout wrappers remain unmodified
- **AssessmentImmersiveShell**: New top-level wrapper component replacing `AssessmentWrapper` during active assessment, providing fullscreen layout with clean background
- **AssessmentOrientationGate**: New component shown on compact viewports in portrait mode, instructing the user to rotate to landscape before proceeding
- **AssessmentFullscreenController**: New utility component that attempts `document.documentElement.requestFullscreen()` on compact viewports with graceful fallback
- **AssessmentOverflowMenu**: New floating bottom-right menu providing Pause, Resume, Return to Details, Return to Dashboard, and Exit actions
- **ImmersiveTopBar**: Internal sub-component within the shell showing timer (left) and progress (right), auto-fading to 30% opacity after 1.5s of inactivity

## Bug Details

### Bug Condition

The bug manifests when the visual acuity assessment is active and the current `AcuitySession` component renders inside `AssessmentWrapper` → `GlassPanel` with full dashboard chrome surrounding it. The `PatientLayout` renders sidebar, header, breadcrumbs, and mobile navigation around the assessment content. The `TestingShell` reading phase dedicates only ~60% of viewport to optotypes due to progress bars, eye icons, level indicators, doctor notes, card padding, and Snellen notation labels.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { assessmentActive: boolean, viewportWidth: number, phase: TestPhase }
  OUTPUT: boolean
  
  RETURN input.assessmentActive == true
         AND input.phase IN ['instructions', 'calibration', 'duration_select', 'testing', 'results']
         AND (
           dashboardChromeRendered(input)
           OR optotypeAreaPercent(input) < 0.90
           OR (input.viewportWidth < 1024 AND NOT immersiveLaunchMode(input))
           OR (input.phase == 'testing' AND NOT topBarAutoFades(input))
           OR (input.phase == 'testing' AND NOT overflowMenuAvailable(input))
         )
END FUNCTION
```

### Examples

- **Example 1**: User starts far-vision assessment on 768px tablet in portrait. Currently: renders inline in dashboard with sidebar hidden but header/breadcrumbs visible, no landscape gate, no fullscreen. Expected: launches new tab, shows orientation gate until landscape, attempts fullscreen, renders immersive shell.
- **Example 2**: User is in reading phase on 1440px desktop. Currently: optotypes constrained to `max-w-2xl` GlassPanel with step dots, eye icons, and doctor note consuming space. Expected: immersive shell in-place, no chrome, optotypes as hero element at 90–95% viewport, minimal top bar that fades.
- **Example 3**: User wants to pause during reading phase. Currently: only inline pause/resume button at bottom of card. Expected: floating overflow menu at bottom-right with Pause, Resume, Return to Details, Return to Dashboard, Exit.
- **Example 4**: User in reading phase has not interacted for 2 seconds. Currently: timer ring, progress bar, eye badges remain at full opacity permanently. Expected: top bar faded to 30% opacity; any interaction restores full opacity.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `CalibrationStep` renders identically — credit card overlay, tap-to-set, physical sizing calculations unchanged
- `SnellenRenderer` SVG rendering uses same `pxPerMm`, `exactHeightMm`, `CAP_HEIGHT_RATIO`, Sloan spacing
- `useCalibrationSync` hook produces identical DPR/resize recalculations
- `useVisionProgression` hook progression decisions unchanged
- `useLetterTimer` hook timing, pause/resume, letter advancement unchanged
- `useAssessmentProgress` hook level/percentage calculations unchanged
- Assessment completion persists to Firestore with identical schema and payload
- `globals.css` file receives zero modifications
- `design-tokens.ts` exports remain unchanged (RADIUS, SPACING, SHADOWS, GLASS, TYPOGRAPHY, DEPTH_LAYERS)
- `PatientLayout` sidebar, header, mobile nav render unchanged for non-assessment routes
- Keyboard navigation, focus visibility, and ARIA attributes work for all interactive elements
- Mouse clicks and touch interactions on assessment controls continue to function

**Scope:**
All inputs that do NOT involve the assessment's presentation layer should be completely unaffected by this fix. This includes:
- Clinical calculations (sizing, progression, timing)
- Data persistence (Firestore reads/writes)
- Route guards and authentication logic
- Non-assessment pages (dashboard, appointments, prescriptions, profile)
- Global CSS variables and design token exports

## Hypothesized Root Cause

Based on the bug description, the root causes are architectural rather than logic errors:

1. **Single Wrapper Pattern**: `AcuitySession` uses `AssessmentWrapper` which always renders inside `PatientLayout`'s grid structure (sidebar + header + content area). There is no escape hatch to bypass dashboard chrome when immersive mode is needed.

2. **Fixed Max-Width Constraint**: `AssessmentWrapper` renders a `GlassPanel` with `max-w-2xl` (~672px) which hard-limits optotype display width regardless of available viewport.

3. **No Viewport-Responsive Launch Strategy**: The assessment page (`app/patient/assessment/visual-acuity/page.tsx`) renders as a standard Next.js page within the patient layout — it has no logic to detect compact viewports and launch differently.

4. **Permanent Full-Opacity Header Elements**: `TestingShell` renders timer ring, progress bar, eye info, and Snellen notation labels at constant full opacity with no inactivity detection or auto-fade mechanism.

5. **Missing Overflow Menu**: Only a simple inline pause/resume button exists in `TestingShell`. No floating menu component exists for additional actions (return, exit).

6. **Decorative Element Overhead**: Eye icons in colored squares, doctor note section, GlassPanel glassmorphism container, and step dots consume vertical and horizontal space that should be dedicated to optotype rendering.

## Correctness Properties

Property 1: Bug Condition - Immersive Shell Replaces Dashboard Chrome

_For any_ assessment session where the assessment is active (phase ∈ {instructions, calibration, duration_select, testing, results}), the fixed presentation layer SHALL render `AssessmentImmersiveShell` without dashboard chrome (no sidebar, no header, no breadcrumbs, no GlassPanel card container, no max-w-2xl constraint), dedicating 90–95% of viewport area to assessment content with a clean medical-grade background.

**Validates: Requirements 2.1, 2.3, 2.6**

Property 2: Bug Condition - Compact Viewport Immersive Launch

_For any_ assessment session where the viewport width is < 1024px, the fixed system SHALL launch the assessment in a new tab/window, display `AssessmentOrientationGate` when in portrait orientation, and attempt fullscreen mode via `AssessmentFullscreenController` with graceful fallback if denied.

**Validates: Requirements 2.2**

Property 3: Bug Condition - Top Bar Auto-Fade

_For any_ assessment session in the reading phase (testing phase, eyePhase == "reading") where 1.5 seconds have elapsed without user interaction (no mouse move, touch, or keyboard event), the fixed system SHALL render the minimal top bar (timer left, progress right) at 30% opacity, restoring to full opacity upon any user interaction.

**Validates: Requirements 2.3, 2.4**

Property 4: Bug Condition - Overflow Menu Availability

_For any_ assessment session in the reading phase, the fixed system SHALL render a floating `AssessmentOverflowMenu` at bottom-right providing actions: Pause, Resume, Return to Details, Return to Dashboard, and Exit.

**Validates: Requirements 2.5**

Property 5: Preservation - Clinical Logic Invariance

_For any_ input processed by clinical hooks (`useCalibrationSync`, `useVisionProgression`, `useLetterTimer`, `useAssessmentProgress`) or clinical renderers (`CalibrationStep`, `SnellenRenderer`), the fixed code SHALL produce exactly the same output as the original code — identical pxPerMm values, progression decisions, timer behavior, and SVG dimensions.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 6: Preservation - Global Systems Untouched

_For any_ evaluation of `globals.css`, `design-tokens.ts`, shared layout wrappers (`PatientLayout`, `FloatingSidebar`, `PremiumHeader`), or global padding systems, the fixed code SHALL produce identical results — these files receive zero modifications.

**Validates: Requirements 3.4, 3.5**

Property 7: Preservation - Accessibility Continuity

_For any_ interactive element in the assessment, the fixed code SHALL maintain keyboard navigation (Tab/Enter/Escape), focus visibility indicators, and appropriate ARIA attributes (`role`, `aria-label`, `aria-valuenow`, `aria-expanded`) on all controls.

**Validates: Requirements 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `modules/visual-acuity/immersive/AssessmentImmersiveShell.tsx` (NEW)

**Purpose**: Top-level immersive container that replaces `AssessmentWrapper`

**Specific Changes**:
1. **Create AssessmentImmersiveShell component**: Full-viewport wrapper with `fixed inset-0 z-50` positioning, clean medical-grade background (subtle off-white/cool-gray, no gradients or glassmorphism), flexbox column layout dedicating 90–95% to content area
2. **Integrate ImmersiveTopBar**: Internal sub-component positioned at top with timer (left) and progress indicator (right). Uses `opacity` transition with CSS `transition: opacity 300ms ease` controlled by an `isIdle` state
3. **Auto-fade mechanism**: `useEffect` sets a 1500ms inactivity timeout. Listens to `mousemove`, `touchstart`, `keydown` events on the shell container. Resets timeout on interaction, sets `isIdle = true` after 1500ms
4. **Viewport-aware rendering**: On mount, checks `window.innerWidth`. If < 1024px and rendering in the original tab context, triggers new-tab launch logic. If ≥ 1024px, renders in-place over the dashboard

---

**File**: `modules/visual-acuity/immersive/AssessmentOrientationGate.tsx` (NEW)

**Purpose**: Portrait-to-landscape instruction screen for compact viewports

**Specific Changes**:
1. **Orientation detection**: Uses `window.matchMedia('(orientation: portrait)')` listener
2. **Gate UI**: Centered card with rotate-device icon, instruction text ("Please rotate your device to landscape"), accessible messaging
3. **Auto-dismiss**: When orientation changes to landscape, gate fades out and renders children

---

**File**: `modules/visual-acuity/immersive/AssessmentFullscreenController.tsx` (NEW)

**Purpose**: Fullscreen request/release utility for compact viewports

**Specific Changes**:
1. **Fullscreen attempt**: On mount (compact viewport only), calls `document.documentElement.requestFullscreen()` wrapped in try/catch
2. **Graceful fallback**: If promise rejects (user denied, browser doesn't support), logs warning and continues without fullscreen — no error UI shown
3. **Cleanup**: On unmount, calls `document.exitFullscreen()` if currently fullscreen

---

**File**: `modules/visual-acuity/immersive/AssessmentOverflowMenu.tsx` (NEW)

**Purpose**: Floating action menu positioned bottom-right

**Specific Changes**:
1. **Toggle trigger**: Small circular button (48×48px) with three-dot/ellipsis icon at fixed `bottom-6 right-6`
2. **Menu panel**: Animated panel (Framer Motion scale+fade) with 5 actions: Pause (when running), Resume (when paused), Return to Details, Return to Dashboard, Exit Assessment
3. **Accessibility**: `role="menu"`, `aria-expanded`, keyboard navigation with Escape to close, auto-focus first item on open
4. **Action callbacks**: Accepts `onPause`, `onResume`, `onReturnToDetails`, `onReturnToDashboard`, `onExit` props

---

**File**: `modules/visual-acuity/immersive/useInactivityFade.ts` (NEW)

**Purpose**: Custom hook encapsulating the 1.5s inactivity detection logic

**Specific Changes**:
1. **Hook interface**: `useInactivityFade(containerRef: RefObject<HTMLElement>, timeoutMs?: number) => { isIdle: boolean }`
2. **Event listeners**: Attaches `mousemove`, `touchstart`, `keydown` to container element
3. **Timeout management**: Clears/resets `setTimeout` on each interaction event; sets `isIdle = true` after `timeoutMs` (default 1500ms)
4. **Cleanup**: Removes listeners and clears timeout on unmount
5. **Reduced motion**: If `prefers-reduced-motion` is active, never fades (always `isIdle = false`)

---

**File**: `modules/visual-acuity/immersive/index.ts` (NEW)

**Purpose**: Barrel export for all immersive components

---

**File**: `modules/visual-acuity/AcuitySession.tsx` (MODIFY)

**Purpose**: Switch from `AssessmentWrapper` to `AssessmentImmersiveShell`

**Specific Changes**:
1. **Replace wrapper**: Import `AssessmentImmersiveShell` instead of `AssessmentWrapper`
2. **Pass new props**: Provide timer state, progress state, phase info, and overflow menu callbacks to the shell
3. **Preserve all existing logic**: Phase state machine, Firestore persistence, session ID generation — zero changes to logic

---

**File**: `modules/visual-acuity/steps/TestingShell.tsx` (MODIFY)

**Purpose**: Remove decorative elements and chrome; delegate UI chrome to parent shell

**Specific Changes**:
1. **Remove doctor note section**: The `<div className="rounded-xl bg-[#0f4f4b]/4...">` with eye icon and doctor note text
2. **Remove Snellen notation header**: The top-center notation display (notation is now part of minimal data if needed)
3. **Remove GlassPanel card wrapper**: The `max-w-2xl mx-auto` constraint and white card container
4. **Remove inline progress bar**: Global progress bar moves to ImmersiveTopBar
5. **Remove inline pause/resume button**: Moves to AssessmentOverflowMenu
6. **Keep SnellenRenderer rendering**: The actual optotype rendering remains identical — same props, same calibration
7. **Keep timer/progress hook usage**: Hooks remain but their UI representation moves to parent shell

---

**File**: `app/patient/assessment/visual-acuity/page.tsx` (MODIFY)

**Purpose**: Add compact-viewport detection and new-tab launch logic

**Specific Changes**:
1. **Viewport check on mount**: If `window.innerWidth < 1024` and not already in immersive mode (check URL param `?immersive=1`), open `window.open()` with `?immersive=1` appended
2. **Immersive mode flag**: When `?immersive=1` is present, render without `PatientLayout` chrome (use a separate layout or conditional rendering)
3. **Large viewport (≥ 1024px)**: Render in-place with `AssessmentImmersiveShell` as an overlay (z-50 fixed positioning over dashboard content)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write component tests using Testing Library that render `AcuitySession` within a simulated viewport and assert DOM structure. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Dashboard Chrome Present**: Render assessment and assert that `GlassPanel` with `max-w-2xl` and `AssessmentWrapper` chrome elements (step dots, stage labels) ARE present (will demonstrate the bug condition)
2. **Optotype Area Constraint**: Measure rendered optotype container height vs viewport height, assert it's < 90% (will fail on unfixed code when we expect ≥ 90%)
3. **No Auto-Fade on Inactivity**: Simulate 2s of no interaction during reading phase, assert top bar opacity remains at 1.0 (demonstrates missing auto-fade)
4. **No Overflow Menu**: Query for overflow menu trigger button during reading phase, assert it does NOT exist (demonstrates missing menu)

**Expected Counterexamples**:
- Assessment renders within `GlassPanel` card with `max-w-2xl` constraint
- Optotype area is ~60% of viewport due to decorative elements
- Timer/progress elements never change opacity
- No overflow menu element exists in DOM during reading phase

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderAssessmentImmersive(input)
  ASSERT noDashboardChrome(result)
  ASSERT optotypeAreaPercent(result) >= 0.90
  ASSERT topBarAutoFades(result, afterMs=1500)
  ASSERT overflowMenuExists(result)
  IF input.viewportWidth < 1024 THEN
    ASSERT immersiveLaunchMode(result)
    ASSERT orientationGateShown(result, whenPortrait=true)
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT clinicalHookOutput_original(input) == clinicalHookOutput_fixed(input)
  ASSERT snellenRendererSVG_original(input) == snellenRendererSVG_fixed(input)
  ASSERT firestorePayload_original(input) == firestorePayload_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random calibration data sets and verifies pxPerMm calculations are unchanged
- It generates many random vision progression states and verifies level decisions are unchanged
- It catches edge cases (extreme DPR values, tiny viewports, rapid resize) that manual tests miss
- It provides strong guarantees that clinical logic is byte-identical before and after presentation changes

**Test Plan**: Observe behavior on UNFIXED code first for clinical hook outputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **SnellenRenderer SVG Invariance**: For any `(letters, exactHeightMm, calibration)` tuple, assert SVG `width`, `height`, `viewBox`, and letter positions are identical before and after
2. **useCalibrationSync Output Invariance**: For any `(calibration, dprChange, viewportResize)` scenario, assert effective calibration output is identical
3. **useLetterTimer Behavior Invariance**: For any `(totalLetters, durationMs, pauseResumeSequence)`, assert letterIndex and remainingMs at each step are identical
4. **Firestore Payload Invariance**: For any completed assessment, assert the persisted document has identical fields and values

### Unit Tests

- Test `useInactivityFade` hook: verify `isIdle` transitions to `true` after 1500ms, resets on simulated interaction
- Test `AssessmentOrientationGate`: verify gate renders in portrait, dismisses in landscape
- Test `AssessmentFullscreenController`: verify fullscreen attempt, graceful fallback on rejection
- Test `AssessmentOverflowMenu`: verify menu opens/closes, correct actions rendered, keyboard navigation works
- Test `ImmersiveTopBar`: verify timer and progress render correctly, opacity changes with `isIdle` prop

### Property-Based Tests

- Generate random `CalibrationData` objects (pxPerMm ∈ [1, 20], cardWidthPx ∈ [200, 600], dpr ∈ [1, 4]) and verify `SnellenRenderer` produces identical SVG dimensions in both old and new presentation layers
- Generate random `(totalLetters, durationMs)` pairs and verify `useLetterTimer` progression sequence is identical regardless of which shell renders around it
- Generate random interaction event sequences and verify `useInactivityFade` correctly identifies idle periods of ≥ 1500ms

### Integration Tests

- Test full assessment flow in immersive mode: calibration → duration select → testing → results, verify all phases render within immersive shell
- Test compact viewport flow: verify new tab opens with `?immersive=1`, orientation gate appears in portrait, fullscreen is attempted
- Test overflow menu actions: verify Pause/Resume toggle timer correctly, Return to Dashboard navigates, Exit closes immersive mode
- Test auto-fade during reading: simulate inactivity, verify top bar opacity transitions, simulate interaction, verify restore
- Test accessibility: verify Tab navigation through overflow menu items, Escape closes menu, focus returns to trigger, screen reader announces menu state
