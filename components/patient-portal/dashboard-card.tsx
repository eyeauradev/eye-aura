"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { GLASS, SHADOWS, SPACING } from "@/lib/patient-portal/design-tokens";
import { cardEntrance } from "@/lib/patient-portal/motion-variants";

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
      variants={cardEntrance}
      initial="hidden"
      animate="visible"
      custom={staggerIndex}
      whileHover={
        disableHover ? undefined : { y: -3, transition: { duration: 0.2, ease: "easeOut" } }
      }
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
