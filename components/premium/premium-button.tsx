"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion, type HTMLMotionProps, type Transition } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonPress } from "@/lib/motion-variants";

const premiumButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-md hover:shadow-lg",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:shadow-lg",
        outline:
          "border border-border bg-transparent text-foreground hover:shadow-md",
        ghost:
          "bg-transparent text-foreground hover:bg-muted/50",
      },
      size: {
        sm: "min-h-9 px-4 text-sm rounded-xl",
        md: "min-h-11 px-5 text-sm rounded-2xl",
        lg: "min-h-12 px-6 text-base rounded-2xl",
        icon: "h-11 w-11 rounded-2xl",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface PremiumButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof premiumButtonVariants> {
  /** Leading icon */
  icon?: React.ReactNode;
  /** Trailing icon */
  trailingIcon?: React.ReactNode;
  /** Render as child element (Radix Slot pattern) */
  asChild?: boolean;
  /** Loading state */
  loading?: boolean;
  children?: React.ReactNode;
}

const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      icon,
      trailingIcon,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const shouldReduceMotion = useReducedMotion();

    if (asChild) {
      return (
        <Slot
          className={cn(
            premiumButtonVariants({ variant, size, fullWidth, className }),
          )}
          ref={ref as React.Ref<HTMLElement>}
        >
          {children as React.ReactElement}
        </Slot>
      );
    }

    return (
      <motion.button
        className={cn(
          premiumButtonVariants({ variant, size, fullWidth, className }),
        )}
        ref={ref}
        disabled={disabled || loading}
        whileTap={shouldReduceMotion ? undefined : buttonPress.whileTap}
        whileHover={shouldReduceMotion ? undefined : buttonPress.whileHover}
        transition={shouldReduceMotion ? { duration: 0 } : buttonPress.transition as Transition}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {trailingIcon && !loading ? (
          <span className="shrink-0">{trailingIcon}</span>
        ) : null}
      </motion.button>
    );
  },
);

PremiumButton.displayName = "PremiumButton";

export { PremiumButton, premiumButtonVariants };
