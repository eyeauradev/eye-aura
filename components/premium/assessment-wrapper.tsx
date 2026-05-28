"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { GLASS, SHADOWS, TYPOGRAPHY, SPACING } from "@/lib/design-tokens";
import { GlassPanel } from "./glass-panel";
import { PremiumButton } from "./premium-button";

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface AssessmentStage {
  id: string;
  label: string;
}

export interface AssessmentWrapperProps {
  /** Current stage content */
  children: ReactNode;
  /** Title displayed in the header area */
  title?: string;
  /** Supporting subtitle text */
  subtitle?: string;
  /** All stages for the progress indicator */
  stages?: AssessmentStage[];
  /** Current stage index (0-based) */
  currentStage?: number;
  /** Whether the back button is visible */
  canGoBack?: boolean;
  /** Back button handler */
  onBack?: () => void;
  /** Unique key for AnimatePresence transitions */
  stageKey?: string;
  /** Additional class names for the outer container */
  className?: string;
}

/* ─── Stage transition variants ─────────────────────────────────────── */

const stageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

/* ─── Component ─────────────────────────────────────────────────────── */

/**
 * AssessmentWrapper provides a premium, immersive container for
 * assessment modules (visual acuity tests, etc.).
 *
 * Features:
 * - Full-viewport GlassPanel with rounded-[32px] and backdrop-blur ≥24px
 * - TYPOGRAPHY-based heading/supporting text hierarchy
 * - Progress indicator colored with --primary
 * - Stage transitions via Framer Motion fade + vertical slide (300ms)
 * - Respects prefers-reduced-motion
 */
export function AssessmentWrapper({
  children,
  title,
  subtitle,
  stages,
  currentStage = 0,
  canGoBack = false,
  onBack,
  stageKey,
  className,
}: AssessmentWrapperProps) {
  const shouldReduceMotion = useReducedMotion();

  const totalStages = stages?.length ?? 0;
  const progressPercent =
    totalStages > 1 ? ((currentStage + 1) / totalStages) * 100 : 0;

  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col items-center justify-start",
        SPACING.pageX,
        SPACING.pageY,
        className
      )}
    >
      {/* Full-viewport GlassPanel container */}
      <GlassPanel
        rounded="32"
        padding="none"
        className={cn(
          "w-full max-w-2xl flex-1 flex flex-col overflow-hidden",
          "backdrop-blur-[24px]",
          SHADOWS.glass
        )}
      >
        {/* Header area */}
        <div className={cn("px-6 pt-6 pb-4 space-y-4")}>
          {/* Top row: back button + title */}
          <div className="flex items-center gap-3">
            {canGoBack && onBack && (
              <PremiumButton
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="shrink-0 h-10 w-10"
                aria-label="Go back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </PremiumButton>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className={cn(TYPOGRAPHY.heading, "truncate")}>{title}</h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          {stages && totalStages > 1 && (
            <div className="space-y-2">
              {/* Stage label */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.12em]">
                  Stage {currentStage + 1} of {totalStages}
                </span>
                {stages[currentStage] && (
                  <span className="text-xs font-medium text-primary">
                    {stages[currentStage].label}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: 0.4, ease: "easeOut" }
                  }
                />
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5 justify-center pt-1">
                {stages.map((stage, i) => {
                  const isActive = i === currentStage;
                  const isDone = i < currentStage;
                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        shouldReduceMotion ? "duration-0" : "duration-300",
                        isActive
                          ? "w-6 bg-primary"
                          : isDone
                            ? "w-4 bg-primary/60"
                            : "w-2 bg-border"
                      )}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stage content with animated transitions */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {shouldReduceMotion ? (
            <div key={stageKey}>{children}</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={stageKey}
                variants={stageTransition}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

/**
 * AssessmentActionButton — a PremiumButton pre-configured for assessment
 * action buttons with min-height 56px for comfortable touch targets.
 */
export interface AssessmentActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function AssessmentActionButton({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  icon,
  trailingIcon,
  fullWidth = true,
  className,
}: AssessmentActionButtonProps) {
  return (
    <PremiumButton
      variant={variant}
      size="lg"
      fullWidth={fullWidth}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      icon={icon}
      trailingIcon={trailingIcon}
      className={cn("min-h-[56px] text-base", className)}
    >
      {children}
    </PremiumButton>
  );
}
