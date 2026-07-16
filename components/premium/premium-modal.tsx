"use client";

import { type ReactNode, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GLASS, SPACING, TYPOGRAPHY, SHADOWS } from "@/lib/design-tokens";
import { modalEntrance, modalExit } from "@/lib/motion-variants";

export interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: string;
}

export function PremiumModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  maxWidth = "560px",
}: PremiumModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Keep the latest onClose in a ref so the keydown listener (and the open
  // effect) never has to depend on onClose's identity. An inline onClose in the
  // parent is recreated every render, which previously re-ran the effect on
  // every keystroke and yanked focus back to the first input.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Handle Escape key press
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onCloseRef.current();
    }
  }, []);

  // Focus management: runs only when `open` transitions, never on parent
  // re-renders (e.g. while the user is typing into an input).
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);

    // Focus the first focusable element exactly once when the modal opens.
    const rafId = requestAnimationFrame(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable ?? modalRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus on close
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Basic focus trap
  const handleTabKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }}
          onClick={handleBackdropClick}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            ref={modalRef}
            className={cn(
              "backdrop-blur-[30px]",
              GLASS.cardBackground,
              GLASS.border,
              SHADOWS.elevated,
              "rounded-3xl",
              SPACING.cardPadding,
              "w-full mx-4 my-4 max-h-[90vh] overflow-y-auto"
            )}
            style={{ maxWidth }}
            variants={shouldReduceMotion ? undefined : { ...modalEntrance, exit: modalExit.hidden }}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            exit={shouldReduceMotion ? undefined : "exit"}
            tabIndex={-1}
            onKeyDown={handleTabKey}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="mb-4">
                {title && (
                  <h2 className={cn(TYPOGRAPHY.subheading)}>{title}</h2>
                )}
                {subtitle && (
                  <p className="text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
            )}

            {/* Content */}
            <div>{children}</div>

            {/* Actions */}
            {actions && (
              <div className={cn("flex items-center justify-end mt-6", SPACING.cardGap)}>
                {actions}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
