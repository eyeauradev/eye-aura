import type { NearVisionLine, JaegerNotation } from "../types";

/**
 * Near vision chart lines — exact specification at 40 cm (16 inches).
 * Based on clinical Jaeger notation with Snellen equivalents.
 */
export const NEAR_VISION_LINES: NearVisionLine[] = [
  {
    jaeger: "J16",
    snellen: "20/200",
    snellen6m: "6/60",
    exactHeightMm: 5.82,
    pointSize: 48,
    letters: ["E"],
    label: "Largest",
  },
  {
    jaeger: "J11",
    snellen: "20/100",
    snellen6m: "6/30",
    exactHeightMm: 2.91,
    pointSize: 24,
    letters: ["F", "P"],
    label: "Very Large",
  },
  {
    jaeger: "J9",
    snellen: "20/70",
    snellen6m: "6/21",
    exactHeightMm: 2.04,
    pointSize: 18,
    letters: ["T", "O", "Z"],
    label: "Large",
  },
  {
    jaeger: "J5",
    snellen: "20/50",
    snellen6m: "6/15",
    exactHeightMm: 1.45,
    pointSize: 12,
    letters: ["L", "P", "E", "D"],
    label: "Medium-Large",
  },
  {
    jaeger: "J3",
    snellen: "20/40",
    snellen6m: "6/12",
    exactHeightMm: 1.16,
    pointSize: 10,
    letters: ["P", "E", "C", "F", "D"],
    label: "Medium",
  },
  {
    jaeger: "J2",
    snellen: "20/30",
    snellen6m: "6/9",
    exactHeightMm: 0.87,
    pointSize: 7,
    letters: ["E", "D", "F", "C", "Z", "P"],
    label: "Small",
  },
  {
    jaeger: "J1",
    snellen: "20/25",
    snellen6m: "6/7.5",
    exactHeightMm: 0.73,
    pointSize: 5.5,
    letters: ["F", "E", "L", "O", "P", "Z", "D"],
    label: "Normal",
  },
  {
    jaeger: "J1+",
    snellen: "20/20",
    snellen6m: "6/6",
    exactHeightMm: 0.58,
    pointSize: 4,
    letters: ["D", "E", "F", "P", "O", "T", "E", "C"],
    label: "Sharp",
  },
  {
    jaeger: "—",
    snellen: "20/15",
    snellen6m: "6/4.5",
    exactHeightMm: 0.44,
    pointSize: 3,
    letters: ["L", "E", "F", "O", "D", "P", "C", "T"],
    label: "Excellent",
  },
];

/**
 * Convert near vision exact height to CSS font-size in pixels.
 * Times New Roman point size reference: 1 pt = 0.353 mm at 35 cm
 * Scaled to 40 cm: 1 pt = 0.353 × (40/35) = 0.403 mm
 *
 * @param exactHeightMm  Physical letter height in millimetres at 40 cm
 * @param pxPerMm       Calibrated CSS pixels per millimetre
 */
export function nearFontSizePx(exactHeightMm: number, pxPerMm: number): number {
  return exactHeightMm * pxPerMm;
}

// Human-readable descriptions for results
export const NEAR_DESCRIPTIONS: Record<JaegerNotation, string> = {
  "J16": "Very reduced near vision — large print only",
  "J11": "Significantly reduced — standard print not readable",
  "J9":  "Below normal — reading requires strong correction",
  "J5":  "Mild reduction — comfortable reading may require glasses",
  "J3":  "Near-normal — minor difficulty with fine print",
  "J2":  "Normal near vision — comfortable for daily reading",
  "J1":  "Good near vision — fine print readable",
  "J1+": "Excellent near vision — fine print clearly readable",
  "—":   "Exceptional near vision — smallest print readable",
};

// Level number mapping (1-9) for each Jaeger notation
export const NEAR_LEVEL: Record<JaegerNotation, number> = {
  "J16": 1,
  "J11": 2,
  "J9":  3,
  "J5":  4,
  "J3":  5,
  "J2":  6,
  "J1":  7,
  "J1+": 8,
  "—":   9,
};

export type NearCategory = "poor" | "reduced" | "normal" | "excellent" | "unknown";

export function nearCategory(jaeger: JaegerNotation | null): NearCategory {
  if (!jaeger) return "unknown";
  const map: Record<JaegerNotation, NearCategory> = {
    "J16": "poor",
    "J11": "poor",
    "J9":  "reduced",
    "J5":  "reduced",
    "J3":  "normal",
    "J2":  "normal",
    "J1":  "excellent",
    "J1+": "excellent",
    "—":   "excellent",
  };
  return map[jaeger];
}
