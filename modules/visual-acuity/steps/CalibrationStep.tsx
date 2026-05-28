"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CreditCard, CheckCircle2, RefreshCw, ZoomIn, ZoomOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalibrationData } from "../types";

// ISO/IEC 7810 ID-1 -- standard credit/bank card
const CARD_WIDTH_MM  = 85.60;   // long side
const CARD_HEIGHT_MM = 53.98;   // short side
const ASPECT_RATIO   = CARD_HEIGHT_MM / CARD_WIDTH_MM; // ~0.631

// Switch to portrait calibration when viewport is narrower than this
const PORTRAIT_BREAKPOINT_PX = 520;

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
      data.deviceWidth  !== window.innerWidth ||
      data.deviceHeight !== window.innerHeight
    ) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCalibration(data: CalibrationData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(data));
  } catch { /* storage full -- silently continue */ }
}

export function CalibrationStep({ onCalibrated, existingCalibration }: CalibrationStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // portrait = true when the viewport is too narrow for landscape card
  const [portrait, setPortrait] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < PORTRAIT_BREAKPOINT_PX
  );

  // cardLongPx represents the LONG dimension of the card in CSS pixels.
  // - Landscape: long side is the width  (85.60 mm)
  // - Portrait:  long side is the height (85.60 mm)
  // pxPerMm = cardLongPx / CARD_WIDTH_MM in BOTH cases.
  const initialLong = () => {
    if (typeof window === "undefined") return 280;
    if (window.innerWidth < PORTRAIT_BREAKPOINT_PX) {
      // Start at 60% of viewport height — card usually needs ~55–65% on a typical phone
      return Math.max(200, Math.min(Math.floor(window.innerHeight * 0.6), 600));
    }
    return Math.max(200, Math.min(Math.floor(window.innerWidth * 0.6), 420));
  };

  const [cardLongPx, setCardLongPx] = useState(initialLong);
  const [confirmed, setConfirmed]   = useState(false);
  const [stored, setStored]         = useState<CalibrationData | null>(null);

  // Re-evaluate portrait on resize
  useEffect(() => {
    const onResize = () => {
      setPortrait(window.innerWidth < PORTRAIT_BREAKPOINT_PX);
      setConfirmed(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const cal = existingCalibration ?? loadStoredCalibration();
    if (cal) {
      setStored(cal);
      setCardLongPx(Math.round(cal.cardWidthPx)); // cardWidthPx always = longPx
    }
  }, [existingCalibration]);

  const minLong = 160;
  const maxLong = portrait
    ? Math.min((typeof window !== "undefined" ? window.innerHeight : 800), 720)
    : Math.min((typeof window !== "undefined" ? window.innerWidth  : 800) - 48, 560);

  const adjust = useCallback((delta: number) => {
    setCardLongPx((v) => Math.max(minLong, Math.min(maxLong, v + delta)));
    setConfirmed(false);
  }, [minLong, maxLong]);

  // Computed short side
  const cardShortPx = Math.round(cardLongPx * ASPECT_RATIO);

  // Displayed element dimensions
  const displayW = portrait ? cardShortPx  : cardLongPx;
  const displayH = portrait ? cardLongPx   : cardShortPx;

  const buildCalibrationData = (): CalibrationData => ({
    pxPerMm:     cardLongPx / CARD_WIDTH_MM,
    cardWidthPx: cardLongPx,                   // always long dimension = 85.60 mm
    deviceWidth:  window.innerWidth,
    deviceHeight: window.innerHeight,
    dpr:          window.devicePixelRatio ?? 1,
    timestamp:    Date.now(),
  });

  const handleConfirm = () => {
    const data = buildCalibrationData();
    saveCalibration(data);
    setStored(data);
    setConfirmed(true);
  };

  const handleUseStored = () => {
    if (stored) onCalibrated(stored);
  };

  const handleProceed = () => {
    const data = buildCalibrationData();
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
          {portrait
            ? "Hold your bank card vertically next to the rectangle. Adjust until they are exactly the same height."
            : "Place any bank card, ID, or credit card next to the rectangle below. Adjust until they are exactly the same size."}
        </p>
      </div>

      {/* Previously saved calibration shortcut */}
      {stored && !confirmed && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#0f4f4b]/5 border border-[#0f4f4b]/12 p-4">
          <CheckCircle2 className="h-5 w-5 text-[#0f4f4b] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0f4f4b]">Previous calibration found</p>
            <p className="text-xs text-[#0f4f4b]/55 mt-0.5">
              {stored.pxPerMm.toFixed(3)} px/mm - saved within the last 24 hours
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

      {/* Calibration area — card overflows the viewport edges intentionally */}
      <div ref={containerRef} className="flex flex-col items-center gap-6">

        {/* Calibration rectangle — allowed to overflow horizontally so user can
            hold a physical card against the screen edge for comparison */}
        <div
          className="relative"
          style={{ width: displayW, height: displayH }}
        >
          <div
            className={`w-full h-full rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
              confirmed
                ? "border-[#0f4f4b] bg-[#0f4f4b]/5"
                : "border-dashed border-[#b5964d] bg-[#b5964d]/4"
            }`}
          >
            <CreditCard
              className={`mb-2 ${confirmed ? "text-[#0f4f4b]" : "text-[#b5964d]/60"} ${
                portrait ? "h-6 w-6" : "h-8 w-8"
              }`}
              style={portrait ? { transform: "rotate(90deg)" } : undefined}
            />
            <p
              className={`text-[10px] font-bold uppercase tracking-widest text-center ${
                confirmed ? "text-[#0f4f4b]/70" : "text-[#b5964d]/70"
              }`}
            >
              {portrait
                ? `${CARD_HEIGHT_MM}mm x ${CARD_WIDTH_MM}mm`
                : `${CARD_WIDTH_MM}mm x ${CARD_HEIGHT_MM}mm`}
            </p>
          </div>
          {confirmed && (
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#0f4f4b] flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
          )}
        </div>

        {/* Controls — constrained to viewport width */}
        <div className="w-full max-w-sm px-2 space-y-4">
          {/* Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#0f4f4b]/50 font-medium">
              <span>{portrait ? "Shorter" : "Narrower"}</span>
              <span className="font-bold text-[#0f4f4b]">
                {cardLongPx}px {portrait ? "tall" : "wide"}
              </span>
              <span>{portrait ? "Taller" : "Wider"}</span>
            </div>
            <input
              type="range"
              min={minLong}
              max={maxLong}
              value={cardLongPx}
              onChange={(e) => {
                setCardLongPx(Number(e.target.value));
                setConfirmed(false);
              }}
              className="w-full accent-[#0f4f4b] h-2 rounded-full cursor-pointer"
            />
          </div>        {/* Fine-tune buttons */}
        <div className="grid grid-cols-4 gap-1.5 w-full">
          <button
            onClick={() => adjust(-5)}
            className="flex items-center justify-center gap-1 py-2.5 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            <ZoomOut className="h-3 w-3 shrink-0 hidden sm:block" />
            <span>-5px</span>
          </button>
          <button
            onClick={() => adjust(-1)}
            className="flex items-center justify-center py-2.5 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            -1px
          </button>
          <button
            onClick={() => adjust(1)}
            className="flex items-center justify-center py-2.5 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            +1px
          </button>
          <button
            onClick={() => adjust(5)}
            className="flex items-center justify-center gap-1 py-2.5 rounded-xl border border-[#0f4f4b]/20 text-[#0f4f4b] text-xs font-semibold hover:bg-[#0f4f4b]/5 transition-colors"
          >
            <span>+5px</span>
            <ZoomIn className="h-3 w-3 shrink-0 hidden sm:block" />
          </button>
        </div>

        {/* Confirm match */}
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
              Calibrated - {(cardLongPx / CARD_WIDTH_MM).toFixed(3)} px/mm
            </p>
            <button
              onClick={() => setConfirmed(false)}
              className="ml-auto text-xs text-[#0f4f4b]/50 hover:text-[#0f4f4b] flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Redo
            </button>
          </div>
        )}
        </div>{/* end controls */}
      </div>{/* end calibration area */}

      {/* Reference */}
      <div className="rounded-2xl bg-[#b5964d]/6 border border-[#b5964d]/20 p-4">
        <p className="text-xs font-bold text-[#b5964d] mb-1">ISO/IEC 7810 ID-1 Reference</p>
        <p className="text-xs text-[#0f4f4b]/60 leading-relaxed">
          Standard bank card, driving licence, or ID card: 85.60 mm x 53.98 mm (3.370 x 2.125 in).
          {portrait
            ? " Hold it upright (portrait) to match the tall rectangle."
            : " Any card of this standard may be used for calibration."}
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
