# Requirements Document

## Introduction

Apply the established premium design language from the Patient Portal module across the Doctor Module and Admin Module of Eye Aura. The revamp unifies the entire platform into a cohesive premium AI-powered tele-health operating system. Premium quality is achieved exclusively through spacing, typography, layering, elevation, motion, glass effects, and visual rhythm — using only existing theme tokens and CSS variables. No new colors, hardcoded hex values, or arbitrary Tailwind color classes are introduced. The existing reusable component library (GlassPanel, PremiumButton, DashboardCard, StatusBadge, SectionHeader) is extended and shared across all modules.

## Glossary

- **Doctor_Module**: The doctor-facing module of Eye Aura containing dashboard, appointments, requests, patients, prescriptions, slots/calendar, and profile pages
- **Admin_Module**: The admin-facing module of Eye Aura containing dashboard, doctors management, services, assessments, appointments, users, payments, analytics, and settings pages
- **Design_Token_System**: The centralized set of TypeScript constants (RADIUS, SPACING, SHADOWS, GLASS, TYPOGRAPHY) defined in `lib/patient-portal/design-tokens.ts` that govern all visual properties
- **Theme_Token**: A CSS custom property defined in the application root (--primary, --secondary, --background, --foreground, --card, --muted, --muted-foreground, --accent, --border, --ring) that controls color values dynamically
- **Radius_System**: The hierarchical border-radius scale: 32px for layout containers, 24px (3xl) for cards, 16px (2xl) for buttons and inputs, full for pills and badges
- **Glass_Panel**: A translucent surface element using backdrop-blur, semi-transparent backgrounds derived from theme tokens, and subtle border highlights
- **Floating_Sidebar**: A sidebar navigation component rendered as an elevated glass panel with rounded-[32px] radius, sticky positioning, and smooth active-state transitions
- **Premium_Table**: A redesigned table component with soft container backgrounds, floating row styling, generous padding, elegant hover states, and premium pagination controls
- **Premium_Input**: A redesigned form input component with rounded-2xl radius, enhanced focus states using the --ring token, proper label hierarchy, and validation state styling
- **Premium_Modal**: A redesigned modal/dialog component with glass panel background, rounded-3xl radius, smooth entrance animations, and proper backdrop blur
- **Premium_Tabs**: A tab navigation component with animated active indicator, smooth transitions, and theme-token-derived styling
- **Metric_Card**: A specialized dashboard card for displaying numerical metrics with icon, value, label, and optional trend indicator
- **Framer_Motion**: The animation library used for microinteractions, entrance animations, and smooth transitions
- **Microinteraction**: A subtle animation triggered by user interaction (hover, focus, click) or page state changes (entrance, exit)
- **Vertical_Rhythm**: Consistent spacing intervals between elements following the defined SPACING token scale
- **Surface_Layering**: The visual depth system using translucent backgrounds, backdrop-blur, and subtle shadows to create hierarchy between content layers

## Requirements

### Requirement 1: Shared Design Token System Extension

**User Story:** As a developer, I want a single shared design token system used across all modules, so that the Doctor Module and Admin Module maintain visual consistency with the Patient Portal without code duplication.

#### Acceptance Criteria

1. THE Design_Token_System SHALL be relocated from `lib/patient-portal/` to a shared location (`lib/design-tokens.ts`) accessible by all modules, and the previous path (`lib/patient-portal/design-tokens.ts`) SHALL re-export all constants to maintain backward compatibility with existing Patient_Portal imports
2. THE Design_Token_System SHALL export RADIUS, SPACING, SHADOWS, GLASS, and TYPOGRAPHY constants, and the Patient_Portal, Doctor_Module, and Admin_Module SHALL each import these constants exclusively from the shared `lib/design-tokens.ts` path (or its re-export) with no module defining its own local overrides of these constants
3. THE Design_Token_System SHALL define all shadow values as box-shadow strings using semi-transparent --primary theme token values exclusively, with opacity values between 0.03 and 0.18 for each shadow level (card, glass, buttonHover, sidebar)
4. THE Design_Token_System SHALL contain zero hardcoded hex color values, arbitrary Tailwind color classes, or inline color styles
5. WHEN the administrator updates a CSS custom property theme token value (--primary, --secondary, --card, etc.) on the root element, THE Design_Token_System-derived styles SHALL reflect the change across all three modules at the next page render without requiring source code modifications or redeployment
6. IF a module attempts to use a hardcoded color value or a locally-defined design constant that duplicates a Design_Token_System export, THEN the code review process SHALL reject the change as a violation of the shared token system

