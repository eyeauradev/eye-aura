"use client";

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import { tabIndicator } from "@/lib/motion-variants";
import { TYPOGRAPHY } from "@/lib/design-tokens";

export interface PremiumTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface PremiumTabsProps {
  tabs: PremiumTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "underline" | "pill";
  className?: string;
}

const PremiumTabs = React.forwardRef<HTMLDivElement, PremiumTabsProps>(
  ({ tabs, activeTab, onTabChange, variant = "underline", className }, ref) => {
    const tabRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
    const shouldReduceMotion = useReducedMotion();

    const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onTabChange(tabs[currentIndex].id);
        return;
      }

      if (nextIndex !== null) {
        const nextTab = tabs[nextIndex];
        const nextEl = tabRefs.current.get(nextTab.id);
        nextEl?.focus();
      }
    };

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "relative flex items-center",
          variant === "underline" && "border-b border-border",
          className,
        )}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(tab.id, el);
                } else {
                  tabRefs.current.delete(tab.id);
                }
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                TYPOGRAPHY.body,
                "relative flex items-center gap-2 px-4 min-h-[44px] cursor-pointer select-none transition-colors duration-150 ease-in-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>

              {/* Active indicator */}
              {isActive && variant === "underline" && (
                <motion.span
                  layoutId={tabIndicator.layoutId}
                  transition={shouldReduceMotion ? { duration: 0 } : tabIndicator.transition as Transition}
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                />
              )}
              {isActive && variant === "pill" && (
                <motion.span
                  layoutId={tabIndicator.layoutId}
                  transition={shouldReduceMotion ? { duration: 0 } : tabIndicator.transition as Transition}
                  className="absolute inset-0 rounded-full bg-primary/10"
                />
              )}
            </button>
          );
        })}
      </div>
    );
  },
);

PremiumTabs.displayName = "PremiumTabs";

export { PremiumTabs };
