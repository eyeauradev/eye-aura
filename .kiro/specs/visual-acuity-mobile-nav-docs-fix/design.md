# Visual Acuity Mobile/Nav/Docs Bugfix Design

## Overview

This design addresses four interconnected bugs in the Eye Aura platform: (1) the Snellen test 3-column layout is cramped on mobile viewports, (2) optotype physical sizing does not recalculate when DPR/resize/orientation changes, (3) doctor and admin modules lack a navigation path back to the public home page, and (4) architecture documentation is out of sync with the current implementation. The fix strategy is minimal and targeted — each bug is resolved with the smallest change that restores correct behavior while preserving all existing functionality on unaffected code paths.

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger one of the four bugs — mobile viewport for layout, DPR/resize/orientation change for calibration, doctor/admin module context for navigation, and documentation read for docs
- **Property (P)**: The desired correct behavior when the bug condition holds — responsive 2-row layout, recalculated pxPerMm, visible Public Home link, accurate documentation
- **Preservation**: Existing behavior that must remain unchanged — desktop 3-column layout, credit card calibration accuracy, existing nav items, patient module behavior, design token usage
- **TestingShell**: The component in `modules/visual-acuity/steps/TestingShell.tsx` that renders the 3-column reading phase layout (eye info | chart | timer)
- **SnellenRenderer**: The component in `modules/visual-acuity/SnellenRenderer.tsx` that renders SVG optotypes with calibrated physical sizing
- **CalibrationData**: The interface holding `pxPerMm`, `cardWidthPx`, `deviceWidth`, `deviceHeight`, `dpr`, and `timestamp`
- **pxPerMm**: CSS pixels per physical millimeter, derived from credit card calibration
- **FloatingSidebar**: The shared glass navigation component in `components/premium/floating-sidebar.tsx`
- **NavItem**: The interface for sidebar navigation entries (`label`, `href`, `icon`, `group`)

## Bug Details

### Bug Condition

The bugs manifest across four distinct conditions:

**Bug 1 — Mobile Layout**: When the Snellen test reading phase renders on a viewport < 768px, the 3-column flex layout (`w-28 | flex-1 | w-28`) compresses the center chart area to approximately `viewport - 56px - 56px - gaps`, making optotypes cramped and unreadable.

**Bug 2 — DPR/Resize Recalculation**: When the device pixel ratio changes (monitor switch, pinch-zoom) or the viewport is resized/rotated after calibration, the `CalibrationData.pxPerMm` value becomes stale because no listener triggers recalculation.

**Bug 3 — Navigation Dead-Ends**: When a user is inside `/doctor/*` or `/admin/*`, neither the `doctorNavItems` nor `adminNavItems` arrays include a link to `/` (public home), creating a dead-end.

**Bug 4 — Documentation Drift**: When documentation files are read, they present outdated information that does not reflect the premium design system, doctor/admin revamp, visual acuity architecture, or payment flows.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { context: "layout" | "calibration" | "navigation" | "docs", viewport?: number, dprChanged?: boolean, resized?: boolean, orientationChanged?: boolean, module?: string }
  OUTPUT: boolean
  
  IF input.context == "layout" THEN
    RETURN input.viewport < 768
  ELSE IF input.context == "calibration" THEN
    RETURN input.dprChanged OR input.resized OR input.orientationChanged
  ELSE IF input.context == "navigation" THEN
    RETURN input.module IN ["doctor", "admin"]
  ELSE IF input.context == "docs" THEN
    RETURN true  // docs are always stale until fixed
  END IF
  
  RETURN false
