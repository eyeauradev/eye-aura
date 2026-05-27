"use client";

import { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "requested"
  | "active"
  | "inactive";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full text-xs font-semibold uppercase tracking-wide border border-current/15",
  {
    variants: {
      variant: {
        pending:
          "bg-secondary/12 text-secondary",
        confirmed:
          "bg-primary/10 text-primary",
        in_progress:
          "bg-accent/25 text-accent-foreground",
        completed:
          "bg-muted/60 text-muted-foreground",
        cancelled:
          "bg-ring/15 text-foreground/70",
        requested:
          "bg-secondary/8 text-secondary/90",
        active:
          "bg-primary/10 text-primary",
        inactive:
          "bg-muted/50 text-muted-foreground",
      },
      size: {
        sm: "px-3 py-1",
        md: "px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "pending",
      size: "sm",
    },
  },
);

export interface StatusBadgeProps
  extends Omit<VariantProps<typeof statusBadgeVariants>, "variant"> {
  /** Status variant determining color scheme */
  variant: StatusVariant;
  /** Badge content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

export function StatusBadge({
  variant,
  size,
  className,
  children,
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant, size }), className)}>
      {children}
    </span>
  );
}
