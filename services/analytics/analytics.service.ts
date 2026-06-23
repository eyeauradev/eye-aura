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
  serviceName: string;
  doctorName: string;
  value: number;
  currency: string;
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

// ── New event param interfaces ────────────────────────────────────────────

export interface CtaClickParams {
  /** Human-readable label of the button/link, e.g. "Book Consultation" */
  label: string;
  /** Section or component origin, e.g. "hero", "pricing", "navbar" */
  location: string;
}

export interface BookingFunnelParams {
  /**
   * Which step the user just completed/entered.
   * 0 = service, 1 = doctor, 2 = time, 3 = notes, 4 = confirm
   */
  step: number;
  step_name: "service" | "doctor" | "time" | "notes" | "confirm";
  /** Comma-separated service titles when relevant */
  service_names?: string;
  /** Doctor display name when relevant */
  doctor_name?: string;
}

export interface PaymentInitiatedParams {
  value: number;
  currency: string;
  service_names: string;
  order_id: string;
}

export interface PaymentFailedParams {
  reason: string;
  service_names: string;
}

export interface PaymentAbandonedParams {
  service_names: string;
  step_reached: string;
}

export interface BookingRequestParams {
  request_id: string;
  service_names: string;
  doctor_name: string;
  value: number;
  currency: string;
}

export interface DoctorRequestActionParams {
  action: "accepted" | "rejected";
  request_id: string;
  reject_reason?: string;
}

export interface RecommendationActionParams {
  action: "accepted" | "declined";
  recommendation_id: string;
  service_name?: string;
}

export interface AssessmentParams {
  assessment_id: string;
  assessment_type: string;
}

export interface ForgotPasswordParams {
  /** always "email" for now */
  method: "email";
}

export interface DoctorOnboardingParams {
  invite_id?: string;
}

export interface WhatsAppModalParams {
  /** "shown" = user saw it, "resolved" = user went to profile */
  action: "shown" | "resolved";
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

export function getFirebaseAnalyticsInstance(): Analytics | null {
  return firebaseAnalyticsInstance;
}

// ─── Initialization ───────────────────────────────────────────────────────────

export async function initAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  if (initialized) return;

  const config = getAnalyticsConfig();
  ga4Enabled = config.ga4.enabled;
  firebaseEnabled = config.firebase.enabled;

  if (!ga4Enabled) {
    console.warn("[Analytics] NEXT_PUBLIC_GA_MEASUREMENT_ID is missing or empty — GA4 tracking disabled.");
  }
  if (!firebaseEnabled) {
    console.warn("[Analytics] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is missing or empty — Firebase Analytics disabled.");
  }

  if (firebaseEnabled) {
    try {
      const { isSupported, getAnalytics } = await import("firebase/analytics");
      const supported = await isSupported();
      if (supported) {
        const { getFirebaseApp } = await import("@/services/firebase/client");
        const app = getFirebaseApp();
        firebaseAnalyticsInstance = getAnalytics(app);
      }
    } catch (err) {
      console.warn("[Analytics] Firebase Analytics init failed:", err);
      firebaseAnalyticsInstance = null;
    }
  }

  initialized = true;
}

// ─── Core Internal Dispatcher ─────────────────────────────────────────────────

/**
 * Low-level dispatcher. Sends to GA4 + Firebase. Wrapped in queueMicrotask
 * by every public track* function so it never blocks the main thread.
 * All errors are silently swallowed — analytics must never break the app.
 */
function _dispatch(eventName: string, params: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || !initialized) return;
    if (ga4Enabled && window.gtag) {
      window.gtag("event", eventName, params);
    }
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, eventName, params as Record<string, string | number | boolean>);
    }
  } catch {
    // silently swallow — analytics must never break the app
  }
}

/**
 * Public dispatcher: defers to a microtask so the calling code is never
 * delayed. Safe to call from event handlers, useEffect, and async functions.
 */
function dispatch(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  queueMicrotask(() => _dispatch(eventName, params));
}

// ─── SSR / Pre-Init Guard Helper ─────────────────────────────────────────────

function isReadyToTrack(): boolean {
  if (typeof window === "undefined") {
    if (!warnedServerSide) {
      console.warn("[Analytics] Tracking skipped: server-side context.");
      warnedServerSide = true;
    }
    return false;
  }
  if (!initialized) {
    console.warn("[Analytics] Tracking skipped: analytics not yet initialized.");
    return false;
  }
  return true;
}

// ─── Existing Tracking Functions (preserved, now use dispatch) ────────────────

export function trackPageView(params: PageViewParams): void {
  try {
    if (typeof window === "undefined") { isReadyToTrack(); return; }
    if (!initialized) { isReadyToTrack(); return; }
    dispatch("page_view", { page_path: params.page_path, page_title: params.page_title });
  } catch { /* silently swallow */ }
}

export function trackSignUp(params: SignUpParams): void {
  try {
    if (typeof window === "undefined") { isReadyToTrack(); return; }
    if (!initialized) { isReadyToTrack(); return; }
    dispatch("sign_up", { method: params.method });
  } catch { /* silently swallow */ }
}

