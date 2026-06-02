# Implementation Plan

## Overview

Fix the missing/incorrect header logo navigation across all Eye Aura authenticated portals. Introduces a shared `HeaderLogo` component that renders consistently in Patient, Doctor, Admin, and Assessment contexts, always navigating to the public homepage (`/`) with exit confirmation during active assessments.

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Logo Missing or Navigates to Wrong Destination
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists across all portals
  - **Scoped PBT Approach**: For each portal context (patient, doctor, admin, assessment), assert logo presence and correct navigation target
  - Test that Patient layout contains an element with `alt="Eye Aura Home"` wrapped in a Link with `href="/"` (from Bug Condition: patient portal has no logo)
  - Test that Doctor layout logo Link has `href="/"` not `/doctor/dashboard` (from Bug Condition: doctor logo navigates to wrong destination)
  - Test that Admin layout logo Link has `href="/"` not `/admin/dashboard` (from Bug Condition: admin logo navigates to wrong destination)
  - Test that AssessmentImmersiveShell contains an element with `alt="Eye Aura Home"` (from Bug Condition: assessment has no logo)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples: Patient has no logo element, Doctor logo href is `/doctor/dashboard`, Admin logo href is `/admin/dashboard`, Assessment has no logo element
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Navigation Elements Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Doctor layout renders doctor name and sign-out button in header on unfixed code
  - Observe: Admin layout renders admin user info, hamburger menu toggle, and sign-out button in header on unfixed code
  - Observe: Patient layout breadcrumbs and back buttons function correctly on unfixed code
  - Observe: AssessmentImmersiveShell overflow menu (pause, resume, exit) renders and functions on unfixed code
  - Observe: Mobile bottom navigation bars render without layout shifts on unfixed code
  - Write property-based tests: for all non-logo header interactions, existing elements remain present and functional after fix
  - Write property-based tests: for all sidebar navigation links, routing targets are unchanged
  - Write property-based tests: for all assessment overflow menu actions, behavior is identical
  - Verify tests PASS on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix for header logo navigation across all portals

  - [ ] 3.1 Create the shared HeaderLogo component
    - Create `components/premium/header-logo.tsx` with props: `compact?: boolean`, `showExitDialog?: boolean`, `onExitConfirm?: () => void`, `className?: string`
    - Use Next.js `Image` with `src="/eye-aura-logo_transparent.png"` and `alt="Eye Aura Home"`
    - Wrap in Next.js `Link` with `href="/"` and `aria-label="Navigate to Eye Aura homepage"`
    - Render brand text "Eye Aura" beside logo on desktop (hidden on mobile when compact)
    - Implement responsive sizing: standard 40×40px desktop, 36×36px tablet, 32×32px mobile; compact 28×28px (24×24px mobile)
    - Implement exit confirmation dialog using Radix Dialog when `showExitDialog=true`: title "Exit Assessment?", description about losing progress, "Continue Assessment" and "Exit to Home" buttons
    - Use existing `RADIUS`, `GLASS`, `SHADOWS` design tokens for styling
    - Ensure keyboard accessibility with `focus:ring-2 focus:ring-primary focus:ring-offset-2`
    - _Bug_Condition: isBugCondition(input) where portal ∈ {patient, doctor, admin, assessment} — logo missing or wrong href_
    - _Expected_Behavior: Logo always visible with href="/" and proper accessibility attributes_
    - _Preservation: No changes to existing navigation elements, only adding new logo component_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 3.2 Export HeaderLogo from barrel file
    - Add `export { HeaderLogo } from "./header-logo"` to `components/premium/index.ts`
    - Add type export for `HeaderLogoProps` if applicable
    - _Requirements: 2.7_

  - [ ] 3.3 Update Patient layout to add logo
    - In `app/patient/layout.tsx`, import `HeaderLogo` from `@/components/premium/header-logo`
    - Add `<HeaderLogo />` to the page header area (before or alongside `PremiumHeader`)
    - No `compact` or `showExitDialog` props needed — standard rendering
    - _Bug_Condition: Patient portal has no logo — isBugCondition({portal: "patient", action: "view"}) = true_
    - _Expected_Behavior: Logo visible with href="/"_
    - _Preservation: Existing breadcrumbs and back buttons remain unchanged_
    - _Requirements: 2.1, 3.1_

  - [ ] 3.4 Update Doctor layout — replace inline logo, fix href to /
    - In `app/doctor/layout.tsx`, import `HeaderLogo` from `@/components/premium/header-logo`
    - Replace inline `<Link href="/doctor/dashboard">...<Image src="/eye.png" .../>...</Link>` with `<HeaderLogo />`
    - Remove the inline logo markup and the "Eye Aura" text span
    - Logo now links to `/` instead of `/doctor/dashboard`
    - _Bug_Condition: Doctor logo navigates to /doctor/dashboard — isBugCondition({portal: "doctor", action: "click"}) = true_
    - _Expected_Behavior: Logo navigates to /_
    - _Preservation: Doctor name and sign-out button remain in header alongside logo_
    - _Requirements: 2.2, 3.2_

  - [ ] 3.5 Update Admin layout — replace inline logo, fix href to /
    - In `app/admin/layout.tsx`, import `HeaderLogo` from `@/components/premium/header-logo`
    - Replace inline `<Link href="/admin/dashboard">...<Image src="/eye.png" .../>...</Link>` with `<HeaderLogo />`
    - Remove the inline logo markup, the "Eye Aura" heading and "Admin Portal" subtitle
    - Logo now links to `/` instead of `/admin/dashboard`
    - _Bug_Condition: Admin logo navigates to /admin/dashboard — isBugCondition({portal: "admin", action: "click"}) = true_
    - _Expected_Behavior: Logo navigates to /_
    - _Preservation: Admin user info, hamburger menu toggle, and sign-out button remain in header alongside logo_
    - _Requirements: 2.3, 3.3_

  - [ ] 3.6 Update Assessment Immersive Shell — add compact logo with exit confirmation
    - In `modules/visual-acuity/immersive/AssessmentImmersiveShell.tsx`, import `HeaderLogo`
    - Add `<HeaderLogo compact showExitDialog={phase !== "results"} onExitConfirm={handleExitToHome} />` to the top bar area (left-aligned, before timer)
    - Implement `handleExitToHome` callback that triggers existing exit navigation flow
    - When phase is "results", clicking logo navigates directly to `/` without confirmation
    - When phase is active test, clicking logo shows exit confirmation dialog
    - _Bug_Condition: Assessment has no logo — isBugCondition({portal: "assessment", action: "view"}) = true_
    - _Expected_Behavior: Compact logo visible; confirmation dialog during active test; direct navigation during results_
    - _Preservation: Existing overflow menu (pause, resume, exit) remains fully functional and unchanged_
    - _Requirements: 2.4, 2.5, 2.6, 3.4_

  - [ ] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Logo Navigates to Public Homepage
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (logo present with href="/")
    - When this test passes, it confirms the expected behavior is satisfied across all portals
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Navigation Elements Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all existing navigation (sidebar, breadcrumbs, mobile nav, overflow menu, sign-out) still works after fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run TypeScript compiler (`npx tsc --noEmit`) to verify clean compilation
  - Run full test suite to ensure no regressions
  - Verify HeaderLogo renders correctly in all portal contexts
  - Verify exit confirmation dialog works during active assessments
  - Verify direct navigation works on results screen
  - Ensure all tests pass, ask the user if questions arise.


## Task Dependency Graph

```json
{
  "waves": [
    ["1", "2"],
    ["3.1"],
    ["3.2", "3.3", "3.4", "3.5", "3.6"],
    ["3.7"],
    ["3.8"],
    ["4"]
  ]
}
```

## Notes

- Tasks 1 and 2 MUST be completed before any implementation to establish the bug condition baseline and preservation baseline
- Task 1 is expected to FAIL on unfixed code (this confirms the bug exists)
- Task 2 is expected to PASS on unfixed code (this confirms existing behavior to preserve)
- Tasks 3.3–3.6 can be done in parallel once 3.1 and 3.2 are complete
- The exit confirmation dialog in task 3.6 reuses existing Radix Dialog infrastructure
- Logo asset `/public/eye-aura-logo_transparent.png` already exists — no new assets required
