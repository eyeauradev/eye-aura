# Bugfix Requirements Document

## Introduction

This bugfix addresses three related issues in the Eye Aura application's session management and sign-out functionality:

1. **Sign-out should live inside profile/account pages** — The sign-out action should be placed within the profile/account page for each module (patient and doctor), not scattered in headers or sidebars. The doctor module currently has sign-out in its header which should be moved to the profile page. The patient module has a `handleSignOut` function defined but never rendered anywhere.

2. **Public home page should not offer sign-in when session exists** — Once signed in, the home page (`/`) should not display a "Sign In" option. The user should not be able to re-authenticate while already having an active session.

3. **Broken session persistence** — After signing in, the session cookie is never set anywhere in the codebase. The middleware checks for `__session` cookie and `lib/auth-server.ts` checks for `auth-token` cookie — neither is ever written during sign-in. This causes the public home page to incorrectly show "Sign In" and breaks server-side route protection.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user is authenticated in the patient module THEN the system does not render any sign-out option anywhere in the patient profile/account page despite having a `handleSignOut` function defined in the layout

1.2 WHEN a user is authenticated in the doctor module THEN the system renders the sign-out button in the header instead of inside the doctor profile page, making it inconsistent with the desired account-settings pattern

1.3 WHEN a user signs in successfully and then navigates to the home page (`/`) THEN the system displays "Sign In" and "Book Consultation" buttons, allowing the user to attempt re-authentication while already having an active session

1.4 WHEN the middleware checks for authentication on protected routes THEN the system reads a `__session` cookie that is never set by any sign-in flow, resulting in `token` always being `undefined`

1.5 WHEN server-side code calls `getServerSession()` to verify the user THEN the system reads an `auth-token` cookie that is never set by any sign-in flow, resulting in the session always being `null`

1.6 WHEN a user is authenticated and the home page NavBar component mounts THEN the system shows a flash of unauthenticated state (Sign In button) before the auth context resolves

### Expected Behavior (Correct)

2.1 WHEN a user is authenticated and navigates to the patient profile page (`/patient/profile`) THEN the system SHALL render a sign-out button/action within the profile page

2.2 WHEN a user is authenticated and navigates to the doctor profile page (`/doctor/profile`) THEN the system SHALL render the sign-out button/action within the profile page (moved from the header)

2.3 WHEN a user is already signed in and navigates to the home page (`/`) THEN the system SHALL NOT display a "Sign In" option — it SHALL only show navigation to their dashboard (preventing re-authentication)

2.4 WHEN a user signs in successfully THEN the system SHALL set a session cookie (e.g., `__session`) containing the Firebase ID token so that middleware can validate authentication on subsequent requests

2.5 WHEN server-side code calls `getServerSession()` THEN the system SHALL be able to read a valid session cookie that was set during sign-in to verify the user's identity

2.6 WHEN a user is authenticated and the home page NavBar component mounts THEN the system SHALL show a loading state or use the session cookie to determine auth status so that the correct navigation state appears without a flash of "Sign In"

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user is not authenticated and navigates to a protected route THEN the system SHALL CONTINUE TO redirect them to the login page

3.2 WHEN a user signs out from the profile page of any module THEN the system SHALL CONTINUE TO clear the auth state, remove the session cookie, and redirect to the login page

3.3 WHEN an unauthenticated user visits the home page (`/`) THEN the system SHALL CONTINUE TO display "Sign In" and "Book Consultation" buttons

3.4 WHEN a user is authenticated and navigates to `/patient/dashboard` directly THEN the system SHALL CONTINUE TO load the patient dashboard successfully

3.5 WHEN a user completes sign-in via email or Google THEN the system SHALL CONTINUE TO create/load the user profile from Firestore and update the auth context

3.6 WHEN a user is on the public booking route (`/booking`) without authentication THEN the system SHALL CONTINUE TO allow access without redirect

3.7 WHEN a user is authenticated in the doctor module THEN the system SHALL CONTINUE TO display the doctor layout with sidebar navigation and all existing functionality intact
