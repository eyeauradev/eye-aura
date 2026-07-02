"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface BlinkingEyeLoaderProps {
  size?: number;
  withBackground?: boolean;
  className?: string;
  loadingText?: string;
}

/**
 * BlinkingEyeLoader - An animated eye loader component with blinking effect
 * 
 * @param size - Size of the eye icon in pixels (default: 64)
 * @param withBackground - Whether to show the background container (default: true)
 * @param className - Additional CSS classes
 * @param loadingText - Optional loading text to display below the eye
 */
export function BlinkingEyeLoader({
  size = 64,
  withBackground = true,
  className = "",
  loadingText,
}: BlinkingEyeLoaderProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    // Random blink interval between 2-4 seconds
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 2000;
      return setTimeout(() => {
        setIsBlinking(true);
        // Blink duration
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 200);
      }, delay);
    };

    const timeoutId = scheduleNextBlink();

    return () => clearTimeout(timeoutId);
  }, []);

  const containerClasses = withBackground
    ? "flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-[#f7f3ee]/80 backdrop-blur-sm border border-[#0f4f4b]/10"
    : "flex flex-col items-center justify-center gap-4";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="relative">
        {/* Eye image */}
        <div
          className="rounded-full bg-[#f7f3ee] p-2 shadow-lg transition-all duration-200"
          style={{
            transform: isBlinking ? "scaleY(0.1)" : "scaleY(1)",
            transformOrigin: "center",
          }}
        >
          <Image
            src="/eye.png"
            alt="Loading..."
            width={size}
            height={size}
            className="rounded-full object-contain"
            priority
          />
        </div>

        {/* Pulse effect */}
        <div
          className="absolute inset-0 rounded-full bg-[#0f4f4b]/20 animate-ping"
          style={{
            animationDuration: "2s",
            opacity: isBlinking ? 0 : 0.4,
          }}
        />
      </div>

      {/* Loading text */}
      {loadingText && (
        <p className="text-sm font-semibold text-[#0f4f4b]/70 animate-pulse">
          {loadingText}
        </p>
      )}
    </div>
  );
}

/**
 * FullScreenLoader - Full screen version of the blinking eye loader
 */
export function FullScreenLoader({
  loadingText = "Loading...",
}: {
  loadingText?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7f3ee]/95 backdrop-blur-sm">
      <BlinkingEyeLoader
        size={80}
        withBackground={false}
        loadingText={loadingText}
      />
    </div>
  );
}

/**
 * InlineLoader - Compact inline version for buttons and smaller areas
 */
export function InlineLoader({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 2000;
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 200);
      }, delay);
    };

    const timeoutId = scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className="rounded-full bg-[#f7f3ee] p-0.5 transition-all duration-200"
        style={{
          transform: isBlinking ? "scaleY(0.1)" : "scaleY(1)",
          transformOrigin: "center",
        }}
      >
        <Image
          src="/eye.png"
          alt="Loading..."
          width={size}
          height={size}
          className="rounded-full object-contain animate-spin"
          style={{ animationDuration: "3s" }}
        />
      </div>
    </div>
  );
}
