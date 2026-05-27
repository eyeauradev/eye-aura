"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MotionWrapperProps {
  children: ReactNode;
  /** Framer Motion variants for the animation */
  variants?: Variants;
  /** Initial animation state key */
  initial?: string;
  /** Animate-to state key */
  animate?: string;
  /** Exit animation state key */
  exit?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A reduced-motion-aware animation wrapper.
 *
 * When the user has `prefers-reduced-motion` enabled, renders children
 * in a plain `<div>` with no animation. Otherwise wraps children in a
 * Framer Motion `motion.div` with the provided animation props.
 */
export function MotionWrapper({
  children,
  variants,
  initial,
  animate,
  exit,
  className,
}: MotionWrapperProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
    >
      {children}
    </motion.div>
  );
}
