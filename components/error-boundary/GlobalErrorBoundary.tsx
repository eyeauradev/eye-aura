"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { errorLogService } from "@/services/error-logging/error-log.service";
import { ERROR_CODES } from "@/lib/errors";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  user?: { id: string; role?: string; email?: string } | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary - Catches React rendering errors
 * Automatically logs errors to Firestore for monitoring
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary] Caught error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log to Firestore
    errorLogService.logError(
      {
        code: ERROR_CODES.SYSTEM.UNEXPECTED,
        title: "Application Crash",
        message: "The application encountered an unexpected error",
        originalError: error,
        context: "GlobalErrorBoundary",
        action: "react_render_error",
        resourceType: "application",
      },
      this.props.user || undefined
    );
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f7f3ee] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-center text-red-900 mb-3">
                Something Went Wrong
              </h1>
              <p className="text-center text-gray-600 mb-8">
                We're sorry, but something unexpected happened. Our team has been notified and will look into it.
              </p>

              {/* Error Details (dev mode only) */}
              {process.env.NODE_ENV !== "production" && this.state.error && (
                <details className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="text-xs overflow-auto text-red-800 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0f4f4b] text-white rounded-xl font-semibold hover:bg-[#0a3a36] transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#0f4f4b] border-2 border-[#0f4f4b] rounded-xl font-semibold hover:bg-[#0f4f4b]/5 transition"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </div>

              {/* Support */}
              <p className="text-center text-sm text-gray-500 mt-8">
                If this problem persists, please{" "}
                <Link href="/support" className="text-[#0f4f4b] underline hover:text-[#0a3a36]">
                  contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
