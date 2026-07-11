"use client";

import { useState, useEffect } from "react";
import { X, Smartphone, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PWAInstallPromptProps {
  /** Whether to show the prompt */
  show: boolean;
  /** Callback when user dismisses the prompt */
  onDismiss: () => void;
}

/**
 * Non-intrusive banner suggesting PWA installation for better assessment experience.
 * Only shown once per session, dismissible, appears at the top of the screen.
 */
export function PWAInstallPrompt({ show, onDismiss }: PWAInstallPromptProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-2 left-2 right-2 z-[110] mx-auto max-w-md"
      >
        <div className="bg-gradient-to-r from-[#0f4f4b] to-[#0a3a36] rounded-2xl shadow-2xl p-4 pr-12 border border-white/10">
          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          <div className="flex gap-3 items-start">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-bold text-white">
                Install Eye Aura
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                For the best assessment experience, add Eye Aura to your Home Screen
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-white/60">
                <Share className="h-3 w-3" />
                <span>Tap Share, then "Add to Home Screen"</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage PWA install prompt visibility.
 * Shows prompt once per session, stores dismissal state in sessionStorage.
 */
export function usePWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const STORAGE_KEY = "ea_pwa_prompt_dismissed";

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    // Show after a short delay (2 seconds) to avoid disrupting initial load
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Storage full, ignore
    }
  };

  return { showPrompt, dismissPrompt };
}
