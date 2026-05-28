"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./glass-panel";
import { SHADOWS } from "@/lib/design-tokens";

export interface NavItem {
  /** Display label */
  label: string;
  /** Navigation href */
  href: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional group identifier for divider separation */
  group?: string;
}

export interface FloatingSidebarProps {
  /** Array of navigation items */
  items: NavItem[];
  /** Currently active href — supports prefix matching for nested routes */
  activeHref: string;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for the navigation landmark */
  ariaLabel?: string;
}

/**
 * Checks if the current href matches a navigation item's href using prefix matching.
 * Supports nested routes: e.g. `/doctor/appointments/123` matches `/doctor/appointments`.
 * An exact match always returns true. For prefix matches, the character immediately
 * after the prefix must be `/` or `?` to avoid false positives
 * (e.g. `/doctor/appointments-new` should NOT match `/doctor/appointments`).
 */
function isActiveRoute(currentHref: string, itemHref: string): boolean {
  if (currentHref === itemHref) return true;
  if (
    currentHref.startsWith(itemHref) &&
    (currentHref[itemHref.length] === "/" ||
      currentHref[itemHref.length] === "?")
  ) {
    return true;
  }
  return false;
}

/**
 * Floating glass sidebar navigation shared across Patient Portal, Doctor, and Admin modules.
 * Only renders on viewports >= 1024px (lg breakpoint).
 * Uses GlassPanel as the container with rounded-[32px] and SHADOWS.sidebar elevation.
 * Sticky positioning with top-24 (96px) offset.
 */
export function FloatingSidebar({
  items,
  activeHref,
  className,
  ariaLabel = "Module navigation",
}: FloatingSidebarProps) {
  // Group items for rendering dividers between groups
  const groupedItems: { item: NavItem; showDivider: boolean }[] = items.map(
    (item, index) => ({
      item,
      showDivider:
        index > 0 && item.group !== items[index - 1].group && !!item.group,
    })
  );

  return (
    <nav
      className={cn("hidden lg:block sticky top-24", className)}
      aria-label={ariaLabel}
    >
      <GlassPanel
        rounded="32"
        padding="md"
        className={cn(SHADOWS.sidebar)}
      >
        <ul className="flex flex-col gap-1" role="list">
          {groupedItems.map(({ item, showDivider }) => {
            const isActive = isActiveRoute(activeHref, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                {showDivider && (
                  <div className="border-b border-border/50 my-2" />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ease-in-out text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted/50"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </GlassPanel>
    </nav>
  );
}
