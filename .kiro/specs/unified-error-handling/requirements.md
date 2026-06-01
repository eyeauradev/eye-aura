# Requirements Document

## Introduction

Eye Aura is a premium healthcare platform built with Next.js, Firebase Authentication, and Firestore. Currently, users — patients, doctors, and admins — are exposed to raw technical error messages such as `firebase/auth-invalid-credential`, `FirebaseError`, `Permission denied`, stack traces, and internal API error strings. This is unacceptable for a healthcare platform where trust and calm are paramount.

This feature introduces a centralized, production-grade error handling and error code system across the entire Eye Aura platform. Every user-facing error will carry a structured error code (e.g. `EA-AUTH-001`), a calm user-friendly title and message, and an optional recovery suggestion. Technical details are preserved in developer logs but are never exposed to users. The system replaces the existing `lib/errors.ts` stub and extends it into a full `/lib/errors/` module.

## Glossary

- **Error_Handler**: The centralized module (`lib/errors/error-handler.ts`) responsible for converting any raw error into a structured `AppError` for display.
- **AppError**: The standardized error object with fields `code`, `title`, `message`, and optional `suggestion`.
- **Error_Code**: A string identifier in the format `EA-[CATEGORY]-[NUMBER]` (e.g. `EA-AUTH-001`) that uniquely identifies an error type.
- **Firebase_Error_Mapper**: The module (`lib/errors/firebase-error-mapper.ts`) that maps Firebase Auth and Firestore error codes to `AppError` instances.
- **API_Error_Handler**: The module (`lib/errors/api-error-handler.ts`) that maps HTTP status codes and API route errors to `AppError` instances.
- **Error_Boundary**: A React component that catches rendering crashes and displays a premium fallback UI with an error code.
- **Toast_System**: The existing `components/ui/toast-provider.tsx` and `useToast` hook used to display transient error notifications.
- **Display_Error**: The user-visible formatted string `[EA-AUTH-001] Unable to Sign In — Please check your email address and password and try again.`
- **Logger**: The internal logging utility that records the full technical error details (original error, stack trace, error code) to the developer console without exposing them to users.
- **EA**: The two-letter prefix standing for "Eye Aura" used in all error codes.
- **Category**: The domain segment of an error code. Valid categories: `AUTH`, `USER`, `BOOKING`, `APPOINTMENT`, `ASSESSMENT`, `PAYMENT`, `PRESCRIPTION`, `SUPPORT`, `DOCTOR`, `ADMIN`, `FIRESTORE`, `API`, `NETWORK`, `SYSTEM`.

---

## Requirements

### Requirement 1: Centralized Error Module Structure

**User Story:** As a developer, I want all error handling logic in a single, well-organized module, so that I can find, update, and audit error definitions in one place.

#### Acceptance Criteria

1. THE Error_Handler SHALL export a `getDisplayError(error: unknown, fallbackCode?: string): AppError` function that accepts any thrown value and returns a structured `AppError`; when `fallbackCode` is omitted it SHALL default to `EA-SYSTEM-001`.
2. THE Error_Handler SHALL export a `logError(code: string, error: unknown, context?: string): void` function that logs the error code, original error, and stack trace to the developer console without returning any user-visible data.
3. THE Error_Handler SHALL be the single entry point for all user-facing error resolution; no component or service SHALL call `error.message` directly as a user-facing display string.
4. THE Error_Handler SHALL re-export all error codes, the `AppError` type, `Firebase_Error_Mapper`, and `API_Error_Handler` from a single barrel file at `lib/errors/index.ts`.
5. WHEN `getDisplayError` receives an error that is already an `AppError` (i.e. has `code`, `title`, and `message` fields), THE Error_Handler SHALL return it with all four fields (`code`, `title`, `message`, `suggestion`) unchanged.
6. WHEN `getDisplayError` receives a value that is `null`, `undefined`, or a non-object primitive (other than a string), THE Error_Handler SHALL return an `AppError` with code `EA-SYSTEM-001`, title `"Unexpected Issue"`, and message `"Something unexpected happened. Please try again."`.

---

### Requirement 2: AppError Type and Error Code Registry

**User Story:** As a developer, I want a typed error code registry and a standard error shape, so that TypeScript enforces correct usage and autocomplete works across the codebase.

