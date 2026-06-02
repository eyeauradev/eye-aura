"use client";

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MoreVertical, Pause, Play, LogOut } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssessmentOverflowMenuProps {
  /** Called when the user selects "Pause" from the menu. */
  onPause: () => void;
  /** Called when the user selects "Resume" from the menu. */
  onResume: () => void;
  /** Called when the user selects "Return to Details". */
  onReturnToDetails: () => void;
  /** Called when the user selects "Return to Dashboard". */
  onReturnToDashboard: () => void;
  /** Called when the user selects "Exit Assessment". */
  onExit: () => void;
  /** Whether the assessment is currently paused. */
  isPaused: boolean;
}

// ---------------------------------------------------------------------------
// Menu Item Definition
// ---------------------------------------------------------------------------

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Animation variants for the menu panel. */
const MENU_VARIANTS = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.85, y: 10 },
};

/** Transition config for menu animations. */
const MENU_TRANSITION = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Floating overflow menu positioned at bottom-right of the viewport.
 *
 * Provides assessment control actions: Pause/Resume, Return to Details,
 * Return to Dashboard, and Exit Assessment. Uses Framer Motion for
 * scale+fade animations and supports full keyboard navigation.
 *
 * Accessibility:
 * - `role="menu"` on the panel
 * - `role="menuitem"` on each action
 * - `aria-expanded` on the trigger button
 * - Escape closes the menu
 * - Arrow keys navigate menu items
 * - Auto-focuses first item on open
 */
export function AssessmentOverflowMenu({
  onPause,
  onResume,
  onReturnToDetails,
  onReturnToDashboard,
  onExit,
  isPaused,
}: AssessmentOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prefersReducedMotion = useReducedMotion();

  // ── Build menu items based on pause state ─────────────────────────────────

  const menuItems: MenuItem[] = [
    isPaused
      ? { id: "resume", label: "Resume", icon: <Play className="h-4 w-4" aria-hidden="true" />, action: onResume }
      : { id: "pause", label: "Pause", icon: <Pause className="h-4 w-4" aria-hidden="true" />, action: onPause },
    { id: "exit", label: "Exit Assessment", icon: <LogOut className="h-4 w-4" aria-hidden="true" />, action: onExit },
  ];

  // ── Toggle menu ───────────────────────────────────────────────────────────

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    // Return focus to trigger button after closing.
    triggerRef.current?.focus();
  }, []);

  // ── Auto-focus first item when menu opens ─────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start and refs to attach.
      const timer = setTimeout(() => {
        itemRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ── Click outside to close ────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  // ── Keyboard navigation on trigger ────────────────────────────────────────

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeMenu();
      } else if (
        (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") &&
        !isOpen
      ) {
        event.preventDefault();
        setIsOpen(true);
      }
    },
    [isOpen, closeMenu],
  );

  // ── Keyboard navigation within menu ───────────────────────────────────────

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = itemRefs.current.findIndex(
        (ref) => ref === document.activeElement,
      );

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          closeMenu();
          break;
        case "ArrowDown":
        case "Tab": {
          if (event.key === "Tab" && event.shiftKey) {
            event.preventDefault();
            const prevIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
            itemRefs.current[prevIndex]?.focus();
            break;
          }
          event.preventDefault();
          const nextIndex = currentIndex >= menuItems.length - 1 ? 0 : currentIndex + 1;
          itemRefs.current[nextIndex]?.focus();
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          const prevIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
          itemRefs.current[prevIndex]?.focus();
          break;
        }
        case "Home":
          event.preventDefault();
          itemRefs.current[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          itemRefs.current[menuItems.length - 1]?.focus();
          break;
        default:
          break;
      }
    },
    [closeMenu, menuItems.length],
  );

  // ── Handle menu item activation ───────────────────────────────────────────

  const handleItemClick = useCallback(
    (action: () => void) => {
      action();
      closeMenu();
    },
    [closeMenu],
  );

  const handleItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, action: () => void) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleItemClick(action);
      }
    },
    [handleItemClick],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="assessment-overflow-menu"
      className="fixed bottom-6 right-6 z-50"
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Assessment actions menu"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f4f4b] text-white shadow-lg transition-colors hover:bg-[#0f4f4b]/90 focus:outline-none focus:ring-2 focus:ring-[#0f4f4b] focus:ring-offset-2"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Menu panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="Assessment actions"
            onKeyDown={handleMenuKeyDown}
            className="absolute bottom-0 right-14 mr-2 w-48 origin-bottom-right rounded-xl bg-white py-2 shadow-xl ring-1 ring-black/5"
            variants={prefersReducedMotion ? undefined : MENU_VARIANTS}
            initial={prefersReducedMotion ? { opacity: 1 } : "hidden"}
            animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
            exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
            transition={prefersReducedMotion ? { duration: 0 } : MENU_TRANSITION}
          >
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                role="menuitem"
                type="button"
                tabIndex={-1}
                onClick={() => handleItemClick(item.action)}
                onKeyDown={(e) => handleItemKeyDown(e, item.action)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:bg-slate-100 focus:outline-none"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
