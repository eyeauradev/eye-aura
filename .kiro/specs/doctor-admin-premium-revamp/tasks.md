# Implementation Plan: Doctor & Admin Premium Revamp

## Overview

This plan implements the premium design language revamp across Doctor and Admin modules by: (1) extracting the shared design token system and component library, (2) building new premium components, (3) revamping module layouts, dashboards, and page-level UIs, and (4) enforcing design constraints via static analysis and unit tests. All implementation uses TypeScript with Next.js, Tailwind CSS, and Framer Motion.

## Tasks

- [x] 1. Extract shared design token system and motion variants
  - [x] 1.1 Relocate design tokens to shared path and create re-exports
    - Move `lib/patient-portal/design-tokens.ts` content to `lib/design-tokens.ts`
    - Replace `lib/patient-portal/design-tokens.ts` with a re-export file: `export * from '../design-tokens'`
    - Ensure RADIUS, SPACING, SHADOWS, GLASS, TYPOGRAPHY constants are exported from the shared path
    - Verify all existing Patient Portal imports continue to resolve
    - _Requirements: 1.1, 1.2, 1.4, 17.1_

  - [x] 1.2 Create shared motion variants module
    - Create `lib/motion-variants.ts` with all existing motion variants (cardEntrance, cardHover, pageEntrance, buttonPress, fadeIn, staggerContainer)
    - Add new variants: tableRowEntrance, modalEntrance, modalExit, tabIndicator, statusTransition
    - Create `lib/patient-portal/motion-variants.ts` as a re-export for backward compatibility
    - _Requirements: 2.4, 15.1, 15.2, 15.3, 15.5_

