"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { GLASS, SHADOWS } from "@/lib/patient-portal/design-tokens";

export type GlassPanelPadding = "none" | "sm" | "md" | "lg";

export interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  /** Padding size preset */
  padding?: GlassPanelPadding;
  /** Border radius override (defaults to rounded-3xl) */
  rounded?: "2xl" | "3xl" | "32";
  /** Additional CSS classes */
  className?: string;
}

const paddingMap: Record<GlassPanelPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const roundedMap: Record<NonNullable<GlassPanelProps["rounded"]>, string> = {
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  "32": "rounded-[32px]",
};

export function GlassPanel({
  children,
  padding = "md",
  rounded = "3xl",
  className,
  ...motionProps
}: GlassPanelProps) {
  return (
    <motion.div
      className={cn(
        GLASS.blur,
        GLASS.background,
        GLASS.border,
        SHADOWS.glass,
        paddingMap[padding],
        roundedMap[rounded],
        className
      )}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
