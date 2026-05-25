"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CreditCard, CheckCircle2, RefreshCw, ZoomIn, ZoomOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalibrationData } from "../types";

// ISO/IEC 7810 ID-1 — standard credit/bank card
const CARD_WIDTH_MM = 85.60;
const CARD_HEIGHT_MM = 53.98;
const ASPECT_RATIO = CARD_HEIGHT_MM / CARD_WIDTH_MM; // ≈ 0.631

const CALIBRATION_KEY = "ea_acuity_calibration";
const CALIBRATION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CalibrationStepProps {
  onCalibrated: (data: CalibrationData) => void;
  existingCalibration?: CalibrationData | null;
}

function loadStoredCalibration(): CalibrationData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return null;
    const data: CalibrationData = JSON.parse(raw);
    const age = Date.now() - data.timestamp;
    if (
      age > CALIBRATION_MAX_AGE_MS ||
      data.deviceWidth !== window.innerWidth ||
      data.deviceHeight !== window.innerHeight
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveCalibration(data: CalibrationData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(data));
  } catch {
    /* storage full — silently continue */
  }
}

export function CalibrationStep({ onCalibrated, existingCalibration }: CalibrationStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Safe initial width — half the viewport, at least 160px
  const initialWidth = typeof window !== "undefined"
    ? Math.max(160, Math.min(Math.floor(window.innerWidth * 0.55), 420))
    : 280;

  const [cardWidthPx, setCardWidthPx] = useState(initialWidth);
  const [confirmed, setConfirmed] = useState(false);
  const [stored, setStored] = useState<CalibrationData | null>(null);

  const cardHeightPx = Math.round(cardWidthPx * ASPECT_RATIO);

  useEffect(() => {
    const cal = existingCalibration ?? loadStoredCalibration();
    if (cal) {
      setStored(cal);
      setCardWidthPx(Math.round(cal.cardWidthPx));
    }
  }, [existingCalibration]);

  const minWidth = 120;
  const maxWidth =
    typeof window !== "undefined" ? Math.min(window.innerWidth - 48, 560) : 480;

  const adjust = useCallback((delta: number) => {
    setCardWidthPx((w) => Math.max(minWidth, Math.min(maxWidth, w + delta)));
    setConfirmed(false);
  }, [maxWidth]);

  const handleConfirm = () => {
    const pxPerMm = cardWidthPx / CARD_WIDTH_MM;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const data: CalibrationData = {
      pxPerMm,
      cardWidthPx,
      deviceWidth: window.innerWidth,
      deviceHeight: window.innerHeight,
      dpr,
      timestamp: Date.now(),
    };
    saveCalibration(data);
    setStored(data);
    setConfirmed(true);
  };

  const handleUseStored = () => {
    if (stored) onCalibrated(stored);
  };

  const handleProceed = () => {
    const pxPerMm = cardWidthPx / CARD_WIDTH_MM;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    const data: CalibrationData = {
      pxPerMm,
      cardWidthPx,
      deviceWidth: window.innerWidth,
      deviceHeight: window.innerHeight,
      dpr,
      timestamp: Date.now(),
    };
    saveCalibration(data);
    onCalibrated(data);
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#b5964d]/30 bg-[#b5964d]/8 px-4 py-1.5 mb-1">
          <CreditCard className="h-3.5 w-3.5 text-[#b5964d]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#b5964d]">
            Screen Calibration
          </span>
        </div>
        <h2 className="text-2xl font-black text-[#0f4f4b]">Match your physical card</h2>
        <p className="text-sm text-[#0f4f4b]/60 max-w-xs mx-auto leading-relaxed">
          Place any bank card, ID, or credit card next to the rectangle below.
          Adjust until they are exactly the same size.
        </p>
      </div>

      {/* Previously saved calibration shortcut */}
      {stored && !confirmed && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#0f4f4b]/5 border border-[#0f4f4b]/12 p-4">
          <CheckCircle2 className="h-5 w-5 text-[#0f4f4b] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0f4f4b]">Previous calibration found</p>
            <p className="text-xs text-[#0f4f4b]/55 mt-0.5">
              {stored.pxPerMm.toFixed(3)} px/mm — saved within the last 24 hours
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleUseStored}
            className="shrink-0 border-[#0f4f4b]/20 text-[#0f4f4b] text-xs rounded-xl min-h-8 px-3 py-1"
          >
            Use it
          </Button>
        </div>
      )}

      {/* Calibration card */}
      <div
        ref={containerRef}
        className="flex flex-col items-center gap-6 rounded-3xl bg-white/90 border border-[#0f4f4b]/12 p-6"
      >
        {/* The calibration rectangle */}
        <div className="relative" style={{ width: cardWidthPx, height: cardHeightPx }}>
          <div
            className={`w-full h-full rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
              confirmed
                ? "border-[#0f4f4b] bg-[#0f4f4b]/5"
                : "border-dashed border-[#b5964d] bg-[#b5964d]/4"
            }`}
          >
            <CreditCard
              className={`h-8 w-8 mb-2 ${confirmed ? "text-[#0f4f4b]" : "text-[#b5964d]/60"}`}
            />
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                confirmed ? "text-[#0f4f4b]/70" : "text-[#b5964d]/70"
              }`}
            >
              {CARD_WIDTH_MM}mm × {CARD_HEIGHT_MM}mm
            </p>
          </div>
          {confirmed && (
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#0f4f4b] flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
          )}
        </div>

        {/* Slider */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between text-xs text-[#0f4f4b]/50 font-medium">
            <span>Narrower</span>
            <span className="font-bold text-[#0f4f4b]">
              {cardWidthPx}px wide
            </span>
            <span>Wider</span>
          </div>
          <input
            type="range"
            min={minWidth}
            max={maxWidth}
            value={cardWidthPx}
            onChange={(e) => {
              setCardWidthPx(Number(e.target.value));
              setConfirmed(false);
            }}
            className="w-full accent-[#0f4f4b] h-2 rounded-full cursor-pointer"
          />
        </div>

        {/* Fine-tune buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => adjust(-5)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            <ZoomOut className="h-3.5 w-3.5" /> −5px
          </button>
          <button
            onClick={() => adjust(-1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            −1px
          </button>
          <button
            onClick={() => adjust(1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            +1px
          </button>
          <button
            onClick={() => adjust(5)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            <ZoomIn className="h-3.5 w-3.5" /> +5px
          </button>
        </div>

        {/* Confirm match button */}
        {!confirmed ? (
          <Button
            onClick={handleConfirm}
            variant="outline"
            className="w-full border-[#0f4f4b]/25 text-[#0f4f4b] font-semibold rounded-xl"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            The on-screen card matches my physical card
          </Button>
        ) : (
          <div className="w-full flex items-center gap-2 p-3 rounded-xl bg-[#0f4f4b]/6 border border-[#0f4f4b]/15">
            <CheckCircle2 className="h-4 w-4 text-[#0f4f4b]" />
            <p className="text-sm font-bold text-[#0f4f4b]">
              Calibrated — {(cardWidthPx / CARD_WIDTH_MM).toFixed(3)} px/mm
            </p>
            <button
              onClick={() => setConfirmed(false)}
              className="ml-auto text-xs text-[#0f4f4b]/50 hover:text-[#0f4f4b] flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Redo
            </button>
          </div>
        )}
      </div>

      {/* Reference */}
      <div className="rounded-2xl bg-[#b5964d]/6 border border-[#b5964d]/20 p-4">
        <p className="text-xs font-bold text-[#b5964d] mb-1">ISO/IEC 7810 ID-1 Reference</p>
        <p className="text-xs text-[#0f4f4b]/60 leading-relaxed">
          Standard bank card, driving licence, or ID card: 85.60 mm × 53.98 mm (3.370 × 2.125 in).
          Any card of this standard may be used for calibration.
        </p>
      </div>

      <Button
        onClick={handleProceed}
        disabled={!confirmed}
        size="lg"
        className="w-full h-14 text-base rounded-2xl bg-[#0f4f4b] hover:bg-[#0a3a36] disabled:opacity-40 transition-all"
      >
        Start Testing
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
