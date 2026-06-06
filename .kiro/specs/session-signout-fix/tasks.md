# Implementation Plan

## Overview

Fix the session cookie persistence, sign-out button placement, and NavBar auth flash issues. The implementation follows the exploratory bugfix workflow: write tests to confirm the bug, write preservation tests, implement the fix, then validate.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Session Cookie Never Set After Sign-In
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases:
    - After `authService.signInWithEmail()` succeeds, assert `__session` cookie is set with a valid Firebase ID token
    - After `authService.signInWithGoogle()` succeeds, assert `__session` cookie is set with a valid Firebase ID token
    - After sign-in, render patient profile page and assert a sign-out button/action exists
    - After sign-in, render doctor profile page and assert a sign-out button/action exists
    - After sign-in, render NavBar with authenticated user and assert "Sign In" text is NOT present
  - Bug Condition from design: `isBugCondition(input)` where `input.firebaseUser != null AND NOT cookies.has("__session")`
  - Expected Behavior: After sign-in, `cookies.has("__session") == true` AND `cookies.get("__session").value == validFirebaseIdToken`
  - Run test on UNFIXED code - expect FAILURE (this confirms the bug exists)
  - Document counterexamples found (e.g., "signInWithEmail succeeds but document.cookie has no __session", "patient profile page has no sign-out button")
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unauthenticated Behavior and Existing Flows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code:
    - Unauthenticated user visiting `/patient/dashboard` is redirected to `/auth/login` (middleware reads missing `__session` → redirects)
    - Unauthenticated user visiting `/` sees "Sign In" and "Book Consultation" buttons
    - Public routes (`/`, `/booking`, `/auth/login`, `/auth/signup`, `/invite`) are accessible without authentication
    - Doctor layout renders sidebar navigation, header branding, and mobile bottom nav for authenticated users
    - Patient layout renders sidebar, premium header, breadcrumbs, and mobile bottom nav for authenticated users
    - Sign-in flows (email, Google) create/load Firestore profiles and update auth context
  - Write property-based tests:
    - For all unauthenticated requests to protected routes (`/patient/*`, `/doctor/*`, `/admin/*`), middleware redirects to `/auth/login`
    - For all unauthenticated requests to public routes, access is granted without redirect
    - For all authenticated users, doctor layout renders core navigation elements (sidebar, header logo, mobile nav)
    - For all authenticated users, patient layout renders core navigation elements (sidebar, premium header, mobile nav)
    - For all sign-in attempts with valid credentials, Firestore profile is loaded/created and auth context is updated
  - Verify tests pass on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for session cookie not set and sign-out button placement

  - [x] 3.1 Create session API route (`app/api/auth/session/route.ts`)
    - Create POST handler: receive `{ idToken: string }` in body, verify with Firebase Admin SDK, set `__session` HTTP-only cookie with token value, `Secure` flag, `SameSite=Lax`, `maxAge` of 3600 (1 hour)
    - Create DELETE handler: clear the `__session` cookie by setting it with `maxAge=0`
    - Return appropriate status codes (200 on success, 401 on invalid token)
    - _Bug_Condition: isBugCondition(input) where firebaseUser != null AND NOT cookies.has("__session")_
    - _Expected_Behavior: After POST, cookies.has("__session") == true with valid token_
    - _Preservation: Existing API routes unaffected_
    - _Requirements: 2.4, 2.5_

  - [x] 3.2 Update auth service to set session cookie after sign-in (`services/auth/auth.service.ts`)
    - Add private `setSessionCookie()` method: gets ID token via `this.auth.currentUser!.getIdToken()`, POSTs to `/api/auth/session`
    - Call `await this.setSessionCookie()` at end of `signInWithEmail()` after successful authentication
    - Call `await this.setSessionCookie()` at end of `signInWithGoogle()` after successful authentication
    - Update `signOut()`: call `fetch('/api/auth/session', { method: 'DELETE' })` before `firebaseSignOut(this.auth)`
    - _Bug_Condition: Sign-in succeeds but no cookie write occurs_
    - _Expected_Behavior: After signInWithEmail/signInWithGoogle, __session cookie is set; after signOut, __session cookie is cleared_
    - _Preservation: Firestore profile creation/loading, email verification, all existing auth flows unchanged_
    - _Requirements: 2.4, 2.5, 3.2, 3.5_

  - [x] 3.3 Update auth context to sync cookie on state changes (`contexts/auth-context.tsx`)
    - In `onAuthStateChanged` callback, when `firebaseUser` is non-null: after loading profile, call POST `/api/auth/session` with fresh ID token to keep cookie in sync (handles token refresh)
    - In `onAuthStateChanged` callback, when `firebaseUser` is null: call DELETE `/api/auth/session` to clear stale cookie
    - _Bug_Condition: Auth state changes but cookie is not synced_
    - _Expected_Behavior: Cookie state always matches Firebase auth state_
    - _Preservation: Auth context state management, loading states, error handling unchanged_
    - _Requirements: 2.4, 2.6, 3.5_

  - [x] 3.4 Update `lib/auth-server.ts` to read `__session` cookie
    - Change `cookieStore.get("auth-token")` to `cookieStore.get("__session")` in `getServerSession()`
    - _Bug_Condition: getServerSession reads wrong cookie name_
    - _Expected_Behavior: getServerSession reads __session cookie (same name as middleware)_
    - _Preservation: Token verification logic, Firestore profile loading, role checking unchanged_
    - _Requirements: 2.5_

  - [x] 3.5 Add sign-out button to patient profile page (`app/patient/profile/page.tsx`)
    - Import `LogOut` icon from lucide-react
    - Add a "Sign Out" button/card section at the bottom of the profile page
    - On click: call `signOut()` from `useAuth()` context, then redirect to `/auth/login`
    - _Bug_Condition: Patient profile page has no sign-out action_
    - _Expected_Behavior: Authenticated patient sees sign-out button on /patient/profile_
    - _Preservation: All existing profile page content (personal info, settings) unchanged_
    - _Requirements: 2.1, 3.2_

  - [x] 3.6 Add sign-out button to doctor profile page (`app/doctor/profile/page.tsx`)
    - Import `useAuth` from auth context and `LogOut` icon from lucide-react
    - Add a "Sign Out" button/card section at the bottom of the profile page
    - On click: call `signOut()` from `useAuth()` context, then redirect to `/auth/login`
    - _Bug_Condition: Doctor profile page has no sign-out action_
    - _Expected_Behavior: Authenticated doctor sees sign-out button on /doctor/profile_
    - _Preservation: All existing profile page content unchanged_
    - _Requirements: 2.2, 3.2_

  - [x] 3.7 Remove sign-out button from doctor layout header (`app/doctor/layout.tsx`)
    - Remove the `<button onClick={handleSignOut}>` block with LogOut icon from the header JSX
    - Keep or remove `handleSignOut` function (profile page handles sign-out independently via `useAuth().signOut()`)
    - Optionally remove unused `LogOut` import if no longer referenced
    - _Bug_Condition: Sign-out in header instead of profile page_
    - _Expected_Behavior: Doctor layout header no longer shows sign-out button_
    - _Preservation: Header still shows branding (Eye Aura logo), user display name; sidebar, mobile nav, consultation route handling all unchanged_
    - _Requirements: 2.2, 3.7_

  - [x] 3.8 Update NavBar to accept loading prop and show skeleton (`modules/home/sections/NavBar.tsx`)
    - Update component props: accept `loading?: boolean` prop alongside existing `user` prop
    - When `loading` is true, render a skeleton/placeholder for the auth buttons area (instead of "Sign In" / "Book Consultation")
    - When `loading` is false and `user` is non-null, show "Dashboard" button (existing behavior)
    - When `loading` is false and `user` is null, show "Sign In" / "Book Consultation" (existing behavior)
    - _Bug_Condition: NavBar flashes "Sign In" while auth context resolves for authenticated users_
    - _Expected_Behavior: NavBar shows loading skeleton until auth state resolves, then shows correct state_
    - _Preservation: Desktop/mobile nav links, logo, scroll behavior, mobile menu all unchanged_
    - _Requirements: 2.3, 2.6, 3.3_

  - [x] 3.9 Update landing page to pass loading state to NavBar (`modules/home/landing-page.tsx`)
    - Destructure `loading` from `useAuth()` alongside `user`
    - Pass `loading` prop to `<NavBar user={user} loading={loading} />`
    - _Bug_Condition: NavBar never receives loading state_
    - _Expected_Behavior: NavBar receives loading prop and can show skeleton during auth resolution_
    - _Preservation: All other sections (Hero, Services, HowItWorks, etc.) unchanged_
    - _Requirements: 2.6_

  - [x] 3.10 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Session Cookie Set After Sign-In
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied:
      - `__session` cookie is set after sign-in
      - Patient profile page renders sign-out button
      - Doctor profile page renders sign-out button
      - NavBar does not show "Sign In" for authenticated users
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.11 Verify preservation tests still pass
    - **Property 2: Preservation** - Unauthenticated Behavior and Existing Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix:
      - Unauthenticated users still redirected from protected routes
      - Public routes still accessible
      - Doctor layout still renders all navigation elements
      - Patient layout still renders all navigation elements
      - Sign-in flows still create/load profiles correctly

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify bug condition test (Property 1) passes on fixed code
  - Verify preservation tests (Property 2) pass on fixed code
  - Ensure all existing tests in the project still pass
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 4, "tasks": ["3.3", "3.9"] },
    { "id": 5, "tasks": ["3.10"] },
    { "id": 6, "tasks": ["3.11"] },
    { "id": 7, "tasks": ["4"] }
  ]
}
```

## Notes

- Middleware (`middleware.ts`) already reads `__session` — no changes needed there
- The `auth-token` cookie name in `lib/auth-server.ts` is unified to `__session` to match middleware
- The session API route uses Firebase Admin SDK for token verification (server-side only)
- Cookie `maxAge` of 3600s (1 hour) matches Firebase ID token expiry; `onAuthStateChanged` keeps it refreshed
- Sign-out buttons in profile pages use `useAuth().signOut()` which handles both Firebase sign-out and cookie clearing
