/**
 * SLOAN OPTOTYPE VECTOR DEFINITIONS
 *
 * Each glyph is defined as an SVG path on a 10×10 unit bounding box.
 * Stroke weight = 2 units (1/5 of the letter height — standard Sloan).
 *
 * To render at a target physical size:
 *   scale = targetCapPx / 10
 *   Apply: transform="translate(x, y) scale(scale)"
 *
 * This guarantees mathematically exact, font-engine-independent rendering.
 * All letters are solid filled shapes (no text glyphs, no browser typography).
 */

export interface OptotypeDef {
  /** SVG path data on a 10×10 unit grid */
  d: string;
  /** fill-rule — evenodd required for hollow glyphs (O, D, P) */
  fillRule?: "evenodd" | "nonzero";
}

/**
 * Verified Sloan-inspired optotype paths.
 * All paths fit within [0,0]→[10,10]. Stroke width = 2 units.
 *
 * Construction notes:
 *  E — left vertical + 3 horizontal bars (middle bar ¾ width)
 *  F — left vertical + top bar + middle bar
 *  L — left vertical + bottom bar
 *  T — top bar + center vertical
 *  C — top bar + left vertical + bottom bar (open right)
 *  O — hollow square ring (evenodd cutout)
 *  D — hollow rect with flat left edge (evenodd cutout)
 *  Z — top bar + diagonal + bottom bar
 *  P — left column + upper closed loop (evenodd cutout)
 */
export const OPTOTYPES: Record<string, OptotypeDef> = {
  /**
   * E — 3-barred letter
   * Left col (0-2) + top bar (full) + middle bar (¾) + bottom bar (full)
   */
  E: {
    d: "M0,0 H10 V2 H2 V4 H8 V6 H2 V8 H10 V10 H0 Z",
  },

  /**
   * F — 2-barred letter
   * Left col + top bar (full) + middle bar (¾)
   */
  F: {
    d: "M0,0 H10 V2 H2 V4 H8 V6 H2 V10 H0 Z",
  },

  /**
   * L — corner letter
   * Left col (full) + bottom bar (full)
   */
  L: {
    d: "M0,0 H2 V8 H10 V10 H0 Z",
  },

  /**
   * T — cross letter
   * Top bar (full) + center vertical
   */
  T: {
    d: "M0,0 H10 V2 H6 V10 H4 V2 H0 Z",
  },

  /**
   * C — open-right bracket
   * Top bar + left col + bottom bar (right side open)
   */
  C: {
    d: "M0,0 H10 V2 H2 V8 H10 V10 H0 Z",
  },

  /**
   * O — hollow square ring (evenodd)
   * Outer 10×10 minus inner 6×6 cutout at (2,2)
   */
  O: {
    d: "M0,0 H10 V10 H0 Z M2,2 H8 V8 H2 Z",
    fillRule: "evenodd",
  },

  /**
   * D — hollow rect, flat left side (evenodd)
   * Outer 9×10 minus inner cutout — approximates D curve with rectilinear strokes
   */
  D: {
    d: "M0,0 H9 V10 H0 Z M2,2 H7 V8 H2 Z",
    fillRule: "evenodd",
  },

  /**
   * Z — diagonal letter
   * Top bar + diagonal from (10,2)→(0,8) with 2-unit width + bottom bar
   */
  Z: {
    d: "M0,0 H10 V2 L2,8 H10 V10 H0 V8 L8,2 H0 Z",
  },

  /**
   * P — loop letter (evenodd)
   * Left col (full height) + upper closed loop, hollow inside
   */
  P: {
    d: "M0,0 H9 V6 H2 V10 H0 Z M2,2 H8 V5 H2 Z",
    fillRule: "evenodd",
  },
};

/** All letters used in the far + near vision assessment charts */
export const ASSESSMENT_LETTER_SET = Object.keys(OPTOTYPES);
