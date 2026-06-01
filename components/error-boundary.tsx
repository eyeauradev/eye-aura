"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Image from "next/image";
import { ERROR_CODES, logError } from "@/lib/errors";

// ── ErrorFallbackUI ───────────────────────────────────────────────────────────

/**
 * Default full-page fallback rendered when the ErrorBoundary catches an error.
 * Shows the Eye Aura logo, a friendly error message, and a reload button.
 * No stack trace, no component tree, no technical details.
 */
function ErrorFallbackUI() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <Image
            src="/eye-aura-logo_transparent.png"
            alt="Eye Aura"
            width={160}
            height={56}
            priority
            className="object-contain"
          />
        </div>

        {/* Glass card */}
        <div className="w-full rounded-3xl border border-white/60 bg-card/72 backdrop-blur-[22px] shadow-[0_24px_80px_rgba(var(--primary-rgb),0.12)] p-8 flex flex-col items-center gap-5">
          {/* Error code badge */}
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs uppercase tracking-[0.12em] font-medium text-primary">
            EA-SYSTEM-001
          </span>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Something Went Unexpected
          </h1>

          {/* Message */}
          <p className="text-base text-muted-foreground leading-relaxed">
            We&apos;ve encountered an unexpected issue. Our team has been notified.
          </p>

          {/* Reload button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex items-center justify-center min-h-11 px-6 text-sm font-medium rounded-2xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ErrorBoundary ─────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  /** Content to render when no error has occurred */
  children: ReactNode;
  /** Optional custom fallback UI — replaces the default ErrorFallbackUI */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Global React Error Boundary.
 *
 * Catches any unhandled render-phase errors in the component tree below it,
 * logs them via `logError`, and renders either the provided `fallback` prop
 * or the default `ErrorFallbackUI`.
 *
 * Must be a class component — React's `componentDidCatch` API is not available
 * to function components.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // Always attempt to log — if logError itself throws, fall back to console.error
    // so the fallback UI still renders regardless.
    try {
      logError(ERROR_CODES.SYSTEM.UNEXPECTED, error, "ErrorBoundary");
    } catch {
      console.error("[EA-SYSTEM-001] ErrorBoundary caught an error", error);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return <ErrorFallbackUI />;
  }
}
