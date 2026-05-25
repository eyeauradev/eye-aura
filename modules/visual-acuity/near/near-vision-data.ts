import type { NearVisionLine, NearNotation } from "../types";

/**
 * Near vision chart lines — ordered largest to smallest (easiest → hardest).
 *
 * Cap-height formula at 40 cm viewing distance:
 *   capHeightMm = N × 0.353 × (40 / 35) = N × 0.4034
 *   (1 point = 0.353 mm at standard 35 cm reading distance, scaled to 40 cm)
 *
 * Stroke rendering: CSS font-size = capHeightMm / 0.72 * pxPerMm
 *   (0.72 = approximate cap-height / font-size ratio for bold sans-serif)
 */
export const NEAR_VISION_LINES: NearVisionLine[] = [
  {
    notation: "N24",
    capHeightMm: 9.7,
    label: "Largest",
    content: "EYE CARE",
  },
  {
    notation: "N18",
    capHeightMm: 7.3,
    label: "Very Large",
    content: "CLEAR VISION",
  },
  {
    notation: "N12",
    capHeightMm: 4.8,
    label: "Large",
    content: "Read the text aloud.",
  },
  {
    notation: "N8",
    capHeightMm: 3.2,
    label: "Medium",
    content: "Please read this sentence clearly.",
  },
  {
    notation: "N6",
    capHeightMm: 2.4,
    label: "Normal Reading",
    content: "The eye focuses light onto the retina for clear vision.",
  },
  {
    notation: "N5",
    capHeightMm: 2.0,
    label: "Small",
    content: "Good near vision allows comfortable reading at arm's length.",
  },
  {
    notation: "N4",
    capHeightMm: 1.6,
    label: "Fine Print",
    content: "Regular eye examinations help detect vision changes early.",
  },
];

/**
 * Convert near vision cap-height to CSS font-size in pixels.
 *
 * @param capHeightMm  Physical cap height in millimetres
 * @param pxPerMm      Calibrated CSS pixels per millimetre
 */
export function nearFontSizePx(capHeightMm: number, pxPerMm: number): number {
  const fontSizeMm = capHeightMm / 0.72;
  return fontSizeMm * pxPerMm;
}

// Human-readable descriptions for results
export const NEAR_DESCRIPTIONS: Record<NearNotation, string> = {
  N24: "Very reduced near vision — large print only",
  N18: "Significantly reduced — standard print not readable",
  N12: "Below normal — reading requires strong correction",
  N8:  "Mild reduction — comfortable reading may require glasses",
  N6:  "Near-normal — minor difficulty with fine print",
  N5:  "Normal near vision — comfortable for daily reading",
  N4:  "Excellent near vision — fine print readable clearly",
};

export type NearCategory = "poor" | "reduced" | "normal" | "excellent" | "unknown";

export function nearCategory(notation: NearNotation | null): NearCategory {
  if (!notation) return "unknown";
  const map: Record<NearNotation, NearCategory> = {
    N24: "poor",
    N18: "poor",
    N12: "reduced",
    N8:  "reduced",
    N6:  "normal",
    N5:  "normal",
    N4:  "excellent",
  };
  return map[notation];
}