export function trackLogin(params: LoginParams): void {
  try {
    if (typeof window === "undefined") { isReadyToTrack(); return; }
    if (!initialized) { isReadyToTrack(); return; }
    dispatch("login", { method: params.method });
  } catch { /* silently swallow */ }
}

export function trackAppointmentBooking(params: AppointmentBookingParams): void {
  try {
    if (typeof window === "undefined") { isReadyToTrack(); return; }
    if (!initialized) { isReadyToTrack(); return; }
    dispatch("purchase", {
      service_name: params.serviceName,
      doctor_name: params.doctorName,
      value: params.value,
      currency: params.currency,
    });
  } catch { /* silently swallow */ }
}

export function trackPrescriptionView(params: PrescriptionViewParams): void {
  try {
    if (typeof window === "undefined") { isReadyToTrack(); return; }
    if (!initialized) { isReadyToTrack(); return; }
    dispatch("prescription_view", { prescription_id: params.prescriptionId });
  } catch { /* silently swallow */ }
}

export function trackSupportTicketCreated(params: SupportTicketCreatedParams): void {
  try {
    if (typeof window === "undefined") { isReadyToTrack(); return; }
    if (!initialized) { isReadyToTrack(); return; }
    dispatch("support_ticket_created", { category: params.category });
  } catch { /* silently swallow */ }
}

// ─── New Tracking Functions ───────────────────────────────────────────────────

/** CTA button / link click — hero, pricing, navbar, footer, etc. */
export function trackCtaClick(params: CtaClickParams): void {
  dispatch("cta_click", { label: params.label, location: params.location });
}

/**
 * User advanced to a new booking funnel step.
 * Fire when the step changes (service → doctor → time → notes → confirm).
 */
export function trackBookingStep(params: BookingFunnelParams): void {
  dispatch("booking_step", {
    step: params.step,
    step_name: params.step_name,
    ...(params.service_names ? { service_names: params.service_names } : {}),
    ...(params.doctor_name   ? { doctor_name:   params.doctor_name   } : {}),
  });
}

/**
 * Razorpay checkout modal was opened (payment initiated).
 * Analogous to GA4's "begin_checkout".
 */
export function trackPaymentInitiated(params: PaymentInitiatedParams): void {
  dispatch("begin_checkout", {
    value: params.value,
    currency: params.currency,
    service_names: params.service_names,
    order_id: params.order_id,
  });
}

/** Razorpay payment.failed callback fired. */
export function trackPaymentFailed(params: PaymentFailedParams): void {
  dispatch("payment_failed", {
    reason: params.reason,
    service_names: params.service_names,
  });
}

/**
 * User dismissed the Razorpay modal without paying (modal.ondismiss).
 * This is the "abandoned cart" equivalent.
 */
export function trackPaymentAbandoned(params: PaymentAbandonedParams): void {
  dispatch("payment_abandoned", {
    service_names: params.service_names,
    step_reached: params.step_reached,
  });
}

/** Booking request successfully created after payment verification. */
export function trackBookingRequestCreated(params: BookingRequestParams): void {
  dispatch("booking_request_created", {
    request_id: params.request_id,
    service_names: params.service_names,
    doctor_name: params.doctor_name,
    value: params.value,
    currency: params.currency,
  });
}

/** Doctor accepted or rejected a booking request. */
export function trackDoctorRequestAction(params: DoctorRequestActionParams): void {
  dispatch("doctor_request_action", {
    action: params.action,
    request_id: params.request_id,
    ...(params.reject_reason ? { reject_reason: params.reject_reason } : {}),
  });
}

/** Patient accepted or declined a service recommendation from a doctor. */
export function trackRecommendationAction(params: RecommendationActionParams): void {
  dispatch("recommendation_action", {
    action: params.action,
    recommendation_id: params.recommendation_id,
    ...(params.service_name ? { service_name: params.service_name } : {}),
  });
}

/** Vision assessment started by patient. */
export function trackAssessmentStarted(params: AssessmentParams): void {
  dispatch("assessment_started", {
    assessment_id: params.assessment_id,
    assessment_type: params.assessment_type,
  });
}

/** Vision assessment completed by patient. */
export function trackAssessmentCompleted(params: AssessmentParams): void {
  dispatch("assessment_completed", {
    assessment_id: params.assessment_id,
    assessment_type: params.assessment_type,
  });
}

/** User submitted the forgot-password form. */
export function trackForgotPassword(params: ForgotPasswordParams): void {
  dispatch("forgot_password", { method: params.method });
}

/** Doctor completed their onboarding via invite link. */
export function trackDoctorOnboardingCompleted(params: DoctorOnboardingParams): void {
  dispatch("doctor_onboarding_completed", {
    ...(params.invite_id ? { invite_id: params.invite_id } : {}),
  });
}

/**
 * WhatsApp number gate in booking flow.
 * "shown"    = user hit the booking page without a WhatsApp number
 * "resolved" = user clicked "Go to Profile" to add their number
 */
export function trackWhatsAppModal(params: WhatsAppModalParams): void {
  dispatch("whatsapp_gate", { action: params.action });
}

/** Nav anchor link clicked (Services, How It Works, etc.) */
export function trackNavAnchorClick(label: string): void {
  dispatch("nav_anchor_click", { label });
}
