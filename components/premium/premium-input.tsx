"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RADIUS, TYPOGRAPHY } from "@/lib/design-tokens";

export interface PremiumInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const PremiumInput = React.forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ className, label, error, helperText, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              TYPOGRAPHY.label,
              "mb-1.5 block",
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            RADIUS.interactive,
            "w-full border bg-transparent px-4 py-3 text-foreground",
            "border-border",
            "placeholder:text-muted-foreground",
            "transition-all duration-200 ease-in-out",
            "focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20",
            error && "border-destructive/50 focus:border-destructive focus:ring-destructive/20",
            disabled && "pointer-events-none opacity-50",
            className,
          )}
          {...props}
        />
        {error && (
          <p
            className={cn(
              TYPOGRAPHY.label,
              "mt-1 text-destructive normal-case tracking-normal",
            )}
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

PremiumInput.displayName = "PremiumInput";

export { PremiumInput };
