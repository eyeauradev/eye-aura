"use client";

import { type ReactNode } from "react";
import { MotionWrapper } from "./motion-wrapper";
import { pageEntrance } from "@/lib/patient-portal/motion-variants";

export interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page entrance animation wrapper.
 *
 * Wraps page content with a fade-in + upward translation entrance animation
 * using the pageEntrance motion variant. Automatically respects
 * prefers-reduced-motion via the underlying MotionWrapper.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <MotionWrapper
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </MotionWrapper>
  );
}