### Requirement 2: Shared Reusable Component Library

**User Story:** As a developer, I want the premium components (GlassPanel, PremiumButton, DashboardCard, StatusBadge, SectionHeader, PremiumTable, PremiumInput, PremiumModal, PremiumTabs, MetricCard) available to all modules, so that the entire platform uses identical premium building blocks.

#### Acceptance Criteria

1. THE reusable component library SHALL be relocated from `components/patient-portal/` to a shared location (`components/premium/`) and SHALL export all components from a barrel file (`components/premium/index.ts`) importable by the Patient_Portal, Doctor_Module, and Admin_Module
2. THE reusable component library SHALL include GlassPanel, PremiumButton, DashboardCard, StatusBadge, SectionHeader, MetricCard, Premium_Table, Premium_Input, Premium_Modal, and Premium_Tabs as individually exported components, each accepting typed props interfaces
3. THE reusable component library SHALL derive all color values exclusively from theme tokens (--primary, --secondary, --background, --foreground, --card, --muted, --muted-foreground, --accent, --border, --ring) with zero hardcoded hex values, rgba literals, or arbitrary Tailwind color classes
4. THE reusable component library SHALL use Framer_Motion for all animation behaviors including entrance animations, hover state transitions, and exit animations, with no CSS keyframe animations or alternative animation libraries
5. THE reusable component library SHALL maintain backward compatibility with existing Patient_Portal imports by providing re-exports from `components/patient-portal/index.ts` that resolve to the `components/premium/` implementations, preserving identical component names and prop interfaces
6. THE reusable component library SHALL apply spacing, border-radius, shadow, and typography values from the Design_Token_System (RADIUS, SPACING, SHADOWS, TYPOGRAPHY constants) rather than ad-hoc Tailwind utility values

### Requirement 3: Doctor Module Layout Revamp

**User Story:** As a doctor, I want the Doctor Module layout to feel premium and consistent with the rest of the platform, so that the interface conveys professionalism and quality.

#### Acceptance Criteria

1. THE Doctor_Module layout SHALL render a Floating_Sidebar with rounded-[32px] radius, glass background using the GLASS token values from the Design_Token_System, and shadow elevation using the SHADOWS token scale on desktop viewports (1024px and above)
2. THE Doctor_Module header SHALL render as a glass surface with backdrop-blur using the GLASS token blur intensity, background derived from the --card theme token at the GLASS token opacity level, and rounded-[32px] container styling
3. THE Doctor_Module sidebar SHALL display the active navigation item with a filled background using the --primary theme token and text using the --primary-foreground theme token, with a 200ms ease transition animation on background and text color properties
4. WHEN the doctor hovers over an inactive sidebar navigation item, THE Doctor_Module sidebar SHALL animate the item background to a semi-transparent --primary value (opacity between 0.08 and 0.12) using a 200ms ease transition
5. THE Doctor_Module layout SHALL render a mobile bottom navigation bar on viewports below 1024px with glass background using the GLASS token values, backdrop-blur, and minimum interactive element height of 44px
6. WHILE the viewport width is below 1024px, THE Doctor_Module layout SHALL hide the Floating_Sidebar and display only the bottom navigation bar for module navigation
7. THE Doctor_Module layout SHALL apply the SPACING token scale for all internal padding and gaps between layout sections
8. THE Doctor_Module layout SHALL contain zero hardcoded color values (no hex color classes, no bg-white, no text-white, no arbitrary Tailwind color classes) and derive all colors exclusively from theme tokens

