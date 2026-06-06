# Session & Sign-Out Bugfix Design

## Overview

This bugfix addresses three interrelated authentication/session issues in the Eye Aura application:

1. **Sign-out placement**: The sign-out action must be rendered inside the profile/account page for both patient and doctor modules. Currently, the patient layout defines `handleSignOut` but never renders it, and the doctor layout renders it in the header instead of the profile page.

2. **Home page shows "Sign In" for authenticated users**: The NavBar on the public home page conditionally renders based on the `user` object from `useAuth()`, but because the session cookie is never written, the server-side middleware has no way to pass auth state, causing a flash of unauthenticated UI. Additionally, even when the auth context resolves, the NavBar correctly shows "Dashboard" — but there's a visible flash.

3. **Session cookie never set**: Neither the `__session` cookie (checked by middleware) nor the `auth-token` cookie (checked by `getServerSession()`) is ever written during any sign-in flow. This breaks middleware-based route protection and server-side session verification entirely.

The fix introduces an API route (`/api/auth/session`) to set a session cookie after sign-in and clear it on sign-out, unifies the cookie name to `__session`, moves sign-out buttons into profile pages, and ensures the NavBar respects authenticated state without flash.

## Glossary

- **Bug_Condition (C)**: The condition where a user has completed Firebase client-side authentication but no session cookie exists, causing middleware to treat the user as unauthenticated
- **Property (P)**: After sign-in, a valid `__session` cookie containing the Firebase ID token is set; middleware and server-side code can verify authentication
- **Preservation**: Existing auth flows (email sign-in, Google sign-in, sign-up, email verification redirect, Firestore profile creation) must continue to work unchanged
- **`__session` cookie**: The cookie name checked by Next.js middleware for route protection; also the canonical cookie name for Firebase Hosting
- **`auth-token` cookie**: The cookie name currently checked by `lib/auth-server.ts` (will be unified to `__session`)
- **`onAuthStateChanged`**: Firebase client SDK listener that fires when auth state changes
- **`getServerSession()`**: Server-side function in `lib/auth-server.ts` that reads a cookie and verifies it with Firebase Admin SDK
- **Edge Runtime**: The runtime environment for Next.js middleware, which cannot use Firebase Admin SDK

## Bug Details

### Bug Condition

The bug manifests when a user successfully authenticates via Firebase Auth (email or Google) but no session cookie is written to the browser. The middleware reads `__session` (always undefined), and `getServerSession()` reads `auth-token` (always undefined). This means:
- Protected routes are never truly protected by middleware
- Server components cannot identify the user
- The home page NavBar always sees an unauthenticated state on initial render

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action: "sign-in" | "page-load", firebaseUser: User | null, cookies: CookieStore }
  OUTPUT: boolean

  IF input.action == "sign-in"
    RETURN input.firebaseUser != null
           AND NOT cookies.has("__session")
  END IF

  IF input.action == "page-load"
    RETURN input.firebaseUser != null
           AND NOT cookies.has("__session")
           AND (currentRoute IN protectedRoutes OR currentRoute == "/")
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Example 1**: User signs in with email/password → Firebase Auth succeeds → `onAuthStateChanged` fires → auth context updates to `{ user: profile }` → but `document.cookie` has no `__session` → middleware treats next navigation as unauthenticated
- **Example 2**: Authenticated user visits `/` → Next.js server renders page → middleware sees no `__session` → page renders with "Sign In" button → client-side hydration fires `onAuthStateChanged` → NavBar re-renders to show "Dashboard" (visible flash)
- **Example 3**: Authenticated patient navigates to `/patient/profile` → profile page renders → no sign-out button is visible despite `handleSignOut` existing in the layout
- **Example 4**: Authenticated doctor navigates to `/doctor/profile` → profile page renders → sign-out is only in the header, not on the profile page itself

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Email sign-in, Google sign-in, and sign-up flows must continue to authenticate the user and load/create their Firestore profile
- Email verification redirect flow must continue to work
- Unauthenticated users visiting protected routes must still be redirected to `/auth/login`
- The doctor layout must continue to show sidebar navigation, header branding, and mobile bottom nav
- The patient layout must continue to show sidebar, premium header, breadcrumbs, and mobile bottom nav
- Public routes (`/`, `/booking`, `/auth/login`, `/auth/signup`, `/invite`) must remain accessible without authentication
- Existing Firestore reads/writes for user profiles must not be affected

**Scope:**
All inputs that do NOT involve session cookie write/read or sign-out button rendering should be completely unaffected by this fix. This includes:
- All Firestore operations (appointments, prescriptions, assessments, etc.)
- Firebase Auth token refresh (handled by Firebase SDK internally)
- Doctor consultation flow
- Patient assessment flow
- Admin operations

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing session cookie API route**: No API route exists to receive the Firebase ID token from the client and set it as an HTTP-only cookie. The sign-in flows in `auth.service.ts` authenticate with Firebase but never make a call to persist the token as a cookie.

