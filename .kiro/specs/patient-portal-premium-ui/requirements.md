# Requirements Document

## Introduction

Revamp the Eye Aura Patient Portal module into a premium, modern, calm medical SaaS experience. The redesign establishes a cohesive design system with consistent border radii, layered backgrounds, refined typography hierarchy, glassmorphism panels, and smooth microinteractions. The visual identity must feel like a premium AI-powered tele-optometry healthcare platform built in 2026 — calm, elegant, trustworthy, and minimal but rich. All styling must use existing theme tokens and CSS variables exclusively, ensuring dynamic adaptability when administrators change the theme palette.

## Glossary

- **Patient_Portal**: The patient-facing module of Eye Aura containing dashboard, appointments, assessments, prescriptions, profile, notifications, requests, and support pages
- **Design_System**: The unified set of design rules governing radius, spacing, typography, color usage, shadows, and animations across the Patient Portal
- **Theme_Token**: A CSS custom property (variable) defined in the application root (e.g., `--primary`, `--secondary`, `--background`) that controls color values dynamically
- **Radius_System**: The hierarchical border-radius scale applied consistently: 32px for layout containers, 24px (3xl) for cards, 16px (2xl) for buttons and inputs, full for pills and badges
- **Glass_Panel**: A translucent surface element using backdrop-blur, semi-transparent backgrounds derived from theme tokens, and subtle border highlights
- **DashboardCard**: A reusable card component with soft shadows, layered surfaces, border highlights, and backdrop blur for displaying grouped information
- **StatusBadge**: A reusable badge component for displaying status indicators with theme-token-derived colors and rounded-full radius
- **PremiumButton**: A reusable button component with rounded-2xl radius, smooth hover elevation transitions, and theme-token-based styling
- **GlassPanel**: A reusable translucent container component with backdrop-blur, theme-derived semi-transparent backgrounds, and soft borders
- **InfoRow**: A reusable component for displaying label-value pairs with consistent spacing and typography hierarchy
- **SectionHeader**: A reusable component for section titles with uppercase tracking labels, muted supporting text, and consistent vertical spacing
- **Framer_Motion**: The animation library used for microinteractions, entrance animations, and smooth transitions
- **Microinteraction**: A subtle animation triggered by user interaction (hover, focus, click) or page state changes (entrance, exit)
- **Vertical_Rhythm**: Consistent spacing intervals between elements following a defined scale to create visual harmony
- **Visual_Hierarchy**: The arrangement of typography weights, sizes, colors, and spacing to guide user attention through content priority

## Requirements

### Requirement 1: Consistent Radius System

**User Story:** As a patient, I want all interface elements to have consistent rounded corners, so that the portal feels cohesive and modern.

#### Acceptance Criteria

1. THE Design_System SHALL apply rounded-[32px] border radius to all main layout containers including the header hero section, sidebar wrapper, and page-level content wrappers
2. THE Design_System SHALL apply rounded-3xl (24px) border radius to all DashboardCard components and card-based surfaces
3. THE Design_System SHALL apply rounded-2xl (16px) border radius to all PremiumButton components and input fields
4. THE Design_System SHALL apply rounded-full border radius to all StatusBadge components, pills, and avatar elements
5. THE Design_System SHALL contain zero sharp-edged (squared corner) elements within the Patient_Portal module

### Requirement 2: Layered Background System

**User Story:** As a patient, I want the portal background to feel warm and layered, so that the interface conveys depth and premium quality.

#### Acceptance Criteria

1. THE Patient_Portal SHALL render a layered background composed of a warm off-white base color derived from the --background theme token
2. THE Patient_Portal SHALL render subtle radial gradient glows using semi-transparent values of --accent and --secondary theme tokens positioned at distinct viewport locations
3. THE Patient_Portal SHALL render translucent Glass_Panel surfaces for elevated content areas using backdrop-blur and semi-transparent --card theme token values
4. WHEN the administrator changes the theme palette, THE Patient_Portal background layers SHALL adapt dynamically using the updated theme token values without requiring code changes

### Requirement 3: Typography Hierarchy

**User Story:** As a patient, I want clear visual distinction between headings, body text, and labels, so that I can scan information quickly and understand content priority.

#### Acceptance Criteria

1. THE Design_System SHALL render primary headings using semibold or bold weight at sizes that establish clear dominance over body text
2. THE Design_System SHALL render supporting and descriptive text using the --muted-foreground theme token color to create visual separation from primary content
3. THE Design_System SHALL render section labels using uppercase text with increased letter-spacing (tracking) and reduced font size to distinguish them from content text
4. THE SectionHeader component SHALL maintain consistent vertical spacing above and below to establish predictable Vertical_Rhythm across all Patient_Portal pages
5. THE Design_System SHALL use a maximum of four distinct typographic levels (heading, subheading, body, label) to maintain clarity without visual noise

### Requirement 4: Premium Header Redesign

