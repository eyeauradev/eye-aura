/**
 * LocalStorage utilities for the Blink Companion widget.
 * Handles position persistence and reminder timing.
 */

const STORAGE_PREFIX = "eyeaura_blink_";

const KEYS = {
  position: `${STORAGE_PREFIX}position`,
  lastDismissed: `${STORAGE_PREFIX}last_dismissed`,
  lastShown: `${STORAGE_PREFIX}last_shown`,
} as const;

export interface WidgetPosition {
  x: number;
  y: number;
  edge: "left" | "right";
}

/** Save widget position to localStorage. */
export function savePosition(pos: WidgetPosition): void {
  try {
    localStorage.setItem(KEYS.position, JSON.stringify(pos));
  } catch {
    // Storage unavailable — silently ignore
  }
}

/** Retrieve saved widget position, or null if none stored. */
export function getPosition(): WidgetPosition | null {
  try {
    const raw = localStorage.getItem(KEYS.position);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetPosition;
  } catch {
    return null;
  }
}

/** Record the current timestamp as last dismissed. */
export function recordDismissal(): void {
  try {
    localStorage.setItem(KEYS.lastDismissed, Date.now().toString());
  } catch {
    // Silently ignore
  }
}

/** Record the current timestamp as last shown. */
export function recordShown(): void {
  try {
    localStorage.setItem(KEYS.lastShown, Date.now().toString());
  } catch {
    // Silently ignore
  }
}

/** Minimum interval between reminders: 30 minutes in ms. */
const MIN_INTERVAL_MS = 30 * 60 * 1000;

/** Check if enough time has passed since last reminder. */
export function canShowReminder(): boolean {
  try {
    const lastDismissed = localStorage.getItem(KEYS.lastDismissed);
    const lastShown = localStorage.getItem(KEYS.lastShown);

    const latest = Math.max(
      lastDismissed ? parseInt(lastDismissed, 10) : 0,
      lastShown ? parseInt(lastShown, 10) : 0
    );

    if (latest === 0) return true;
    return Date.now() - latest >= MIN_INTERVAL_MS;
  } catch {
    return true;
  }
}
