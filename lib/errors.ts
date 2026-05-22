/**
 * Eye Aura Error Code Reference
 *
 * Format: EA-[DOMAIN]-[NUMBER]
 *
 * Domains:
 *   AUTH  – Authentication & authorization
 *   PAT   – Patient module
 *   DOC   – Doctor module
 *   APT   – Appointments
 *   BKG   – Booking flow
 *   PRE   – Prescriptions
 *   PAY   – Payments
 *   SVC   – Services
 *   SUP   – Support / tickets
 *   ADM   – Admin module
 *   API   – Server-side API routes
 *   GEN   – General / uncategorised
 */

export const EA = {
  // ── Auth ────────────────────────────────────────────────────────────────
  AUTH_001: "EA-AUTH-001", // Sign-in failed
  AUTH_002: "EA-AUTH-002", // Sign-up failed
  AUTH_003: "EA-AUTH-003", // Sign-out failed
  AUTH_004: "EA-AUTH-004", // Password reset failed
  AUTH_005: "EA-AUTH-005", // Profile update failed
  AUTH_006: "EA-AUTH-006", // Session expired / unauthenticated
  AUTH_007: "EA-AUTH-007", // Unauthorized role access

  // ── Patient ─────────────────────────────────────────────────────────────
  PAT_001: "EA-PAT-001",  // Failed to load patient dashboard
  PAT_002: "EA-PAT-002",  // Failed to load patient profile
  PAT_003: "EA-PAT-003",  // Failed to save patient profile

  // ── Appointments ─────────────────────────────────────────────────────────
  APT_001: "EA-APT-001",  // Failed to load appointments
  APT_002: "EA-APT-002",  // Failed to load appointment details
  APT_003: "EA-APT-003",  // Failed to cancel appointment
  APT_004: "EA-APT-004",  // Failed to reschedule appointment
  APT_005: "EA-APT-005",  // Failed to join appointment session

  // ── Booking ──────────────────────────────────────────────────────────────
  BKG_001: "EA-BKG-001",  // Failed to load booking page
  BKG_002: "EA-BKG-002",  // Failed to submit booking request
  BKG_003: "EA-BKG-003",  // Failed to load booking confirmation
  BKG_004: "EA-BKG-004",  // Failed to reschedule booking
  BKG_005: "EA-BKG-005",  // No available slots

  // ── Prescriptions ────────────────────────────────────────────────────────
  PRE_001: "EA-PRE-001",  // Failed to load prescriptions list
  PRE_002: "EA-PRE-002",  // Failed to load prescription details
  PRE_003: "EA-PRE-003",  // Failed to generate PDF
  PRE_004: "EA-PRE-004",  // Failed to create prescription
  PRE_005: "EA-PRE-005",  // Failed to update prescription

  // ── Payments ─────────────────────────────────────────────────────────────
  PAY_001: "EA-PAY-001",  // Failed to create payment order
  PAY_002: "EA-PAY-002",  // Payment verification failed
  PAY_003: "EA-PAY-003",  // Refund failed

  // ── Services ─────────────────────────────────────────────────────────────
  SVC_001: "EA-SVC-001",  // Failed to load services
  SVC_002: "EA-SVC-002",  // Failed to create/update service
  SVC_003: "EA-SVC-003",  // Failed to delete service

  // ── Support ──────────────────────────────────────────────────────────────
  SUP_001: "EA-SUP-001",  // Failed to load support tickets
  SUP_002: "EA-SUP-002",  // Failed to submit support ticket
  SUP_003: "EA-SUP-003",  // Failed to load ticket details
  SUP_004: "EA-SUP-004",  // Failed to send support message

  // ── Doctor ───────────────────────────────────────────────────────────────
  DOC_001: "EA-DOC-001",  // Failed to load doctor dashboard
  DOC_002: "EA-DOC-002",  // Failed to load doctor profile
  DOC_003: "EA-DOC-003",  // Failed to save doctor profile
  DOC_004: "EA-DOC-004",  // Failed to manage slots
  DOC_005: "EA-DOC-005",  // Failed to accept/reject booking request
  DOC_006: "EA-DOC-006",  // Failed to load patients list

  // ── Admin ────────────────────────────────────────────────────────────────
  ADM_001: "EA-ADM-001",  // Failed to load admin dashboard
  ADM_002: "EA-ADM-002",  // Failed to manage doctors
  ADM_003: "EA-ADM-003",  // Failed to send doctor invite
  ADM_004: "EA-ADM-004",  // Failed to manage services
  ADM_005: "EA-ADM-005",  // Failed to manage users
  ADM_006: "EA-ADM-006",  // Failed to load analytics

  // ── API ──────────────────────────────────────────────────────────────────
  API_001: "EA-API-001",  // Generic API route error
  API_002: "EA-API-002",  // Missing required fields
  API_003: "EA-API-003",  // Unauthorized API access
  API_004: "EA-API-004",  // External service error (Razorpay, email, etc.)

  // ── General ──────────────────────────────────────────────────────────────
  GEN_001: "EA-GEN-001",  // Unknown / unexpected error
  GEN_002: "EA-GEN-002",  // Network error
  GEN_003: "EA-GEN-003",  // Data not found
} as const;

export type EACode = (typeof EA)[keyof typeof EA];

/**
 * Returns a safe user-facing message for any error.
 * Strips Firebase internals and wraps with an EA code.
 */
export function eaMessage(code: EACode, detail?: string): string {
  return `Something went wrong (${code}). Please try again or contact support.`;
}

/**
 * Logs error internally with full detail, returns safe user message.
 */
export function eaError(code: EACode, error: unknown): string {
  console.error(`[${code}]`, error);
  return eaMessage(code);
}
