# Implementation Plan: Unified Error Handling

## Overview

Implement a production-grade centralized error handling system for Eye Aura. The plan proceeds in four phases: (1) build the `lib/errors/` module from scratch, (2) extend the Toast system and create the Error Boundary, (3) migrate all application code to use the new system, and (4) audit the full codebase for compliance. All code is TypeScript targeting the existing Next.js + Firebase + Firestore stack.

---

## Tasks

- [x] 1. Create the `lib/errors/` module — foundational files

  - [x] 1.1 Create `lib/errors/error-codes.ts`
    - Define the `ERROR_CODES` nested const object with all 14 categories and every code listed in the design (`EA-AUTH-001` through `EA-SYSTEM-002`)
    - Define the `DeepValues` recursive type helper
    - Export the `EACode` union type derived from `ERROR_CODES`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 16.5_

  - [x] 1.2 Create `lib/errors/error-messages.ts`
    - Define the `ErrorMessageEntry` type `{ title: string; message: string; suggestion?: string }`
    - Define and export `ERROR_MESSAGES` typed as `Record<EACode, ErrorMessageEntry>` with an entry for every code in `ERROR_CODES`
    - Include non-empty `suggestion` for all nine domain codes: `EA-BOOKING-001`, `EA-BOOKING-002`, `EA-PAYMENT-001`, `EA-PAYMENT-002`, `EA-ASSESSMENT-001`, `EA-ASSESSMENT-002`, `EA-ASSESSMENT-003`, `EA-SYSTEM-001`, `EA-SYSTEM-002`
    - _Requirements: 2.3, 7.5_

  - [x] 1.3 Create `lib/errors/app-error.ts`
    - Define and export the `AppError` interface with fields `code: EACode`, `title: string`, `message: string`, `suggestion?: string`
    - Implement and export the `isAppError(value: unknown): value is AppError` type guard
    - _Requirements: 2.1, 2.4, 1.5_

  - [x] 1.4 Create `lib/errors/firebase-error-mapper.ts`
    - Implement `makeAppError(code: EACode): AppError` private helper using `ERROR_MESSAGES`
    - Implement `mapFirebaseAuthError(error: unknown): AppError | null` with the exact priority order from the design (rate-limit first, unrecognized last)
    - Implement `mapFirestoreError(error: unknown): AppError | null` with code-based rules taking priority over message-based rules
    - Implement `mapNetworkError(error: unknown): AppError | null` with timeout checked before generic network patterns; return `null` for null/undefined/empty message
    - Export all three mapper functions
    - _Requirements: 3.1–3.9, 4.1–4.6, 5.1–5.4_

  - [x] 1.5 Create `lib/errors/api-error-handler.ts`
    - Implement and export `mapApiError(status: number | undefined): AppError` using a switch on HTTP status codes (401, 403, 404, 429, 500, default)
    - Map `undefined`/`null` status to `EA-NETWORK-001`
    - Never include the raw numeric status code in any returned `AppError` field
    - _Requirements: 6.1–6.8_

  - [x] 1.6 Create `lib/errors/error-handler.ts`
    - Implement `getDisplayError(error: unknown, fallbackCode?: EACode): AppError` following the dispatch chain: isAppError → null/undefined/primitive → auth mapper → firestore mapper → network mapper → fallback
    - Wrap the entire dispatch chain in try/catch so `getDisplayError` never throws
    - Implement `formatDisplayError(error: AppError): string` producing `[EA-CODE] Title \u2014 Message` with optional suggestion appended
    - Implement `logError(code: string, error: unknown, context?: string): void` using `console.error` only; suppress `console.log`/`console.debug` in production; handle null/undefined error as `"(no error object)"`; truncate context to 100 chars
    - Wrap `logError` in try/catch so logging failure never propagates
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 8.1–8.7, 9.1–9.6_

  - [x] 1.7 Create `lib/errors/index.ts` barrel and backward-compatible alias
    - Re-export `AppError`, `isAppError`, `ERROR_CODES`, `EACode`, `ERROR_MESSAGES`, `getDisplayError`, `formatDisplayError`, `logError`, `mapFirebaseAuthError`, `mapFirestoreError`, `mapNetworkError`, `mapApiError`
    - Define and export the `EA` alias object mapping all old flat keys (`AUTH_001`, `BKG_001`, `PAY_001`, etc.) to their corresponding `ERROR_CODES` values
    - Delete (or replace) the old `lib/errors.ts` stub after the barrel is in place
    - _Requirements: 1.4, 15.1, 15.4_