**User Story:** As a patient, I want the portal header to feel like a premium hero section, so that the first impression conveys quality and trust.

#### Acceptance Criteria

1. THE Patient_Portal header SHALL render as a rounded-[32px] container with internal padding that separates it visually from the viewport edges
2. THE Patient_Portal header SHALL display a gradient background using semi-transparent values derived from --primary and --secondary theme tokens
3. THE Patient_Portal header SHALL apply a soft glass overlay effect using backdrop-blur and a semi-transparent surface layer
4. THE Patient_Portal header SHALL include breadcrumb navigation showing the current location within the portal hierarchy
5. THE Patient_Portal header SHALL maintain sticky positioning at the top of the viewport during scroll

### Requirement 5: Floating Glass Sidebar

**User Story:** As a patient, I want the navigation sidebar to feel modern and elevated, so that it integrates seamlessly with the premium aesthetic.

#### Acceptance Criteria

1. THE Patient_Portal sidebar SHALL render as a floating Glass_Panel with rounded-[32px] border radius and soft shadow elevation
2. THE Patient_Portal sidebar SHALL display the active navigation item with a filled background using the --primary theme token and smooth transition animation
3. WHEN the patient hovers over a navigation item, THE Patient_Portal sidebar SHALL animate the item background opacity using a 200ms ease transition
4. THE Patient_Portal sidebar SHALL maintain a sticky position offset from the top of the viewport during scroll
5. THE Patient_Portal sidebar SHALL visually separate navigation groups using subtle dividers derived from the --border theme token

### Requirement 6: DashboardCard Component

**User Story:** As a patient, I want information cards to feel elevated and distinct, so that grouped content is easy to identify and read.

#### Acceptance Criteria

1. THE DashboardCard component SHALL render with a soft box-shadow using semi-transparent --primary theme token values for depth
2. THE DashboardCard component SHALL display a subtle top or inner border highlight using a semi-transparent white or --card theme token value
3. THE DashboardCard component SHALL apply backdrop-blur to create a frosted glass layering effect over the background
4. THE DashboardCard component SHALL accept children content and render with consistent internal padding following the Vertical_Rhythm scale
5. THE DashboardCard component SHALL apply rounded-3xl border radius consistently on all viewport sizes

### Requirement 7: StatusBadge Component

**User Story:** As a patient, I want status indicators to be visually clear and consistent, so that I can quickly understand the state of my appointments and requests.

#### Acceptance Criteria

1. THE StatusBadge component SHALL render with rounded-full border radius and horizontal padding proportional to text size
2. THE StatusBadge component SHALL derive background and text colors from theme tokens using opacity modifiers rather than hardcoded hex values
3. THE StatusBadge component SHALL accept a status variant prop that maps to predefined theme-token-based color combinations
4. THE StatusBadge component SHALL maintain readable contrast ratios between text and background colors across all status variants

### Requirement 8: PremiumButton Component

**User Story:** As a patient, I want buttons to feel responsive and premium, so that interactions feel satisfying and intentional.

#### Acceptance Criteria

1. THE PremiumButton component SHALL render with rounded-2xl border radius and padding that provides comfortable touch targets (minimum 44px height)
2. WHEN the patient hovers over a PremiumButton, THE PremiumButton component SHALL animate a subtle elevation increase using box-shadow transition over 200ms
3. WHEN the patient clicks a PremiumButton, THE PremiumButton component SHALL animate a subtle scale reduction (scale 0.98) to provide tactile feedback
4. THE PremiumButton component SHALL support primary, secondary, outline, and ghost variants using theme token colors exclusively
5. THE PremiumButton component SHALL inherit all color values from theme tokens to ensure compatibility when the administrator changes the theme palette

### Requirement 9: GlassPanel Component

**User Story:** As a patient, I want translucent container panels throughout the portal, so that the interface feels layered and modern.

#### Acceptance Criteria

1. THE GlassPanel component SHALL render with backdrop-blur of at least 16px and a semi-transparent background derived from the --card theme token
2. THE GlassPanel component SHALL display a subtle border using semi-transparent white or --border theme token values
3. THE GlassPanel component SHALL apply a soft box-shadow for elevation using semi-transparent --primary theme token values
4. THE GlassPanel component SHALL accept a padding prop with predefined size options (sm, md, lg) following the Vertical_Rhythm scale
5. WHEN the administrator changes the theme palette, THE GlassPanel component SHALL adapt its background and border colors dynamically

### Requirement 10: InfoRow Component

**User Story:** As a patient, I want label-value information pairs to be consistently formatted, so that data is easy to scan across different sections.

#### Acceptance Criteria

1. THE InfoRow component SHALL render a label using uppercase tracking, reduced font size, and --muted-foreground theme token color
2. THE InfoRow component SHALL render a value using standard body font size and --foreground theme token color with semibold weight
3. THE InfoRow component SHALL maintain consistent vertical spacing between consecutive InfoRow instances
4. THE InfoRow component SHALL optionally accept an icon prop rendered at the start of the row using --secondary theme token color

