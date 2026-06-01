export const ERROR_CODES = {
  AUTH: {
    INVALID_CREDENTIAL:  "EA-AUTH-001",
    USER_NOT_FOUND:      "EA-AUTH-002",
    EMAIL_IN_USE:        "EA-AUTH-003",
    WEAK_PASSWORD:       "EA-AUTH-004",
    POPUP_CANCELLED:     "EA-AUTH-005",
    TOO_MANY_REQUESTS:   "EA-AUTH-006",
    GENERIC:             "EA-AUTH-007",
  },
  USER: {
    LOAD_FAILED:         "EA-USER-001",
    SAVE_FAILED:         "EA-USER-002",
  },
  BOOKING: {
    SLOT_CONFLICT:       "EA-BOOKING-001",
    ALREADY_CANCELLED:   "EA-BOOKING-002",
  },
  APPOINTMENT: {
    LOAD_FAILED:         "EA-APPOINTMENT-001",
    CANCEL_FAILED:       "EA-APPOINTMENT-002",
  },
  ASSESSMENT: {
    EXPIRED:             "EA-ASSESSMENT-001",
    NOT_ASSIGNED:        "EA-ASSESSMENT-002",
    INVALID_LINK:        "EA-ASSESSMENT-003",
  },
  PAYMENT: {
    CREATION_FAILED:     "EA-PAYMENT-001",
    VERIFICATION_FAILED: "EA-PAYMENT-002",
  },
  PRESCRIPTION: {
    OPERATION_FAILED:    "EA-PRESCRIPTION-001",
  },
  SUPPORT: {
    OPERATION_FAILED:    "EA-SUPPORT-001",
  },
  DOCTOR: {
    OPERATION_FAILED:    "EA-DOCTOR-001",
  },
  ADMIN: {
    OPERATION_FAILED:    "EA-ADMIN-001",
  },
  FIRESTORE: {
    INDEX_REQUIRED:      "EA-FIRESTORE-001",
    PERMISSION_DENIED:   "EA-FIRESTORE-002",
    UNAVAILABLE:         "EA-FIRESTORE-003",
    NOT_FOUND:           "EA-FIRESTORE-004",
  },
  API: {
    SERVER_ERROR:        "EA-API-001",
    NOT_FOUND:           "EA-API-002",
    FORBIDDEN:           "EA-API-003",
    UNAUTHORIZED:        "EA-API-004",
    RATE_LIMITED:        "EA-API-005",
  },
  NETWORK: {
    CONNECTION_ISSUE:    "EA-NETWORK-001",
    TIMEOUT:             "EA-NETWORK-002",
  },
  SYSTEM: {
    UNEXPECTED:          "EA-SYSTEM-001",
    MAINTENANCE:         "EA-SYSTEM-002",
  },
} as const;

// Recursive value extractor — produces the union of all leaf string literals
type DeepValues<T> = T extends string
  ? T
  : T extends object
  ? DeepValues<T[keyof T]>
  : never;

export type EACode = DeepValues<typeof ERROR_CODES>;
