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

export const SPACING = {
  /** Between major sections */
  sectionGap: "gap-8",
  /** Between cards within a section */
  cardGap: "gap-6",
  /** Internal card padding */
  cardPadding: "p-6",
  /** Between sidebar and content */
  layoutGap: "gap-7",
  /** Page horizontal padding */
  pageX: "px-4 sm:px-6",
  /** Page vertical padding */
  pageY: "py-5 sm:py-8",
} as const;

export const SHADOWS = {
  /** Soft card elevation */
  card: "",
  /** Glass panel elevation */
  glass: "",
  /** Button hover elevation */
  buttonHover: "",
  /** Sidebar elevation */
  sidebar: "",
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