END FUNCTION
```

### Examples

- **Mobile Layout**: On iPhone 14 (390px wide), the 3-column layout gives the chart only ~250px after subtracting two `w-28` (112px each) columns and gaps — optotypes for 20/200 (8.73mm height) render at correct physical size but overflow or get clipped
- **DPR Change**: User calibrates on a 1x DPR external monitor (pxPerMm = 3.27), then drags the browser to a 2x Retina display — optotypes render at half their intended physical size because pxPerMm is not recalculated
- **Orientation Change**: User calibrates in portrait on iPad, rotates to landscape — `deviceWidth` and `deviceHeight` swap but `pxPerMm` remains unchanged, causing incorrect sizing
- **Navigation Dead-End**: Doctor finishes reviewing patients at `/doctor/patients` and wants to return to the public landing page — no link exists; they must manually type `/` in the URL bar
- **Documentation**: Developer reads `EYE_AURA_MASTER_ARCHITECTURE.md` expecting to find the premium design token system but finds no mention of `GLASS`, `SHADOWS`, `TYPOGRAPHY`, `SPACING`, `RADIUS`, or `DEPTH_LAYERS`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Desktop 3-column layout (viewport >= 768px) in TestingShell must continue rendering as-is
- Credit card calibration method using ISO/IEC 7810 ID-1 (85.60mm x 53.98mm) must produce identical pxPerMm values
- SVG rendering with exact numeric width/height, CAP_HEIGHT_RATIO = 0.711, Sloan spacing, and geometricPrecision must remain unchanged
- All existing doctor nav items (Dashboard, Appointments, Requests, Patients, Prescriptions, Slots, Profile) must remain in their current order
- All existing admin nav items (Dashboard, Doctors, Services, Assessments, Appointments, Users, Payments, Analytics, Settings) must remain in their current order
- Patient module's existing "Public Home" link and all navigation behavior must remain unchanged
- Premium design system tokens (GLASS, SHADOWS, TYPOGRAPHY, SPACING, RADIUS, DEPTH_LAYERS) must continue to be used without hardcoded colors
- Visual acuity phase flow (type_select → instructions → calibration → duration_select → testing → results) must remain unaltered
- Timer engine, self-report mechanism, and useLetterTimer/useAssessmentProgress hooks must remain unchanged

**Scope:**
All inputs that do NOT involve mobile viewport testing layout, DPR/resize/orientation changes post-calibration, doctor/admin module navigation, or documentation reads should be completely unaffected by this fix. This includes:
- Desktop viewport rendering of the Snellen test
- Initial calibration flow (credit card matching)
- Patient module navigation
- All assessment logic (timer, progression, results)
- Near vision testing (NearTestingStep)

## Hypothesized Root Cause

Based on the bug analysis, the root causes are:

1. **Fixed-Width Columns on Mobile (Bug 1)**: `TestingShell.tsx` uses `w-28 flex-shrink-0` for both left (eye info) and right (timer) columns unconditionally. On mobile, these 112px × 2 = 224px of fixed space plus gaps leaves insufficient room for the chart. The layout needs a responsive breakpoint to stack into rows below 768px.

2. **No DPR/Resize Listener (Bug 2)**: `CalibrationStep.tsx` computes `pxPerMm` once during calibration and stores it in `CalibrationData`. Neither `SnellenRenderer` nor `TestingShell` listens for `window.devicePixelRatio` changes, `resize` events, or `orientationchange` events to trigger recalculation. The `pxPerMm` value is treated as immutable after calibration.

3. **Missing NavItem Entry (Bug 3)**: The `doctorNavItems` array in `app/doctor/layout.tsx` and `adminNavItems` array in `app/admin/layout.tsx` simply do not include a `{ label: "Public Home", href: "/", icon: Home }` entry. The `mobileNavItems` subsets also omit it.

4. **Documentation Not Updated (Bug 4)**: Recent commits adding the premium design system, doctor/admin revamp, assessment architecture, and payment flows did not include corresponding documentation updates to `docs/EYE_AURA_MASTER_ARCHITECTURE.md` and `docs/EYE_AURA_MASTER_REFERENCE.md`.

## Correctness Properties

Property 1: Bug Condition - Mobile Layout Responsiveness

_For any_ viewport width < 768px where the Snellen test reading phase is displayed, the fixed TestingShell component SHALL render a 2-row layout with Row 1 containing eye info and timer side-by-side, and Row 2 containing the Snellen chart at full container width, ensuring the chart area receives maximum horizontal space.

**Validates: Requirements 2.1**

Property 2: Bug Condition - DPR/Resize/Orientation Recalculation

_For any_ environment change (DPR change, viewport resize, or orientation change) occurring after calibration, the fixed calibration system SHALL recalculate pxPerMm using the ratio of current physical measurements to CSS pixels, and the SnellenRenderer SHALL re-render optotypes with updated dimensions within a smooth CSS transition (no jarring visual jumps).

**Validates: Requirements 2.2, 2.3**

Property 3: Bug Condition - Navigation Public Home Link

_For any_ user session inside the doctor module (/doctor/*) or admin module (/admin/*), the fixed layout SHALL display a "Public Home" navigation item linking to "/" in both the desktop sidebar and mobile navigation, consistent with the patient module's existing implementation.

**Validates: Requirements 2.4, 2.5**

Property 4: Preservation - Existing Layout and Behavior

_For any_ input where none of the bug conditions hold (desktop viewport >= 768px, no DPR/resize/orientation change, patient module navigation, non-documentation reads), the fixed code SHALL produce exactly the same behavior as the original code, preserving the 3-column desktop layout, credit card calibration accuracy, existing nav items, phase flow, timer engine, and design token usage.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `modules/visual-acuity/steps/TestingShell.tsx`

**Function**: `TestingShell` (reading phase JSX)

**Specific Changes**:
1. **Responsive Layout Breakpoint**: Replace the unconditional 3-column flex layout with a responsive structure:
   - Below `md` (< 768px): Render a 2-row layout — Row 1 is a flex row with eye info (left) and timer (right) side-by-side; Row 2 is the Snellen chart at full width
   - At `md` and above (>= 768px): Preserve the existing 3-column layout exactly as-is
   - Use Tailwind responsive classes (`md:flex-row`, `flex-col`, etc.) to avoid JS-based breakpoint detection

2. **Mobile Column Sizing**: On mobile, remove `w-28 flex-shrink-0` from left/right columns and instead use a compact horizontal bar with `flex items-center justify-between` for the top row

---

**File**: `modules/visual-acuity/engine/useCalibrationSync.ts` (NEW)

**Function**: `useCalibrationSync` (new custom hook)

**Specific Changes**:
3. **DPR/Resize/Orientation Listener Hook**: Create a new hook that:
   - Accepts current `CalibrationData` and a callback `onRecalibrate(newData: CalibrationData)`
   - Listens for `resize`, `orientationchange`, and `matchMedia('(resolution: Xdpi)')` change events
   - On trigger, computes new `pxPerMm` by scaling the original calibration: `newPxPerMm = calibration.cardWidthPx / CARD_WIDTH_MM` adjusted for the DPR ratio change (`newDpr / calibration.dpr`)
   - Debounces recalculation (300ms) to avoid excessive re-renders
   - Returns the current effective `CalibrationData` (either original or recalculated)

4. **Smooth Transition on Recalculation**: Add a CSS `transition: width 0.3s ease, height 0.3s ease` to the SnellenRenderer's SVG container so size changes from recalculation animate smoothly rather than jumping

---

**File**: `modules/visual-acuity/steps/TestingShell.tsx`

**Function**: `TestingShell`

**Specific Changes**:
5. **Integrate useCalibrationSync**: Call the new hook in TestingShell, passing the calibration prop. Use the returned effective calibration when rendering SnellenRenderer. This ensures optotypes stay physically accurate across environment changes.

---

**File**: `app/doctor/layout.tsx`

**Specific Changes**:
6. **Add Public Home NavItem**: Add `{ label: "Public Home", href: "/", icon: Home, group: "home" }` as the first entry in `doctorNavItems` array. Add the same entry to `mobileNavItems` array. Import `Home` from `lucide-react`.

---

**File**: `app/admin/layout.tsx`

**Specific Changes**:
7. **Add Public Home NavItem**: Add `{ label: "Public Home", href: "/", icon: Home, group: "home" }` as the first entry in `adminNavItems` array. Ensure it appears in the mobile bottom nav and slide-out drawer. Import `Home` from `lucide-react`.

---

**Files**: `docs/EYE_AURA_MASTER_ARCHITECTURE.md`, `docs/EYE_AURA_MASTER_REFERENCE.md`

**Specific Changes**:
8. **Full Documentation Audit**: Update both documents to accurately reflect:
   - Premium design system tokens (GLASS, SHADOWS, TYPOGRAPHY, SPACING, RADIUS, DEPTH_LAYERS)
   - Doctor/admin layout revamp (FloatingSidebar, PageTransition, glass header, mobile bottom nav)
   - Visual acuity assessment architecture (calibration pipeline, SVG rendering, session flow, timer engine)
   - Payment flows and service architecture
   - Navigation structure including Public Home links
   - Responsive behavior and breakpoint system
   - Module structures and component hierarchy

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write component tests that render TestingShell at mobile viewport widths and assert layout structure. Write unit tests that simulate DPR changes and verify pxPerMm staleness. Inspect doctor/admin nav arrays for missing home link. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Mobile Layout Test**: Render TestingShell at 390px viewport width, assert that the chart container width is less than 200px (cramped) — will fail on unfixed code by demonstrating the problem
2. **DPR Change Test**: Create CalibrationData with dpr=1, simulate window.devicePixelRatio changing to 2, assert pxPerMm is NOT recalculated (will confirm bug on unfixed code)
3. **Resize Test**: Create CalibrationData at 1920x1080, simulate resize to 1024x768, assert CalibrationData remains stale (will confirm bug on unfixed code)
4. **Navigation Test**: Assert `doctorNavItems` does not contain an entry with `href: "/"` (will confirm bug on unfixed code)
5. **Admin Navigation Test**: Assert `adminNavItems` does not contain an entry with `href: "/"` (will confirm bug on unfixed code)

**Expected Counterexamples**:
- Chart area receives insufficient width on mobile due to fixed w-28 columns
- pxPerMm value never changes after initial calibration regardless of environment changes
- No navigation item with href "/" exists in doctor or admin nav arrays

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.context == "layout" THEN
    result := renderTestingShell(viewport=input.viewport)
    ASSERT result.layout == "2-row"
    ASSERT result.chartWidth == containerWidth  // full width
  ELSE IF input.context == "calibration" THEN
    result := useCalibrationSync(calibration, newEnvironment)
    ASSERT result.pxPerMm != calibration.pxPerMm  // recalculated
    ASSERT result.pxPerMm == expectedPxPerMm(newEnvironment)
  ELSE IF input.context == "navigation" THEN
    result := getNavItems(input.module)
    ASSERT result.contains({ href: "/" })
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderTestingShell_original(input) = renderTestingShell_fixed(input)
  ASSERT calibrationBehavior_original(input) = calibrationBehavior_fixed(input)
  ASSERT navItems_original(input).existingItems = navItems_fixed(input).existingItems
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many viewport widths >= 768px to verify desktop layout is unchanged
- It generates many CalibrationData configurations to verify initial calibration is unaffected
- It catches edge cases at boundary values (exactly 768px, DPR = 1.0 unchanged)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for desktop viewports, stable calibration, and existing nav items, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Desktop Layout Preservation**: For any viewport >= 768px, verify TestingShell renders 3-column layout with w-28 side columns
2. **Calibration Accuracy Preservation**: For any CalibrationData where DPR has NOT changed, verify pxPerMm remains identical
3. **Existing Nav Items Preservation**: Verify all original doctor nav items remain in order after adding Public Home
4. **Existing Admin Nav Items Preservation**: Verify all original admin nav items remain in order after adding Public Home
5. **SVG Rendering Preservation**: For any exactHeightMm and pxPerMm, verify SnellenRenderer produces identical SVG dimensions

### Unit Tests

- Test TestingShell renders 2-row layout at viewport widths 320, 375, 390, 414, 428, 540, 767
- Test TestingShell renders 3-column layout at viewport widths 768, 1024, 1280, 1440, 1920
- Test useCalibrationSync recalculates pxPerMm when DPR changes from 1→2, 2→1, 1→3
- Test useCalibrationSync recalculates on resize event (debounced at 300ms)
- Test useCalibrationSync recalculates on orientationchange event
- Test useCalibrationSync does NOT recalculate when DPR/size remain unchanged
- Test doctor layout includes Public Home as first nav item
- Test admin layout includes Public Home as first nav item
- Test Public Home link navigates to "/"
- Test smooth CSS transition is applied to SVG container during recalculation

### Property-Based Tests

- Generate random viewport widths (300–2000px) and verify layout mode matches breakpoint rule (< 768 → 2-row, >= 768 → 3-column)
- Generate random CalibrationData (pxPerMm 1.0–10.0, dpr 1–4) and random DPR changes, verify recalculated pxPerMm = cardWidthPx / CARD_WIDTH_MM × (newDpr / originalDpr) relationship holds
- Generate random nav item arrays and verify adding Public Home preserves all existing items in original order
- Generate random exactHeightMm values (0.5–90mm) and verify SnellenRenderer SVG dimensions are deterministic given same calibration

### Integration Tests

- Test full visual acuity flow on mobile viewport: calibrate → test → verify chart is readable (full width)
- Test DPR change mid-test: calibrate on 1x → switch to 2x → verify optotypes resize smoothly
- Test doctor module navigation: login → navigate to patients → click Public Home → verify lands on "/"
- Test admin module navigation: login → navigate to settings → click Public Home → verify lands on "/"
- Test orientation change: calibrate in portrait → rotate to landscape → verify optotypes recalculate
