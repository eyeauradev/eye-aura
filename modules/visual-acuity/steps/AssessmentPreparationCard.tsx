"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, Smartphone, Sun, Ruler, Bell, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AssessmentPreparationCardProps {
  /** Callback when user dismisses or continues */
  onContinue: () => void;
  /** Test type for customized messaging */
  testType: "far" | "near";
}

const STORAGE_KEY = "ea_preparation_shown";

/**
 * Pre-assessment preparation card.
 * Shows important recommendations before starting the assessment.
 * 
 * Features:
 * - Only shown once per browser/user
 * - Never interrupts an ongoing assessment
 * - Provides actionable recommendations
 * - Optional PWA installation instructions (iOS Safari only)
 * - Clean, non-intrusive design
 */
export function AssessmentPreparationCard({
  onContinue,
  testType,
}: AssessmentPreparationCardProps) {
  const [show, setShow] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  // Check if should show (only once per browser)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already shown
    const hasShown = sessionStorage.getItem(STORAGE_KEY);
    if (hasShown) {
      // Don't show, continue immediately
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsIOSSafari(isIOS && isSafari && !isStandalone);
    setShow(true);
  }, []);

  const handleContinue = () => {
    // Mark as shown
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Storage full, ignore
    }

    setShow(false);
    onContinue();
  };

  if (!show) {
    // If not showing, continue immediately
    if (typeof window !== "undefined") {
      const hasShown = sessionStorage.getItem(STORAGE_KEY);
      if (!hasShown) {
        // Will show, don't auto-continue
      } else {
        // Already shown before, auto-continue
        setTimeout(onContinue, 0);
      }
    }
    return null;
  }

  const distance = testType === "far" ? "3 metres" : "40 cm";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0f4f4b] to-[#0a3a36] p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">
                  Assessment Preparation
                </h2>
                <p className="text-sm text-white/80">
                  For the best results, please ensure:
                </p>
              </div>
              <button
                onClick={handleContinue}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Recommendations list */}
            <div className="space-y-3">
              <RecommendationItem
                icon={<Smartphone className="h-5 w-5" />}
                text="Rotate your device to landscape orientation"
              />
              <RecommendationItem
                icon={<Sun className="h-5 w-5" />}
                text="Increase your screen brightness to maximum"
              />
              <RecommendationItem
                icon={<Ruler className="h-5 w-5" />}
                text={`Position yourself exactly ${distance} from the screen`}
              />
              <RecommendationItem
                icon={<Bell className="h-5 w-5" />}
                text="Avoid interruptions during the assessment"
              />
              {isIOSSafari && (
                <RecommendationItem
                  icon={<Share className="h-5 w-5" />}
                  text="Install to Home Screen for fullscreen experience"
                  actionLabel="How to Install"
                  onAction={() => setShowInstallGuide(true)}
                />
              )}
            </div>

            {/* Install guide (if iOS Safari) */}
            {showInstallGuide && isIOSSafari && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-[#0f4f4b]/5 rounded-xl p-4 border border-[#0f4f4b]/10"
              >
                <h3 className="text-sm font-bold text-[#0f4f4b] mb-2">
                  Install to Home Screen:
                </h3>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                  <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in the top right</li>
                  <li>Open Eye Aura from your Home Screen</li>
                </ol>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="mt-3 text-xs text-[#0f4f4b] font-semibold hover:underline"
                >
                  Got it
                </button>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-0">
            <Button
              onClick={handleContinue}
              className="w-full h-12 bg-[#0f4f4b] hover:bg-[#0a3a36] text-white font-semibold rounded-xl"
            >
              Continue to Assessment
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface RecommendationItemProps {
  icon: React.ReactNode;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

function RecommendationItem({
  icon,
  text,
  actionLabel,
  onAction,
}: RecommendationItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <div className="h-8 w-8 rounded-lg bg-[#0f4f4b]/10 flex items-center justify-center text-[#0f4f4b]">
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-xs text-[#0f4f4b] font-semibold hover:underline mt-1"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <CheckCircle2 className="h-5 w-5 text-[#0f4f4b]/30 flex-shrink-0 mt-0.5" />
    </div>
  );
}
