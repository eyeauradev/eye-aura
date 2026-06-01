import type { EACode } from "./error-codes";

type ErrorMessageEntry = { title: string; message: string; suggestion?: string };

export const ERROR_MESSAGES: Record<EACode, ErrorMessageEntry> = {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  "EA-AUTH-001": {
    title: "Unable to Sign In",
    message: "Please check your email address and password and try again.",
  },
  "EA-AUTH-002": {
    title: "Account Not Found",
    message: "We couldn't find an account with that email address.",
  },
  "EA-AUTH-003": {
    title: "Email Already Registered",
    message: "An account with this email already exists. Please sign in instead.",
  },
  "EA-AUTH-004": {
    title: "Password Too Weak",
    message: "Please choose a password that is at least 8 characters long.",
  },
  "EA-AUTH-005": {
    title: "Sign In Cancelled",
    message: "The sign-in window was closed. Please try again when you're ready.",
  },
  "EA-AUTH-006": {
    title: "Too Many Attempts",
    message: "Your account has been temporarily locked. Please try again in a few minutes.",
  },
  "EA-AUTH-007": {
    title: "Authentication Error",
    message: "We encountered a problem with your sign-in. Please try again.",
  },

  // ── USER ──────────────────────────────────────────────────────────────────
  "EA-USER-001": {
    title: "Profile Unavailable",
    message: "We couldn't load your profile. Please refresh the page.",
  },
  "EA-USER-002": {
    title: "Profile Save Failed",
    message: "We couldn't save your profile changes. Please try again.",
  },

  // ── BOOKING ───────────────────────────────────────────────────────────────
  "EA-BOOKING-001": {
    title: "Slot No Longer Available",
    message: "This time slot has just been taken. Please choose another.",
    suggestion: "Refresh the calendar to see current availability.",
  },
  "EA-BOOKING-002": {
    title: "Appointment Already Cancelled",
    message: "This appointment has already been cancelled.",
    suggestion: "Please book a new appointment if you still need a consultation.",
  },

  // ── APPOINTMENT ───────────────────────────────────────────────────────────
  "EA-APPOINTMENT-001": {
    title: "Appointments Unavailable",
    message: "We couldn't load your appointments. Please try again.",
  },
  "EA-APPOINTMENT-002": {
    title: "Cancellation Failed",
    message: "We couldn't cancel this appointment. Please try again or contact support.",
  },

  // ── ASSESSMENT ────────────────────────────────────────────────────────────
  "EA-ASSESSMENT-001": {
    title: "Assessment Expired",
    message: "This assessment has expired. Please ask your doctor to reassign it.",
    suggestion: "Contact your doctor to request a new assessment link.",
  },
  "EA-ASSESSMENT-002": {
    title: "Assessment Not Available",
    message: "No assessment has been assigned to you at this time.",
    suggestion: "Please contact your doctor if you believe this is an error.",
  },
  "EA-ASSESSMENT-003": {
    title: "Invalid Assessment Link",
    message: "This assessment link is not valid. Please use the link provided by your doctor.",
    suggestion: "Check your email for the original assessment link.",
  },

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  "EA-PAYMENT-001": {
    title: "Payment Could Not Be Started",
    message: "We couldn't initiate your payment. Please try again.",
    suggestion: "If the issue persists, contact support with your booking reference.",
  },
  "EA-PAYMENT-002": {
    title: "Payment Verification Failed",
    message: "We couldn't verify your payment. Please contact support.",
    suggestion: "Do not retry — contact support with your payment reference.",
  },

  // ── PRESCRIPTION ──────────────────────────────────────────────────────────
  "EA-PRESCRIPTION-001": {
    title: "Prescription Error",
    message: "We couldn't complete this prescription action. Please try again.",
  },

  // ── SUPPORT ───────────────────────────────────────────────────────────────
  "EA-SUPPORT-001": {
    title: "Support Request Failed",
    message: "We couldn't process your support request. Please try again.",
  },

  // ── DOCTOR ────────────────────────────────────────────────────────────────
  "EA-DOCTOR-001": {
    title: "Doctor Action Failed",
    message: "We couldn't complete this action. Please try again.",
  },

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  "EA-ADMIN-001": {
    title: "Admin Action Failed",
    message: "We couldn't complete this management action. Please try again.",
  },

  // ── FIRESTORE ─────────────────────────────────────────────────────────────
  "EA-FIRESTORE-001": {
    title: "Data Temporarily Unavailable",
    message:
      "Some information is taking longer than expected to load. Please try again shortly.",
  },
  "EA-FIRESTORE-002": {
    title: "Access Not Available",
    message: "You don't have permission to view this information.",
  },
  "EA-FIRESTORE-003": {
    title: "Service Temporarily Unavailable",
    message:
      "Our database is temporarily unreachable. Please check your connection and try again.",
  },
  "EA-FIRESTORE-004": {
    title: "Information Not Found",
    message: "The requested information could not be found.",
  },

  // ── API ───────────────────────────────────────────────────────────────────
  "EA-API-001": {
    title: "Something Went Wrong",
    message: "We encountered an unexpected issue. Please try again or contact support.",
  },
  "EA-API-002": {
    title: "Information Not Found",
    message: "The information you requested could not be found.",
  },
  "EA-API-003": {
    title: "Access Restricted",
    message: "You don't have permission to perform this action.",
  },
  "EA-API-004": {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again.",
  },
  "EA-API-005": {
    title: "Too Many Requests",
    message: "You've made too many requests. Please wait a moment and try again.",
  },

  // ── NETWORK ───────────────────────────────────────────────────────────────
  "EA-NETWORK-001": {
    title: "Connection Issue",
    message: "Please check your internet connection and try again.",
  },
  "EA-NETWORK-002": {
    title: "Request Timed Out",
    message: "The request took too long to complete. Please try again.",
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  "EA-SYSTEM-001": {
    title: "Unexpected Issue",
    message: "Something unexpected happened. Please try again.",
    suggestion: "If this keeps happening, please contact support.",
  },
  "EA-SYSTEM-002": {
    title: "Service Unavailable",
    message:
      "Eye Aura is temporarily unavailable for maintenance. Please check back shortly.",
    suggestion: "Follow our status page for updates.",
  },
};