### Requirement 4: Doctor Dashboard Premium Redesign

**User Story:** As a doctor, I want my dashboard to feel like a premium analytics workspace, so that I can efficiently overview my practice at a glance.

#### Acceptance Criteria

1. THE Doctor_Module dashboard SHALL display key metrics (total patients, appointments today, pending requests, completed consultations) using MetricCard components within a responsive grid of 1 column below 640px, 2 columns from 640px to 1023px, and 4 columns at 1024px and above
2. THE Doctor_Module dashboard SHALL render an appointment overview section using DashboardCard components with staggered entrance animations where each card animates in sequence with a 50-100ms delay per card using opacity (0 to 1) and translateY (10px to 0) transitions
3. THE Doctor_Module dashboard SHALL render a patient management section displaying the 5 most recent patients, each within a DashboardCard component showing patient name, last visit date, and status using a StatusBadge
4. THE Doctor_Module dashboard SHALL include an action center using a GlassPanel container with PremiumButton quick actions for "New Appointment", "View Requests", and "Manage Slots"
5. WHEN the doctor hovers over a MetricCard, THE MetricCard SHALL animate a subtle upward translation (translateY -2px) over 200ms ease
6. THE Doctor_Module dashboard SHALL use SectionHeader components for all section titles with consistent Vertical_Rhythm spacing using the SPACING token scale between each dashboard section
7. IF the dashboard data fails to load, THEN THE Doctor_Module dashboard SHALL display an error message indicating the data could not be retrieved and provide a retry action using a PremiumButton

### Requirement 5: Doctor Appointment Management Revamp

**User Story:** As a doctor, I want appointment management to use premium patient cards and elegant status indicators, so that I can quickly scan and manage my schedule.

#### Acceptance Criteria

1. THE Doctor_Module appointment list SHALL render each appointment as a DashboardCard with patient avatar, name, appointment type, date, time, and a StatusBadge displaying the appointment status with a visually distinct color derived from theme tokens for each status (pending, confirmed, completed, cancelled)
2. THE Doctor_Module appointment list SHALL provide filter controls using Premium_Tabs with animated active indicator for status filtering (all, pending, confirmed, completed, cancelled)
3. WHEN the appointment list loads or the active filter changes, THE Doctor_Module appointment list SHALL apply staggered fade-up entrance animations to appointment cards with 50-100ms delay per card using Framer_Motion
4. WHEN the doctor hovers over an appointment card, THE appointment card SHALL animate an elevation increase using box-shadow transition and upward translation (translateY -2px) over 200ms ease
5. THE Doctor_Module appointment detail view SHALL render patient information, consultation details, and action buttons within separate GlassPanel containers with vertical spacing between sections following the SPACING token scale
6. IF the appointment list contains zero results for the active filter, THEN THE Doctor_Module appointment list SHALL display an empty state message within a GlassPanel container indicating no appointments match the selected filter

### Requirement 6: Doctor Consultation Interface Revamp

**User Story:** As a doctor, I want the consultation interface to be clean and distraction-free, so that I can focus on patient care during consultations.

#### Acceptance Criteria

1. THE Doctor_Module consultation interface SHALL render patient details in a compact GlassPanel sidebar with the patient name styled using the TYPOGRAPHY.subheading token and metadata fields (appointment type, date, platform) styled using the TYPOGRAPHY.label token
2. THE Doctor_Module consultation interface SHALL render action buttons (start consultation, write prescription, complete) as PremiumButton components where the primary action uses the default variant and secondary actions use the outline variant
3. THE Doctor_Module consultation interface SHALL hide the main Floating_Sidebar navigation and use the full viewport width during active consultations (status "in_progress"), displaying only the patient details sidebar and content area
4. THE Doctor_Module consultation interface SHALL apply SPACING.cardPadding for internal element padding and SPACING.cardGap for gaps between content sections
5. WHEN the consultation status changes (from "confirmed" to "in_progress", or from "in_progress" to "completed"), THE Doctor_Module consultation interface SHALL animate the status indicator transition using a Framer_Motion fade with a 200ms duration
6. IF the viewport width is below 1024px, THEN THE Doctor_Module consultation interface SHALL collapse the patient details sidebar into a top summary bar displaying patient name and current status