### Requirement 11: SectionHeader Component

**User Story:** As a patient, I want section titles to be clearly distinguished from content, so that I can navigate page sections quickly.

#### Acceptance Criteria

1. THE SectionHeader component SHALL render a title using semibold weight and --foreground theme token color at a size larger than body text
2. THE SectionHeader component SHALL optionally render a subtitle using --muted-foreground theme token color below the title
3. THE SectionHeader component SHALL apply consistent top and bottom margin following the Vertical_Rhythm scale to separate sections
4. THE SectionHeader component SHALL optionally render a trailing action element (button or link) aligned to the end of the header row

### Requirement 12: Microinteractions and Animations

**User Story:** As a patient, I want subtle animations throughout the portal, so that the interface feels alive and responsive without being distracting.

#### Acceptance Criteria

1. WHEN a DashboardCard enters the viewport, THE Patient_Portal SHALL animate the card entrance using a staggered fade-up animation with Framer_Motion (each card delayed by 50-100ms)
2. WHEN the patient hovers over a DashboardCard, THE DashboardCard SHALL animate a subtle upward translation (translateY -2px to -4px) over 200ms ease
3. WHEN the patient navigates between Patient_Portal pages, THE Patient_Portal SHALL animate page content entrance using a fade-in with subtle upward translation
4. THE Patient_Portal SHALL respect the prefers-reduced-motion media query by disabling all animations when the user has requested reduced motion
5. THE Patient_Portal SHALL use Framer_Motion as the sole animation library for all component and page transitions

### Requirement 13: Layout Grid and Spacing

**User Story:** As a patient, I want content to be well-proportioned and balanced, so that the interface feels spacious and organized.

#### Acceptance Criteria

1. THE Patient_Portal SHALL use a 12-column responsive grid system for page layouts with consistent gutter spacing
2. THE Patient_Portal SHALL maintain a minimum of 24px spacing between major content sections on desktop viewports
3. THE Patient_Portal SHALL apply proportional spacing reduction on mobile viewports while maintaining the relative spacing hierarchy
4. THE Patient_Portal SHALL center main content within a maximum width container (max-w-7xl) with horizontal padding on all viewport sizes
5. THE Patient_Portal SHALL maintain consistent whitespace between the sidebar and main content area on desktop viewports

### Requirement 14: Theme Token Compliance

**User Story:** As an administrator, I want the premium UI to adapt when I change the theme palette, so that the portal maintains its premium feel regardless of brand colors.

#### Acceptance Criteria

1. THE Patient_Portal SHALL use exclusively CSS custom properties (--primary, --secondary, --background, --foreground, --card, --muted, --muted-foreground, --accent, --border, --ring) for all color values
2. THE Patient_Portal SHALL contain zero hardcoded hex color values, arbitrary Tailwind color classes (e.g., bg-blue-500), or inline color styles
3. WHEN the administrator updates a theme token value, THE Patient_Portal SHALL reflect the change across all components without requiring a code deployment
4. THE Patient_Portal SHALL maintain visual coherence in dark mode by deriving all surface and text colors from theme tokens that support dark mode values
5. THE Patient_Portal SHALL achieve premium visual quality through spacing, typography, layering, shadows, glassmorphism, and animation rather than through introducing additional color values

### Requirement 15: Responsive and Accessible Design

**User Story:** As a patient using various devices, I want the premium portal to work beautifully on mobile, tablet, and desktop, so that I have a consistent experience everywhere.

#### Acceptance Criteria

1. THE Patient_Portal SHALL render a mobile-optimized layout with bottom navigation bar on viewports below 1024px width
2. THE Patient_Portal SHALL render the floating sidebar navigation on viewports at or above 1024px width
3. THE Patient_Portal SHALL maintain minimum touch target sizes of 44px for all interactive elements on mobile viewports
4. THE Patient_Portal SHALL maintain WCAG 2.1 AA contrast ratios between text and background colors across all theme token combinations
5. THE Patient_Portal SHALL provide visible focus indicators using the --ring theme token for keyboard navigation on all interactive elements

### Requirement 16: Contextual Quick Actions Panel

**User Story:** As a patient, I want quick access to common actions from my dashboard, so that I can navigate to frequent tasks efficiently.

#### Acceptance Criteria

1. THE Patient_Portal dashboard SHALL display a contextual quick actions panel containing primary patient actions (book consultation, view appointments, view prescriptions, view profile)
2. THE quick actions panel SHALL render each action as a PremiumButton with an associated icon and label
3. THE quick actions panel SHALL render within a GlassPanel container with consistent spacing between action items
4. WHEN the patient hovers over a quick action item, THE quick action item SHALL animate with the standard hover elevation Microinteraction
