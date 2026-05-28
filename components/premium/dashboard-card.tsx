"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { GLASS, SHADOWS, SPACING } from "@/lib/design-tokens";
import { cardEntrance } from "@/lib/motion-variants";

export interface DashboardCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Disable hover animation */
  disableHover?: boolean;
  /** Stagger index for entrance animation (delay = index * 80ms) */
  staggerIndex?: number;
}

export function DashboardCard({
  children,
  className,
  disableHover = false,
  staggerIndex = 0,
  ...motionProps
}: DashboardCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        "rounded-3xl",
        "backdrop-blur-xl",
        GLASS.cardBackground,
        SHADOWS.card,
        GLASS.border,
        SPACING.cardPadding,
        className
      )}
      variants={shouldReduceMotion ? undefined : cardEntrance}
      initial={shouldReduceMotion ? false : "hidden"}
      animate="visible"
      custom={staggerIndex}
      whileHover={
        disableHover || shouldReduceMotion ? undefined : { y: -3, transition: { duration: 0.2, ease: "easeOut" } }
      }
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