### Requirement 7: Admin Module Layout Revamp

**User Story:** As an administrator, I want the Admin Module layout to match the premium quality of the rest of the platform, so that the operational interface feels cohesive and modern.

#### Acceptance Criteria

1. THE Admin_Module layout SHALL render a Floating_Sidebar with rounded-[32px] radius, glass background, and shadow elevation derived from the SHADOWS token on desktop viewports (1024px and above)
2. THE Admin_Module header SHALL render as a glass surface with backdrop-blur, semi-transparent background derived from the --card theme token, sticky positioning, and a z-index value that layers it above scrollable page content
3. THE Admin_Module sidebar SHALL display the active navigation item with a filled background using the --primary theme token and foreground text derived from a theme token (not hardcoded white) with a 200ms ease transition animation
4. WHEN the administrator hovers over a sidebar navigation item, THE Admin_Module sidebar SHALL animate the item background from fully transparent to a semi-transparent --primary value (between 0.08 and 0.12 opacity) using a 200ms ease transition
5. THE Admin_Module layout SHALL hide the Floating_Sidebar and render a mobile bottom navigation bar on viewports below 1024px with glass background, backdrop-blur, and a minimum interactive element height of 44px
6. THE Admin_Module layout SHALL apply the SPACING token scale for all internal padding and gaps between layout sections
7. THE Admin_Module layout SHALL contain zero hardcoded color values (no bg-[#F0EDE8], bg-white, text-white, or inline color styles) and derive all colors exclusively from theme tokens or Design_Token_System constants

### Requirement 8: Admin Dashboard Premium Redesign

**User Story:** As an administrator, I want the dashboard to display premium analytics surfaces and modern SaaS metrics, so that I can monitor platform operations at a glance.

#### Acceptance Criteria

1. THE Admin_Module dashboard SHALL display operational metrics (total users, active doctors, appointments today, revenue) using MetricCard components within a responsive grid that renders 1 column on viewports below 640px, 2 columns between 640px and 1024px, and 4 columns on viewports 1024px and above
2. THE Admin_Module dashboard SHALL render analytics sections using DashboardCard components with staggered entrance animations (50-100ms delay per card)
3. THE Admin_Module dashboard SHALL include a recent activity feed rendered within a GlassPanel container, displaying a maximum of 20 activity items, each formatted as a horizontal row containing a timestamp, actor name, and action description with TYPOGRAPHY label styling for metadata and body styling for descriptions
4. WHEN the administrator hovers over a MetricCard, THE MetricCard SHALL animate a subtle upward translation (translateY -2px) over 200ms ease
5. THE Admin_Module dashboard SHALL use SectionHeader components for all section titles with Vertical_Rhythm spacing derived from the SPACING token scale between each section
6. THE Admin_Module dashboard SHALL render all chart and graph containers within DashboardCard components with minimum 24px internal padding and rounded-3xl radius
7. IF metric data fails to load or returns an error, THEN THE Admin_Module dashboard SHALL display a placeholder state within each affected MetricCard indicating that data is unavailable, without crashing or leaving the card empty

### Requirement 9: Premium Table Component

**User Story:** As an administrator, I want data tables to feel premium with soft containers and elegant interactions, so that managing large datasets feels refined rather than utilitarian.

#### Acceptance Criteria

1. THE Premium_Table component SHALL render within a GlassPanel container with rounded-3xl radius and internal padding matching the SPACING cardPadding token (p-6)
2. THE Premium_Table component SHALL render table rows with minimum 16px vertical padding and 1px bottom borders using the --border theme token
3. WHEN the administrator hovers over a table row, THE Premium_Table SHALL animate the row background to a semi-transparent --primary theme token value at 8% opacity over 150ms ease transition
4. THE Premium_Table component SHALL render table headers using the TYPOGRAPHY label style (uppercase, tracking-[0.12em], muted-foreground color, font-medium)
5. THE Premium_Table component SHALL include pagination controls using PremiumButton components with rounded-2xl radius, displaying previous/next navigation and current page indicator
6. WHEN the administrator selects a table row, THE Premium_Table SHALL display a 3px left-border accent using the --primary theme token on the selected row
7. WHEN data loads into the Premium_Table, THE Premium_Table SHALL apply staggered entrance animations to rows using Framer_Motion with 30-50ms delay per row
8. IF the Premium_Table receives an empty dataset, THEN THE Premium_Table SHALL render a centered empty-state message within the GlassPanel container using the TYPOGRAPHY body style and muted-foreground color

### Requirement 10: Premium Form and Input System

**User Story:** As an administrator, I want form inputs to feel premium with proper hierarchy and elegant states, so that data entry feels intentional and refined.

#### Acceptance Criteria

1. THE Premium_Input component SHALL render with rounded-2xl radius, minimum internal padding of 12px vertical and 16px horizontal, and a 1px border using the --border theme token
2. WHEN the user focuses a Premium_Input, THE Premium_Input SHALL animate the border color to the --ring theme token value with a 200ms ease transition and display an outer glow of 0 0 0 3px using the --ring token at 20% opacity
3. IF a Premium_Input contains a validation error, THEN THE Premium_Input SHALL display a border using the --destructive theme token at 50% opacity and render error text below the field with 4px top margin using the TYPOGRAPHY label style in the --destructive color
4. THE Premium_Input component SHALL render associated labels using the TYPOGRAPHY label style (uppercase, tracking-[0.12em], text-muted-foreground, text-xs, font-medium) positioned above the input with 6px bottom margin
5. THE Premium_Input component SHALL support disabled state with reduced opacity (0.5) and pointer-events-none styling
6. THE form layout system SHALL maintain vertical spacing between form fields using the SPACING cardGap token (gap-6, 24px)
7. WHEN a Premium_Input has no value and is not focused, THE Premium_Input SHALL display placeholder text using the --muted-foreground theme token color

### Requirement 11: Premium Button System Consistency

**User Story:** As a user across all modules, I want buttons to feel tactile and luxurious with consistent behavior, so that every interaction feels premium regardless of which module I am using.

#### Acceptance Criteria

1. THE PremiumButton component SHALL render with rounded-2xl radius, minimum height of 44px, and minimum horizontal padding of 16px across all modules
2. WHEN the user hovers over a PremiumButton, THE PremiumButton SHALL animate a subtle elevation increase using box-shadow transition over 200ms
3. WHEN the user clicks a PremiumButton, THE PremiumButton SHALL animate a scale reduction to 0.98 over 120ms ease and return to scale 1.0 on release over 200ms ease
4. THE PremiumButton component SHALL support primary, secondary, outline, and ghost variants using theme token colors exclusively
5. THE Doctor_Module and Admin_Module SHALL replace all existing Button component usages with PremiumButton for visual consistency
6. WHILE the PremiumButton is in loading state, THE PremiumButton SHALL display a loading spinner that replaces the icon, maintain the button label text visible, disable pointer events to prevent additional clicks, and preserve the button's rendered width and height
7. WHILE the PremiumButton is in disabled state, THE PremiumButton SHALL render with reduced opacity (0.5), disable pointer events, and suppress hover and click animations
8. WHEN the PremiumButton receives keyboard focus, THE PremiumButton SHALL display a visible focus ring using the --ring theme token with 2px offset to meet accessibility requirements

### Requirement 12: Premium Modal and Dialog System

**User Story:** As a user, I want modals and dialogs to feel premium with smooth animations and glass surfaces, so that overlay interactions maintain the luxury aesthetic.

#### Acceptance Criteria

1. THE Premium_Modal component SHALL render with a glass panel background using the GLASS token values (backdrop-blur-[22px], bg-card/82 background) and rounded-3xl radius, with a maximum width of 560px centered horizontally
2. THE Premium_Modal component SHALL animate entrance using a fade-in (opacity 0 to 1) combined with scale-up (from 0.95 to 1.0) over 200ms using Framer_Motion, and animate exit using a fade-out (opacity 1 to 0) combined with scale-down (from 1.0 to 0.95) over 150ms
3. THE Premium_Modal component SHALL render a backdrop overlay with background opacity of 0.5 using the --background theme token and backdrop-blur-sm
4. WHEN the user clicks the backdrop overlay or presses the Escape key, THE Premium_Modal component SHALL dismiss the modal by triggering the exit animation and invoking the onClose callback
5. THE Premium_Modal component SHALL render action buttons as PremiumButton components aligned to the bottom of the modal with SPACING cardGap (gap-6) between buttons
6. THE Premium_Modal component SHALL support a title rendered using TYPOGRAPHY subheading style and optional subtitle using muted-foreground color

### Requirement 13: Premium Tabs Component

**User Story:** As a user, I want tab navigation to feel smooth and animated, so that switching between views feels fluid and intentional.

#### Acceptance Criteria

1. THE Premium_Tabs component SHALL render tab items with horizontal padding following the SPACING token scale (minimum 16px per side), minimum height of 44px, and the TYPOGRAPHY body style
2. THE Premium_Tabs component SHALL display an animated active indicator that slides between tabs using Framer_Motion layoutId animation with a spring transition (duration 300ms or less), rendering as a 2px-height bottom border in underline variant or a rounded-full background fill in pill variant
3. WHEN the user hovers over an inactive tab, THE Premium_Tabs component SHALL animate the tab text color toward --foreground using a 150ms ease transition
4. THE Premium_Tabs component SHALL derive all colors from theme tokens (active text: --primary, inactive text: --muted-foreground, indicator background/border: --primary) with zero hardcoded color values
5. THE Premium_Tabs component SHALL support both underline and pill indicator variants, defaulting to underline when no variant is specified
6. THE Premium_Tabs component SHALL support keyboard navigation allowing the user to move focus between tabs using arrow keys and activate a tab using Enter or Space, with a visible focus ring using the --ring theme token

### Requirement 14: Sidebar Navigation Redesign

**User Story:** As a user, I want the sidebar navigation across Doctor and Admin modules to feel like a floating premium panel, so that navigation feels elevated and modern.

#### Acceptance Criteria

1. THE Floating_Sidebar component SHALL render as a GlassPanel with rounded-[32px] radius, backdrop-blur, and shadow elevation defined by the SHADOWS.sidebar design token
2. THE Floating_Sidebar component SHALL maintain sticky positioning with a top offset of 96px from the viewport edge during scroll
3. THE Floating_Sidebar component SHALL display navigation items with rounded-2xl radius and internal padding of 16px horizontal and 12px vertical
4. THE Floating_Sidebar component SHALL visually separate navigation groups using dividers at 50% opacity of the --border theme token with 8px vertical margin above and below
5. WHEN the active navigation item changes, THE Floating_Sidebar component SHALL animate the active item background color using a 200ms ease transition
6. THE Floating_Sidebar component SHALL be shared between Doctor_Module and Admin_Module, accepting an array of navigation items (each with label, href, icon, and optional group identifier) and an activeHref prop to determine the highlighted item
7. WHEN the user hovers over a non-active navigation item, THE Floating_Sidebar component SHALL display a background highlight using the --muted theme token at 50% opacity with a 200ms ease transition

### Requirement 15: Microinteractions and Motion System

**User Story:** As a user, I want subtle animations throughout the Doctor and Admin modules, so that the interface feels alive and responsive without being distracting.

#### Acceptance Criteria

1. WHEN a DashboardCard or MetricCard enters the viewport, THE module SHALL animate the card entrance using a staggered fade-up animation with Framer_Motion, transitioning opacity from 0 to 1 and translateY from 12px to 0px over 300ms ease-out, with each successive card delayed by 50-100ms
2. WHEN the user hovers over a DashboardCard or MetricCard component, THE card SHALL animate an upward translation (translateY -2px to -4px) over 200ms ease, and revert to the original position on hover-out over the same duration
3. WHEN the user navigates between pages within the Doctor_Module or Admin_Module, THE module SHALL animate page content entrance using a fade-in (opacity 0 to 1) combined with an upward translation (translateY 10px to 0px) over 250ms ease-out
4. IF the user has enabled the prefers-reduced-motion system setting, THEN THE Doctor_Module and Admin_Module SHALL set all Framer_Motion animation durations to 0ms so that elements reach their final state immediately without visible motion
5. THE Doctor_Module and Admin_Module SHALL use Framer_Motion as the sole animation library for all component and page transitions
6. WHEN a Premium_Table loads data, THE Premium_Table SHALL animate each row entrance using a fade-up animation (opacity 0 to 1, translateY 8px to 0px) over 200ms ease-out, with each successive row delayed by 30-50ms
7. WHEN a DashboardCard, MetricCard, or Premium_Table row entrance animation is in progress and the user navigates away from the page, THE module SHALL cancel remaining staggered animations immediately without displaying partial animation states

### Requirement 16: Depth and Surface Layering System

**User Story:** As a user, I want the interface to feel layered with depth, so that content hierarchy is visually clear through surface elevation.

#### Acceptance Criteria

1. THE Doctor_Module and Admin_Module SHALL render a minimum of three visual depth layers: background (base), surface (cards/panels), and elevated (modals/popovers), where each successive layer uses higher backdrop-blur intensity and stronger shadow elevation than the layer below it
2. THE background layer SHALL use the --background theme token with optional radial gradient glows using --accent and --secondary values at no more than 10% opacity
3. THE surface layer SHALL use GlassPanel components with the GLASS.blur token value (backdrop-blur-[22px]) and the GLASS.background token value (bg-card/72) for semi-transparent backgrounds
4. THE elevated layer SHALL use a backdrop-blur intensity of at least 30px and a shadow spread at least 2x the surface layer shadow values, with background opacity of at least 80% using the --card theme token
5. THE surface layering system SHALL derive all opacity and color values from theme tokens to support future dark mode implementation
6. THE surface layering system SHALL ensure that no two adjacent depth layers use identical backdrop-blur or background opacity values

### Requirement 17: Dark Mode Readiness

**User Story:** As a developer, I want all components to be token-driven, so that implementing dark mode in the future requires only updating CSS variable values without component code changes.

#### Acceptance Criteria

1. THE Doctor_Module and Admin_Module SHALL use exclusively CSS custom properties for all color values including backgrounds, text, borders, and shadows
2. THE Doctor_Module and Admin_Module SHALL contain zero hardcoded hex color values, arbitrary Tailwind color classes (e.g., bg-blue-500, text-gray-600), or inline color styles
3. THE glass and translucent effects (Glass_Panel backgrounds, backdrop overlays, and Floating_Sidebar surfaces) SHALL use opacity modifiers on theme token values (e.g., bg-card/72) rather than hardcoded rgba values
4. THE shadow system SHALL use semi-transparent values derived from theme tokens such that shadow color intensity remains proportional to the background luminance in both light and dark contexts without producing invisible or overly harsh shadows
5. WHEN a dark mode theme token set is applied to the root element, THE Doctor_Module and Admin_Module SHALL render all text with a minimum contrast ratio of 4.5:1 against their immediate background, display all interactive elements with visible borders or fills, and preserve the same layout and spacing as light mode without requiring component-level code changes
6. WHEN a dark mode theme token set is applied to the root element, THE Doctor_Module and Admin_Module SHALL display all Glass_Panel and translucent surfaces with sufficient visual distinction (minimum 5% perceived lightness difference) from the base --background layer

### Requirement 18: Responsive Design System

**User Story:** As a user on any device, I want the premium experience to adapt gracefully to my screen size, so that the interface feels intentionally designed for every viewport.

#### Acceptance Criteria

1. THE Doctor_Module and Admin_Module SHALL render desktop layouts with Floating_Sidebar navigation on viewports at or above 1024px width
2. THE Doctor_Module and Admin_Module SHALL render mobile layouts with bottom navigation bar and hidden sidebar (accessible via a slide-out drawer triggered by a menu button) on viewports below 768px width, and tablet layouts with bottom navigation bar and icon-only collapsed sidebar on viewports from 768px to 1023px width
3. THE Doctor_Module and Admin_Module SHALL maintain minimum touch target sizes of 44px (width and height) for all interactive elements on viewports below 1024px
4. THE Doctor_Module and Admin_Module SHALL apply a 0.75x multiplier to SPACING token values on viewports below 768px and a 0.875x multiplier on viewports from 768px to 1023px, while maintaining the relative spacing hierarchy defined by SPACING tokens
5. THE Doctor_Module and Admin_Module SHALL render MetricCard grids as 2-column on viewports below 768px, 3-column on viewports from 768px to 1023px, and 4-column on viewports at or above 1024px
6. THE Premium_Table component SHALL render as a card-based list view on viewports below 768px instead of a traditional table layout
7. WHILE the user resizes the browser viewport across a breakpoint boundary (768px or 1024px), THE Doctor_Module and Admin_Module SHALL reflow the layout immediately without requiring a page reload
8. THE Doctor_Module and Admin_Module SHALL respect the prefers-reduced-motion media query by applying layout changes without transition animations when the user has requested reduced motion

### Requirement 19: Assessment Module Visual Upgrade

**User Story:** As a doctor, I want assessment modules (visual acuity tests) to feel immersive and medical-grade, so that the testing experience conveys clinical precision and futuristic quality.

#### Acceptance Criteria

1. THE assessment interface SHALL render within a full-viewport GlassPanel container with rounded-[32px] radius and backdrop-blur of at least 24px
2. THE assessment interface SHALL render test instructions using the Design_Token_System heading level (semibold, --foreground color) and render supporting text using --muted-foreground color to establish a two-level typographic distinction
3. THE assessment interface SHALL render a progress indicator displaying the current stage relative to total stages, colored using the --primary theme token
4. THE assessment interface SHALL render action buttons as PremiumButton components with a minimum height of 56px for comfortable touch targets during tests
5. WHEN the patient advances or returns between assessment stages, THE assessment interface SHALL animate the transition using Framer_Motion fade (opacity 0 to 1) and vertical slide (translateY 12px to 0) over a duration of 300ms
6. THE assessment interface SHALL respect the prefers-reduced-motion media query by disabling all animated transitions when the user has requested reduced motion

### Requirement 20: Typography System Enhancement

**User Story:** As a user, I want stronger typographic hierarchy across Doctor and Admin modules, so that content priority is immediately clear through visual weight and spacing.

#### Acceptance Criteria

1. THE TYPOGRAPHY token system SHALL define exactly four distinct levels: heading (text-2xl responsive to text-3xl, font-semibold, foreground color), subheading (text-lg, font-semibold, foreground color), body (text-base, font-normal, foreground color), and label (text-xs, uppercase, tracking-[0.12em], font-medium, muted-foreground color)
2. THE Doctor_Module and Admin_Module SHALL apply the TYPOGRAPHY heading token to the single top-level title element on every page, and the TYPOGRAPHY subheading token to all card titles and section titles within page content
3. THE Doctor_Module and Admin_Module SHALL apply the TYPOGRAPHY label token to all metadata fields, timestamps, status indicators, and supporting descriptors that are not part of primary content (body text or headings)
4. THE Doctor_Module and Admin_Module SHALL maintain letter-spacing of tracking-[0.12em] on all label-level text elements
5. THE SectionHeader component SHALL apply a top margin of 32px minimum and a bottom margin of 16px minimum to establish predictable Vertical_Rhythm across all pages
6. THE Doctor_Module and Admin_Module SHALL apply text styles exclusively from the four TYPOGRAPHY token levels, with zero instances of ad-hoc font-size, font-weight, or letter-spacing classes outside the token definitions
