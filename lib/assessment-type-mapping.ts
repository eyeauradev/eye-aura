import type { VisionAssessmentType } from "@/types/firestore";

// ─── Global Assessment Type Config ────────────────────────────────────────────
// Single source of truth for all available assessment types across the app.
// Both doctor and admin UIs should import from here.

export interface AssessmentTypeOption {
  value: VisionAssessmentType;
  label: string;
  description: string;
}

/**
 * The assessment types currently available in the system.
 * When new types are added, update this array and they'll appear everywhere.
 */
export const AVAILABLE_ASSESSMENT_TYPES: AssessmentTypeOption[] = [
  {
    value: "far",
    label: "Far Vision",
    description: "Standard distance vision test at 3 metres",
  },
  {
    value: "near",
    label: "Near Vision",
    description: "Close-range reading ability at 35–40 cm",
  },
];

/**
 * Get a human-readable label for a VisionAssessmentType.
 */
export function getAssessmentLabel(type: VisionAssessmentType): string {
  const found = AVAILABLE_ASSESSMENT_TYPES.find((t) => t.value === type);
  return found?.label ?? type;
}

// ─── Legacy mapping (kept for backward compatibility) ─────────────────────────

/**
 * @deprecated Use VisionAssessmentType directly. This type alias exists only
 * for backward compatibility during migration.
 */
export type ExtendedAssessmentType = VisionAssessmentType;

/**
 * @deprecated Identity mapping — no conversion needed. Kept so existing
 * call sites don't break.
 */
export function mapExtendedToVisionType(
  extended: ExtendedAssessmentType
): VisionAssessmentType {
  return extended;
}