#### Acceptance Criteria

1. THE Error_Handler SHALL define an `AppError` interface with fields: `code: EACode`, `title: string`, `message: string`, and `suggestion?: string`.
2. THE Error_Handler SHALL define an `ERROR_CODES` constant object containing all error codes organized by category, where each key maps to a string literal in the format `EA-[CATEGORY]-[NNN]` (three-digit zero-padded number, e.g. `EA-AUTH-001`).
3. THE Error_Handler SHALL define an `ERROR_MESSAGES` record that maps every `EACode` string to an object containing `title`, `message`, and optional `suggestion` fields; every code in `ERROR_CODES` SHALL have a corresponding entry in `ERROR_MESSAGES` (bijection).
4. THE Error_Handler SHALL export an `EACode` type derived as a union of all values in `ERROR_CODES`; `AppError.code` SHALL be typed as `EACode` to enforce compile-time correctness.
5. THE `ERROR_CODES` constant SHALL include at least one code for each of the fourteen categories: `AUTH`, `USER`, `BOOKING`, `APPOINTMENT`, `ASSESSMENT`, `PAYMENT`, `PRESCRIPTION`, `SUPPORT`, `DOCTOR`, `ADMIN`, `FIRESTORE`, `API`, `NETWORK`, and `SYSTEM`.

---

### Requirement 3: Firebase Authentication Error Mapping

**User Story:** As a patient, I want to see a calm, helpful message when my sign-in fails, so that I know what to do next without seeing technical Firebase error codes.

#### Acceptance Criteria

1. WHEN a Firebase Auth error with code `auth/invalid-credential` or `auth/wrong-password` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-AUTH-001`, title `"Unable to Sign In"`, and message `"Please check your email address and password and try again."`.
2. WHEN a Firebase Auth error with code `auth/user-not-found` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-AUTH-002`, title `"Account Not Found"`, and message `"We couldn't find an account with that email address."`.
3. WHEN a Firebase Auth error with code `auth/email-already-in-use` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-AUTH-003`, title `"Email Already Registered"`, and message `"An account with this email already exists. Please sign in instead."`.
4. WHEN a Firebase Auth error with code `auth/weak-password` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-AUTH-004`, title `"Password Too Weak"`, and message `"Please choose a password that is at least 8 characters long."`.
5. WHEN a Firebase Auth error with code `auth/popup-closed-by-user` or `auth/cancelled-popup-request` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-AUTH-005`, title `"Sign In Cancelled"`, and message `"The sign-in window was closed. Please try again when you're ready."`.
6. WHEN a Firebase Auth error with code `auth/too-many-requests` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-AUTH-006`, title `"Too Many Attempts"`, and message `"Your account has been temporarily locked. Please try again in a few minutes."`.
7. WHEN a Firebase Auth error with an unrecognized code is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-AUTH-007`, title `"Authentication Error"`, and message `"We encountered a problem with your sign-in. Please try again."`.
8. WHEN a single Firebase Auth error code could match more than one mapping rule, THE Firebase_Error_Mapper SHALL apply the following priority order (highest to lowest): `auth/too-many-requests` (EA-AUTH-006) → `auth/invalid-credential` / `auth/wrong-password` (EA-AUTH-001) → `auth/user-not-found` (EA-AUTH-002) → `auth/email-already-in-use` (EA-AUTH-003) → `auth/weak-password` (EA-AUTH-004) → `auth/popup-closed-by-user` / `auth/cancelled-popup-request` (EA-AUTH-005) → unrecognized (EA-AUTH-007).
9. WHEN the input to the Firebase_Error_Mapper is not a Firebase Auth error object (i.e. does not have a `code` property starting with `auth/`), THE Firebase_Error_Mapper SHALL return `null` to signal that the caller should try the next mapper in the chain.

---

### Requirement 4: Firestore Error Mapping

**User Story:** As a patient, I want to see a reassuring message when data fails to load, so that I am not alarmed by database error messages.

#### Acceptance Criteria

1. WHEN a Firestore error whose message contains the substring `"requires an index"` (case-insensitive) is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-FIRESTORE-001`, title `"Data Temporarily Unavailable"`, and message `"Some information is taking longer than expected to load. Please try again shortly."`.
2. WHEN a Firestore error with code `"permission-denied"` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-FIRESTORE-002`, title `"Access Not Available"`, and message `"You don't have permission to view this information."`.
3. WHEN a Firestore error with code `"unavailable"` or `"deadline-exceeded"` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-FIRESTORE-003`, title `"Service Temporarily Unavailable"`, and message `"Our database is temporarily unreachable. Please check your connection and try again."`.
4. WHEN a Firestore error with code `"not-found"` is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-FIRESTORE-004`, title `"Information Not Found"`, and message `"The requested information could not be found."`.
5. IF a Firestore error matches both the message-based pattern (criterion 1) and a code-based pattern (criteria 2–4), THEN THE Firebase_Error_Mapper SHALL apply the code-based pattern with higher priority than the message-based pattern.
6. WHEN a Firestore error has an unrecognized code and its message does not match any known pattern, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-FIRESTORE-001`, title `"Data Temporarily Unavailable"`, and message `"Some information is taking longer than expected to load. Please try again shortly."` as the fallback.

