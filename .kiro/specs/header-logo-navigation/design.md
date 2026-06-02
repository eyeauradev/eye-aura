# Header Logo Navigation Bugfix Design

## Overview

The Eye Aura platform lacks consistent brand logo navigation across its authenticated portals. The Patient portal has no logo, the Doctor and Admin portals link their logos to internal dashboards rather than the public homepage, and assessment pages have zero branding. This fix introduces a single shared `HeaderLogo` component that renders the Eye Aura brand logo across all portals with consistent appearance, always navigates to the public homepage (`/`) via Next.js `Link`, supports a compact mode for assessment contexts, and shows an exit confirmation dialog when clicked during an active assessment.

## Glossary

- **Bug_Condition (C)**: The condition where a user clicks the Eye Aura logo (or expects to see one) in any authenticated portal, and the logo either doesn't exist or navigates to an internal dashboard instead of the public homepage (`/`)
- **Property (P)**: The desired behavior — the logo is always visible, uses consistent styling, and navigates to `/` (with confirmation during active assessments)
- **Preservation**: Existing back buttons, breadcrumbs, sidebar navigation, mobile bottom nav, doctor/admin header elements (name, sign-out, hamburger), and assessment exit/pause controls must remain fully functional and visually unchanged
- **HeaderLogo**: The new shared component at `components/premium/header-logo.tsx` that encapsulates all logo rendering logic
- **AssessmentImmersiveShell**: The full-viewport wrapper (`modules/visual-acuity/immersive/AssessmentImmersiveShell.tsx`) that provides the immersive assessment environment
- **Compact mode**: A prop-driven rendering variant of HeaderLogo that reduces logo dimensions for space-constrained contexts (assessment immersive shell)

## Bug Details

### Bug Condition

The bug manifests when a user is in any authenticated section of the Eye Aura platform and either (a) sees no brand logo to click, or (b) clicks the existing logo expecting to reach the public homepage but is taken to an internal dashboard instead.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { portal: "patient" | "doctor" | "admin" | "assessment", action: "view" | "click" }
  OUTPUT: boolean

  IF input.portal = "patient" AND input.action = "view"
    RETURN true   -- no logo displayed at all
  END IF

  IF input.portal = "doctor" AND input.action = "click"
    RETURN true   -- logo navigates to /doctor/dashboard instead of /
  END IF

  IF input.portal = "admin" AND input.action = "click"
    RETURN true   -- logo navigates to /admin/dashboard instead of /
  END IF

  IF input.portal = "assessment" AND input.action = "view"
    RETURN true   -- no logo displayed at all
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Patient portal**: User visits `/patient/dashboard` — no Eye Aura logo is rendered anywhere in the header. Expected: logo visible, clicking navigates to `/`.
- **Doctor portal**: User clicks the Eye Aura logo in the doctor header — navigates to `/doctor/dashboard`. Expected: navigates to `/`.
- **Admin portal**: User clicks the Eye Aura logo in the admin header — navigates to `/admin/dashboard`. Expected: navigates to `/`.
- **Assessment (active test)**: User is on the acuity testing phase — no branding visible. Expected: compact logo visible; clicking shows exit confirmation dialog before navigating to `/`.
- **Assessment (results)**: User is on the results screen — no branding visible. Expected: compact logo visible; clicking navigates directly to `/` (no confirmation needed since test is complete).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Existing back buttons and breadcrumbs in the Patient `PremiumHeader` must continue to function identically
- Doctor header must continue to display doctor name and sign-out button alongside the logo
- Admin header must continue to display admin user info, hamburger menu toggle, and sign-out button alongside the logo
- Assessment `AssessmentOverflowMenu` (pause, resume, return to details, return to dashboard, exit) must continue to work without interference
- Mobile bottom navigation bars in all portals must remain visually and functionally unchanged
- Sidebar navigation in all portals must continue routing to correct internal pages
- The existing exit confirmation dialog in `AcuitySession` (triggered by overflow menu) must remain functional

**Scope:**
All interactions that do NOT involve clicking the header logo should be completely unaffected by this fix. This includes:
- Sidebar link clicks
- Breadcrumb navigation
- Mobile bottom nav taps
- Back button usage
- Assessment overflow menu actions
- Sign-out button clicks
- Any non-logo header element interaction

## Hypothesized Root Cause

Based on the bug description, the issues are:

1. **No shared logo component exists**: Each layout (Doctor, Admin) implements its own inline logo markup with hard-coded `href` values pointing to internal dashboards. The Patient layout and assessment shell have no logo implementation at all.

2. **Incorrect navigation targets**: The Doctor layout links logo to `/doctor/dashboard` and Admin layout links logo to `/admin/dashboard` — both using `<Link href="/doctor/dashboard">` and `<Link href="/admin/dashboard">` respectively, instead of `/`.

3. **Missing logo in Patient layout**: The `PatientLayout` component in `app/patient/layout.tsx` has a `PremiumHeader` with title/breadcrumbs but no logo element in the page header area.

