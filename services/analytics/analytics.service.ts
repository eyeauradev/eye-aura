import type { Analytics } from "firebase/analytics";
import { logEvent } from "firebase/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// ─── Event Parameter Interfaces ─────────────────────────────────────────────

export interface PageViewParams {
  page_path: string;
  page_title: string;
}

export interface SignUpParams {
  method: "email" | "google";
}

export interface LoginParams {
  method: "email" | "google";
}

export interface AppointmentBookingParams {
  serviceName: string; // comma-separated service names
  doctorName: string;
  value: number; // total price in major currency units (rupees, not paise)
  currency: string; // defaults to "INR"
}

export interface PrescriptionViewParams {
  prescriptionId: string;
}

export interface SupportTicketCreatedParams {
  category:
    | "billing"
    | "technical"
    | "appointment"
    | "prescription"
    | "other"
    | "general";
}

// ─── Config Interfaces ────────────────────────────────────────────────────────

export interface ProviderConfig {
  enabled: boolean;
  envVar: string;
}

export interface AnalyticsConfig {
  ga4: ProviderConfig;
  firebase: ProviderConfig;
}

// ─── Module-Scoped State (NOT exported) ──────────────────────────────────────

let firebaseAnalyticsInstance: Analytics | null = null;
let initialized = false;
let ga4Enabled = false;
let firebaseEnabled = false;
let warnedServerSide = false;

// ─── Config Accessor ──────────────────────────────────────────────────────────

/**
 * Returns the current analytics configuration derived from environment variables.
 * Pure function — no side effects, safe to call at any time including before init().
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const fbMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  return {
    ga4: {
      enabled: Boolean(gaMeasurementId && gaMeasurementId.trim().length > 0),
      envVar: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    },
    firebase: {
      enabled: Boolean(fbMeasurementId && fbMeasurementId.trim().length > 0),
      envVar: "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    },
  };
}

// ─── Firebase Instance Accessor ───────────────────────────────────────────────

/**
 * Returns the current Firebase Analytics instance, or null if not yet initialized
 * or if Firebase Analytics is not supported in this environment.
 *
 * Does NOT trigger initialization. Safe to call before init().
 *
 * Validates: Requirements 3.4
 */
export function getFirebaseAnalyticsInstance(): Analytics | null {
  return firebaseAnalyticsInstance;
}

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Initializes the analytics service. Must be called once by the AnalyticsProvider
 * useEffect on mount (client-side only).
 *
 * Idempotent — safe to call multiple times; subsequent calls are no-ops.
 * Never called at module scope (Rule: no module-level init).
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 3.1, 3.2, 3.3, 3.5
 */
export async function initAnalytics(): Promise<void> {
  // SSR guard — never init on server
  if (typeof window === "undefined") {
    return;
  }

  // Idempotency guard — only init once
  if (initialized) {
    return;
  }

  const config = getAnalyticsConfig();
  ga4Enabled = config.ga4.enabled;
  firebaseEnabled = config.firebase.enabled;

  if (!ga4Enabled) {
    console.warn(
      "[Analytics] NEXT_PUBLIC_GA_MEASUREMENT_ID is missing or empty — GA4 tracking disabled."
    );
  }

  if (!firebaseEnabled) {
    console.warn(
      "[Analytics] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is missing or empty — Firebase Analytics disabled."
    );
  }

  // Firebase Analytics initialization (browser-only, deferred to here)
  if (firebaseEnabled) {
    try {
      const { isSupported, getAnalytics } = await import("firebase/analytics");
      const supported = await isSupported();
      if (supported) {
        const { getFirebaseApp } = await import("@/services/firebase/client");
        const app = getFirebaseApp();
        firebaseAnalyticsInstance = getAnalytics(app);
      }
      // If !supported: silent — old browsers/privacy environments are expected
    } catch (err) {
      console.warn("[Analytics] Firebase Analytics init failed:", err);
      firebaseAnalyticsInstance = null;
    }
  }

  initialized = true;
}

// ─── SSR / Pre-Init Guard Helper ─────────────────────────────────────────────

/**
 * Returns true if the current execution context is safe to send analytics events.
 * Logs a one-time warning when called in an unsafe context.
 */
