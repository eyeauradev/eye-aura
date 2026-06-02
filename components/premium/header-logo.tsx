"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

export interface HeaderLogoProps {
  /** Renders smaller for assessment/immersive contexts */
  compact?: boolean;
  /** Show exit confirmation dialog before navigating (active assessments) */
  showExitDialog?: boolean;
  /** Called after user confirms "Exit to Home" in the dialog */
  onExitConfirm?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Shared Eye Aura brand logo that appears in every authenticated header.
 * Always navigates to the public homepage ("/").
 *
 * - Standard mode: 40×40 logo + "Eye Aura" text on desktop
 * - Compact mode: 28×28 logo only (for assessment immersive shells)
 * - When `showExitDialog` is true, click opens a confirmation dialog
 *   instead of navigating immediately.
 */
export function HeaderLogo({
  compact = false,
  showExitDialog = false,
  onExitConfirm,
  className = "",
}: HeaderLogoProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (showExitDialog) {
        e.preventDefault();
        setDialogOpen(true);
      }
      // else: normal Link navigation to "/"
    },
    [showExitDialog]
  );

  const handleContinue = useCallback(() => setDialogOpen(false), []);

  const handleExit = useCallback(() => {
    setDialogOpen(false);
    onExitConfirm?.();
    // Navigate to homepage
    window.location.href = "/";
  }, [onExitConfirm]);

  const logoSize = compact ? "h-7 w-7" : "h-10 w-10 sm:h-9 sm:w-9";
  const logoPx = compact ? 28 : 40;

  return (
    <>
      <Link
        href="/"
        onClick={handleClick}
        aria-label="Navigate to Eye Aura homepage"
        className={`flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg ${className}`}
      >
        <Image
          src="/eye-aura-logo_transparent.png"
          alt="Eye Aura Home"
          width={logoPx}
          height={logoPx}
          className={`${logoSize} object-contain`}
          priority
        />
        {!compact && (
          <span className="font-display text-xl text-primary hidden sm:block">
            Eye Aura
          </span>
        )}
      </Link>

      {/* Exit Assessment Confirmation Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#0f4f4b]">
              Exit Assessment?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              You have an assessment in progress. Leaving now may result in
              losing your progress.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleContinue}
                className="flex-1 py-3 px-4 rounded-xl border border-[#0f4f4b]/20 text-sm font-semibold text-[#0f4f4b] hover:bg-[#0f4f4b]/5 transition-colors"
              >
                Continue Assessment
              </button>
              <button
                onClick={handleExit}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Exit to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