2. **Cookie name mismatch**: Middleware checks `__session` while `auth-server.ts` checks `auth-token`. Even if a cookie were set, using two different names creates an inconsistency. The fix must unify on `__session`.

3. **Sign-out rendering gap (patient)**: In `app/patient/layout.tsx`, `handleSignOut` is defined (line ~97) but never rendered in any JSX — there's no sign-out button in the layout or the profile page.

4. **Sign-out placement issue (doctor)**: In `app/doctor/layout.tsx`, the sign-out button is rendered in the header (line ~157). It should be moved to the doctor profile page (`app/doctor/profile/page.tsx`) and removed from the header.

5. **NavBar flash**: The NavBar receives `user` from `useAuth()` which starts as `null` during SSR/initial load. Without a cookie, server-side rendering always sees "unauthenticated". The fix is to either use the cookie to provide initial state or show a loading skeleton until auth resolves.

## Correctness Properties

Property 1: Bug Condition - Session Cookie Set After Sign-In

_For any_ sign-in action (email or Google) that succeeds (Firebase Auth returns a valid user credential), the system SHALL call the session API route and set the `__session` cookie containing a valid Firebase ID token, so that subsequent middleware checks and `getServerSession()` calls can verify the user.

**Validates: Requirements 2.4, 2.5**

Property 2: Bug Condition - Sign-Out Rendered in Profile Pages

_For any_ authenticated user navigating to their respective profile page (`/patient/profile` or `//doctor/profile`), the system SHALL render a visible sign-out button/action that, when activated, clears the session cookie and redirects to the login page.

**Validates: Requirements 2.1, 2.2**

Property 3: Bug Condition - Home Page Shows Dashboard for Authenticated Users

_For any_ authenticated user navigating to the home page (`/`), the system SHALL NOT display a "Sign In" option and SHALL instead show navigation to their dashboard without a flash of unauthenticated state.

**Validates: Requirements 2.3, 2.6**

Property 4: Preservation - Unauthenticated Access and Redirect Behavior

_For any_ input where the user is NOT authenticated (no valid Firebase session), the system SHALL produce the same behavior as the original code: showing "Sign In" on the home page, redirecting from protected routes to `/auth/login`, and allowing access to public routes.

**Validates: Requirements 3.1, 3.3, 3.6**

Property 5: Preservation - Existing Auth Flows and Module Functionality

_For any_ authenticated user interaction that does NOT involve sign-out button rendering or session cookie operations, the system SHALL produce the same behavior as the original code, preserving dashboard access, Firestore profile operations, and all module functionality.

