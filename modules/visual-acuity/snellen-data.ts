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

// Standard Snellen lines — largest to smallest (easiest to hardest)
export const SNELLEN_LINES: SnellenLine[] = [
  { notation: "6/60", denominator: 60, letterCount: 1, label: "Count Fingers" },
  { notation: "6/36", denominator: 36, letterCount: 2, label: "Very Large" },
  { notation: "6/24", denominator: 24, letterCount: 3, label: "Large" },
  { notation: "6/18", denominator: 18, letterCount: 4, label: "Medium-Large" },
  { notation: "6/12", denominator: 12, letterCount: 5, label: "Medium" },
  { notation: "6/9",  denominator: 9,  letterCount: 6, label: "Small" },
  { notation: "6/6",  denominator: 6,  letterCount: 7, label: "Normal" },
  { notation: "6/5",  denominator: 5,  letterCount: 8, label: "Sharp" },
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
  "6/60": "Severely reduced — can only see very large objects clearly",
  "6/36": "Reduced vision — large print readable at close range",
  "6/24": "Moderate reduction — reading difficult without correction",
  "6/18": "Mild reduction — driving likely requires correction",
  "6/12": "Below normal — glasses or contact lenses likely required",
  "6/9":  "Near normal — mild refractive error possible",
  "6/6":  "Normal vision — no correction needed",
  "6/5":  "Better-than-normal — excellent visual acuity",
};

// Clinical severity for badge colouring
export function vaCategory(
  notation: SnellenNotation | null
): "poor" | "reduced" | "normal" | "excellent" | "unknown" {
  if (!notation) return "unknown";
  const d: Record<SnellenNotation, ReturnType<typeof vaCategory>> = {
    "6/60": "poor",
    "6/36": "poor",
    "6/24": "reduced",
    "6/18": "reduced",
    "6/12": "reduced",
    "6/9":  "normal",
    "6/6":  "normal",
    "6/5":  "excellent",
  };
  return d[notation];
}
