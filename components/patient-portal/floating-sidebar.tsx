"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./glass-panel";
import { SHADOWS } from "@/lib/patient-portal/design-tokens";

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
  /** Currently active href (used to highlight active item) */
  activeHref: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Floating glass sidebar navigation for the Patient Portal.
 * Only renders on viewports >= 1024px (lg breakpoint).
 * Uses GlassPanel as the container with rounded-[32px] and soft shadow.
 */
export function FloatingSidebar({
  items,
  activeHref,
  className,
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
      className={cn(
        "hidden lg:block sticky top-24",
        className
      )}
      aria-label="Patient portal navigation"
    >
      <GlassPanel
        rounded="32"
        padding="md"
        className={cn(SHADOWS.sidebar)}
      >
        <ul className="flex flex-col gap-1" role="list">
          {groupedItems.map(({ item, showDivider }) => {
            const isActive = activeHref === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                {showDivider && (
                  <div className="border-b border-border/50 my-2" />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted/50"
                  )}
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
