export const RADIUS = {
  /** Layout containers: header, sidebar, page wrappers */
  container: "rounded-[32px]",
  /** Cards and elevated surfaces */
  card: "rounded-3xl",
  /** Buttons, inputs, interactive elements */
  interactive: "rounded-2xl",
  /** Badges, pills, avatars */
  pill: "rounded-full",
} as const;

/**
 * Responsive spacing multiplier system:
 * - Mobile (<768px): 0.75x multiplier
 * - Tablet (768px–1023px): 0.875x multiplier
 * - Desktop (≥1024px): 1x (full spacing)
 *
 * Tailwind breakpoints used: md (768px), lg (1024px)
 * Values are rounded to the nearest Tailwind spacing scale step.
 */
export const SPACING = {
  /** Between major sections: 24px → 28px → 32px */
  sectionGap: "gap-6 md:gap-7 lg:gap-8",
  /** Between cards within a section: 16px → 20px → 24px */
  cardGap: "gap-4 md:gap-5 lg:gap-6",
  /** Internal card padding: 16px → 20px → 24px */
  cardPadding: "p-4 md:p-5 lg:p-6",
  /** Between sidebar and content: 20px → 24px → 28px */
  layoutGap: "gap-5 md:gap-6 lg:gap-7",
  /** Page horizontal padding: 12px → 16px → 24px */
  pageX: "px-3 md:px-4 lg:px-6",
  /** Page vertical padding: 16px → 20px → 32px */
  pageY: "py-4 md:py-5 lg:py-8",
} as const;

/**
 * Responsive spacing multiplier configuration.
 * Documents the breakpoint-to-multiplier mapping used in SPACING tokens.
 */
export const RESPONSIVE_SPACING = {
  /** Viewport < 768px */
  mobile: 0.75,
  /** Viewport 768px–1023px */
  tablet: 0.875,
  /** Viewport ≥ 1024px */
  desktop: 1,
  /** Minimum touch target size for interactive elements below 1024px */
  minTouchTarget: "min-h-[44px] min-w-[44px]",
} as const;

export const SHADOWS = {
  /** Soft card elevation */
  card: "shadow-[0_8px_32px_rgba(var(--primary-rgb),0.06)]",
  /** Glass panel elevation (surface layer) */
  glass: "shadow-[0_24px_80px_rgba(var(--primary-rgb),0.12)]",
  /** Button hover elevation */
  buttonHover: "shadow-[0_12px_40px_rgba(var(--primary-rgb),0.14)]",
  /** Sidebar elevation */
  sidebar: "shadow-[0_16px_64px_rgba(var(--primary-rgb),0.10)]",
  /** Elevated layer — modals/popovers (≥2x surface shadow) */
  elevated: "shadow-[0_32px_100px_rgba(var(--primary-rgb),0.24)]",
} as const;

export const GLASS = {
  /** Standard glass background */
  background: "bg-card/72",
  /** Card glass background (slightly more opaque) */
  cardBackground: "bg-card/82",
  /** Header glass background */
  headerBackground: "bg-card/80",
  /** Glass border */
  border: "border border-white/60",
  /** Glass blur */
  blur: "backdrop-blur-[22px]",
} as const;

export const TYPOGRAPHY = {
  /** Page heading */
  heading: "text-2xl sm:text-3xl font-semibold text-foreground",
  /** Card/section title */
  subheading: "text-lg font-semibold text-foreground",
  /** Body text */
  body: "text-base text-foreground",
  /** Labels and captions */
  label: "text-xs uppercase tracking-[0.12em] font-medium text-muted-foreground",
} as const;

/**
 * Three-layer depth system for visual hierarchy.
 *
 * - background: Base page layer (no blur, standard background)
 * - surface: Cards and panels (GlassPanel — moderate blur, semi-transparent)
 * - elevated: Modals and popovers (high blur, stronger shadow, higher opacity)
 *
 * Each successive layer uses higher backdrop-blur and stronger shadow.
 * No two adjacent layers share identical blur or background opacity values.
 */
export interface DepthLayer {
  name: "background" | "surface" | "elevated";
  blur: string;
  background: string;
  shadow: string;
}

export const DEPTH_LAYERS: readonly DepthLayer[] = [
  {
    name: "background",
    blur: "backdrop-blur-none",
    background: "bg-background",
    shadow: "shadow-none",
  },
  {
    name: "surface",
    blur: "backdrop-blur-[22px]",
    background: "bg-card/72",
    shadow: "shadow-[0_24px_80px_rgba(var(--primary-rgb),0.12)]",
  },
  {
    name: "elevated",
    blur: "backdrop-blur-[30px]",
    background: "bg-card/82",
    shadow: "shadow-[0_32px_100px_rgba(var(--primary-rgb),0.24)]",
  },
] as const;