- [x] 2. Extract and extend shared component library
  - [x] 2.1 Relocate premium components to shared path and create re-exports
    - Move all components from `components/patient-portal/` to `components/premium/`
    - Create `components/premium/index.ts` barrel file exporting all components
    - Create `components/patient-portal/index.ts` as a re-export from `components/premium/`
    - Verify existing Patient Portal imports resolve correctly
    - _Requirements: 2.1, 2.5_

  - [x] 2.2 Implement MetricCard component
    - Create `components/premium/metric-card.tsx` with MetricCardProps interface
    - Render icon, value, label, and optional trend indicator within a DashboardCard
    - Apply cardEntrance animation with stagger support and whileHover translateY -2px
    - Use TYPOGRAPHY tokens for value (heading) and label (label) styling
    - Export from barrel file
    - _Requirements: 2.2, 2.3, 2.6, 4.1, 4.5, 8.1, 8.4_

  - [x] 2.3 Implement PremiumTable component
    - Create `components/premium/premium-table.tsx` with PremiumTableProps<T> generic interface
    - Render within GlassPanel with TYPOGRAPHY.label headers, 16px row padding, --border bottom borders
    - Implement row hover animation (bg-primary/8), selected row 3px left-border accent
    - Add staggered row entrance animations (30-50ms delay)
    - Implement pagination controls with PremiumButton
    - Implement empty state message rendering
    - Render card-based list view on mobile (<768px)
    - Export from barrel file
    - _Requirements: 2.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 15.6, 18.6_

  - [x] 2.4 Implement PremiumInput component
    - Create `components/premium/premium-input.tsx` with PremiumInputProps interface
    - Render with rounded-2xl, 12px/16px padding, --border border
    - Implement focus state: border to --ring with outer glow (0 0 0 3px ring/20)
    - Implement error state: --destructive border and error text below
    - Render labels with TYPOGRAPHY.label style, 6px bottom margin
    - Support disabled state with opacity 0.5 and pointer-events-none
    - Export from barrel file
    - _Requirements: 2.2, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 2.5 Implement PremiumModal component
    - Create `components/premium/premium-modal.tsx` with PremiumModalProps interface
    - Render with glass panel background (backdrop-blur-[22px], bg-card/82), rounded-3xl, max-width 560px
    - Implement entrance animation: fade-in + scale 0.95→1.0 over 200ms
    - Implement exit animation: fade-out + scale 1.0→0.95 over 150ms
    - Render backdrop with bg-background/50 and backdrop-blur-sm
    - Dismiss on backdrop click and Escape key
    - Render title (TYPOGRAPHY.subheading), optional subtitle, children, and action buttons
    - Export from barrel file
    - _Requirements: 2.2, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 2.6 Implement PremiumTabs component
    - Create `components/premium/premium-tabs.tsx` with PremiumTabsProps interface
    - Render tab items with SPACING token padding, min-height 44px
    - Implement animated active indicator using Framer Motion layoutId (spring, ≤300ms)
    - Support underline (2px bottom border) and pill (rounded-full background) variants
    - Implement keyboard navigation: arrow keys for focus, Enter/Space for activation
    - Derive all colors from theme tokens (active: --primary, inactive: --muted-foreground)
    - Export from barrel file
    - _Requirements: 2.2, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 2.7 Update FloatingSidebar for shared usage
    - Update `components/premium/floating-sidebar.tsx` to accept NavItem[] and activeHref props
    - Implement prefix-matching for activeHref to support nested routes
    - Ensure hover states use bg-muted/50 with 200ms transition
    - Maintain sticky positioning with top-24 (96px)
    - Render group dividers at 50% opacity of --border with 8px vertical margin
    - Active item: filled --primary background, --primary-foreground text, 200ms ease transition
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [x] 3. Checkpoint - Shared library complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Doctor Module layout and pages revamp
  - [x] 4.1 Implement Doctor Module layout
    - Create/update `app/doctor/layout.tsx` with glass header, FloatingSidebar, and responsive behavior
    - Desktop (≥1024px): Glass header (sticky, backdrop-blur) + FloatingSidebar + main content
    - Tablet (768px–1023px): Glass header + icon-only collapsed sidebar + bottom nav
    - Mobile (<768px): Glass header + bottom nav + slide-out drawer sidebar
    - Apply SPACING tokens for all padding and gaps
    - Ensure zero hardcoded color values
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 18.1, 18.2, 18.3_

  - [x] 4.2 Implement Doctor Dashboard page
    - Create/update `app/doctor/dashboard/page.tsx` with MetricCard grid (1/2/4 columns responsive)
    - Render appointment overview with DashboardCard staggered entrance animations (50-100ms delay)
    - Render recent patients section with DashboardCard + StatusBadge
    - Render action center with GlassPanel + PremiumButton quick actions
    - Use SectionHeader for all section titles with SPACING vertical rhythm
    - Implement error state with retry PremiumButton
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 15.1, 15.2_

  - [x] 4.3 Implement Doctor Appointments page
    - Create/update `app/doctor/appointments/page.tsx` with PremiumTabs filter controls
    - Render appointment cards as DashboardCard with avatar, name, type, date, time, StatusBadge
    - Apply staggered fade-up entrance animations on load and filter change
    - Implement hover elevation increase (shadow + translateY -2px)
    - Render appointment detail view with GlassPanel containers and SPACING tokens
    - Implement empty state for zero-result filters
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 15.1, 15.2_

  - [x] 4.4 Implement Doctor Consultation interface
    - Create/update consultation page with GlassPanel patient sidebar
    - Style patient name with TYPOGRAPHY.subheading, metadata with TYPOGRAPHY.label
    - Render action buttons as PremiumButton (primary + outline variants)
    - Hide main sidebar during active consultations, use full viewport width
    - Apply SPACING.cardPadding and SPACING.cardGap
    - Animate status transitions with Framer Motion fade (200ms)
    - Collapse patient sidebar to top summary bar on mobile (<1024px)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 5. Admin Module layout and pages revamp
  - [x] 5.1 Implement Admin Module layout
    - Create/update `app/admin/layout.tsx` with glass header, FloatingSidebar, and responsive behavior
    - Desktop (≥1024px): Glass header (sticky, z-index above content) + FloatingSidebar + main content
    - Tablet (768px–1023px): Glass header + icon-only collapsed sidebar + bottom nav
    - Mobile (<768px): Glass header + bottom nav + slide-out drawer sidebar
    - Apply SPACING tokens for all padding and gaps
    - Ensure zero hardcoded color values (no bg-[#F0EDE8], bg-white, text-white)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 18.1, 18.2, 18.3_

  - [x] 5.2 Implement Admin Dashboard page
    - Create/update `app/admin/dashboard/page.tsx` with MetricCard grid (1/2/4 columns responsive)
    - Render analytics sections with DashboardCard staggered entrance animations
    - Render recent activity feed in GlassPanel (max 20 items, TYPOGRAPHY label + body styling)
    - Render chart containers within DashboardCard (min 24px padding, rounded-3xl)
    - Use SectionHeader for all section titles with SPACING vertical rhythm
    - Implement error/placeholder state for failed metric data
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 15.1, 15.2_

- [x] 6. Checkpoint - Module layouts and pages complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Assessment module and cross-cutting concerns
  - [x] 7.1 Implement Assessment module visual upgrade
    - Update assessment interface with full-viewport GlassPanel (rounded-[32px], backdrop-blur ≥24px)
    - Apply TYPOGRAPHY heading for instructions, --muted-foreground for supporting text
    - Render progress indicator with --primary color
    - Render action buttons as PremiumButton with min-height 56px
    - Animate stage transitions with Framer Motion fade + vertical slide (300ms)
    - Respect prefers-reduced-motion
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [x] 7.2 Apply typography system across Doctor and Admin modules
    - Ensure TYPOGRAPHY.heading on top-level page titles
    - Ensure TYPOGRAPHY.subheading on card titles and section titles
    - Ensure TYPOGRAPHY.label on metadata, timestamps, status indicators
    - Ensure tracking-[0.12em] on all label-level text
    - Ensure SectionHeader has 32px top margin and 16px bottom margin
    - Remove any ad-hoc font-size, font-weight, or letter-spacing classes
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [x] 7.3 Replace all Button usages with PremiumButton in Doctor and Admin modules
    - Find and replace all `@/components/ui/button` imports in Doctor and Admin modules
    - Replace with PremiumButton maintaining equivalent variant mappings
    - Ensure loading state, disabled state, and focus ring behavior
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 7.4 Implement depth and surface layering system
    - Ensure three depth layers (background, surface, elevated) are applied across modules
    - Background layer: --background with optional radial gradient glows (≤10% opacity)
    - Surface layer: GlassPanel with GLASS.blur and GLASS.background
    - Elevated layer: backdrop-blur ≥30px, shadow 2x surface, bg-card/82+
    - Ensure no two adjacent layers share identical blur or opacity values
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [x] 7.5 Implement reduced motion support across modules
    - Ensure all Framer Motion animations check useReducedMotion hook
    - Set durations to 0ms when prefers-reduced-motion is active
    - Verify elements render in final state without visible motion
    - Cancel staggered animations on page navigation
    - _Requirements: 15.4, 15.7, 18.8, 19.6_

  - [x] 7.6 Implement responsive spacing multipliers
    - Apply 0.75x spacing multiplier on viewports below 768px
    - Apply 0.875x spacing multiplier on viewports 768px–1023px
    - Ensure minimum 44px touch targets on viewports below 1024px
    - Ensure layout reflows immediately on breakpoint crossing without page reload
    - _Requirements: 18.3, 18.4, 18.5, 18.7_

- [x] 8. Checkpoint - All features implemented
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Static analysis and unit tests
  - [x] 9.1 Write static analysis lint tests for design constraints
    - Create `__tests__/design-system/no-hardcoded-colors.test.ts`
    - Grep Doctor/Admin module files for hex patterns (#[0-9a-fA-F]{3,8})
    - Grep for arbitrary Tailwind color classes (bg-blue-, text-gray-, border-red-, etc.)
    - Verify no local token overrides (RADIUS, SPACING, SHADOWS, GLASS, TYPOGRAPHY redefinitions)
    - Verify no alternative animation library imports (react-spring, gsap, CSS @keyframes)
    - Verify no @/components/ui/button imports in Doctor/Admin modules
    - _Requirements: 1.4, 1.6, 2.3, 2.4, 3.8, 7.7, 17.1, 17.2_

  - [x] 9.2 Write re-export equivalence tests
    - Create `__tests__/design-system/re-exports.test.ts`
    - Verify `lib/patient-portal/design-tokens` re-exports match `lib/design-tokens`
    - Verify `lib/patient-portal/motion-variants` re-exports match `lib/motion-variants`
    - Verify `components/patient-portal/index` re-exports match `components/premium/index`
    - _Requirements: 1.1, 2.1, 2.5_

  - [x] 9.3 Write token structure snapshot tests
    - Create `__tests__/design-system/tokens.test.ts`
    - Snapshot RADIUS, SPACING, SHADOWS, GLASS, TYPOGRAPHY objects
    - Verify token values contain no hex colors
    - Verify shadow values use semi-transparent --primary-rgb references
    - _Requirements: 1.2, 1.3, 1.4, 20.1_

  - [ ]* 9.4 Write MetricCard unit tests
    - Create `__tests__/components/premium/metric-card.test.tsx`
    - Test renders value, label, icon correctly
    - Test trend indicator rendering (up/down)
    - Test hover animation props applied
    - Test stagger index affects animation delay
    - _Requirements: 4.1, 4.5, 8.1, 8.4_

  - [ ]* 9.5 Write PremiumTable unit tests
    - Create `__tests__/components/premium/premium-table.test.tsx`
    - Test renders headers with TYPOGRAPHY.label style
    - Test renders rows with correct padding and borders
    - Test empty state message rendering
    - Test pagination controls render and invoke callbacks
    - Test selected row displays left-border accent
    - Test row hover class application
    - Test mobile card-based layout rendering
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 18.6_

  - [ ]* 9.6 Write PremiumInput unit tests
    - Create `__tests__/components/premium/premium-input.test.tsx`
    - Test renders with correct radius and padding classes
    - Test focus state applies ring classes
    - Test error state renders destructive border and error text
    - Test label renders with TYPOGRAPHY.label style
    - Test disabled state applies opacity and pointer-events
    - Test placeholder uses muted-foreground color
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_

  - [ ]* 9.7 Write PremiumModal unit tests
    - Create `__tests__/components/premium/premium-modal.test.tsx`
    - Test renders with glass panel classes (backdrop-blur, bg-card/82, rounded-3xl)
    - Test calls onClose on Escape key press
    - Test calls onClose on backdrop click
    - Test renders title with TYPOGRAPHY.subheading style
    - Test renders action buttons as PremiumButton
    - Test entrance/exit animation props
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 9.8 Write PremiumTabs unit tests
    - Create `__tests__/components/premium/premium-tabs.test.tsx`
    - Test renders active indicator with layoutId
    - Test underline variant renders 2px bottom border
    - Test pill variant renders rounded-full background
    - Test keyboard navigation (arrow keys move focus, Enter/Space activate)
    - Test inactive tab hover color transition
    - Test all colors derived from theme tokens
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ]* 9.9 Write FloatingSidebar unit tests
    - Create `__tests__/components/premium/floating-sidebar.test.tsx`
    - Test renders with rounded-[32px] and glass panel classes
    - Test active item shows --primary background
    - Test group dividers render with correct opacity
    - Test prefix matching for nested routes
    - Test hover state applies bg-muted/50
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ]* 9.10 Write reduced motion and accessibility tests
    - Create `__tests__/integration/reduced-motion.test.tsx`
    - Test all components respect useReducedMotion (durations set to 0)
    - Test interactive elements meet 44px minimum touch target
    - Test PremiumButton focus ring visibility
    - Test PremiumTabs keyboard navigation accessibility
    - _Requirements: 15.4, 18.3, 11.8, 13.6_

  - [ ]* 9.11 Write Doctor and Admin layout unit tests
    - Create `__tests__/components/layouts/doctor-layout.test.tsx`
    - Create `__tests__/components/layouts/admin-layout.test.tsx`
    - Test desktop layout renders FloatingSidebar
    - Test mobile layout renders bottom navigation
    - Test glass header renders with correct classes
    - Test responsive breakpoint behavior
    - _Requirements: 3.1, 3.5, 3.6, 7.1, 7.5, 18.1, 18.2_

- [x] 10. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Static analysis tests (9.1-9.3) are mandatory as they enforce design system integrity
- Unit tests (9.4-9.11) are optional but recommended for component correctness
- All components use TypeScript with Framer Motion for animations
- Test runner: Vitest with happy-dom environment and @testing-library/react
- Property-based testing is not applicable per design document analysis

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.2"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 7, "tasks": ["9.4", "9.5", "9.6", "9.7", "9.8", "9.9", "9.10", "9.11"] }
  ]
}
```