**Validates: Requirements 3.4, 3.5, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/api/auth/session/route.ts` (NEW)

**Purpose**: API route to set/clear the `__session` cookie

**Specific Changes**:
1. **POST handler**: Receives `{ idToken: string }` in body, verifies it with Firebase Admin SDK, sets `__session` HTTP-only cookie with the token value, `Secure` flag, `SameSite=Lax`, and a `maxAge` matching the token expiry (~1 hour)
2. **DELETE handler**: Clears the `__session` cookie by setting it with `maxAge=0`

---

**File**: `services/auth/auth.service.ts`

**Function**: `signInWithEmail`, `signInWithGoogle`

**Specific Changes**:
1. **After successful sign-in**: Call `await this.setSessionCookie()` which gets the current user's ID token via `user.getIdToken()` and POSTs it to `/api/auth/session`
2. **Add `setSessionCookie()` private method**: Gets ID token from `this.auth.currentUser`, calls fetch POST to `/api/auth/session`
3. **Update `signOut()` method**: Call fetch DELETE to `/api/auth/session` before calling `firebaseSignOut`

---

**File**: `contexts/auth-context.tsx`

**Function**: `useEffect` with `onAuthStateChanged`

**Specific Changes**:
1. **On auth state change to authenticated**: After loading the profile, also call the session API to ensure the cookie is fresh (handles token refresh scenarios)
2. **On auth state change to null**: Call DELETE on `/api/auth/session` to clear the cookie

---

**File**: `lib/auth-server.ts`

**Function**: `getServerSession()`

**Specific Changes**:
1. **Change cookie name**: Read `__session` instead of `auth-token` to unify with middleware

---

**File**: `middleware.ts`

**Specific Changes**:
1. No changes needed — middleware already reads `__session`. Once the cookie is actually set, it will work correctly.

---

**File**: `app/patient/profile/page.tsx`

**Specific Changes**:
1. **Add sign-out section**: Import `useAuth` (already imported), add a "Sign Out" button at the bottom of the sidebar section, using `LogOut` icon, calling `signOut()` from auth context and redirecting to `/auth/login`

---

**File**: `app/doctor/profile/page.tsx`

**Specific Changes**:
1. **Add sign-out section**: Import `useAuth` and `LogOut` icon, add a "Sign Out" card/section at the bottom of the page, calling `signOut()` from auth context and redirecting to `/auth/login`

---

**File**: `app/doctor/layout.tsx`

**Specific Changes**:
1. **Remove sign-out button from header**: Remove the `<button onClick={handleSignOut}>` block from the header JSX (lines ~153-163)
2. **Keep `handleSignOut` function** or remove it — the profile page will handle sign-out independently via `useAuth().signOut()`

---

**File**: `modules/home/sections/NavBar.tsx`

**Specific Changes**:
1. **Handle loading state**: Accept a `loading` prop from the parent `LandingPage` and show a skeleton/placeholder for the auth buttons while `loading` is true, preventing the flash of "Sign In" for authenticated users

---

**File**: `modules/home/landing-page.tsx`

**Specific Changes**:
1. **Pass loading state**: Pass `loading` from `useAuth()` to the `NavBar` component

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate sign-in flows and then inspect cookie state, render profile pages and check for sign-out buttons, and render the NavBar with authenticated state to check for flash behavior. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Session Cookie After Email Sign-In**: Call `authService.signInWithEmail()` and assert that `__session` cookie is set (will fail on unfixed code — no cookie is ever written)
2. **Session Cookie After Google Sign-In**: Call `authService.signInWithGoogle()` and assert that `__session` cookie is set (will fail on unfixed code)
3. **Patient Profile Sign-Out Button**: Render `PatientProfilePage` with authenticated user context and assert a sign-out button exists (will fail on unfixed code — no button rendered)
4. **Doctor Profile Sign-Out Button**: Render `DoctorProfilePage` with authenticated user context and assert a sign-out button exists (will fail on unfixed code — button is in header, not profile)
5. **NavBar Authenticated State**: Render `NavBar` with `user` prop and assert "Sign In" text is NOT present (will fail on unfixed code during loading state)

**Expected Counterexamples**:
- `document.cookie` does not contain `__session` after any sign-in flow
- Patient profile page has no element with sign-out action
- NavBar briefly renders "Sign In" before auth context resolves
- Possible causes: missing API route, missing fetch call in auth service, missing JSX in profile pages

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.action == "sign-in"
    result := signIn_fixed(input.credentials)
    ASSERT cookies.has("__session")
    ASSERT cookies.get("__session").value == validFirebaseIdToken
  END IF

  IF input.action == "page-load" AND input.route == "/"
    rendered := renderNavBar_fixed(input.user, input.loading)
    ASSERT NOT rendered.contains("Sign In")
    ASSERT rendered.contains("Dashboard")
  END IF

  IF input.action == "page-load" AND input.route == "/patient/profile"
    rendered := renderPatientProfile_fixed(input.user)
    ASSERT rendered.contains(signOutButton)
  END IF

  IF input.action == "page-load" AND input.route == "/doctor/profile"
    rendered := renderDoctorProfile_fixed(input.user)
    ASSERT rendered.contains(signOutButton)
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) == fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different routes, different auth states, different user roles)
- It catches edge cases that manual unit tests might miss (e.g., token expiry edge cases, concurrent requests)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for unauthenticated users, public routes, and existing module functionality, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Unauthenticated Redirect Preservation**: Verify that unauthenticated users visiting `/patient/dashboard`, `/doctor/dashboard`, etc. are still redirected to `/auth/login` on unfixed code, then verify same behavior after fix
2. **Public Route Access Preservation**: Verify that `/`, `/booking`, `/auth/login` remain accessible without authentication on both unfixed and fixed code
3. **Doctor Layout Functionality Preservation**: Verify that the doctor layout still renders sidebar, header branding, and mobile nav correctly after removing the sign-out button from the header
4. **Patient Layout Functionality Preservation**: Verify that the patient layout still renders sidebar, premium header, breadcrumbs, and mobile nav after fix
5. **Auth Service Flow Preservation**: Verify that sign-in still creates/loads Firestore profile, sign-up still sends verification email, all existing flows intact

### Unit Tests

- Test `/api/auth/session` POST handler: valid token sets cookie, invalid token returns 401
- Test `/api/auth/session` DELETE handler: clears cookie correctly
- Test `getServerSession()` reads `__session` cookie (not `auth-token`)
- Test patient profile page renders sign-out button when user is authenticated
- Test doctor profile page renders sign-out button when user is authenticated
- Test NavBar does not show "Sign In" when `user` prop is non-null
- Test NavBar shows loading state when `loading` prop is true

### Property-Based Tests

- Generate random valid/invalid Firebase ID tokens and verify the session API correctly accepts or rejects them
- Generate random user roles (patient, doctor, admin) and verify sign-out button appears on their respective profile pages
- Generate random navigation scenarios (authenticated + various routes) and verify middleware behavior is consistent with cookie state
- Generate random sequences of sign-in/sign-out actions and verify cookie state is always consistent with auth state

### Integration Tests

- Test full sign-in flow (email) → verify cookie set → navigate to protected route → verify access granted
- Test full sign-in flow (Google) → verify cookie set → navigate to home page → verify "Dashboard" shown (not "Sign In")
- Test sign-out from patient profile → verify cookie cleared → verify redirect to login → verify protected route now redirects
- Test sign-out from doctor profile → verify cookie cleared → verify redirect to login
- Test token refresh: sign-in → wait for token refresh → verify cookie is updated with new token
