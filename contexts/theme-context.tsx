"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";

// ─── Default theme (matches globals.css :root) ────────────────────────────

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  ring: string;
}

export const DEFAULT_THEME: ThemeColors = {
  primary: "#0f4f4b",
  primaryForeground: "#fffaf3",
  secondary: "#b5964d",
  secondaryForeground: "#173f3c",
  background: "#f7f3ee",
  foreground: "#2b2b2b",
  card: "rgba(255, 252, 247, 0.82)",
  cardForeground: "#2b2b2b",
  muted: "#eae2d6",
  mutedForeground: "#64605b",
  accent: "#b7c8be",
  accentForeground: "#0f4f4b",
  border: "rgba(15, 79, 75, 0.14)",
  ring: "rgba(181, 150, 77, 0.42)",
};

// ─── CSS variable mapping ─────────────────────────────────────────────────

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  border: "--border",
  ring: "--ring",
};

function applyThemeToDOM(colors: ThemeColors) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = colors[key as keyof ThemeColors];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }
}

// ─── Context ──────────────────────────────────────────────────────────────

interface ThemeContextValue {
  colors: ThemeColors;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: DEFAULT_THEME,
  loading: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      try {
        const db = getFirebaseDb();
        const settingsRef = doc(db, "platform_settings", "config");

        // Initial load
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.theme) {
            const merged = { ...DEFAULT_THEME, ...data.theme };
            setColors(merged);
            applyThemeToDOM(merged);
          }
        }

        // Real-time listener for live updates when admin changes colors
        unsubscribe = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.theme) {
              const merged = { ...DEFAULT_THEME, ...data.theme };
              setColors(merged);
              applyThemeToDOM(merged);
            }
          }
        });
      } catch (err) {
        // Non-fatal — fall back to CSS defaults
        console.warn("[ThemeProvider] Failed to load theme:", err);
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}