---

### Requirement 5: Network Error Mapping

**User Story:** As a user, I want to see a clear message when my internet connection fails, so that I understand the issue is with connectivity rather than the platform.

#### Acceptance Criteria

1. WHEN a network failure error whose message contains `"network"`, `"fetch"`, `"NetworkError"`, or `"Failed to fetch"` (matched case-insensitively) is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-NETWORK-001`, title `"Connection Issue"`, and message `"Please check your internet connection and try again."`.
2. WHEN a timeout error whose message contains `"timeout"` or `"timed out"` (matched case-insensitively) is thrown, THE Firebase_Error_Mapper SHALL return an `AppError` with code `EA-NETWORK-002`, title `"Request Timed Out"`, and message `"The request took too long to complete. Please try again."`.
3. IF an error message matches both a network pattern (criterion 1) and a timeout pattern (criterion 2), THEN THE Firebase_Error_Mapper SHALL return the timeout `AppError` (`EA-NETWORK-002`) as the more specific match.
4. WHEN the error object has a `null`, `undefined`, or empty string message, THE Firebase_Error_Mapper SHALL return `null` to signal that no network pattern was matched, allowing the caller to proceed to the next mapper.

---

### Requirement 6: API Error Mapping

**User Story:** As a user, I want to see a calm message when a server request fails, so that I am not shown HTTP status codes or internal server error details.

#### Acceptance Criteria

1. WHEN an API response with HTTP status 500 is received, THE API_Error_Handler SHALL return an `AppError` with code `EA-API-001`, title `"Something Went Wrong"`, and message `"We encountered an unexpected issue. Please try again or contact support."`.
2. WHEN an API response with HTTP status 404 is received, THE API_Error_Handler SHALL return an `AppError` with code `EA-API-002`, title `"Information Not Found"`, and message `"The information you requested could not be found."`.
3. WHEN an API response with HTTP status 403 is received, THE API_Error_Handler SHALL return an `AppError` with code `EA-API-003`, title `"Access Restricted"`, and message `"You don't have permission to perform this action."`.
4. WHEN an API response with HTTP status 401 is received, THE API_Error_Handler SHALL return an `AppError` with code `EA-API-004`, title `"Session Expired"`, and message `"Your session has expired. Please sign in again."`.
5. WHEN an API response with HTTP status 429 is received, THE API_Error_Handler SHALL return an `AppError` with code `EA-API-005`, title `"Too Many Requests"`, and message `"You've made too many requests. Please wait a moment and try again."`.
6. WHEN an API response with an unrecognized HTTP status code is received, THE API_Error_Handler SHALL return an `AppError` with code `EA-API-001`, title `"Something Went Wrong"`, and message `"We encountered an unexpected issue. Please try again or contact support."`.
7. WHEN no HTTP response is received (e.g. network failure before server responds), THE API_Error_Handler SHALL return an `AppError` with code `EA-NETWORK-001`, title `"Connection Issue"`, and message `"Please check your internet connection and try again."`.
8. THE API_Error_Handler SHALL NOT include the raw HTTP status code, server response body, or any internal error string in any field of the returned `AppError`.

---

### Requirement 7: Domain-Specific Error Codes

**User Story:** As a developer, I want domain-specific error codes for booking, payment, assessment, and other modules, so that I can quickly identify which part of the system produced an error from logs.

#### Acceptance Criteria

1. THE `ERROR_CODES` constant SHALL include booking errors: `EA-BOOKING-001` for any slot-conflict condition (double booking or time slot no longer available), and `EA-BOOKING-002` for an already-cancelled appointment.
2. THE `ERROR_CODES` constant SHALL include payment errors: `EA-PAYMENT-001` for payment initiation or creation failure, and `EA-PAYMENT-002` for payment verification failure after a payment has been initiated.
3. THE `ERROR_CODES` constant SHALL include assessment errors: `EA-ASSESSMENT-001` for expired assessment, `EA-ASSESSMENT-002` for assessment not assigned, and `EA-ASSESSMENT-003` for invalid assessment link.
4. THE `ERROR_CODES` constant SHALL include system errors: `EA-SYSTEM-001` for unexpected errors, and `EA-SYSTEM-002` for maintenance / service unavailable.
5. THE `ERROR_MESSAGES` record SHALL contain a `title`, `message`, and non-empty `suggestion` for each of the nine domain codes defined in criteria 1–4 of this requirement (`EA-BOOKING-001`, `EA-BOOKING-002`, `EA-PAYMENT-001`, `EA-PAYMENT-002`, `EA-ASSESSMENT-001`, `EA-ASSESSMENT-002`, `EA-ASSESSMENT-003`, `EA-SYSTEM-001`, `EA-SYSTEM-002`).

---

### Requirement 8: Developer Logging

**User Story:** As a developer, I want full technical error details preserved in logs, so that I can diagnose production issues using error codes without users ever seeing stack traces.

#### Acceptance Criteria

1. WHEN `logError` is called, THE Logger SHALL write a structured log entry to the developer console containing: the error code, the original error object, and the stack trace when one is present on the error object.
2. THE Logger SHALL format log entries as `[EA-CODE] <title> | Original: <error message string>` so that developers can search logs by error code.
3. THE Logger SHALL never include stack traces, raw error codes, or internal error messages in any value returned to the UI layer.
4. WHILE the application is running in production mode, THE Logger SHALL suppress `console.log` and `console.debug` output but SHALL preserve `console.error` output for error tracking services.
5. WHILE the application is running in production mode, THE Logger SHALL preserve `console.error` calls so that external error tracking services (e.g. Sentry) can capture them.
6. THE Logger SHALL accept an optional `context` string parameter of up to 100 characters (e.g. `"BookingPage"`, `"AuthService"`) and include it in the log entry when provided.
7. WHEN `logError` is called with a `null` or `undefined` error value, THE Logger SHALL still write a log entry using the provided error code and context, recording the original value as `"(no error object)"`.

---

### Requirement 9: Display Error Formatting

**User Story:** As a user, I want error messages to be formatted consistently and calmly across the entire platform, so that the experience feels premium and trustworthy.

#### Acceptance Criteria

1. THE Error_Handler SHALL provide a `formatDisplayError(error: AppError): string` function that returns the string `[EA-CODE] Title — Message` where `—` is the Unicode em-dash character (U+2014).
2. WHEN `formatDisplayError` is called with an `AppError` that has a `suggestion`, THE Error_Handler SHALL append the suggestion after the message separated by a single space.
3. WHEN `getDisplayError` receives a plain `Error` object whose message contains a Firebase Auth pattern (prefix `auth/`) or a Firestore pattern (prefix `firestore/`), THE Error_Handler SHALL delegate to the Firebase_Error_Mapper; if the mapper returns `null`, THE Error_Handler SHALL fall back to the provided `fallbackCode` or `EA-SYSTEM-001`.
4. WHEN `getDisplayError` receives a plain `Error` object whose message contains a network pattern (`"network"`, `"fetch"`, `"NetworkError"`, `"Failed to fetch"`, `"timeout"`, `"timed out"`), THE Error_Handler SHALL delegate to the network pattern matching logic in Firebase_Error_Mapper.
5. WHEN `getDisplayError` receives a plain `Error` object whose message does not match any known pattern (auth/, firestore/, or network), THE Error_Handler SHALL return an `AppError` using the provided `fallbackCode` or `EA-SYSTEM-001`.
6. WHEN `getDisplayError` receives a non-Error thrown value (e.g. a plain string, number, or plain object), THE Error_Handler SHALL return an `AppError` with the provided `fallbackCode` or `EA-SYSTEM-001`, and SHALL NOT attempt to read `.message` from the value.

---

### Requirement 10: Toast System Integration

**User Story:** As a user, I want all error toasts to show calm, coded messages rather than raw technical strings, so that the notification experience is consistent and professional.

#### Acceptance Criteria

1. THE Toast_System SHALL be extended to accept an `AppError` object in addition to a plain string message.
2. WHEN an `AppError` is passed to `errorFromAppError`, THE Toast_System SHALL display the formatted string `[EA-CODE] Title — Message` as the toast content; WHEN the `AppError` has a `suggestion`, THE Toast_System SHALL append it after the message separated by a single space.
3. THE Toast_System SHALL never display raw Firebase error code strings, stack traces, or HTTP status codes in toast notifications, regardless of input type.
4. THE `useToast` hook SHALL expose an `errorFromAppError(error: AppError): void` method that formats the `AppError` using `formatDisplayError` and displays it as an error toast; `errorFromAppError` SHALL be the required method for displaying `AppError` objects.
5. IF a component calls `useToast().error()` with a plain string, THEN the string SHALL have already been sanitized through `getDisplayError()` before being passed; the `error()` method SHALL accept only pre-sanitized plain strings and SHALL NOT accept raw Firebase error strings.
6. WHEN a plain string containing a Firebase error code pattern (e.g. starting with `auth/` or `firestore/`) is passed to `useToast().error()`, THE Toast_System SHALL replace it with the formatted string for `EA-SYSTEM-001` rather than displaying the raw pattern.

---

### Requirement 11: Authentication Form Error Handling

**User Story:** As a patient, I want sign-in and sign-up forms to show specific, helpful error messages, so that I know exactly what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the Login form catches a sign-in error, THE Login_Form SHALL resolve the error through `getDisplayError` with fallback `EA-AUTH-001` and display the resulting `[EA-CODE] Title — Message` string in the form error area.
2. WHEN the Signup form catches a registration error, THE Signup_Form SHALL resolve the error through `getDisplayError` with fallback `EA-AUTH-003` and display the resulting `[EA-CODE] Title — Message` string in the form error area.
3. WHEN the Forgot Password form catches a reset error, THE Forgot_Password_Form SHALL resolve the error through `getDisplayError` with fallback `EA-AUTH-001` and display the resulting `[EA-CODE] Title — Message` string in the form error area.
4. WHILE an error is displayed in any authentication form (Login, Signup, Forgot Password), THE form SHALL render the error code and message together in the format `[EA-CODE] Title — Message` so users can reference the code when contacting support.
5. IF a sign-in, sign-up, or password-reset error occurs, THEN no authentication form SHALL render any string matching the pattern `auth/[a-z-]+` (e.g. `auth/invalid-credential`) in any visible UI element.

---

### Requirement 12: Booking and Payment Form Error Handling

**User Story:** As a patient, I want booking and payment errors to be calm and actionable, so that I am not alarmed when a payment fails or a slot becomes unavailable.

#### Acceptance Criteria

1. WHEN the Booking flow catches a payment creation error, THE Booking_Page SHALL resolve the error through `getDisplayError` with fallback `EA-PAYMENT-001` and display the resulting `AppError` via `errorFromAppError` in the Toast_System.
2. WHEN the Booking flow catches a payment verification error, THE Booking_Page SHALL resolve the error through `getDisplayError` with fallback `EA-PAYMENT-002` and display the resulting `AppError` via `errorFromAppError` in the Toast_System.
3. WHEN the Booking flow catches a slot unavailability error, THE Booking_Page SHALL resolve the error through `getDisplayError` with fallback `EA-BOOKING-001` and display the resulting `AppError` via `errorFromAppError` in the Toast_System.
4. THE Booking_Page SHALL NOT display raw API error strings, Razorpay error descriptions, or HTTP status codes in any visible UI element.
5. WHEN a booking error occurs, THE Booking_Page SHALL call `logError` with context `"BookingPage"` before displaying the user-friendly message.
6. IF the `getDisplayError` call itself throws an exception, THEN THE Booking_Page SHALL display an `AppError` with code `EA-SYSTEM-001` via `errorFromAppError` to ensure users always receive some feedback without exposing raw error text.

---

### Requirement 13: Assessment Error Handling

**User Story:** As a patient, I want assessment errors to be clear and reassuring, so that I know whether to contact my doctor or try again.

#### Acceptance Criteria

1. WHEN an assessment is accessed with an expired status, THE Assessment_Page SHALL display an `AppError` with code `EA-ASSESSMENT-001`, title `"Assessment Expired"`, and message `"This assessment has expired. Please ask your doctor to reassign it."` via `errorFromAppError`.
2. WHEN an assessment is accessed without a valid assignment, THE Assessment_Page SHALL display an `AppError` with code `EA-ASSESSMENT-002`, title `"Assessment Not Available"`, and message `"No assessment has been assigned to you at this time."` via `errorFromAppError`.
3. WHEN an assessment URL contains an invalid or missing ID parameter, THE Assessment_Page SHALL display an `AppError` with code `EA-ASSESSMENT-003`, title `"Invalid Assessment Link"`, and message `"This assessment link is not valid. Please use the link provided by your doctor."` via `errorFromAppError`.
4. THE Assessment_Page SHALL NOT display Firestore document IDs, URL query parameters, or internal status strings in any visible UI element, regardless of how many error conditions occur.
5. WHEN an assessment error occurs, THE Assessment_Page SHALL call `logError` with context `"AssessmentPage"` before displaying the user-friendly message.

---

### Requirement 14: Global React Error Boundary

**User Story:** As a user, I want the platform to recover gracefully from unexpected rendering crashes, so that I see a helpful screen rather than a blank page or a stack trace.

#### Acceptance Criteria

1. THE Error_Boundary SHALL intercept rendering errors before a blank page or unhandled exception is shown to the user, regardless of which component in the tree threw the error.
2. WHEN a rendering crash occurs, THE Error_Boundary SHALL display a premium fallback UI containing: the Eye Aura logo, the error code `EA-SYSTEM-001`, a calm title `"Something Went Unexpected"`, a message `"We've encountered an unexpected issue. Our team has been notified."`, and a button labelled `"Reload Page"` that triggers a full browser page reload.
3. WHEN a rendering crash occurs, THE Error_Boundary SHALL record the full technical error in developer logs (error code, original error, stack trace) without exposing any of that information in the fallback UI.
4. THE Error_Boundary SHALL NOT display the error stack trace, component tree, or any technical details in the fallback UI.
5. THE Error_Boundary SHALL render the premium fallback UI regardless of whether the developer log recording in criterion 3 succeeds or fails.
6. THE Error_Boundary SHALL protect all application routes so that no route can display an unhandled rendering crash to the user.
7. WHERE a specific module (Doctor, Admin, Patient) requires isolated error recovery, THE Error_Boundary SHALL accept a `fallback` prop that, when provided, replaces the entire default fallback UI with the custom component.

---

### Requirement 15: Full Codebase Audit and Migration

**User Story:** As a developer, I want all existing raw error usages replaced with the centralized system, so that no technical error can leak to users through any code path.

#### Acceptance Criteria

1. THE Error_Handler SHALL replace the existing `lib/errors.ts` file; the new module SHALL be located at `lib/errors/` with individual files for each concern (`error-codes.ts`, `error-messages.ts`, `app-error.ts`, `error-handler.ts`, `firebase-error-mapper.ts`, `api-error-handler.ts`, `index.ts`).
2. IF the migration is complete, THEN no file in `app/`, `components/`, `services/`, `contexts/`, or `lib/` SHALL contain `err.message` or `error.message` used as a string passed directly to a UI rendering function, toast call, or form error state setter.
3. IF the migration is complete, THEN no file in `app/`, `components/`, `services/`, `contexts/`, or `lib/` SHALL contain a string literal matching the pattern `auth/[a-z-]+` or `firestore/[a-z-]+` in user-facing display logic.
4. THE existing `EA` constant object from `lib/errors.ts` SHALL be re-exported from `lib/errors/index.ts` as an alias mapping each old flat key to its corresponding value in the new `ERROR_CODES` object, so that existing import sites continue to compile without changes.
5. IF the migration is complete, THEN all call sites that previously called `eaError()` SHALL be replaced with `logError()`, and all call sites that previously called `eaMessage()` SHALL be replaced with `getDisplayError()` followed by `formatDisplayError()` or `errorFromAppError()`.
6. WHEN the migration is complete, a developer SHALL be able to verify compliance by running a grep for `\.message` in display contexts and finding zero matches in the scoped directories.

---

### Requirement 16: Admin and Doctor Module Error Handling

**User Story:** As a doctor or admin, I want errors in my module to be clearly coded and actionable, so that I can identify issues quickly and contact support with a reference code.

#### Acceptance Criteria

1. WHEN a doctor management operation fails in the Admin module, THE Admin_Module SHALL resolve the error through `getDisplayError` with fallback `EA-ADMIN-001`, call `logError` with context `"AdminModule"`, and display the resulting `AppError` via `errorFromAppError` in the Toast_System.
2. WHEN a doctor profile save fails in the Doctor module, THE Doctor_Module SHALL resolve the error through `getDisplayError` with fallback `EA-DOCTOR-001`, call `logError` with context `"DoctorModule"`, and display the resulting `AppError` via `errorFromAppError` in the Toast_System.
3. WHEN a prescription operation fails, THE Prescription_Module SHALL resolve the error through `getDisplayError` with fallback `EA-PRESCRIPTION-001`, call `logError` with context `"PrescriptionModule"`, and display the resulting `AppError` via `errorFromAppError` in the Toast_System.
4. WHEN a support ticket operation fails, THE Support_Module SHALL resolve the error through `getDisplayError` with fallback `EA-SUPPORT-001`, call `logError` with context `"SupportModule"`, and display the resulting `AppError` via `errorFromAppError` in the Toast_System.
5. THE `ERROR_CODES` constant SHALL include at least one code for each of the following modules, and each code SHALL have a corresponding entry in `ERROR_MESSAGES`: `DOCTOR`, `ADMIN`, `PRESCRIPTION`, `SUPPORT`, `USER`, and `APPOINTMENT`.
6. IF `getDisplayError` is not called before a toast is triggered in any module, THEN THE Toast_System SHALL still display the toast message to ensure users always receive some error feedback; the fallback message SHALL be the `EA-SYSTEM-001` user-friendly message rather than a raw error string.
7. WHEN any module error occurs, THE module SHALL call `logError` before displaying the user-friendly message so that the full technical error is always preserved in developer logs.

---

### Requirement 17: Premium UX Error Display Standards

**User Story:** As a patient, I want all error messages to feel calm and reassuring, so that I trust the platform even when something goes wrong.

#### Acceptance Criteria

1. THE Error_Handler SHALL ensure all `AppError.message` values use plain language with no third-party product names, technical acronyms (other than `EA-` error codes), Firestore/Firebase document IDs, UIDs, or third-party error code strings.
2. THE Error_Handler SHALL ensure all `AppError.title` values are five words or fewer and written in title case (each principal word capitalized).
3. WHEN an `AppError` has a `suggestion` field, THE suggestion SHALL be an imperative sentence of 120 characters or fewer beginning with a verb in imperative mood (e.g. `"Please try again"`, `"Contact support at support@eyeaura.com"`).
4. THE Error_Handler SHALL ensure no `AppError.message` or `AppError.title` value contains any of the following banned terms: `"Firebase"`, `"Firestore"`, `"exception"`, `"stack trace"`, `"null"`, `"undefined"`, `"500"`, `"403"`, `"404"`, `"401"`, `"429"`, `"authentication failure"`, `"permission denied"`, `"index"` (as a standalone database term), or any string matching the pattern `[a-z]+/[a-z-]+` (Firebase/Firestore error code format).
5. THE Error_Handler SHALL ensure all error codes rendered in the following three surfaces are prefixed with `EA-`: (a) inline form error messages, (b) toast notifications, and (c) the Error_Boundary fallback UI.
6. THE Error_Handler SHALL enforce the banned-term list at runtime by throwing a development-mode assertion error if any `AppError` is constructed with a `message` or `title` containing a banned term, so that violations are caught during development before reaching production.

---
