"use client";

import { useEffect, useRef, useCallback } from "react";
import { type BlinkFact } from "./blinkFacts";

interface BlinkCardProps {
  fact: BlinkFact;
  onDismiss: () => void;
  /** Position the card relative to the widget */
  anchorEdge: "left" | "right";
}

/**
 * Educational floating card that displays blink/eye health tips.
 * Auto-dismisses after 12 seconds, or on outside click / button press.
 * Uses project glass-panel aesthetic.
 */
export function BlinkCard({ fact, onDismiss, anchorEdge }: BlinkCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    autoCloseRef.current = setTimeout(onDismiss, 12000);
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [onDismiss]);

  // Close on outside click
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    },
    [onDismiss]
  );

  useEffect(() => {
    // Delay adding listener to avoid immediate dismissal from the opening click
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Trap focus on card open
  useEffect(() => {
    const el = cardRef.current;
    if (el) el.focus();
  }, []);

  const positionClass =
    anchorEdge === "right"
      ? "right-0 bottom-[calc(100%+12px)]"
      : "left-0 bottom-[calc(100%+12px)]";

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-labelledby="blink-card-title"
      aria-describedby="blink-card-body"
      tabIndex={-1}
      className={`absolute ${positionClass} w-72 sm:w-80 rounded-3xl p-5 
        bg-[rgba(255,252,247,0.92)] border border-white/60
        shadow-[0_24px_80px_rgba(15,79,75,0.14)]
        backdrop-blur-[22px]
        animate-[blinkCardIn_0.25s_ease-out]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(181,150,77,0.42)]
        z-50`}
    >
      <h3
        id="blink-card-title"
        className="text-sm font-semibold text-[#0f4f4b] mb-2"
      >
        {fact.title}
      </h3>
      <p
        id="blink-card-body"
        className="text-sm leading-relaxed text-[#2b2b2b] mb-3"
      >
        {fact.body}
      </p>
      <p className="text-[11px] text-[#64605b] mb-3 italic">
        Source: {fact.source}
      </p>
      <button
        onClick={onDismiss}
        className="w-full py-2.5 px-4 rounded-2xl text-sm font-medium
          bg-[#0f4f4b] text-[#fffaf3] 
          hover:bg-[#0f4f4b]/90 
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(181,150,77,0.42)]
          transition-colors duration-200
          min-h-[44px]"
        aria-label="Dismiss eye health tip"
      >
        Got it
      </button>
    </div>
  );
}
