"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RADIUS, GLASS, TYPOGRAPHY } from "@/lib/patient-portal/design-tokens";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface PremiumHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional status badge rendered beside the title */
  statusBadge?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Premium header component with gradient background, glass overlay,
 * breadcrumb navigation, and sticky positioning.
 */
export function PremiumHeader({
  title,
  subtitle,
  breadcrumbs,
  statusBadge,
  className,
}: PremiumHeaderProps) {
  return (
    <header
      className={cn(
        // Rounded container with internal padding
        RADIUS.container,
        "p-6 sm:p-8",
        // Gradient background
        "bg-gradient-to-r from-primary/8 to-secondary/6",
        // Glass overlay with backdrop-blur and semi-transparent surface
        GLASS.blur,
        GLASS.headerBackground,
        // Subtle border
        GLASS.border,
        className
      )}
    >
      {/* Breadcrumb navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1.5 flex-wrap">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.href}-${index}`} className="flex items-center gap-1.5">
                  {isLast ? (
                    <span
                      className={cn(
                        TYPOGRAPHY.label,
                        "text-foreground/70"
                      )}
                      aria-current="page"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <>
                      <Link
                        href={crumb.href}
                        className={cn(
                          TYPOGRAPHY.label,
                          "hover:text-foreground transition-colors duration-200"
                        )}
                      >
                        {crumb.label}
                      </Link>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className={TYPOGRAPHY.heading}>{title}</h1>
        {statusBadge}
      </div>

      {/* Optional subtitle */}
      {subtitle && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {subtitle}
        </p>
      )}
    </header>
  );
}
