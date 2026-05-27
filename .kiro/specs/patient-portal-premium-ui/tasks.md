# Implementation Plan: Patient Portal Premium UI

## Overview

Transform the Eye Aura Patient Portal into a premium, token-driven design system with glassmorphism panels, consistent radius hierarchy, Framer Motion microinteractions, and 6 reusable components. Implementation proceeds bottom-up: design tokens → motion variants → atomic components → layout components → page integration → tests.

## Tasks

- [x] 1. Set up design token constants and motion variants
  - [x] 1.1 Create design tokens constants file
    - Create `lib/patient-portal/design-tokens.ts` with RADIUS, SPACING, SHADOWS, GLASS, and TYPOGRAPHY constant objects
    - All color references must use CSS variable syntax (`hsl(var(--...))`)
    - Export as `const` assertions for type safety
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 14.1, 14.2_

  - [x] 1.2 Create Framer Motion variants file
    - Create `lib/patient-portal/motion-variants.ts` with cardEntrance, cardHover, pageEntrance, buttonPress, fadeIn, and staggerContainer variants
    - Use custom easing curves as specified in design: `[0.25, 0.46, 0.45, 0.94]`
    - Stagger delay of 80ms between children
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 2. Implement atomic reusable components
  - [x] 2.1 Implement GlassPanel component
    - Create `components/patient-portal/glass-panel.tsx`
    - Implement padding prop with none/sm/md/lg presets
    - Implement rounded prop with 2xl/3xl/32 options
    - Apply backdrop-blur-[22px], semi-transparent card background, white/60 border, and primary shadow
    - Use Framer Motion `motion.div` for animation support
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.2 Implement StatusBadge component
    - Create `components/patient-portal/status-badge.tsx`
    - Implement 8 status variants (pending, confirmed, in_progress, completed, cancelled, requested, active, inactive)
    - Use CVA for variant management with token-derived opacity colors
    - Apply rounded-full, size variants (sm/md), uppercase tracking
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 2.3 Implement PremiumButton component
    - Create `components/patient-portal/premium-button.tsx`
    - Implement 4 variants (primary, secondary, outline, ghost) and 4 sizes (sm, md, lg, icon)
    - Use CVA for variant management
    - Apply Framer Motion whileTap scale(0.98) and whileHover translateY(-1px)
    - Support icon, trailingIcon, loading, fullWidth, and asChild props
    - Ensure minimum 44px touch target height
    - Apply focus ring using --ring token
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 15.3, 15.5_

  - [x] 2.4 Implement DashboardCard component
    - Create `components/patient-portal/dashboard-card.tsx`
    - Apply rounded-3xl, backdrop-blur-xl, card glass background, primary shadow, white border highlight
    - Implement staggered entrance animation using cardEntrance variant with staggerIndex prop
    - Implement hover translateY(-3px) animation with disableHover prop
    - Use motion.div from Framer Motion
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.1, 12.2_

  - [x] 2.5 Implement InfoRow component
    - Create `components/patient-portal/info-row.tsx`
    - Render label with uppercase tracking, xs size, muted-foreground color
    - Render value with base size, foreground color, semibold weight
    - Support optional LucideIcon prop with secondary color
    - Apply consistent spacing (gap-3 icon-text, gap-1 label-value)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 2.6 Implement SectionHeader component
    - Create `components/patient-portal/section-header.tsx`
    - Render title with lg semibold foreground styling
    - Support optional subtitle with muted-foreground color
    - Support optional trailing action element with flex justify-between layout
    - Apply consistent vertical spacing (mt-8 mb-4)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 3.3, 3.4_

  - [x] 2.7 Create barrel export file
    - Create `components/patient-portal/index.ts` exporting all components
    - _Requirements: N/A (project structure)_

