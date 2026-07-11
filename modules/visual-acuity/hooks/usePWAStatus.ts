"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// BeforeInstallPromptEvent type augmentation
// (not yet in standard TypeScript lib)
// ---------------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface PWAInstallState {
  /** App is running as an installed PWA (standalone mode). */
  isInstalled: boolean;
  /** Running on an Android device. */
  isAndroid: boolean;
  /** Running on an iPhone or iPad. */
  isIOS: boolean;
  /**
   * Running on any supported mobile device (Android or iOS).
   * False on Windows / macOS / Linux / ChromeOS desktops.
   * When uncertain, defaults to false (conservative).
   */
  isMobile: boolean;
  /**
   * Browser fired `beforeinstallprompt` — native install is available.
   * Always false on iOS (Safari does not support this event).
   */
  canInstall: boolean;
  /**
   * User previously dismissed the banner (persisted in localStorage).
   * Automatically resets to false if the app becomes installed.
   */
  isDismissed: boolean;
  /** Trigger the native browser install prompt (Android/Chromium). No-op on iOS. */
  install: () => Promise<void>;
  /** Persist dismissal so the banner stays hidden across page refreshes. */
  dismiss: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISMISS_KEY = "ea_pwa_banner_dismissed";

// ---------------------------------------------------------------------------
// Platform detection helpers
// Pure functions — no side-effects, safe to call anywhere.
// ---------------------------------------------------------------------------

/** True when UA clearly identifies an Android device. */
function detectAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

/**
 * True when UA clearly identifies iPhone / iPad / iPod.
 * Handles iPadOS 13+ which reports as macOS but has multi-touch.
 */
function detectIOS(ua: string): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ desktop UA workaround
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * True only for confirmed mobile devices.
 * Errs on the side of hiding the banner — uncertain = false.
 */
function detectMobile(ua: string): boolean {
  return detectAndroid(ua) || detectIOS(ua);
}

/** True when the app is running in PWA standalone mode. */
function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Centralised PWA install hook.
 *
 * Handles platform detection, install prompt lifecycle, and dismissal state.
 * Designed to drive the Assessment List install banner.
 *
 * Detection is intentionally conservative: when uncertain, values default
 * to false so the banner is hidden rather than showing wrong instructions.
 */
export function usePWAStatus(): PWAInstallState {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAndroid, setIsAndroid]     = useState(false);
  const [isIOS, setIsIOS]             = useState(false);
  const [isMobile, setIsMobile]       = useState(false);
  const [canInstall, setCanInstall]   = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  // ── One-time platform + install-state detection ───────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;
    const android    = detectAndroid(ua);
    const ios        = detectIOS(ua);
    const mobile     = detectMobile(ua);
    const standalone = detectStandalone();

    setIsAndroid(android);
    setIsIOS(ios);
    setIsMobile(mobile);
    setIsInstalled(standalone);

    // Read dismissal from localStorage (ignored when already installed)
    if (!standalone) {
      try {
        setIsDismissed(localStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        // Private browsing / storage blocked — treat as not dismissed
      }
    }
  }, []);

  // ── beforeinstallprompt (Android / Chromium browsers) ────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── appinstalled — auto-hide banner once installed ────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt.current = null;
    };

    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const install = async (): Promise<void> => {
    if (!deferredPrompt.current) return;

    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
  };

  const dismiss = (): void => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage unavailable — in-memory dismissal still works for the session
    }
  };

  return { isInstalled, isAndroid, isIOS, isMobile, canInstall, isDismissed, install, dismiss };
}
