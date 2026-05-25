"use client";

import { useMemo } from "react";
import { letterHeightMm, mmToCssPx } from "./snellen-data";
import type { CalibrationData } from "./types";

interface SnellenRendererProps {
  letters: string[];
  denominator: number;
  testingDistanceM: number;
  calibration: CalibrationData;
  /** Animate in on mount */
  animate?: boolean;
}

/**
 * SVG-based Snellen optotype renderer.
 *
 * Physical accuracy:
 *   - letter height computed from Snellen formula (5 arcmin at testing distance)
 *   - pxPerMm from user calibration → maps mm directly to CSS pixels
 *   - Each glyph rendered with font-size = computed CSS px height
 *   - Inter-letter gap = one letter width (≈ letter height, 1:1 Sloan proportions)
 *   - SVG uses shape-rendering="geometricPrecision" to prevent sub-pixel blur
 *   - No DPR correction needed — CSS px is already DPR-independent
 */
export function SnellenRenderer({
  letters,
  denominator,
  testingDistanceM,
  calibration,
  animate = true,
}: SnellenRendererProps) {
  const { pxPerMm } = calibration;

  // Proportional scale-up: the hardest Snellen line (6/5, denominator=5) must be
  // at least MIN_READABLE_PX tall so all lines remain distinguishable on screen.
  // All lines are multiplied by the same factor, preserving their correct size ratios.
  // At 3 m (far) the factor is always 1 — no distortion for the far test.
  const MIN_READABLE_PX = 8;
  const scaleFactor = useMemo(() => {
    const smallestPx = mmToCssPx(letterHeightMm(5, testingDistanceM), pxPerMm);
    return smallestPx < MIN_READABLE_PX ? MIN_READABLE_PX / smallestPx : 1;
  }, [testingDistanceM, pxPerMm]);

  const heightPx = useMemo(
    () => mmToCssPx(letterHeightMm(denominator, testingDistanceM), pxPerMm) * scaleFactor,
    [denominator, testingDistanceM, pxPerMm, scaleFactor]
  );

  const letterWidth = heightPx * 0.85;   // Sloan ~0.85 aspect ratio
  const gap        = heightPx * 0.25;   // ¼ letter-height inter-glyph gap
  const strokeW    = heightPx / 5;      // 1 arcmin stroke weight

  const totalWidth = letters.length * letterWidth + (letters.length - 1) * gap;
  const svgWidth   = totalWidth + heightPx;
  const svgHeight  = heightPx * 1.6;

  const centerY = svgHeight / 2;
  const startX  = (svgWidth - totalWidth) / 2;

  return (
    <div
      className="flex items-center justify-center w-full"
      style={{
        opacity: animate ? undefined : 1,
        animation: animate ? "snellen-fade-in 0.4s ease forwards" : undefined,
      }}
    >
      <style>{`
        @keyframes snellen-fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* width:100%/height:auto + viewBox = responsive scaling.
          maxWidth caps the SVG at its natural size on wide screens. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ display: "block", width: "100%", maxWidth: svgWidth, height: "auto" }}
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        aria-label={`Snellen chart line: ${letters.join(" ")}`}
        role="img"
      >
        {/* Optotype background — white for maximum contrast */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="white" />

        {letters.map((letter, i) => {
          const x = startX + i * (letterWidth + gap) + letterWidth / 2;
          return (
            <text
              key={`${letter}-${i}`}
              x={x}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={heightPx}
              fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif"
              fontWeight="900"
              fill="#0a0a0a"
              letterSpacing="0"
              style={{ userSelect: "none" }}
            >
              {letter}
            </text>
          );
        })}
      </svg>

      {/* Physical size indicator — dev/debug, hidden in production */}
      {process.env.NODE_ENV === "development" && (
        <span className="sr-only">
          Letter height: {letterHeightMm(denominator, testingDistanceM).toFixed(2)} mm /{" "}
          {heightPx.toFixed(1)} px | Stroke: {strokeW.toFixed(1)} px
        </span>
      )}
    </div>
  );
}