- [x] 3. Checkpoint - Verify atomic components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement layout components
  - [x] 4.1 Implement MotionWrapper component
    - Create `components/patient-portal/motion-wrapper.tsx`
    - Detect `prefers-reduced-motion` media query
    - Render children with Framer Motion animations when motion is allowed
    - Render children statically (no animation) when reduced motion is preferred
    - _Requirements: 12.4, 12.5_

  - [x] 4.2 Implement PageTransition component
    - Create `components/patient-portal/page-transition.tsx`
    - Wrap page content with fade-in + upward translation entrance animation
    - Use pageEntrance motion variant from motion-variants.ts
    - Integrate with MotionWrapper for reduced-motion support
    - _Requirements: 12.3, 12.4_

  - [x] 4.3 Implement PremiumHeader component
    - Create `components/patient-portal/premium-header.tsx`
    - Apply rounded-[32px] container with internal padding
    - Implement gradient background using semi-transparent --primary and --secondary tokens
    - Apply glass overlay with backdrop-blur and semi-transparent surface
    - Include breadcrumb navigation showing current portal location
    - Apply sticky positioning at viewport top
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.4 Implement FloatingSidebar component
    - Create `components/patient-portal/floating-sidebar.tsx`
    - Render as floating GlassPanel with rounded-[32px] and soft shadow
    - Implement active nav item with filled --primary background and smooth transition
    - Implement hover animation (200ms ease background opacity)
    - Apply sticky positioning offset from top
    - Separate navigation groups with --border dividers
    - Only render on viewports >= 1024px (lg breakpoint)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 15.2_

  - [x] 4.5 Implement QuickActionsPanel component
    - Create `components/patient-portal/quick-actions-panel.tsx`
    - Render within a GlassPanel container
    - Display primary patient actions (book consultation, view appointments, view prescriptions, view profile)
    - Each action rendered as PremiumButton with icon and label
    - Apply standard hover elevation microinteraction
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 5. Checkpoint - Verify layout components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate layout and update patient pages
  - [x] 6.1 Update patient layout with premium components
    - Modify `app/patient/layout.tsx` to use PremiumHeader, FloatingSidebar, and PageTransition
    - Implement layered background with warm off-white base and radial gradient glows using --accent and --secondary tokens
    - Apply 12-column responsive grid with max-w-7xl centered container
    - Implement responsive behavior: sidebar at lg+, bottom nav below lg
    - Maintain consistent gap between sidebar and content (gap-7)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.5, 5.4, 13.1, 13.2, 13.3, 13.4, 13.5, 15.1, 15.2_

  - [x] 6.2 Update patient dashboard page with new design system
    - Update the patient dashboard page to use DashboardCard, SectionHeader, InfoRow, StatusBadge, and QuickActionsPanel
    - Apply staggered card entrance animations
    - Ensure all color values use theme tokens exclusively
    - _Requirements: 1.2, 1.5, 3.1, 3.2, 3.5, 6.4, 12.1, 14.1, 14.2, 14.5_

  - [x] 6.3 Update remaining patient portal pages
    - Update appointments, assessments, prescriptions, profile, notifications, requests, and support pages
    - Replace existing card/panel patterns with DashboardCard and GlassPanel
    - Replace existing buttons with PremiumButton
    - Replace status indicators with StatusBadge
    - Apply consistent SectionHeader and InfoRow usage
    - Ensure zero hardcoded hex values across all updated pages
    - _Requirements: 1.5, 3.5, 14.1, 14.2, 14.3, 14.5_

- [x] 7. Checkpoint - Verify integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Write unit tests and compliance tests
  - [ ]* 8.1 Write unit tests for atomic components
    - Create `__tests__/components/patient-portal/dashboard-card.test.tsx`
    - Create `__tests__/components/patient-portal/status-badge.test.tsx`
    - Create `__tests__/components/patient-portal/premium-button.test.tsx`
    - Create `__tests__/components/patient-portal/glass-panel.test.tsx`
    - Create `__tests__/components/patient-portal/info-row.test.tsx`
    - Create `__tests__/components/patient-portal/section-header.test.tsx`
    - Test correct CSS classes for each variant, prop passthrough, children rendering, accessibility attributes
    - _Requirements: 6.1–6.5, 7.1–7.4, 8.1–8.5, 9.1–9.5, 10.1–10.4, 11.1–11.4_

  - [ ]* 8.2 Write theme token compliance tests
    - Create `__tests__/components/patient-portal/theme-compliance.test.ts`
    - Verify zero hardcoded hex values in rendered component output
    - Verify all color references use CSS variable syntax
    - Verify no arbitrary Tailwind color classes (e.g., bg-blue-500)
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ]* 8.3 Write accessibility and interaction tests
    - Test minimum 44px touch targets on PremiumButton
    - Test focus indicators use --ring token on all interactive elements
    - Test prefers-reduced-motion disables animations in MotionWrapper
    - Test semantic HTML structure of components
    - _Requirements: 15.3, 15.4, 15.5, 12.4_

  - [ ]* 8.4 Write layout and responsive tests
    - Test FloatingSidebar renders at lg breakpoint and above
    - Test bottom navigation renders below lg breakpoint
    - Test max-w-7xl container is applied to main content
    - Test PremiumHeader sticky positioning
    - _Requirements: 13.4, 15.1, 15.2_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests are included — the design explicitly states PBT does not apply to UI rendering/layout features
- All unit tests use Vitest + Testing Library (project standard)
- All color values must use CSS custom properties exclusively — zero hardcoded hex values
- CVA (class-variance-authority) is used for variant management, consistent with existing project patterns

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.5", "2.6", "2.7"] },
    { "id": 2, "tasks": ["2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4"] }
  ]
}
```
