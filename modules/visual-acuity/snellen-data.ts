import type { SnellenLine, SnellenNotation } from "./types";

// ISO/Sloan letter set — 10 standard optotype characters
const SLOAN_SET = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"];

// Fisher-Yates shuffle — new random order each session
export function shuffleLetters(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getSessionLetters(letterCount: number): string[] {
  return shuffleLetters(SLOAN_SET).slice(0, letterCount);
}

// Standard Snellen lines — exact chart specification (20/xx notation)
// Based on clinical standard with exact letter heights in mm at 6m
export const SNELLEN_LINES: SnellenLine[] = [
  {
    notation: "20/200",
    notation6m: "6/60",
    exactHeightMm: 43.6,
    letters: ["E"],
    label: "Count Fingers",
  },
  {
    notation: "20/100",
    notation6m: "6/30",
    exactHeightMm: 21.8,
    letters: ["F", "P"],
    label: "Very Large",
  },
  {
    notation: "20/70",
    notation6m: "6/21",
    exactHeightMm: 15.3,
    letters: ["T", "O", "Z"],
    label: "Large",
  },
  {
    notation: "20/50",
    notation6m: "6/15",
    exactHeightMm: 10.9,
    letters: ["L", "P", "E", "D"],
    label: "Medium-Large",
  },
  {
    notation: "20/40",
    notation6m: "6/12",
    exactHeightMm: 8.7,
    letters: ["P", "E", "C", "F", "D"],
    label: "Medium",
  },
  {
    notation: "20/30",
    notation6m: "6/9",
    exactHeightMm: 6.5,
    letters: ["E", "D", "F", "C", "Z", "P"],
    label: "Small",
  },
  {
    notation: "20/25",
    notation6m: "6/7.5",
    exactHeightMm: 5.5,
    letters: ["F", "E", "L", "O", "P", "Z", "D"],
    label: "Normal",
  },
  {
    notation: "20/20",
    notation6m: "6/6",
    exactHeightMm: 4.36,
    letters: ["D", "E", "F", "P", "O", "T", "E", "C"],
    label: "Sharp",
  },
  {
    notation: "20/15",
    notation6m: "6/4.5",
    exactHeightMm: 3.27,
    letters: ["L", "E", "F", "O", "D", "P", "C", "T"],
    label: "Excellent",
  },
];

/**
 * Compute the physical letter height in millimetres for a given Snellen line.
 *
 * Clinical derivation:
 *   At testing distance D metres, a Snellen letter with denominator N
 *   is designed to subtend exactly 5 arc-minutes of visual angle.
 *
 *   tan(5 arcmin) = tan(5/60 × π/180) ≈ 0.001454
 *
 *   At the standard reference distance of 6 m:
 *     height = 6000 mm × 0.001454 × (N/6) = N × 1.454 mm
 *
 *   At an arbitrary testing distance D metres, scale proportionally:
 *     height = N × (D/6) × 1.454 mm
 *
 * @param denominator  Snellen denominator (e.g. 6 for 6/6)
 * @param testingDistanceM  Patient standing distance in metres
 */
export function letterHeightMm(denominator: number, testingDistanceM: number): number {
  return denominator * (testingDistanceM / 6) * 1.454;
}

/**
 * Convert a physical millimetre measurement to CSS pixels
 * using the calibrated pixel-per-mm ratio.
 * NOTE: pxPerMm is already in CSS pixels (DPR-independent).
 */
export function mmToCssPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm;
}

// Human-readable VA descriptions for results screen
export const VA_DESCRIPTIONS: Record<SnellenNotation, string> = {
  "20/200": "Severely reduced — can only see very large objects clearly",
  "20/100": "Reduced vision — large print readable at close range",
  "20/70":  "Moderate reduction — reading difficult without correction",
  "20/50":  "Mild reduction — driving likely requires correction",
  "20/40":  "Below normal — glasses or contact lenses likely required",
  "20/30":  "Near normal — mild refractive error possible",
  "20/25":  "Normal vision — no correction needed",
  "20/20":  "Better-than-normal — excellent visual acuity",
  "20/15":  "Exceptional — better than standard normal vision",
};

// Level number mapping (1-9) for each Snellen notation
export const VA_LEVEL: Record<SnellenNotation, number> = {
  "20/200": 1,
  "20/100": 2,
  "20/70":  3,
  "20/50":  4,
  "20/40":  5,
  "20/30":  6,
  "20/25":  7,
  "20/20":  8,
  "20/15":  9,
};

// Clinical severity for badge colouring
export function vaCategory(
  notation: SnellenNotation | null
): "poor" | "reduced" | "normal" | "excellent" | "unknown" {
  if (!notation) return "unknown";
  const d: Record<SnellenNotation, ReturnType<typeof vaCategory>> = {
    "20/200": "poor",
    "20/100": "poor",
    "20/70":  "reduced",
    "20/50":  "reduced",
    "20/40":  "reduced",
    "20/30":  "normal",
    "20/25":  "normal",
    "20/20":  "excellent",
    "20/15":  "excellent",
  };
  return d[notation];
}