function isReadyToTrack(): boolean {
  if (typeof window === "undefined") {
    if (!warnedServerSide) {
      console.warn("[Analytics] Tracking skipped: server-side context.");
      warnedServerSide = true;
    }
    return false;
  }

  if (!initialized) {
    console.warn(
      "[Analytics] Tracking skipped: analytics not yet initialized."
    );
    return false;
  }

  return true;
}

// ─── Tracking Functions ───────────────────────────────────────────────────────

/**
 * Tracks a page view event to both GA4 and Firebase Analytics.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export function trackPageView(params: PageViewParams): void {
  try {
    if (typeof window === "undefined") {
      isReadyToTrack();
      return;
    }
    if (!initialized) {
      isReadyToTrack();
      return;
    }
    if (ga4Enabled && window.gtag) {
      window.gtag("event", "page_view", {
        page_path: params.page_path,
        page_title: params.page_title,
      });
    }
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, "page_view", {
        page_path: params.page_path,
        page_title: params.page_title,
      });
    }
  } catch (err) {
    console.error("[Analytics] trackPageView failed:", err);
  }
}

/**
 * Tracks a sign-up event to both GA4 and Firebase Analytics.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2
 */
export function trackSignUp(params: SignUpParams): void {
  try {
    if (typeof window === "undefined") {
      isReadyToTrack();
      return;
    }
    if (!initialized) {
      isReadyToTrack();
      return;
    }
    if (ga4Enabled && window.gtag) {
      window.gtag("event", "sign_up", { method: params.method });
    }
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, "sign_up", {
        method: params.method,
      });
    }
  } catch (err) {
    console.error("[Analytics] trackSignUp failed:", err);
  }
}

/**
 * Tracks a login event to both GA4 and Firebase Analytics.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.1, 7.2
 */
export function trackLogin(params: LoginParams): void {
  try {
    if (typeof window === "undefined") {
      isReadyToTrack();
      return;
    }
    if (!initialized) {
      isReadyToTrack();
      return;
    }
    if (ga4Enabled && window.gtag) {
      window.gtag("event", "login", { method: params.method });
    }
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, "login", { method: params.method });
    }
  } catch (err) {
    console.error("[Analytics] trackLogin failed:", err);
  }
}

/**
 * Tracks an appointment booking event to both GA4 and Firebase Analytics.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.1, 8.2
 */
export function trackAppointmentBooking(
  params: AppointmentBookingParams
): void {
  try {
    if (typeof window === "undefined") {
      isReadyToTrack();
      return;
    }
    if (!initialized) {
      isReadyToTrack();
      return;
    }
    if (ga4Enabled && window.gtag) {
      window.gtag("event", "purchase", {
        service_name: params.serviceName,
        doctor_name: params.doctorName,
        value: params.value,
        currency: params.currency,
      });
    }
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, "purchase", {
        service_name: params.serviceName,
        doctor_name: params.doctorName,
        value: params.value,
        currency: params.currency,
        transaction_id: "",
      });
    }
  } catch (err) {
    console.error("[Analytics] trackAppointmentBooking failed:", err);
  }
}

/**
 * Tracks a prescription view event to both GA4 and Firebase Analytics.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.1
 */
export function trackPrescriptionView(params: PrescriptionViewParams): void {
  try {
    if (typeof window === "undefined") {
      isReadyToTrack();
      return;
    }
    if (!initialized) {
      isReadyToTrack();
      return;
    }
    if (ga4Enabled && window.gtag) {
      window.gtag("event", "prescription_view", {
        prescription_id: params.prescriptionId,
      });
    }
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, "prescription_view", {
        prescription_id: params.prescriptionId,
      });
    }
  } catch (err) {
    console.error("[Analytics] trackPrescriptionView failed:", err);
  }
}

/**
 * Tracks a support ticket created event to both GA4 and Firebase Analytics.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 10.1
 */
export function trackSupportTicketCreated(
  params: SupportTicketCreatedParams
): void {
  try {
    if (typeof window === "undefined") {
      isReadyToTrack();
      return;
    }
    if (!initialized) {
      isReadyToTrack();
      return;
    }
    if (ga4Enabled && window.gtag) {
      window.gtag("event", "support_ticket_created", {
        category: params.category,
      });
    }
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, "support_ticket_created", {
        category: params.category,
      });
    }
  } catch (err) {
    console.error("[Analytics] trackSupportTicketCreated failed:", err);
  }
}
