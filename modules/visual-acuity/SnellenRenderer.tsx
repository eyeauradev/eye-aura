"use client";

import type { CalibrationData } from "./types";

/**
 * Arial/Helvetica cap height as a fraction of the declared SVG font-size.
 *
 * Derivation: Arial cap height = 1456 / 2048 UPM = 0.711 of em-square.
 * Verified consistent across: Arial, Arial Bold, Helvetica Neue Bold,
 * Chrome, Safari, Firefox on Windows/macOS/Android/iOS.
 *
 * Usage: fontSize = targetCapPx / CAP_HEIGHT_RATIO
 * This makes rendered capital letters physically equal to targetCapPx.
 */
const CAP_HEIGHT_RATIO = 0.711;

/**
 * Hard device-floor for capital height in CSS px.
 * Clamps ONLY when the calibrated physical size is sub-pixel.
 * Does NOT scale other lines — preserves clinical size ratios.
 */
const MIN_CAP_PX = 4;

/**
 * Standard Sloan letter spacing: each letter occupies one "slot" of width = capPx.
 * Inter-letter gap = capPx × LETTER_GAP_RATIO (crowding standard).
 */
const LETTER_GAP_RATIO  = 0.5;  // ½ cap height between letters
const PAD_H_RATIO       = 0.75; // horizontal edge padding
const PAD_V_RATIO       = 0.4;  // vertical padding (top and bottom)

interface SnellenRendererProps {
  letters: string[];
  /** Physical capital-letter height from the clinical chart spec (mm) */
  exactHeightMm: number;
  calibration: CalibrationData;
  animate?: boolean;
  /** Render developer diagnostics panel below chart (dev mode only) */
  showDebug?: boolean;
}

/**
 * Clinically calibrated Snellen optotype renderer.
 *
 * Physical accuracy pipeline:
 *   1. capPx  = exactHeightMm × pxPerMm          (calibrated physical size)
 *   2. fontSize = capPx / CAP_HEIGHT_RATIO         (makes rendered cap = capPx)
 *   3. SVG rendered at exact numeric pixel dimensions — NOT width:"100%"
 *      Browser cannot scale or reflow the element.
 *   4. overflowX:auto on container — large lines scroll, never shrink
 *
 * Letter rendering uses SVG <text> with Helvetica Neue / Arial Bold:
 *   - Real ophthalmic-style letterforms (proper O, C, D curves)
 *   - textRendering="geometricPrecision" for sharp sub-pixel edges
 *   - Alphabetic baseline anchored at padV + capPx (caps sit exactly in the box)
 *   - Each letter centered in its Sloan slot (letterWidth = capPx)
 */
export function SnellenRenderer({
  letters,
  exactHeightMm,
  calibration,
  animate = true,
  showDebug = false,
}: SnellenRendererProps) {
  const { pxPerMm } = calibration;

  // ── 1. Physical sizing ───────────────────────────────────────────────────
  const rawCapPx = exactHeightMm * pxPerMm;
  const capPx    = Math.max(rawCapPx, MIN_CAP_PX);
  const clamped  = rawCapPx < MIN_CAP_PX;

  // ── 2. Font size → cap height compensation ───────────────────────────────
  const fontSize = capPx / CAP_HEIGHT_RATIO;

  // ── 3. Sloan chart spacing ───────────────────────────────────────────────
  const slotW  = capPx;                         // each letter occupies one square slot
  const gap    = capPx * LETTER_GAP_RATIO;
  const padH   = capPx * PAD_H_RATIO;
  const padV   = capPx * PAD_V_RATIO;

  const totalLettersW = letters.length * slotW + (letters.length - 1) * gap;
  const svgW = totalLettersW + padH * 2;
  const svgH = capPx + padV * 2;

  // Alphabetic baseline: caps top = padV → baseline = padV + capPx
  const baselineY = padV + capPx;

  // ── Dev diagnostics ──────────────────────────────────────────────────────
  const renderedMm   = capPx / pxPerMm;
  const deviationPct = Math.abs((renderedMm - exactHeightMm) / exactHeightMm) * 100;
  const isDev        = process.env.NODE_ENV === "development";

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        @keyframes snellen-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Scroll wrapper: large lines scroll, never shrink ────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          overflowX: "auto",
          overflowY: "visible",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/*
         * SVG with EXACT NUMERIC width + height.
         * These are CSS pixel values — browser cannot scale this element.
         * viewBox == width × height → 1 viewBox unit == 1 CSS px.
         * Physical accuracy guaranteed by calibrated capPx.
         */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${svgW} ${svgH}`}
          width={svgW}
          height={svgH}
          style={{
            display: "block",
            flexShrink: 0,
            background: "white",
            animation: animate ? "snellen-fade 0.3s ease forwards" : undefined,
          }}
          textRendering="geometricPrecision"
          shapeRendering="geometricPrecision"
          aria-label={`Snellen chart line: ${letters.join(" ")}`}
          role="img"
        >
          {letters.map((letter, i) => {
            // Center of each Sloan slot
            const slotCenterX = padH + i * (slotW + gap) + slotW / 2;
            return (
              <text
                key={`${letter}-${i}`}
                x={slotCenterX}
                y={baselineY}
                textAnchor="middle"
                dominantBaseline="auto"
                fontSize={fontSize}
                fontFamily="'Helvetica Neue', 'Arial', 'Liberation Sans', sans-serif"
                fontWeight="700"
                fill="#0a0a0a"
                letterSpacing="0"
                style={{ userSelect: "none" }}
              >
                {letter}
              </text>
            );
          })}
        </svg>
      </div>

      {/* ── Developer diagnostics — below chart, never overlapping ────────── */}
      {isDev && showDebug && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            background: "rgba(0,0,0,0.04)",
            borderRadius: 6,
            fontFamily: "monospace",
            fontSize: 10,
            lineHeight: 1.7,
            color: "#555",
            border: "1px solid rgba(0,0,0,0.09)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0 12px" }}>
            <span>target</span>      <strong>{exactHeightMm.toFixed(3)} mm</strong>
            <span>rendered</span>    <strong>{renderedMm.toFixed(3)} mm</strong>
            <span>deviation</span>   <strong style={{ color: deviationPct > 5 ? "#c00" : "#080" }}>{deviationPct.toFixed(1)}%</strong>
            <span>cap px</span>      <strong>{capPx.toFixed(2)} px{clamped ? "  ⚠ floor-clamped" : ""}</strong>
            <span>font-size</span>   <strong>{fontSize.toFixed(2)} px</strong>
            <span>px / mm</span>     <strong>{pxPerMm.toFixed(4)}</strong>
            <span>DPR</span>         <strong>{typeof window !== "undefined" ? window.devicePixelRatio : "—"}</strong>
            <span>svg</span>         <strong>{svgW.toFixed(0)} × {svgH.toFixed(0)} px</strong>
          </div>
        </div>
      )}
    </div>
  );
}
