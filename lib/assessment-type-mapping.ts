import type { VisionAssessmentType } from "@/types/firestore";

/**
 * Extended assessment type used in the AssignAssessmentDialog UI.
 * These map to the underlying VisionAssessmentType values stored in Firestore.
 */
export type ExtendedAssessmentType =
  | "distance_visual_acuity"
  | "near_vision"
  | "color_vision"
  | "contrast_sensitivity"
  | "custom";

/**
 * Maps an ExtendedAssessmentType (used in the dialog UI) to the
 * corresponding VisionAssessmentType (stored in Firestore).
 */
export function mapExtendedToVisionType(
  extended: ExtendedAssessmentType
): VisionAssessmentType {
  const mapping: Record<ExtendedAssessmentType, VisionAssessmentType> = {
    distance_visual_acuity: "far",
    near_vision: "near",
    color_vision: "color_vision",
    contrast_sensitivity: "contrast_sensitivity",
    custom: "custom",
  };
  return mapping[extended];
}