4. **Missing logo in Assessment shell**: The `AssessmentImmersiveShell` only renders a timer/progress top bar and overflow menu — no branding element exists.

5. **No exit-confirmation integration for logo**: Assessment exit confirmation logic currently only triggers from the `AssessmentOverflowMenu` — no mechanism exists for a logo click to trigger the same confirmation flow.

## Correctness Properties

Property 1: Bug Condition - Logo Navigates to Public Homepage

_For any_ portal context (Patient, Doctor, Admin, Assessment-results) where the user clicks the HeaderLogo component, the system SHALL navigate to the public homepage (`/`) using a Next.js `<Link>` element with `href="/"`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.6**

Property 2: Bug Condition - Assessment Exit Confirmation

_For any_ assessment context where the test phase is active (not "results") and the user clicks the HeaderLogo, the system SHALL display a confirmation dialog with title "Exit Assessment?", message about losing progress, and "Continue Assessment" / "Exit to Home" actions — navigating to `/` only after explicit "Exit to Home" confirmation.

**Validates: Requirements 2.4, 2.5**

Property 3: Preservation - Existing Navigation Elements Unchanged

_For any_ interaction with non-logo navigation elements (sidebar links, breadcrumbs, mobile bottom nav, back buttons, assessment overflow menu, sign-out buttons), the system SHALL produce exactly the same behavior as before the fix, preserving all existing routing and UI state management.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `components/premium/header-logo.tsx` (NEW)

**Component**: `HeaderLogo`

**Specific Changes**:
1. **Create shared HeaderLogo component**: A new component with the following props interface:
   ```typescript
   interface HeaderLogoProps {
     compact?: boolean;           // Renders smaller for assessment contexts
     onExitConfirm?: () => void;  // Callback when exit is confirmed during assessment
     showExitDialog?: boolean;    // Whether to show confirmation before navigating
     className?: string;          // Additional styling
   }
   ```
   - Uses Next.js `Image` component with `src="/eye-aura-logo_transparent.png"`
   - Wraps in Next.js `Link` with `href="/"`
   - `alt="Eye Aura Home"` for accessibility
   - Renders brand text "Eye Aura" beside logo on desktop (hidden on mobile when compact)
   - Responsive sizing: desktop 40×40px, tablet 36×36px, mobile 32×32px; compact mode: 28×28px across all breakpoints

2. **Exit Confirmation Dialog**: When `showExitDialog` is true, clicking the logo opens a Radix Dialog (using existing `components/ui/dialog.tsx`) instead of navigating immediately:
   - Title: "Exit Assessment?"
   - Description: "You have an assessment in progress. Leaving now may result in losing your progress."
   - Actions: "Continue Assessment" (closes dialog) | "Exit to Home" (calls `onExitConfirm` then navigates to `/`)
   - Uses existing `RADIUS`, `GLASS`, and `SHADOWS` design tokens for consistent styling

3. **Update Patient layout** (`app/patient/layout.tsx`):
   - Import `HeaderLogo` from `@/components/premium/header-logo`
   - Add logo before the `PremiumHeader` component or integrate into the existing layout flow at the top of the page container
   - No `compact` or `showExitDialog` props needed — standard rendering

4. **Update Doctor layout** (`app/doctor/layout.tsx`):
   - Replace inline `<Link href="/doctor/dashboard">...<Image src="/eye.png" .../>...</Link>` with `<HeaderLogo />`
   - Remove the inline logo markup and the "Eye Aura" text span
   - The logo now links to `/` instead of `/doctor/dashboard`

5. **Update Admin layout** (`app/admin/layout.tsx`):
   - Replace inline `<Link href="/admin/dashboard">...<Image src="/eye.png" .../>...</Link>` with `<HeaderLogo />`
   - Remove the inline logo markup, the "Eye Aura" heading and "Admin Portal" subtitle
   - The logo now links to `/` instead of `/admin/dashboard`

6. **Update Assessment Immersive Shell** (`modules/visual-acuity/immersive/AssessmentImmersiveShell.tsx`):
   - Add `HeaderLogo` with `compact` prop to the top bar area (left-aligned, before timer)
   - Pass `showExitDialog` based on whether phase is NOT "results"
   - Pass `onExitConfirm` callback that triggers existing exit navigation flow

7. **Export from barrel file** (`components/premium/index.ts`):
   - Add `export { HeaderLogo } from "./header-logo"` and type export

### Logo Asset Selection

Use existing `/public/eye-aura-logo_transparent.png` as the primary logo asset. This provides:
- Transparent background for compatibility with glass-morph headers
- Consistent with brand guidelines
- Already available in the public directory (no new asset needed)

### Responsive Sizing Strategy

| Context | Desktop (≥1024px) | Tablet (768-1023px) | Mobile (<768px) |
|---------|-------------------|---------------------|-----------------|
| Standard (Patient/Doctor/Admin) | 40×40px + brand text | 36×36px + brand text | 32×32px, text hidden |
| Compact (Assessment) | 28×28px, no text | 28×28px, no text | 24×24px, no text |

