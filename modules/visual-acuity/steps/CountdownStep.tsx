"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface CountdownStepProps {
  /** Total seconds to count down (default 10) */
  seconds?: number;
  /** Called when countdown reaches zero */
  onComplete: () => void;
}

/**
 * Full-screen countdown shown before the far-vision Snellen test begins.
 *
 * The user needs time to walk away from the display to the 3 m testing
 * distance. A large animated number counts down from `seconds` (default 10).
 * Tapping anywhere on the screen toggles pause / resume.
 */
export function CountdownStep({ seconds = 10, onComplete }: CountdownStepProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Run the countdown tick
  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      onCompleteRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, paused]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  // Progress: 0 → 1 as time runs out
  const progress = (seconds - remaining) / seconds;
  // Circle dimensions
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <button
      type="button"
      onClick={togglePause}
      aria-label={paused ? "Resume countdown" : "Pause countdown"}
      className="
        relative flex flex-col items-center justify-center
        w-full min-h-[70vh] select-none
        focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 rounded-3xl
      "
    >
      {/* Instruction text */}
      <p className="text-base sm:text-lg font-medium text-muted-foreground mb-10 px-6 text-center leading-relaxed max-w-sm">
        Walk to your&nbsp;
        <span className="font-semibold text-foreground">3&nbsp;metre</span>
        &nbsp;testing distance.<br />
        Assessment begins when the timer reaches&nbsp;
        <span className="font-semibold text-foreground">0</span>.
      </p>

      {/* Big circular countdown */}
      <div className="relative flex items-center justify-center" style={{ width: 268, height: 268 }}>
        {/* Background track */}
        <svg
          width={268}
          height={268}
          viewBox="0 0 268 268"
          className="absolute inset-0 rotate-[-90deg]"
          aria-hidden
        >
          <circle
            cx={134}
            cy={134}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            className="text-primary/10"
          />
          {/* Animated progress arc */}
          <circle
            cx={134}
            cy={134}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={paused ? "text-[#b5964d]" : "text-primary"}
            style={{ transition: paused ? "none" : "stroke-dashoffset 0.95s linear" }}
          />
        </svg>

        {/* Number */}
        <span
          className={`
            font-black tabular-nums leading-none select-none
            transition-colors duration-300
            ${paused ? "text-[#b5964d]" : "text-primary"}
          `}
          style={{ fontSize: remaining >= 10 ? "5.5rem" : "6.5rem" }}
        >
          {remaining}
        </span>
      </div>

      {/* Pause / resume hint */}
      <p
        className={`
          mt-10 text-sm font-medium tracking-wide uppercase transition-colors duration-300
          ${paused ? "text-[#b5964d]" : "text-muted-foreground/60"}
        `}
      >
        {paused ? "▶ Tap to resume" : "⏸ Tap to pause"}
      </p>
    </button>
  );
}
