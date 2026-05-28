"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GLASS, SHADOWS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { cardEntrance } from "@/lib/motion-variants";

export interface MetricCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: { value: number; direction: "up" | "down" };
  className?: string;
  staggerIndex?: number;
}

export function MetricCard({
  icon,
  value,
  label,
  trend,
  className,
  staggerIndex = 0,
}: MetricCardProps) {
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
      whileHover={shouldReduceMotion ? undefined : { y: -2, transition: { duration: 0.2, ease: "easeOut" } }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-shrink-0 text-primary">{icon}</div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.direction === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className={cn(TYPOGRAPHY.heading, "tabular-nums")}>{value}</p>
        <p className={cn(TYPOGRAPHY.label, "mt-1")}>{label}</p>
      </div>
    </motion.div>
  );
}