### Accessibility Requirements

- `alt="Eye Aura Home"` on the Image element
- `aria-label="Navigate to Eye Aura homepage"` on the wrapping Link
- Logo must be keyboard-focusable and activatable via Enter/Space (inherited from `<Link>`)
- Focus ring uses existing `focus:ring-2 focus:ring-primary focus:ring-offset-2` pattern
- Exit confirmation dialog uses Radix Dialog for proper focus trapping and screen reader announcements
- Dialog buttons have descriptive text (no icon-only actions)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write component tests that render each layout and check for logo presence, navigation target, and accessibility attributes. Run these tests on the UNFIXED code to observe failures and confirm root causes.

**Test Cases**:
1. **Patient Layout Logo Missing**: Render `PatientLayout` and query for an element with `alt="Eye Aura Home"` — will fail on unfixed code (no logo exists)
2. **Doctor Layout Wrong Navigation**: Render `DoctorLayout` and check the logo link `href` — will find `/doctor/dashboard` instead of `/` on unfixed code
3. **Admin Layout Wrong Navigation**: Render `AdminLayout` and check the logo link `href` — will find `/admin/dashboard` instead of `/` on unfixed code
4. **Assessment Shell Logo Missing**: Render `AssessmentImmersiveShell` and query for logo — will fail on unfixed code (no logo exists)

**Expected Counterexamples**:
- Patient portal: no element with `alt="Eye Aura Home"` found in DOM
- Doctor portal: logo link href is `/doctor/dashboard`, not `/`
- Admin portal: logo link href is `/admin/dashboard`, not `/`
- Assessment shell: no logo element found in DOM

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderLayout(input.portal)
  logo := queryByAltText(result, "Eye Aura Home")
  ASSERT logo IS NOT null
  link := getParentLink(logo)
  ASSERT link.href = "/"
  IF input.portal = "assessment" AND phase != "results" THEN
    simulateClick(logo)
    dialog := queryByRole(result, "dialog")
    ASSERT dialog IS NOT null
    ASSERT dialog.title = "Exit Assessment?"
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderLayout_original(input) = renderLayout_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various pathnames, user states, viewport sizes)
- It catches edge cases that manual unit tests might miss (e.g., specific breadcrumb combinations, mobile nav interactions)
- It provides strong guarantees that behavior is unchanged for all non-logo interactions

**Test Plan**: Observe behavior on UNFIXED code first for sidebar clicks, breadcrumbs, mobile nav, and assessment controls, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Sidebar Navigation Preservation**: Verify all sidebar links in Patient/Doctor/Admin portals continue to route correctly after the fix
2. **Breadcrumb Navigation Preservation**: Verify Patient portal breadcrumbs continue linking to correct pages
3. **Mobile Bottom Nav Preservation**: Verify mobile nav items continue working without layout shifts
4. **Assessment Controls Preservation**: Verify overflow menu pause/resume/exit actions work identically after logo addition
5. **Sign-out Button Preservation**: Verify Doctor/Admin sign-out buttons continue functioning alongside the new logo
6. **Header Layout Preservation**: Verify Doctor name display and Admin user info remain in the header

### Unit Tests

- Test `HeaderLogo` renders with correct `alt` text and `href="/"`
- Test `HeaderLogo` in compact mode renders smaller dimensions
- Test `HeaderLogo` with `showExitDialog=true` shows confirmation dialog on click
- Test exit confirmation dialog "Continue Assessment" button closes dialog without navigation
- Test exit confirmation dialog "Exit to Home" button triggers `onExitConfirm` and navigates
- Test `HeaderLogo` with `showExitDialog=false` navigates directly on click
- Test logo is keyboard-accessible (focusable, activatable)

### Property-Based Tests

- Generate random portal contexts and verify HeaderLogo always renders with `href="/"`
- Generate random assessment phases and verify exit dialog shows only during active phases (not "results")
- Generate random viewport widths and verify logo sizing is responsive and within expected bounds
- Generate random user interaction sequences on non-logo elements and verify behavior is identical pre/post fix

### Integration Tests

- Test Patient portal full flow: load dashboard → verify logo visible → click logo → arrives at `/`
- Test Doctor portal full flow: load dashboard → verify logo visible → click logo → arrives at `/` (not `/doctor/dashboard`)
- Test Admin portal full flow: load dashboard → verify logo visible → click logo → arrives at `/` (not `/admin/dashboard`)
- Test Assessment active test flow: start test → verify compact logo visible → click logo → confirmation dialog → "Continue Assessment" → test continues → "Exit to Home" → arrives at `/`
- Test Assessment results flow: complete test → verify compact logo visible → click logo → arrives at `/` directly (no dialog)
- Test coexistence: verify logo and breadcrumbs both render, clicking breadcrumbs still routes internally while logo routes to `/`