- [x] 2. Checkpoint — verify the `lib/errors/` module compiles cleanly
  - Run `tsc --noEmit` (or the project's type-check script) and confirm zero TypeScript errors in `lib/errors/`
  - Ensure all 7 files exist and the barrel resolves correctly from `@/lib/errors`

- [ ] 3. Write property-based and unit tests for the `lib/errors/` module

  - [ ]* 3.1 Write property test for Property 1 — `getDisplayError` always returns a valid AppError
    - Use `fc.anything()` as the arbitrary; assert `code`, `title`, `message` are non-empty strings and `code` matches `/^EA-[A-Z]+-\d{3}$/`; assert the function never throws
    - **Property 1: getDisplayError always returns a valid AppError**
    - **Validates: Requirements 1.1, 1.6, 9.3, 9.4, 9.5, 9.6**

  - [ ]* 3.2 Write property test for Property 2 — `getDisplayError` is idempotent on AppError inputs
    - Generate valid `AppError` objects with `fc.record({ code: fc.constantFrom(...allEACodes), title: fc.string({ minLength: 1 }), message: fc.string({ minLength: 1 }), suggestion: fc.option(fc.string()) })`; assert all four fields are unchanged after passing through `getDisplayError`
    - **Property 2: getDisplayError is idempotent on AppError inputs**
    - **Validates: Requirements 1.5**

  - [ ]* 3.3 Write property test for Property 3 — Firebase Auth mapper returns correct EA code for every known auth/ code
    - Generate objects with `code` drawn from the known auth code set plus arbitrary `auth/` prefixed strings; assert correct EA code mapping for known codes, `EA-AUTH-007` for unknown `auth/` codes, and `null` for non-auth inputs
    - **Property 3: Firebase Auth mapper returns correct EA code for every known auth/ code**
    - **Validates: Requirements 3.1–3.9**

  - [ ]* 3.4 Write property test for Property 4 — Firestore mapper applies code-based priority over message-based priority
    - Generate error objects that simultaneously have a recognized Firestore code and a message containing `"requires an index"`; assert the code-based result always wins
    - **Property 4: Firestore mapper applies code-based priority over message-based priority**
    - **Validates: Requirements 4.1–4.6**

  - [ ]* 3.5 Write property test for Property 5 — Network mapper returns timeout AppError when message matches both patterns
    - Generate error messages that contain both a network keyword and a timeout keyword; assert `EA-NETWORK-002` is always returned
    - **Property 5: Network mapper returns timeout AppError when message matches both timeout and network patterns**
    - **Validates: Requirements 5.1–5.4**

  - [ ]* 3.6 Write property test for Property 6 — API error handler never exposes raw HTTP status codes
    - Use `fc.integer({ min: 100, max: 599 })` as the arbitrary; assert none of `code`, `title`, `message`, `suggestion` contain the numeric status as a substring
    - **Property 6: API error handler never exposes raw HTTP status codes in AppError fields**
    - **Validates: Requirements 6.1–6.6, 6.8**

  - [ ]* 3.7 Write property test for Property 7 — `formatDisplayError` always produces canonical format
    - Generate arbitrary `AppError` objects; assert output matches `/^\[EA-[A-Z]+-\d{3}\] .+ \u2014 .+$/`; assert em-dash (U+2014) is always present; assert suggestion is appended when present
    - **Property 7: formatDisplayError always produces the canonical [EA-CODE] Title — Message format**
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 3.8 Write property test for Property 8 — `ERROR_CODES` and `ERROR_MESSAGES` are in bijection
    - Enumerate all leaf values from `ERROR_CODES`; assert each has a corresponding `ERROR_MESSAGES` entry with non-empty `title` and `message`; assert no extra keys exist in `ERROR_MESSAGES`
    - **Property 8: ERROR_CODES and ERROR_MESSAGES are in bijection**
    - **Validates: Requirements 2.2, 2.3, 2.5**

  - [ ]* 3.9 Write property test for Property 9 — `logError` log format is consistent for any input
    - Spy on `console.error`; use `fc.string()` for code and `fc.anything()` for error value; assert exactly one `console.error` call whose first argument matches `[<code>]` prefix; assert context appears when provided
    - **Property 9: logError log format is consistent for any input**
    - **Validates: Requirements 8.1, 8.2, 8.6, 8.7**

  - [ ]* 3.10 Write unit tests for `lib/errors/` module
    - Test `ERROR_CODES` format: every value matches `/^EA-[A-Z]+-\d{3}$/`
    - Test `logError` with null/undefined error: verifies `"(no error object)"` in log output
    - Test `mapApiError` with `undefined` status: returns `EA-NETWORK-001`
    - Test `isAppError` type guard with valid and invalid inputs
    - _Requirements: 2.2, 6.7, 8.7_

- [x] 4. Extend the Toast system and create the Error Boundary

  - [x] 4.1 Extend `components/ui/toast-provider.tsx` with `errorFromAppError` and raw-string guard
    - Add `errorFromAppError: (error: AppError) => void` to the `ToastContextValue` interface
    - Implement `errorFromAppError` using `useCallback` calling `formatDisplayError(appError)` then `toast(..., "error")`
    - Add the raw Firebase pattern guard to the existing `error(message: string)` method: test against `/^(auth|firestore)\//i` and replace with `EA-SYSTEM-001` formatted string if matched
    - Import `AppError`, `formatDisplayError`, `ERROR_CODES`, `makeAppError` (or equivalent) from `@/lib/errors`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 4.2 Write property test for Property 10 — `errorFromAppError` toast content matches `formatDisplayError` output
    - Render a test component that calls `errorFromAppError`; generate arbitrary `AppError` objects; assert the displayed toast message equals `formatDisplayError(appError)` exactly and toast type is `"error"`
    - **Property 10: errorFromAppError toast content matches formatDisplayError output**
    - **Validates: Requirements 10.2, 10.4**

  - [ ]* 4.3 Write unit tests for Toast system extension
    - Test that `error("auth/invalid-credential")` displays the `EA-SYSTEM-001` message, not the raw string
    - Test that `error("auth/wrong-password")` is replaced
    - Test that `error("A pre-sanitized message")` passes through unchanged
    - _Requirements: 10.3, 10.5, 10.6_

  - [x] 4.4 Create `components/error-boundary.tsx`
    - Implement `ErrorBoundary` as a React class component with `ErrorBoundaryProps` (`children`, optional `fallback`) and `ErrorBoundaryState` (`hasError`)
    - Implement `getDerivedStateFromError` returning `{ hasError: true }`
    - Implement `componentDidCatch` calling `logError(ERROR_CODES.SYSTEM.UNEXPECTED, error, "ErrorBoundary")` wrapped in try/catch so logging failure never prevents fallback render
    - Implement `ErrorFallbackUI` as a separate functional component rendering: Eye Aura logo, `EA-SYSTEM-001` code, title "Something Went Unexpected", message "We've encountered an unexpected issue. Our team has been notified.", and a "Reload Page" button calling `window.location.reload()`
    - When `fallback` prop is provided, render it instead of `ErrorFallbackUI`
    - No stack trace, component tree, or technical details in the fallback UI
    - _Requirements: 14.1–14.7_

  - [ ]* 4.5 Write unit tests for the Error Boundary component
    - Test that `ErrorBoundary` renders children when no error occurs
    - Test that `ErrorBoundary` renders `ErrorFallbackUI` when a child throws
    - Test that `logError` is called with `"ErrorBoundary"` context on crash
    - Test that a custom `fallback` prop replaces the default fallback UI
    - Test that the "Reload Page" button calls `window.location.reload()`
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.7_

- [x] 5. Checkpoint — verify Toast extension and Error Boundary compile and tests pass
  - Run `tsc --noEmit` and confirm zero errors in `components/ui/toast-provider.tsx` and `components/error-boundary.tsx`
  - Run the test suite for tasks 3 and 4 and confirm all pass

- [x] 6. Wrap `app/layout.tsx` with the Error Boundary

  - [x] 6.1 Import `ErrorBoundary` from `@/components/error-boundary` in `app/layout.tsx`
    - Wrap the root layout children with `<ErrorBoundary>` so all application routes are protected
    - Confirm no existing layout structure (providers, theme, fonts) is disrupted
    - _Requirements: 14.6_

- [x] 7. Migrate authentication forms

  - [x] 7.1 Migrate the Login form (`app/(auth)/login/` or equivalent component)
    - In the sign-in catch block, replace any `error.message` or raw Firebase string with `const appError = getDisplayError(error, ERROR_CODES.AUTH.INVALID_CREDENTIAL)`
    - Call `logError(appError.code, error, "LoginForm")` before setting form error state
    - Set form error state to `formatDisplayError(appError)` so the UI renders `[EA-AUTH-001] Unable to Sign In — ...`
    - Remove any string matching `auth/[a-z-]+` from visible UI elements
    - _Requirements: 11.1, 11.4, 11.5_

  - [x] 7.2 Migrate the Signup form
    - In the registration catch block, replace raw error display with `getDisplayError(error, ERROR_CODES.AUTH.EMAIL_IN_USE)`
    - Call `logError` with context `"SignupForm"` before display
    - Set form error state to `formatDisplayError(appError)`
    - _Requirements: 11.2, 11.4, 11.5_

  - [x] 7.3 Migrate the Forgot Password form
    - In the password-reset catch block, replace raw error display with `getDisplayError(error, ERROR_CODES.AUTH.INVALID_CREDENTIAL)`
    - Call `logError` with context `"ForgotPasswordForm"` before display
    - Set form error state to `formatDisplayError(appError)`
    - _Requirements: 11.3, 11.4, 11.5_

- [x] 8. Migrate booking and payment flows

  - [x] 8.1 Migrate payment creation error handling in the Booking page
    - In the payment creation catch block, call `getDisplayError(error, ERROR_CODES.PAYMENT.CREATION_FAILED)`
    - Call `logError(appError.code, error, "BookingPage")` before displaying
    - Display via `errorFromAppError(appError)` on the toast hook
    - Wrap the `getDisplayError` call itself in try/catch; if it throws, display `EA-SYSTEM-001` via `errorFromAppError`
    - _Requirements: 12.1, 12.5, 12.6_

  - [x] 8.2 Migrate payment verification error handling in the Booking page
    - In the payment verification catch block, call `getDisplayError(error, ERROR_CODES.PAYMENT.VERIFICATION_FAILED)`
    - Call `logError` with context `"BookingPage"` before displaying
    - Display via `errorFromAppError(appError)`
    - Remove any Razorpay error descriptions, raw API strings, or HTTP status codes from visible UI
    - _Requirements: 12.2, 12.4, 12.5_

  - [x] 8.3 Migrate slot unavailability error handling in the Booking page
    - In the slot-conflict catch block, call `getDisplayError(error, ERROR_CODES.BOOKING.SLOT_CONFLICT)`
    - Call `logError` with context `"BookingPage"` before displaying
    - Display via `errorFromAppError(appError)`
    - _Requirements: 12.3, 12.4, 12.5_

- [x] 9. Migrate assessment pages

  - [x] 9.1 Migrate expired assessment error in the Assessment page
    - When assessment status is expired, construct `AppError` directly with `ERROR_CODES.ASSESSMENT.EXPIRED` and display via `errorFromAppError`
    - Call `logError(ERROR_CODES.ASSESSMENT.EXPIRED, null, "AssessmentPage")` before displaying
    - _Requirements: 13.1, 13.5_

  - [x] 9.2 Migrate unassigned assessment error in the Assessment page
    - When no valid assignment exists, construct `AppError` with `ERROR_CODES.ASSESSMENT.NOT_ASSIGNED` and display via `errorFromAppError`
    - Call `logError` with context `"AssessmentPage"` before displaying
    - _Requirements: 13.2, 13.5_

  - [x] 9.3 Migrate invalid assessment link error in the Assessment page
    - When URL contains an invalid or missing ID parameter, construct `AppError` with `ERROR_CODES.ASSESSMENT.INVALID_LINK` and display via `errorFromAppError`
    - Call `logError` with context `"AssessmentPage"` before displaying
    - Remove Firestore document IDs, URL query parameters, and internal status strings from visible UI
    - _Requirements: 13.3, 13.4, 13.5_

- [x] 10. Migrate admin and doctor module error handling

  - [x] 10.1 Migrate Admin module doctor management errors
    - In all admin doctor-management catch blocks, call `getDisplayError(error, ERROR_CODES.ADMIN.OPERATION_FAILED)`
    - Call `logError(appError.code, error, "AdminModule")` before displaying
    - Display via `errorFromAppError(appError)` on the toast hook
    - _Requirements: 16.1, 16.7_

  - [x] 10.2 Migrate Doctor module profile save errors
    - In doctor profile save catch blocks, call `getDisplayError(error, ERROR_CODES.DOCTOR.OPERATION_FAILED)`
    - Call `logError(appError.code, error, "DoctorModule")` before displaying
    - Display via `errorFromAppError(appError)`
    - _Requirements: 16.2, 16.7_

  - [x] 10.3 Migrate Prescription module errors
    - In prescription operation catch blocks, call `getDisplayError(error, ERROR_CODES.PRESCRIPTION.OPERATION_FAILED)`
    - Call `logError(appError.code, error, "PrescriptionModule")` before displaying
    - Display via `errorFromAppError(appError)`
    - _Requirements: 16.3, 16.7_

  - [x] 10.4 Migrate Support module errors
    - In support ticket operation catch blocks, call `getDisplayError(error, ERROR_CODES.SUPPORT.OPERATION_FAILED)`
    - Call `logError(appError.code, error, "SupportModule")` before displaying
    - Display via `errorFromAppError(appError)`
    - _Requirements: 16.4, 16.7_

- [x] 11. Checkpoint — verify all migrated modules compile and tests pass
  - Run `tsc --noEmit` across the full project and confirm zero new TypeScript errors
  - Run the full test suite and confirm all tests pass

- [x] 12. Full codebase audit and migration of remaining raw error usages

  - [x] 12.1 Audit and migrate remaining `error.message` / `err.message` usages in `app/`, `components/`, `services/`, `contexts/`, `lib/`
    - Search for `.message` used as a string passed directly to UI rendering, toast calls, or form error state setters
    - Replace each occurrence with the appropriate `getDisplayError` + `formatDisplayError` or `errorFromAppError` pattern
    - Add `// EA-MIGRATED` comment to any intentional `.message` usage that is internal-only and never reaches the UI
    - _Requirements: 15.2, 15.6_

  - [x] 12.2 Audit and remove all `auth/[a-z-]+` and `firestore/[a-z-]+` string literals from user-facing display logic
    - Search for string literals matching `auth/` or `firestore/` patterns in display contexts
    - Replace each with the appropriate `getDisplayError` call
    - _Requirements: 15.3_

  - [x] 12.3 Replace all remaining `eaError()` call sites with `logError()` and all `eaMessage()` call sites with `getDisplayError()` + `formatDisplayError()` or `errorFromAppError()`
    - _Requirements: 15.5_

- [x] 13. Final checkpoint — full compliance verification
  - Run the compliance grep: `grep -rn "\.message" app/ components/ services/ contexts/ lib/ --include="*.tsx" --include="*.ts" | grep -v "// EA-MIGRATED"` and confirm zero matches
  - Run `grep -rn "auth/" app/ components/ services/ contexts/ --include="*.tsx" --include="*.ts"` and confirm zero matches in display contexts
  - Run `tsc --noEmit` and confirm zero TypeScript errors across the full project
  - Run the full test suite and confirm all tests pass

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all core implementation tasks are mandatory
- Each task references specific requirements for traceability
- The `EA` backward-compat alias in `index.ts` (task 1.7) ensures zero breaking changes on day one — existing import sites continue to compile
- The `getDisplayError` dispatch chain is the single entry point for all error resolution; no component should call `error.message` directly as a user-facing string
- `logError` always uses `console.error` so production error tracking services (Sentry, Datadog) capture every call
- The Error Boundary's `componentDidCatch` wraps `logError` in its own try/catch so a logging failure never prevents the fallback UI from rendering
- Property-based tests use **fast-check** (already installed as a dev dependency) with a minimum of 100 iterations per property
- Test files live in `__tests__/unified-error-handling/` following the structure defined in the design document

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6"] },
    { "id": 3, "tasks": ["1.7"] },
    { "id": 4, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "4.1", "4.4"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.5", "6.1"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "8.1", "8.2", "8.3", "9.1", "9.2", "9.3", "10.1", "10.2", "10.3", "10.4"] },
    { "id": 7, "tasks": ["12.1", "12.2", "12.3"] }
  ]
}
```
