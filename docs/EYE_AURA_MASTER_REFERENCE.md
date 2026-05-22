# Eye Aura Master Reference Documentation

**IMPORTANT:**
This file must always remain synchronized with the actual implementation.
Any architectural or feature change in Eye Aura must update this document immediately.

---

## 1. PROJECT OVERVIEW

### What Eye Aura Is
Eye Aura is a premium tele-optometry and digital eye wellness platform that connects patients with eye care professionals for remote consultations, prescription generation, and follow-up care.

### Product Vision
To provide accessible, premium digital eye care through a calm, operationally efficient platform that removes geographic barriers while maintaining clinical excellence.

### Target Audience
- Patients seeking convenient eye care consultations
- Doctors looking to expand their practice digitally
- Individuals requiring prescription renewals or follow-ups

### Platform Goals
- Enable remote eye consultations via Google Meet/Zoom
- Generate structured, branded prescriptions from clinical data
- Provide text-based support system
- Streamline appointment booking and slot management
- Track patient consultation history and follow-ups

### Current Maturity Stage
Phases 1-8 completed:
- ✅ Phase 1: Foundation (Next.js, TypeScript, Tailwind, components)
- ✅ Phase 2: Public Website (homepage, services, navigation)
- ✅ Phase 3: Auth & Backend (login, signup, middleware, roles)
- ✅ Phase 4: Booking Engine (booking flow, slots, reschedule)
- ✅ Phase 5: Patient Module (dashboard, appointments, prescriptions, support)
- ✅ Phase 6: Doctor Module (dashboard, appointments, slots, patients, prescriptions)
- ✅ Phase 7: Admin Module (doctor invites, service management, user management, analytics)
- ✅ Phase 8: Scheduling System Refactor (request/approval system, weekly availability, smart slot generation, custom minimal calendar UI, modular scheduling components, removed Framer Motion, mobile-responsive design)

### Finalized Architecture Decisions
- **NO Firebase Storage** - All data is structured Firestore data
- **NO file uploads** - No prescription file uploads, no patient report uploads
- **Prescriptions are generated** from structured Firestore data and rendered into branded Eye Aura prescription template
- **Consultations happen via Google Meet/Zoom** - External video platform links stored in appointments
- **Support system is text-only** - No file attachments, text-based ticket system

---

## 2. TECH STACK

### Core Technologies
- **Next.js 15.5.18** - App Router for file-based routing and server components
- **TypeScript** - Type safety across the application
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** - Pre-built accessible UI components
- **Firebase Auth** - Authentication (email/password, Google OAuth)
- **Firestore** - NoSQL database for all data storage
- **CSS Transitions** - Animations for smooth UI transitions (replaced Framer Motion)

### Architectural Reasoning
- **Next.js App Router**: Modern React framework with server components, optimized performance, and built-in routing
- **TypeScript**: Prevents runtime errors, improves developer experience, enables better IDE support
- **Tailwind CSS**: Rapid UI development, consistent design system, easy customization
- **Shadcn UI**: Accessible, customizable components that match design requirements
- **Firebase Auth**: Managed authentication service with OAuth support
- **Firestore**: Scalable NoSQL database with real-time capabilities, no server infrastructure needed
- **CSS Transitions**: Smooth animations for premium feel without external animation libraries

---

## 3. PROJECT ARCHITECTURE

### Folder Structure
```
/app
  /auth - Authentication pages (login, signup)
  /patient - Patient module pages
  /doctor - Doctor module pages
  /booking - Booking flow pages
  /(public) - Public website pages
/components
  /ui - Shadcn UI components
  /section-container - Reusable section wrapper
  /doctor
    /schedule - Modular scheduling components (ScheduleHeader, WeeklyAvailabilityCard, UnavailableBlockCard, AvailabilityPreview, TimeRangeRow)
/modules
  /public - Public website components
  /patient - Patient module components
  /doctor - Doctor module components
/services
  /firebase - Firebase services (auth, firestore)
  /booking - Booking business logic
  /notifications - Notification service
/hooks
  /auth - Authentication hooks
  /booking - Booking hooks
/lib
  /timezone - Timezone utilities
  /auth-server - Server-side auth helpers
/types
  /auth - Authentication types
  /booking - Booking types
  /firestore - Firestore document types
/store - State management (if needed)
/docs - Project documentation
```

### Modular Structure
- **/modules/public**: Landing page, services, navigation for unauthenticated users
- **/modules/patient**: Patient dashboard, appointments, prescriptions, support, notifications
- **/modules/doctor**: Doctor dashboard, appointments, slots, patients, prescriptions
- **/modules/admin**: Reserved for future admin functionality

### Architecture Philosophy
- Modular separation of concerns
- Reusable components in `/components`
- Business logic in `/services`
- Type definitions in `/types`
- Utility functions in `/lib`

---

## 4. ROLE SYSTEM

### Roles
Three user roles exist in the system:
1. **patient** - End users seeking eye care
2. **doctor** - Eye care professionals providing consultations
3. **admin** - System administrators (reserved for future use)

### Role Logic

#### Where Role is Stored
Role is stored in the `users` Firestore collection:
```
users/{uid}
  role: "patient" | "doctor" | "admin"
```

#### How Role is Assigned
- **Patient role**: Assigned automatically during public signup
- **Doctor role**: Assigned only through admin invite flow
- **Admin role**: Reserved for platform administrators (manual assignment)

#### Doctor Invite Flow
1. Admin creates doctor invite via `/admin/doctors/invite`
2. System generates secure token with 7-day expiry
3. Email sent via Resend with invite link
4. Doctor accepts invite via `/invite/[token]`
5. Doctor completes onboarding (sets password, profile)
6. Account created with `role = doctor`
7. Invite marked as used
8. Doctor redirected to doctor dashboard

#### How Middleware Protects Routes
Middleware (`middleware.ts`) checks:
1. Session cookie (`__session`) for authentication
2. Route path to determine if access is allowed
3. Simplified role-based redirects (in production, would decode token)

Current middleware logic:
- Public routes: `/`, `/auth/login`, `/auth/signup` - no auth required
- Patient routes: `/patient/*` - requires auth
- Doctor routes: `/doctor/*` - requires auth
- Booking routes: `/booking/*` - requires auth

#### How Redirects Work
- Unauthenticated users accessing protected routes → redirect to `/auth/login`
- Authenticated users accessing auth pages → redirect to `/patient/dashboard` (simplified, would check role in production)

#### How Dashboards are Differentiated
- Patient dashboard: `/patient/dashboard` - shows upcoming appointments, prescriptions, support tickets
- Doctor dashboard: `/doctor/dashboard` - shows today's consultations, follow-ups, slot management

#### How Auth-Aware Navigation Works
Public website components check auth state via `useAuth()` hook:
- If logged in: buttons redirect to role-appropriate dashboard
- If not logged in: buttons redirect to auth pages

---

## 5. AUTHENTICATION FLOW

### Signup Flow
1. User navigates to `/auth/signup`
2. Fills in email, password, and display name
3. Firebase Auth creates user account (`emailVerified: false`)
4. Server-side API creates Firestore user document via Admin SDK (bypasses security rules)
5. Verification email sent via Firebase Auth with actionCodeSettings (`sendEmailVerification`)
6. User redirected to `/auth/verify-email`
7. User must verify email before accessing protected routes

**IMPORTANT**: Public signup ALWAYS creates patient accounts. Doctor accounts can only be created through admin invite flow.

### Email Verification Flow
1. After signup, user redirected to `/auth/verify-email`
2. User sees verification screen with:
   - "Please verify your email to continue" message
   - User's email address displayed
   - "I've verified my email" button (reloads Firebase Auth state)
   - "Resend verification email" button (60-second cooldown)
   - "Sign out" button
3. User clicks verification link in email
4. Firebase Auth marks `emailVerified: true`
5. User returns to `/auth/verify-email` and clicks "I've verified my email"
6. `reloadUser()` refreshes Firebase Auth state
7. User redirected to `/patient/dashboard`

**Verification Enforcement**:
- Unverified users (`emailVerified: false`) cannot access:
  - `/patient/*` routes
  - `/doctor/*` routes
  - `/admin/*` routes
  - `/booking/*` routes
  - Payment flows
  - Booking request creation
- Enforcement happens at page layout level (client-side)
- Google Sign-In accounts are auto-verified (no verification screen)

**Verification Page**: `/auth/verify-email`
- Premium, calm, wellness-oriented UI
- Mobile-responsive (320px minimum)
- Reassuring messaging (no technical jargon)
- Clear instructions and action buttons

### Login Flow
1. User navigates to `/auth/login`
2. Enters email and password (or clicks Google sign-in)
3. Firebase Auth authenticates credentials
4. Session cookie (`__session`) set
5. User document fetched from Firestore
6. If `emailVerified: false` → redirect to `/auth/verify-email`
7. If `emailVerified: true` → redirect to role-appropriate dashboard
8. Google Sign-In accounts are auto-verified → direct dashboard redirect

### Forgot Password Flow
1. User navigates to `/auth/forgot-password` (from login page link)
2. Enters email address
3. Firebase Auth sends password reset email
4. User sees success message with email confirmation
5. User clicks reset link in email
6. Redirected to Firebase password reset page
7. User sets new password
8. User can sign in with new password

**Forgot Password Page:**
- Premium, calm UI matching Eye Aura aesthetic
- Email input form
- Success state showing email confirmation
- Link back to login page
- Mobile-responsive (320px minimum)

### Google Auth Flow
1. User clicks "Sign in with Google"
2. Firebase Auth handles Google OAuth
3. User redirected back with credentials
4. Session cookie set
5. User document fetched/created with role
6. User redirected to dashboard

### Logout Flow
1. User clicks sign out button
2. Firebase Auth signs out user
3. Session cookie cleared
4. User redirected to `/auth/login`

### Session Persistence
- Session stored in `__session` cookie
- Cookie is HTTP-only for security
- Session verified on each protected route access

### Protected Routes
- Middleware checks for session cookie
- Routes without session redirect to `/auth/login`
- Role-based protection implemented via route prefixes
- Email verification enforced at page layout level (patient, doctor, admin layouts)
- Unverified users (`emailVerified: false`) redirected to `/auth/verify-email`
- `/auth/verify-email` is a public route (accessible without verification)

### Loading States
- Auth context provides `loading` state
- Components show loading spinner while auth state is being determined
- Protected routes check auth state before rendering

### Error Handling
- Auth errors caught and displayed to user
- Invalid credentials shown as error message
- Network errors handled gracefully

---

## 6. FIRESTORE ARCHITECTURE

### Collections Overview

#### users
**Purpose**: Store user profile and authentication metadata

**Key Fields**:
- `id` (string) - User UID from Firebase Auth
- `email` (string) - User email
- `displayName` (string) - User display name
- `role` (string) - User role: "patient" | "doctor" | "admin"
- `phoneNumber` (string, optional) - Phone number
- `onboardingCompleted` (boolean) - Onboarding status
- `emailVerified` (boolean) - Firebase Auth email verification status (synchronized from Firebase Auth, not stored in Firestore)
- `createdAt` (timestamp) - Account creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**: 
- One-to-many with appointments (as patient or doctor)
- One-to-many with prescriptions (as doctor)

**Role Access**: 
- Users can read/write their own profile
- Admins can read all profiles

**Business Rules**:
- Role cannot be changed after creation (enforced at application level)
- Email is unique (enforced by Firebase Auth)

#### appointments
**Purpose**: Store consultation appointments between patients and doctors

**Key Fields**:
- `id` (string) - Appointment ID
- `patientId` (string) - Reference to users collection
- `doctorId` (string) - Reference to users collection
- `serviceId` (string) - Reference to services collection
- `slotId` (string) - Reference to doctor_slots collection
- `status` (string) - "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "cancellation_requested"
- `notes` (string, optional) - Consultation notes
- `prescriptionId` (string, optional) - Reference to prescriptions collection
- `paymentId` (string, optional) - Reference to payments collection
- `consultationPlatform` (string) - "google_meet" | "zoom" | "phone"
- `consultationLink` (string, optional) - Video conference link
- `scheduledFor` (timestamp) - Appointment date/time
- `followUpRequired` (boolean) - Whether follow-up is needed
- `followUpDate` (timestamp, optional) - Follow-up appointment date
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- Many-to-one with users (patient)
- Many-to-one with users (doctor)
- Many-to-one with services
- Many-to-one with doctor_slots
- One-to-one with prescriptions
- One-to-one with payments

**Role Access**:
- Patients can read their own appointments
- Doctors can read their own appointments
- Admins can read all appointments

**Business Rules**:
- Status transitions: pending → confirmed → in_progress → completed
- Cancellation can be requested by patient
- Doctor can cancel confirmed appointments
- Prescription can only be generated for completed appointments

#### doctor_availability
**Purpose**: Store doctor weekly availability configuration for smart slot generation

**Key Fields**:
- `id` (string) - Availability ID
- `doctorId` (string) - Reference to users collection
- `dayOfWeek` (string) - Day of week: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
- `isOff` (boolean) - Whether doctor is off on this day
- `timeRanges` (array) - Array of time range objects
  - `startTime` (string) - Start time in HH:MM format
  - `endTime` (string) - End time in HH:MM format
- `duration` (number) - Consultation duration in minutes
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- Many-to-one with users (doctor)

**Role Access**:
- Doctors can create/read/update/delete their own availability
- Patients can read doctor availability
- Admins can read all availability

**Business Rules**:
- Each day has at most one availability record per doctor
- Time ranges cannot overlap on same day
- Duration applies to all time ranges for that day
- Used by smart slot generation to create available slots

#### doctor_blocks
**Purpose**: Store doctor blocked time ranges (vacations, breaks, unavailability)

**Key Fields**:
- `id` (string) - Block ID
- `doctorId` (string) - Reference to users collection
- `start` (timestamp) - Block start date/time
- `end` (timestamp) - Block end date/time
- `repeatWeekly` (boolean) - Whether block repeats weekly
- `reason` (string, optional) - Reason for blocking
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- Many-to-one with users (doctor)

**Role Access**:
- Doctors can create/read/update/delete their own blocks
- Patients can read doctor blocks
- Admins can read all blocks

**Business Rules**:
- Blocks exclude time from availability
- Overlapping blocks are allowed
- Used by smart slot generation to exclude unavailable times

#### booking_requests
**Purpose**: Store patient booking requests for doctor approval

**Key Fields**:
- `id` (string) - Request ID
- `patientId` (string) - Reference to users collection
- `doctorId` (string) - Reference to users collection
- `serviceId` (string) - Reference to services collection
- `requestedTime` (timestamp) - Patient's requested time
- `proposedTime` (timestamp, optional) - Doctor's proposed time (for reschedule)
- `status` (string) - "requested" | "accepted" | "rejected" | "reschedule_requested" | "cancelled"
- `notes` (string, optional) - Patient notes
- `rejectionReason` (string, optional) - Reason for rejection
- `rescheduleReason` (string, optional) - Reason for reschedule request
- `paymentId` (string, optional) - Links to payments collection
- `paymentStatus` (string, optional) - "completed" at creation time
- `paymentAmount` (number, optional) - Amount paid in INR
- `refundStatus` (RefundStatus, optional) - Mirrors payment.refundStatus for quick UI access: "none" | "pending" | "processed" | "failed"
- `appointmentId` (string, optional) - Reference to appointments collection when accepted
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- Many-to-one with users (patient)
- Many-to-one with users (doctor)
- Many-to-one with services
- One-to-one with appointments (when accepted)

**Role Access**:
- Patients can create/read their own requests
- Doctors can read/update requests directed to them
- Admins can read all requests

**Business Rules**:
- Status transitions: requested → accepted → (appointment created) OR requested → rejected OR requested → reschedule_requested
- Patients can cancel pending requests
- Doctors can accept, reject, or propose reschedule
- When accepted, appointment is created and linked
- Reschedule requires patient approval

#### doctor_slots
**Purpose**: Store doctor availability slots for booking (legacy - being replaced by availability-based system)

**Key Fields**:
- `id` (string) - Slot ID
- `doctorId` (string) - Reference to users collection
- `startTime` (timestamp) - Slot start time
- `endTime` (timestamp) - Slot end time
- `isAvailable` (boolean) - Whether slot is available for booking
- `isBlocked` (boolean) - Whether slot is blocked by doctor
- `blockReason` (string, optional) - Reason for blocking
- `appointmentId` (string, optional) - Reference to appointments collection when booked
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- Many-to-one with users (doctor)
- One-to-one with appointments (when booked)

**Role Access**:
- Doctors can create/read/update/delete their own slots
- Patients can read available slots
- Admins can read all slots

**Business Rules**:
- Slots cannot overlap for same doctor
- Booked slots cannot be modified
- Blocked slots are not available for booking
- **DEPRECATED**: Being replaced by doctor_availability + smart slot generation

#### prescriptions
**Purpose**: Store structured prescription data generated from consultations

**Key Fields**:
- `id` (string) - Prescription ID (generated via crypto.randomUUID())
- `appointmentId` (string) - Reference to appointments collection
- `patientId` (string) - Reference to users collection
- `doctorId` (string) - Reference to users collection
- `rightEye` (object) - Right eye examination data
  - `sph` (string) - Spherical power (e.g., "-2.50")
  - `cyl` (string) - Cylindrical power (e.g., "-0.50")
  - `axis` (string) - Axis (e.g., "180")
  - `va` (string) - Visual acuity (e.g., "6/6")
- `leftEye` (object) - Left eye examination data (same structure as rightEye)
- `pd` (string) - Pupillary distance (e.g., "64")
- `findings` (string) - Examination findings (textarea, multi-line)
- `diagnosis` (string) - Diagnosis (textarea, multi-line)
- `medications` (string) - Prescribed medications (textarea, multi-line, text-based)
- `eyeDrops` (string) - Prescribed eye drops (textarea, multi-line, text-based)
- `recommendations` (string) - Recommendations (textarea, multi-line, text-based)
- `exercises` (string) - Recommended exercises (textarea, multi-line, text-based)
- `consultationNotes` (string) - Additional consultation notes (textarea, multi-line)
- `followUpRequired` (boolean) - Whether follow-up is needed
- `followUpDate` (timestamp, optional) - Follow-up date (if followUpRequired = true)
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- One-to-one with appointments (via appointmentId)
- Many-to-one with users (patient via patientId)
- Many-to-one with users (doctor via doctorId)

**Role Access**:
- Patients can read their own prescriptions (where patientId = current user)
- Doctors can read prescriptions they created (where doctorId = current user)
- Admins can read all prescriptions

**Business Rules**:
- Prescriptions are generated from structured data, not file uploads
- ID generated using crypto.randomUUID() for cryptographic security
- PDF/PNG export architecture prepared but not implemented
- Shareable links would be generated from prescription ID (not implemented)
- No file attachments allowed
- Prescription can only be created for completed appointments
- Appointment updated with prescriptionId when prescription is created

#### notifications
**Purpose**: Store user notifications

**Key Fields**:
- `id` (string) - Notification ID
- `userId` (string) - Reference to users collection
- `type` (string) - Notification type
- `message` (string) - Notification message
- `read` (boolean) - Whether notification has been read
- `actionUrl` (string, optional) - URL for action
- `createdAt` (timestamp) - Creation date

**Relationships**:
- Many-to-one with users

**Role Access**:
- Users can read their own notifications
- Admins can read all notifications

**Business Rules**:
- Notifications generated automatically for key events
- Read status updated when user views notification

#### support_tickets
**Purpose**: Store support tickets for text-based support system

**Key Fields**:
- `id` (string) - Ticket ID
- `userId` (string) - Reference to users collection
- `subject` (string) - Ticket subject
- `message` (string) - Ticket message
- `status` (string) - "open" | "in_progress" | "resolved" | "closed"
- `priority` (string) - "low" | "medium" | "high"
- `responses` (array) - Array of response objects
  - `message` (string) - Response message
  - `authorId` (string) - Reference to users collection
  - `createdAt` (timestamp) - Response creation date
- `createdAt` (timestamp) - Ticket creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- Many-to-one with users
- One-to-many with responses

**Role Access**:
- Patients can read/write their own tickets
- Doctors/admins can read all tickets and respond

**Business Rules**:
- Text-only support system (no file attachments)
- Status transitions: open → in_progress → resolved → closed
- Responses are chronologically ordered

#### payments
**Purpose**: Store Razorpay payment information and refund tracking

**Key Fields**:
- `id` (string) - Payment ID
- `userId` (string) - Patient UID (reference to users collection)
- `doctorId` (string) - Doctor UID (reference to users collection)
- `serviceId` (string) - Service UID (reference to services collection)
- `amount` (number) - Amount in INR (human-readable, e.g. 500)
- `currency` (string) - "INR"
- `status` (PaymentStatus) - "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled"
- `razorpayOrderId` (string) - Created by /api/payments/create-order
- `razorpayPaymentId` (string, optional) - Returned by Razorpay after successful payment
- `razorpaySignature` (string, optional) - Verified server-side in /api/payments/verify-payment
- `bookingRequestId` (string, optional) - Set after successful verification (links to booking_requests)
- `requestedTime` (timestamp) - Patient's requested appointment time
- `notes` (string, optional) - Patient notes
- `method` (PaymentMethod, optional) - "card" | "upi" | "net_banking" | "wallet"
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date
- `completedAt` (timestamp, optional) - When payment was completed
- `failedAt` (timestamp, optional) - When payment failed
- `failureReason` (string, optional) - Payment failure reason
- `refundedAt` (timestamp, optional) - When refund was processed
- `refundReason` (string, optional) - Reason for refund (doctor's rejection reason)
- `refundStatus` (RefundStatus, optional) - "none" | "pending" | "processed" | "failed"
- `refundId` (string, optional) - Razorpay refund ID (rfnd_...)
- `refundFailureReason` (string, optional) - Populated if refundStatus === "failed"
- `appointmentId` (string, optional) - Deprecated — kept for schema backward compatibility
- `transactionId` (string, optional) - Deprecated — kept for schema backward compatibility

**Relationships**:
- Many-to-one with users (patient via userId)
- Many-to-one with users (doctor via doctorId)
- Many-to-one with services (via serviceId)
- One-to-one with booking_requests (via bookingRequestId)
- One-to-one with appointments (via appointmentId - deprecated)

**Role Access**:
- Patients can read their own payments (where userId = current user)
- Doctors can read payments for their services (where doctorId = current user)
- Admins can read all payments via /admin/payments

**Business Rules**:
- All writes go through Admin SDK in API routes only
- Payments created via /api/payments/create-order (before checkout)
- Payments verified via /api/payments/verify-payment (after Razorpay callback)
- Refunds initiated via /api/payments/refund (doctor rejection)
- Refund API uses next/server after() pattern — response returns in <3s, Razorpay call runs in background
- Idempotency via X-Razorpay-Idempotency-Key header prevents duplicate refunds
- Requests with refundStatus "pending" or "failed" can be retried via doctor's Requests page

#### doctor_invites
**Purpose**: Store doctor invitation tokens for secure onboarding

**Key Fields**:
- `id` (string) - Invite ID
- `email` (string) - Doctor's email address
- `token` (string) - Secure invite token
- `expiresAt` (timestamp) - Token expiry date (7 days)
- `invitedBy` (string) - Admin user ID who created invite
- `used` (boolean) - Whether invite has been used
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- Many-to-one with users (invitedBy admin)

**Role Access**:
- Admins only (read, create, update, delete)

**Business Rules**:
- Only admins can create invites
- Tokens expire after 7 days
- Each invite can be used only once
- Used invites cannot be reused
- Email sent via Resend upon creation

#### services
**Purpose**: Store available consultation services

**Key Fields**:
- `id` (string) - Service ID
- `title` (string) - Service name
- `description` (string) - Service description
- `type` (string) - Service type
- `price` (number) - Service price
- `currency` (string) - Currency code
- `duration` (number) - Duration in minutes
- `suitableFor` (array) - Array of suitable conditions/symptoms
- `doctorIds` (array) - Array of doctor user IDs who can provide this service
- `isActive` (boolean) - Whether service is active
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- One-to-many with appointments
- Many-to-many with users (doctors) via doctorIds

**Role Access**:
- Public read access
- Admins can create/update/delete services and assign doctors

**Business Rules**:
- Only active services are bookable
- Price and duration are fixed per service
- Services can be assigned to multiple doctors
- Patients can select from available doctors when booking

---

## 7. COMPLETE ROUTE MAP

### PUBLIC ROUTES

#### `/`
- **Purpose**: Landing page
- **Accessible Role**: Public (no auth required)
- **Main Features**: Hero section, services overview, CTA buttons
- **Data Dependencies**: Services collection
- **Related Firestore Collections**: services
- **Business Logic**: Auth-aware navigation (redirects to booking if logged in)

#### `/services`
- **Purpose**: Services listing page
- **Accessible Role**: Public
- **Main Features**: Service cards, filtering
- **Data Dependencies**: Services collection
- **Related Firestore Collections**: services
- **Business Logic**: Auth-aware booking buttons

#### `/services/[slug]`
- **Purpose**: Individual service detail page
- **Accessible Role**: Public
- **Main Features**: Service details, booking CTA
- **Data Dependencies**: Services collection
- **Related Firestore Collections**: services
- **Business Logic**: Auth-aware booking buttons

### AUTH ROUTES

#### `/auth/login`
- **Purpose**: User login
- **Accessible Role**: Public (no auth required)
- **Main Features**: Email/password form, Google sign-in, forgot password
- **Data Dependencies**: Firebase Auth
- **Related Firestore Collections**: users
- **Business Logic**: Firebase Auth authentication, role-based redirect

#### `/auth/signup`
- **Purpose**: User registration
- **Accessible Role**: Public (no auth required)
- **Main Features**: Registration form with role selection
- **Data Dependencies**: Firebase Auth, Firestore
- **Related Firestore Collections**: users
- **Business Logic**: Firebase Auth signup, user document creation, verification email sent, redirect to verify-email

#### `/auth/verify-email`
- **Purpose**: Email verification screen
- **Accessible Role**: Authenticated users (public route, accessible without verification)
- **Main Features**: Email display, verification status refresh, resend verification email, sign out
- **Data Dependencies**: Firebase Auth
- **Related Firestore Collections**: None (uses Firebase Auth only)
- **Business Logic**:
  - Displays user's email address
  - "I've verified my email" button reloads Firebase Auth user state via `reloadUser()`
  - "Resend verification email" button triggers `sendVerificationEmail()`
  - "Sign out" button logs out user
  - Auto-redirects to dashboard when `emailVerified: true`
  - Premium, calm, wellness-oriented UI
  - Mobile-responsive (320px minimum)

### PATIENT ROUTES

#### `/patient/dashboard`
- **Purpose**: Patient home dashboard
- **Accessible Role**: patient
- **Main Features**: Upcoming appointments, recent prescriptions, available services with doctors, quick actions
- **Data Dependencies**: Appointments, prescriptions, notifications, services, users
- **Related Firestore Collections**: appointments, prescriptions, notifications, services, users
- **Business Logic**: Fetch patient's appointments and prescriptions, display services with associated doctors

#### `/patient/profile`
- **Purpose**: Patient profile management
- **Accessible Role**: patient
- **Main Features**: Profile editing, account info
- **Data Dependencies**: Users collection
- **Related Firestore Collections**: users
- **Business Logic**: Update user profile information

#### `/patient/appointments`
- **Purpose**: Patient appointments list
- **Accessible Role**: patient
- **Main Features**: All appointments with filters, status updates
- **Data Dependencies**: Appointments collection
- **Related Firestore Collections**: appointments
- **Business Logic**: Fetch patient's appointments, filter by status/date

#### `/patient/appointments/[id]`
- **Purpose**: Patient appointment detail
- **Accessible Role**: patient
- **Main Features**: Appointment details, consultation link, prescription link
- **Data Dependencies**: Appointments, prescriptions
- **Related Firestore Collections**: appointments, prescriptions
- **Business Logic**: Fetch appointment and related prescription

#### `/patient/prescriptions`
- **Purpose**: Patient prescriptions list
- **Accessible Role**: patient
- **Main Features**: All prescriptions with download/share options
- **Data Dependencies**: Prescriptions collection
- **Related Firestore Collections**: prescriptions
- **Business Logic**: Fetch patient's prescriptions

#### `/patient/prescriptions/[id]`
- **Purpose**: Patient prescription detail
- **Accessible Role**: patient
- **Main Features**: Prescription display, PDF/PNG export, share link
- **Data Dependencies**: Prescriptions collection
- **Related Firestore Collections**: prescriptions
- **Business Logic**: Fetch prescription, generate PDF/PNG (placeholder), generate share link

#### `/patient/support`
- **Purpose**: Patient support tickets
- **Accessible Role**: patient
- **Main Features**: Create tickets, view ticket history
- **Data Dependencies**: Support tickets collection
- **Related Firestore Collections**: support_tickets
- **Business Logic**: Fetch patient's tickets, create new ticket

#### `/patient/support/[id]`
- **Purpose**: Patient support ticket detail
- **Accessible Role**: patient
- **Main Features**: View ticket, add responses
- **Data Dependencies**: Support tickets collection
- **Related Firestore Collections**: support_tickets
- **Business Logic**: Fetch ticket, allow adding responses

#### `/patient/requests`
- **Purpose**: Patient booking requests list
- **Accessible Role**: patient
- **Main Features**: All booking requests with status, refund status, rejection reason, "Book Again" CTA for rejected, appointment link for accepted
- **Data Dependencies**: Booking requests collection, users, services
- **Related Firestore Collections**: booking_requests, users, services
- **Business Logic**:
  - Fetch booking requests where patientId = current user
  - Enrich requests with doctor data (displayName, email)
  - Enrich requests with service data (title, description)
  - Display status badges: pending, accepted, rejected, cancelled
  - Display refund status: pending, processed, failed
  - Show rejection reason for declined requests
  - "Book Again" button for rejected requests (redirects to booking flow)
  - "View Appointment" link for accepted requests (links to appointment detail)

#### `/patient/requests/[id]`
- **Purpose**: Patient booking request detail
- **Accessible Role**: patient
- **Main Features**: Status, doctor info, service details, requested time, notes, rejection reason, refund status with timestamps
- **Data Dependencies**: Booking requests collection, users, services
- **Related Firestore Collections**: booking_requests, users, services
- **Business Logic**:
  - Fetch booking request by ID
  - Verify patientId matches current user
  - Load doctor information (displayName, email, phoneNumber)
  - Load service information (title, description, price)
  - Display requested time in user's timezone
  - Show rejection reason if status is "rejected"
  - Show refund status with timestamps (refundedAt, refundReason)
  - Show failure reason if refundStatus is "failed"

#### `/patient/notifications`
- **Purpose**: Patient notifications
- **Accessible Role**: patient
- **Main Features**: Notification list, mark as read, delete
- **Data Dependencies**: Notifications collection
- **Related Firestore Collections**: notifications
- **Business Logic**: Fetch notifications, update read status, delete notification

### DOCTOR ROUTES

#### `/doctor/dashboard`
- **Purpose**: Doctor home dashboard
- **Accessible Role**: doctor
- **Main Features**: Today's consultations, follow-ups, stats, quick actions
- **Data Dependencies**: Appointments, prescriptions, booking_requests, users
- **Related Firestore Collections**: appointments, prescriptions, booking_requests, users
- **Business Logic**:
  - Role-based redirect on load:
    - If user.role === "admin" → redirect to `/admin/dashboard`
    - If user.role === "patient" → redirect to `/patient/dashboard`
    - If user.isActive === false OR user.isSuspended === true → redirect to `/auth/login`
  - Fetch today's appointments (scheduled between 00:00 and 23:59 today)
  - Fetch follow-up appointments (where followUpRequired === true)
  - Fetch pending booking requests (status === "pending")
  - Enrich appointments and requests with patient data (displayName, email, phoneNumber)
  - Calculate stats:
    - `totalUpcoming`: Count of appointments with status "pending" or "confirmed"
    - `completedToday`: Count of today's appointments with status "completed"
    - `pendingPrescriptions`: Count of today's completed appointments without prescriptionId
    - `pendingRequests`: Count of booking requests with status "pending"
  - Greeting based on time of day (morning/afternoon/evening)
  - Display current date in "weekday, month day" format
  - Consultation join logic: Allow joining 15 minutes before appointment time up to 1 hour after

#### `/doctor/appointments`
- **Purpose**: Doctor appointments list
- **Accessible Role**: doctor
- **Main Features**: All appointments with filters, status updates
- **Data Dependencies**: Appointments collection
- **Related Firestore Collections**: appointments
- **Business Logic**: Fetch doctor's appointments, filter by status/date

#### `/doctor/appointments/[id]`
- **Purpose**: Doctor appointment detail
- **Accessible Role**: doctor
- **Main Features**: Appointment details, consultation notes, status updates, prescription creation
- **Data Dependencies**: Appointments, prescriptions, users
- **Related Firestore Collections**: appointments, prescriptions, users
- **Business Logic**:
  - Fetch appointment by ID
  - Load patient information (displayName, email, phoneNumber)
  - Load prescription if appointment has prescriptionId
  - Status update actions:
    - "confirmed" - Mark appointment as confirmed
    - "completed" - Mark appointment as completed
    - "cancelled" - Mark appointment as cancelled
  - Consultation notes:
    - Textarea for entering notes
    - Save button updates appointment.notes field
  - Consultation join logic:
    - Allow joining 15 minutes before appointment time
    - Allow joining up to 1 hour after appointment time
    - Video consultation link displayed if available
    - Join button opens external video platform (Google Meet/Zoom)
  - Prescription creation:
    - Link to `/doctor/prescriptions/create/[appointmentId]` if no prescription exists
    - Display prescription details if already created
  - Status badge colors:
    - confirmed: green
    - pending: yellow
    - completed: blue
    - cancelled: red

#### `/doctor/slots`
- **Purpose**: Doctor availability overview and block management with custom minimal calendar UI
- **Accessible Role**: doctor
- **Main Features**: Week navigation, day strip with availability indicators, selected day detail, stats cards, block time management
- **Data Dependencies**: Doctor availability collection, doctor blocks collection
- **Related Firestore Collections**: doctor_availability, doctor_blocks
- **Business Logic**:
  - Display custom week view with 7-day horizontal strip
  - Each day pill shows: weekday, date, availability indicator (green dot), block indicator (red dot)
  - Stats cards show: working days per week, upcoming blocks count, average slot duration
  - Selected day detail shows:
    - Working hours from doctor_availability (if configured)
    - Blocked time from doctor_blocks for that day
    - Delete blocks directly from day detail view
  - Add block form with start date/time, end date/time, optional reason
  - All upcoming blocks list at bottom of page
  - Mobile-responsive design (works down to 320px width)
  - Uses CSS transitions (no Framer Motion)
  - No FullCalendar dependency - custom React implementation

#### `/doctor/schedule`
- **Purpose**: Doctor weekly availability configuration with modular components
- **Accessible Role**: doctor
- **Main Features**: Configure weekly working hours, set off days, set consultation duration, copy schedule between days, preview upcoming availability
- **Data Dependencies**: Doctor availability collection, doctor blocks collection
- **Related Firestore Collections**: doctor_availability, doctor_blocks
- **Business Logic**:
  - Uses modular components from /components/doctor/schedule:
    - ScheduleHeader: Title, subtitle, save button with loading/saved states
    - WeeklyAvailabilityCard: Per-day configuration with accordion expansion
    - UnavailableBlockCard: Add/manage unavailable time blocks
    - AvailabilityPreview: Read-only 7-day availability preview
    - TimeRangeRow: Individual time range with start/end inputs and validation
  - Display 7 days of the week (Monday through Sunday)
  - Each day has:
    - "Off" toggle to mark entire day as unavailable
    - Duration input (in minutes) - applies to all time ranges for that day
    - Time ranges array (start time, end time in HH:MM format)
    - "Add Time Range" button to add multiple working periods per day
    - "Copy to [day]" buttons to copy schedule to other days
  - Create/update doctor_availability document for each day
  - Used by smart slot generation to create available booking slots
  - Validation: time ranges cannot overlap on same day
  - Mobile-responsive design with sticky save button on mobile
  - Uses CSS transitions (no Framer Motion)

#### `/doctor/requests`
- **Purpose**: Doctor booking request management with full status visibility and refund integration
- **Accessible Role**: doctor
- **Main Features**: View all requests (pending, accepted, rejected, cancelled), accept/reject/retry refund, styled rejection dialog
- **Data Dependencies**: Booking requests collection, users, services
- **Related Firestore Collections**: booking_requests, users, services
- **Business Logic**:
  - Fetch booking requests where doctorId = current user (all statuses)
  - Enrich requests with patient data (displayName, email, phoneNumber)
  - Enrich requests with service data (title, description)
  - Filter tabs: All, Pending, Accepted, Declined, Cancelled
  - Accept action:
    - Create appointment document in appointments collection
    - Update booking request status to "accepted"
    - Update booking request.appointmentId with new appointment ID
    - Create doctor_block for the accepted time to prevent double-booking
    - Redirect to appointment detail page
  - Reject action:
    - Open styled Dialog for rejection reason input (no window.prompt)
    - POST to /api/payments/refund with bookingRequestId and reason
    - Server marks booking_request status as "rejected", refundStatus as "pending"
    - Server schedules Razorpay refund in background via after() pattern
    - Response returns immediately with refundStatus: "pending"
  - Retry Refund action:
    - "Retry Refund" button appears for declined requests with refundStatus "pending" or "failed"
    - Calls /api/payments/refund with same bookingRequestId
    - Uses X-Razorpay-Idempotency-Key to prevent duplicate refunds
    - On success: refundFailureReason is cleared to prevent stale error display
  - Navigation: Added "Requests" link in doctor layout (desktop + mobile nav)
  - Reschedule action:
    - Update booking request status to "reschedule_requested"
    - Prompt for proposed time
    - Update booking request.proposedTime
    - Patient must approve reschedule proposal

#### `/doctor/patients`
- **Purpose**: Doctor patient list
- **Accessible Role**: doctor
- **Main Features**: Patient list with consultation history, follow-up status
- **Data Dependencies**: Appointments collection, users
- **Related Firestore Collections**: appointments, users
- **Business Logic**:
  - Fetch all appointments where doctorId = current user
  - Extract unique patientIds from appointments
  - Fetch user documents for each patient
  - Group appointments by patientId
  - For each patient, show:
    - Display name, email
    - Total consultation count
    - Last consultation date
    - Follow-up status (if any appointment has followUpRequired = true)
  - Click on patient to view detailed history

#### `/doctor/patients/[id]`
- **Purpose**: Doctor patient detail
- **Accessible Role**: doctor
- **Main Features**: Patient profile, consultation history, prescriptions, follow-ups
- **Data Dependencies**: Appointments, prescriptions, users
- **Related Firestore Collections**: appointments, prescriptions, users
- **Business Logic**:
  - Fetch patient user document (displayName, email, phoneNumber, emergencyContact, emergencyPhone)
  - Fetch all appointments where patientId = [id] AND doctorId = current user
  - Sort appointments by scheduledFor (descending)
  - For each appointment:
    - Load prescription if exists
    - Display appointment status, date/time, service
    - Display prescription link if created
    - Display follow-up status if required
  - Show follow-up appointments in dedicated section
  - Show prescription history in dedicated section

#### `/doctor/prescriptions/create/[appointmentId]`
- **Purpose**: Doctor prescription creation
- **Accessible Role**: doctor
- **Main Features**: Structured prescription form, real-time preview
- **Data Dependencies**: Appointments, prescriptions, users
- **Related Firestore Collections**: appointments, prescriptions, users
- **Business Logic**: Fetch appointment, load patient info, create prescription from structured data, update appointment with prescriptionId, redirect to prescription detail page

#### `/doctor/prescriptions/[id]`
- **Purpose**: Doctor prescription detail
- **Accessible Role**: doctor
- **Main Features**: Prescription display, PDF/PNG export, share link
- **Data Dependencies**: Prescriptions collection, users, appointments
- **Related Firestore Collections**: prescriptions, users, appointments
- **Business Logic**:
  - Fetch prescription by ID
  - Load patient information (displayName, email, phoneNumber)
  - Load doctor information (displayName)
  - Load appointment information (service, date/time)
  - Display prescription in branded Eye Aura template (same as preview)
  - PDF/PNG export buttons (placeholder - not implemented)
  - Share link generation (placeholder - not implemented)
  - Back to appointments button

#### `/doctor/profile`
- **Purpose**: Doctor profile management
- **Accessible Role**: doctor
- **Main Features**: Profile editing, account info
- **Data Dependencies**: Users collection
- **Related Firestore Collections**: users
- **Business Logic**:
  - Display current profile information:
    - Display name
    - Email (replaces User ID for better UX)
    - Role
    - Phone number
    - Created date
  - Editable fields:
    - Display name
    - Phone number
  - Save button updates user document in Firestore
  - Account information section with read-only fields

### BOOKING ROUTES

#### `/booking`
- **Purpose**: Booking flow entry with request/approval system
- **Accessible Role**: patient (requires auth)
- **Main Features**: Multi-step wizard: service selection, doctor selection, time selection (from availability), notes, confirmation
- **Data Dependencies**: Services collection, users collection (doctors), doctor availability collection
- **Related Firestore Collections**: services, users, doctor_availability
- **Business Logic**: Display services with doctors, load doctor availability, generate time slots, create booking request

#### `/booking/request-submitted/[id]`
- **Purpose**: Booking request confirmation page
- **Accessible Role**: patient
- **Main Features**: Request submitted confirmation, next steps, what to expect
- **Data Dependencies**: Booking requests collection
- **Related Firestore Collections**: booking_requests
- **Business Logic**: Display request details, explain approval process, provide navigation options

### ADMIN ROUTES

#### `/admin/dashboard`
- **Purpose**: Admin home dashboard
- **Accessible Role**: admin
- **Main Features**: Platform overview, stats, quick actions, recent activity
- **Data Dependencies**: Users, appointments, prescriptions, support tickets
- **Related Firestore Collections**: users, appointments, prescriptions, support_tickets
- **Business Logic**: Fetch platform statistics, display recent activity

#### `/admin/doctors`
- **Purpose**: Doctor management
- **Accessible Role**: admin
- **Main Features**: View doctors, search/filter, activate/deactivate
- **Data Dependencies**: Users collection
- **Related Firestore Collections**: users
- **Business Logic**: Fetch doctors by role, toggle active status

#### `/admin/doctors/invite`
- **Purpose**: Invite new doctors
- **Accessible Role**: admin
- **Main Features**: Create doctor invite with email
- **Data Dependencies**: Doctor invites collection, Resend email service
- **Related Firestore Collections**: doctor_invites
- **Business Logic**: Generate secure token, send email via Resend

#### `/admin/doctors/[id]`
- **Purpose**: Doctor detail and management
- **Accessible Role**: admin
- **Main Features**: Profile info, appointments, prescriptions, statistics
- **Data Dependencies**: Users, appointments, prescriptions, doctor slots
- **Related Firestore Collections**: users, appointments, prescriptions, doctor_slots
- **Business Logic**: Fetch doctor data, consultation history

#### `/admin/services`
- **Purpose**: Service management
- **Accessible Role**: admin
- **Main Features**: View services, enable/disable, pricing
- **Data Dependencies**: Services collection
- **Related Firestore Collections**: services
- **Business Logic**: Fetch services, toggle active status

#### `/admin/services/create`
- **Purpose**: Create new service
- **Accessible Role**: admin
- **Main Features**: Service creation form with doctor assignment
- **Data Dependencies**: Services collection, users collection (doctors)
- **Related Firestore Collections**: services, users
- **Business Logic**: Create service document, assign doctors via doctorIds array

#### `/admin/services/[id]/edit`
- **Purpose**: Edit service and assign doctors
- **Accessible Role**: admin
- **Main Features**: Service details editing, doctor assignment via checkboxes
- **Data Dependencies**: Services collection, users collection (doctors)
- **Related Firestore Collections**: services, users
- **Business Logic**: Update service document, assign/remove doctors via doctorIds array

#### `/admin/services/[id]`
- **Purpose**: Service detail and management
- **Accessible Role**: admin
- **Main Features**: Service details, edit, enable/disable, delete
- **Data Dependencies**: Services collection
- **Related Firestore Collections**: services
- **Business Logic**: Update or delete service

#### `/admin/appointments`
- **Purpose**: Appointment monitoring
- **Accessible Role**: admin
- **Main Features**: View all appointments, filter by status
- **Data Dependencies**: Appointments, users
- **Related Firestore Collections**: appointments, users
- **Business Logic**: Fetch all appointments, filter by status

#### `/admin/appointments/[id]`
- **Purpose**: Appointment detail
- **Accessible Role**: admin
- **Main Features**: Appointment details, participants, status, prescription
- **Data Dependencies**: Appointments, users, services, prescriptions
- **Related Firestore Collections**: appointments, users, services, prescriptions
- **Business Logic**: Fetch appointment with related data

#### `/admin/support`
- **Purpose**: Support ticket management
- **Accessible Role**: admin
- **Main Features**: View all tickets, filter by status, respond
- **Data Dependencies**: Support tickets, users
- **Related Firestore Collections**: support_tickets, users
- **Business Logic**: Fetch tickets, filter by status

#### `/admin/support/[id]`
- **Purpose**: Support ticket detail
- **Accessible Role**: admin
- **Main Features**: Ticket conversation, status updates, responses
- **Data Dependencies**: Support tickets, users
- **Related Firestore Collections**: support_tickets, users
- **Business Logic**: Fetch ticket, add responses, update status

#### `/admin/users`
- **Purpose**: User management
- **Accessible Role**: admin
- **Main Features**: View users, filter by role, manage status, role changes
- **Data Dependencies**: Users collection
- **Related Firestore Collections**: users
- **Business Rules**: Prevent self-demotion, prevent self-disable

#### `/admin/settings`
- **Purpose**: Platform configuration
- **Accessible Role**: admin
- **Main Features**: Platform branding, consultation platform, email settings
- **Data Dependencies**: Settings collection (future)
- **Related Firestore Collections**: settings (future)
- **Business Logic**: Configure platform-wide settings

#### `/admin/analytics`
- **Purpose**: Platform analytics
- **Accessible Role**: admin
- **Main Features**: Usage metrics, performance stats, platform health
- **Data Dependencies**: Users, appointments, prescriptions
- **Related Firestore Collections**: users, appointments, prescriptions
- **Business Logic**: Calculate metrics and statistics

#### `/admin/payments`
- **Purpose**: Admin payments and refunds dashboard
- **Accessible Role**: admin
- **Main Features**: Expandable cards with patient, doctor, service, full timeline, all transaction IDs, stats row, view toggle, filter pills, search
- **Data Dependencies**: Payments collection, users, services
- **Related Firestore Collections**: payments, users, services
- **Business Logic**:
  - Fetch all payments via paymentsService.getAll()
  - Enrich payments with patient data (displayName, email, phoneNumber)
  - Enrich payments with doctor data (displayName, email)
  - Enrich payments with service data (title, type, duration, price)
  - Stats row: Revenue (completed), Refunded (total), Refund Pending (count), Refund Failed (count), Net Revenue (revenue - refunded)
  - View toggle: Payments tab (filter by status), Refunds tab (filter by refund status)
  - Per-card details (expanded):
    - Patient section: Name, Email, Phone, UID
    - Doctor section: Name, Email, Phone, UID
    - Service section: Title, Type, Duration, Price
    - Timeline section: Payment created, Payment received, Requested time, Refunded at, Refund reason, Last updated, Payment method
    - Transaction IDs section: Order ID, Payment ID, Refund ID, Booking Request ID (monospace)
    - Failure banner: Only shown if refundStatus === "failed"
  - Search: by patient name, email, payment ID, order ID, refund ID
  - Card design: Collapsed view (patient, doctor, service, timestamp, badges, amount, chevron), Expanded view (tappable sections)
  - Responsive: Works from 320px upward
  - Visual cues: Red accent strip for failed refunds, amber border for pending refunds
  - Navigation: Added "Payments" link in admin layout

### INVITE ROUTES

#### `/invite/[token]`
- **Purpose**: Doctor invite acceptance
- **Accessible Role**: public (with valid token)
- **Main Features**: Token validation, onboarding, account creation
- **Data Dependencies**: Doctor invites collection, Firebase Auth
- **Related Firestore Collections**: doctor_invites, users
- **Business Logic**: Validate token, create doctor account, mark invite used

---

## 8. BUSINESS LOGIC FLOWS

### BOOKING FLOW (NEW REQUEST/APPROVAL SYSTEM)

**Patient selects service**
1. Patient navigates to `/booking`
2. Services fetched from `services` collection (filtered by `isActive: true`)
3. Patient selects service
4. Patient navigates to next step

**Selects doctor**
1. Doctors fetched from `users` collection filtered by service.doctorIds
2. Patient selects doctor
3. Doctor availability fetched from `doctor_availability` collection

**Selects time**
1. Smart slot generation from doctor availability
2. Time slots generated based on:
   - Weekly availability configuration
   - Blocked time ranges
   - Existing appointments
   - Consultation duration
3. Patient selects preferred time
4. Patient adds optional notes

**Submits request**
1. Booking request document created in `booking_requests` collection:
   - `patientId`: current user ID
   - `doctorId`: selected doctor
   - `serviceId`: selected service
   - `requestedTime`: selected time
   - `status`: "requested"
   - `notes`: patient notes (optional)
2. Patient redirected to `/booking/request-submitted/[requestId]`

**Doctor reviews request**
1. Doctor sees pending requests in dashboard
2. Doctor can accept, reject, or propose reschedule
3. If accept: appointment created and linked to request
4. If reject: rejection reason stored
5. If reschedule: proposed time stored with reason

**Patient notified**
1. Patient sees request status in dashboard
2. If accepted: appointment confirmed with details
3. If rejected: rejection reason displayed
4. If reschedule requested: proposed time displayed for approval

**Appointment confirmed**
1. When doctor accepts, appointment document created in `appointments` collection:
   - `patientId`: from request
   - `doctorId`: from request
   - `serviceId`: from request
   - `status`: "accepted"
   - `scheduledFor`: requestedTime or proposedTime
2. Request updated:
   - `status`: "accepted"
   - `appointmentId`: new appointment ID
3. Patient notified via notification system

**Doctor consultation**
1. Doctor views appointment in `/doctor/appointments/[id]`
2. Doctor can join consultation via Google Meet/Zoom link
3. Doctor adds consultation notes
4. Doctor marks appointment as completed

**Prescription generated**
1. Doctor navigates to `/doctor/prescriptions/create/[appointmentId]`
2. Prescription created and linked to appointment

### LEGACY BOOKING FLOW (DEPRECATED)

**Direct slot booking has been replaced with request/approval system**
- Previous flow used `doctor_slots` collection
- Patients selected from pre-created slots
- No approval process
- This flow is deprecated but may still exist in codebase for backward compatibility

### PRESCRIPTION FLOW

**Doctor fills structured form**
1. Doctor navigates to `/doctor/prescriptions/create/[appointmentId]`
2. Appointment loaded and patient information fetched (displayName, email, phoneNumber)
3. Structured form displayed with fields:
   - **Right Eye Card**: SPH, CYL, AXIS, VA (4-column grid layout)
   - **Left Eye Card**: SPH, CYL, AXIS, VA (4-column grid layout)
   - **Pupillary Distance Card**: PD input field
   - **Diagnosis Card**: Textarea for diagnosis
   - **Findings Card**: Textarea for examination findings
   - **Medications Card**: Textarea for prescribed medications
   - **Eye Drops Card**: Textarea for prescribed eye drops
   - **Exercises Card**: Textarea for recommended exercises
   - **Recommendations Card**: Textarea for recommendations
   - **Consultation Notes Card**: Textarea for consultation notes (4 rows)
   - **Follow-Up Card**: Checkbox for follow-up required + date picker (min date = today)
4. Real-time preview toggle button shows/hides branded prescription preview
5. Doctor saves prescription

**Real-time Prescription Preview Component**
- Branded Eye Aura template with gradient background (`from-[#F7F4EF] to-[#DDE5DF]`)
- **Header Section**:
  - Eye Aura logo (circle with "EA" text, gradient background)
  - "Eye Aura" title with "Digital Eye Wellness" subtitle
  - Right side: Current date + Doctor name
- **Patient Info Section**:
  - Patient display name
  - Patient email
  - Patient phone number (if provided)
- **Eye Examination Results Section**:
  - 2-column grid for Right Eye (OD) and Left Eye (OS)
  - Each eye shows: SPH, CYL, AXIS, VA with label-value pairs
  - PD displayed below if provided
- **Findings & Diagnosis Section**:
  - Findings (if provided)
  - Diagnosis (if provided)
- **Medications Section**: Text with whitespace preservation
- **Eye Drops Section**: Text with whitespace preservation
- **Exercises Section**: Text with whitespace preservation
- **Recommendations Section**: Text with whitespace preservation
- **Consultation Notes Section**: Text with whitespace preservation
- **Follow-Up Section** (if required):
  - Eye icon + "Follow-up Required: [date]"
- **Footer Section**:
  - "This prescription is generated by Eye Aura Digital Eye Wellness Platform."
  - "For questions, please contact your eye care provider."

**Prescription stored in Firestore**
1. Prescription document created in `prescriptions` collection:
   - `id`: Generated using `crypto.randomUUID()` (cryptographically secure)
   - `patientId`: From appointment
   - `doctorId`: From current user
   - `appointmentId`: From appointment
   - `rightEye`: { sph, cyl, axis, va }
   - `leftEye`: { sph, cyl, axis, va }
   - `pd`: Pupillary distance string
   - `diagnosis`: Diagnosis text
   - `findings`: Examination findings text
   - `medications`: Medications text
   - `eyeDrops`: Eye drops text
   - `exercises`: Exercises text
   - `recommendations`: Recommendations text
   - `consultationNotes`: Consultation notes text
   - `followUpRequired`: Boolean
   - `followUpDate`: Date object if required, undefined otherwise
   - `createdAt`: Current timestamp
   - `updatedAt`: Current timestamp
2. Appointment document updated with `prescriptionId` field
3. Doctor redirected to `/doctor/prescriptions/${prescription.id}` (detail page)
4. Notification would be sent to patient (placeholder - not implemented)

**PDF/PNG generated** (placeholder - architecture prepared)
1. Prescription data fetched from Firestore
2. PDF generation library would render branded template (not implemented)
3. PNG generation library would render branded template (not implemented)
4. Export options provided to patient and doctor (not implemented)

**Patient views/downloads/share link**
1. Patient navigates to `/patient/prescriptions/[id]`
2. Prescription displayed in branded template (same as preview)
3. PDF/PNG export buttons available (placeholder - not implemented)
4. Share link generated from prescription ID (placeholder - not implemented)
5. Share link would be `/prescriptions/[id]` (public page - not implemented)

### DOCTOR INVITE FLOW

**Admin invites new doctor**
1. Admin navigates to `/admin/doctors/invite`
2. Fills in doctor name, email, specialization, consultation types
3. System generates secure token with 7-day expiry
4. Invite document created in `doctor_invites` collection
5. Email sent via Resend with branded HTML template
6. Email contains invite link to `/invite/[token]`

**Doctor accepts invite**
1. Doctor clicks invite link from email
2. System validates token (exists, not used, not expired)
3. Doctor completes onboarding (sets password, profile)
4. Firebase Auth creates user account
5. User document created with `role = "doctor"`
6. Invite marked as used
7. Doctor redirected to doctor dashboard

### FOLLOW-UP FLOW

**Doctor recommends follow-up**
1. During consultation, doctor sets `followUpRequired: true`
2. Doctor sets `followUpDate` to desired date
3. Data stored in appointment document
4. Patient notified via notification system

**Patient dashboard updated**
1. Patient dashboard fetches appointments
2. Follow-up appointments highlighted separately
3. Follow-up date displayed prominently
4. Patient can book follow-up appointment

**Doctor dashboard updated**
1. Doctor dashboard fetches appointments
2. Follow-ups requiring attention displayed
3. Doctor can track which patients need follow-up
4. Doctor can view patient history before follow-up

**Appointment reminder lifecycle** (placeholder)
1. System would send reminder notifications before follow-up date
2. Reminder via notification system
3. Reminder via email (future implementation)

### SUPPORT FLOW

**Patient creates ticket**
1. Patient navigates to `/patient/support`
2. Patient fills ticket form:
   - Subject
   - Message
   - Priority (low/medium/high)
3. Ticket created in `support_tickets` collection:
   - `userId`: current user ID
   - `status`: "open"
   - `createdAt`: current timestamp
4. Patient redirected to `/patient/support/[id]`

**Doctor/admin review**
1. Doctor/admin navigates to support tickets (not yet implemented for doctor)
2. Views ticket details
3. Adds response:
   - Message
   - `authorId`: responder ID
   - `createdAt`: current timestamp
4. Ticket status updated to "in_progress" or "resolved"

**Status updated**
1. Status transitions: open → in_progress → resolved → closed
2. Patient notified of status changes
3. Responses displayed chronologically

---

## 9. PHASE STATUS

### COMPLETED

#### Phase 1 — Foundation
- Next.js 15 App Router setup
- TypeScript configuration
- Tailwind CSS integration
- Shadcn UI components
- Base folder structure
- Type definitions

#### Phase 2 — Public Website
- Landing page with hero section
- Services listing
- Service detail pages
- Auth-aware navigation
- Responsive design
- Premium UI/UX

#### Phase 3 — Auth & Backend
- Firebase Auth integration
- Email/password authentication
- Google OAuth authentication
- User registration with role assignment
- Authentication middleware
- Role-based routing
- Session management

#### Phase 4 — Booking Engine
- Service selection
- Slot selection with date filtering
- Booking confirmation flow
- Appointment creation
- Slot booking logic
- Timezone-safe slot management

#### Phase 5 — Patient Module
- Patient dashboard
- Appointments list and detail pages
- Prescriptions list and detail pages
- Support tickets creation and management
- Notifications system
- Patient profile management

#### Phase 6 — Doctor Module
- Doctor dashboard
- Appointments list and detail pages
- Slot management (create, block, edit, delete)
- Patient list and detail pages
- Prescription creation with structured form
- Prescription detail with export options
- Doctor profile management

#### Phase 7 — Admin Module
- Admin dashboard with platform overview
- Doctor management (invite, activate, deactivate)
- Doctor invite system with Resend email integration
- Service management (create, edit, enable/disable)
- Appointment monitoring and management
- Support ticket management
- User management with role governance
- Platform settings configuration
- Analytics dashboard
- Public signup restricted to patient role only

#### Phase 8 — Scheduling System Refactor
- Request/approval booking system replacing direct slot booking
- Weekly availability configuration for doctors
- Smart slot generation from working hours
- FullCalendar integration for doctor slots page
- Doctor block time management
- Booking requests service with accept/reject/reschedule
- Updated doctor dashboard with pending requests
- Updated patient dashboard with request status tracking
- Switch UI component for toggles
- Firestore collections: doctor_availability, doctor_blocks, booking_requests
- Smart slot generator utility

### PENDING

#### Phase 9 — Payments & Automation
- Payment gateway integration
- Automated reminders
- Invoice generation
- Payment history
- Refund handling

#### Phase 10 — Visual Acuity System
- Visual acuity test interface
- Test result storage
- Historical tracking
- Comparison tools

#### Phase 11 — Production Hardening
- Error monitoring
- Performance optimization
- Security hardening
- Scalability improvements
- Analytics integration

---

## 10. UI/UX DESIGN SYSTEM

### Typography
- **Font**: System fonts (San Francisco, Inter, Segoe UI)
- **Display Font**: Custom "font-display" class for headings
- **Headings**: Large, bold, primary color
- **Body**: Readable, muted color for secondary text

### Colors
- **Primary**: `#0F4F4B` (deep teal)
- **Secondary**: `#1A6B66` (lighter teal)
- **Background**: Gradient from `#F7F4EF` through `#DDE5DF` (warm neutrals)
- **Cards**: White with subtle borders and shadows
- **Text**: Primary color for headings, muted for body

### Spacing Philosophy
- Generous whitespace for calm, premium feel
- Rounded corners (rounded-xl, rounded-2xl) for softness
- Consistent padding/margin scales
- Mobile-first responsive spacing

### Animation Philosophy
- Subtle transitions using Framer Motion
- Smooth page transitions
- Hover effects on interactive elements
- Loading states with spinners
- No jarring animations

### Accessibility Philosophy
- High contrast ratios (WCAG AA compliant)
- Keyboard navigation support
- Focus states on interactive elements
- Semantic HTML structure
- Screen reader friendly
- Reduced motion support

### Eye Aura Visual Identity
- **Calm**: Soft colors, generous whitespace, smooth animations
- **Premium**: High-quality typography, subtle shadows, refined UI
- **Accessible**: WCAG compliant, keyboard navigation, screen reader support
- **Wellness-focused**: Warm color palette, calming gradients, organic shapes
- **Minimal**: Clean layouts, purposeful elements, no clutter

---

## 11. KNOWN LIMITATIONS

### Unfinished Modules
- Payment processing not integrated (Phase 8)
- Visual acuity system not implemented (Phase 9)

### Placeholder Areas
- PDF/PNG export for prescriptions (architecture prepared, not implemented)
- Shareable public prescription pages (not implemented)
- Email notifications (notification system in place, email not configured)
- Payment gateway integration (placeholder)

### Future Improvements
- Real-time appointment availability
- Calendar integration (Google Calendar, Outlook)
- Video call integration directly in platform
- Advanced prescription templates
- Multi-language support
- Dark mode

### Technical Debt
- Middleware uses simplified role checking (would decode token in production)
- Some components use `any` types where proper typing needed
- Error handling could be more granular
- Loading states could be more sophisticated

### Pending Optimizations
- Firestore query optimization
- Image optimization for avatars
- Bundle size reduction
- Server component optimization
- Caching strategy implementation

---

## 12. FUTURE ROADMAP

### Next Priorities
1. ~~Admin Module~~ (COMPLETED)
2. **Payment Integration** - Stripe/Razorpay integration, automated invoicing
3. **Email Notifications** - Transactional emails for key events
4. **Prescription Export** - PDF/PNG generation with jsPDF/html2canvas

### Admin Module Plans
- ~~User management interface~~ (COMPLETED)
- ~~Role management~~ (COMPLETED)
- ~~Service CRUD operations~~ (COMPLETED)
- ~~Revenue dashboard~~ (COMPLETED)
- ~~Appointment analytics~~ (COMPLETED)
- ~~System health monitoring~~ (COMPLETED)

### Payment Automation Plans
- Stripe integration for card payments
- Razorpay for Indian market
- Automated invoice generation
- Payment reminder emails
- Refund processing
- Payment history tracking

### Visual Acuity Plans
- Online visual acuity test interface
- Snellen chart display
- Test result storage
- Historical tracking
- Comparison with previous tests
- Doctor review interface

### Scaling Plans
- Database indexing optimization
- Query pagination for large datasets
- Caching layer for frequently accessed data
- CDN integration for static assets
- Load balancing for high traffic
- Geographic distribution for low latency

---

## 13. IMPORTANT ARCHITECTURAL DECISIONS

### WHY No Firebase Storage
**Decision**: Exclude Firebase Storage entirely from architecture

**Reasoning**:
- Reduced complexity in data management
- Reduced compliance burden (no file storage regulations)
- Simpler workflows (structured data only)
- Lower infrastructure costs
- Faster development time
- Easier data portability

**Trade-off**: Cannot store user-uploaded files (intentional design choice)

### WHY Doctor Invite System
**Decision**: Implement secure doctor invite flow with token-based onboarding

**Reasoning**:
- Prevents unauthorized doctor account creation
- Ensures only vetted doctors join the platform
- Provides audit trail for doctor onboarding
- Secure token-based authentication for invite acceptance
- Admin governance over doctor onboarding process
- Email verification via Resend for security

**Implementation**:
- `doctor_invites` Firestore collection with secure tokens
- 7-day token expiry for security
- Single-use tokens to prevent reuse
- Branded email templates via Resend
- `/invite/[token]` public route for onboarding
- Automatic role assignment (`doctor`) upon completion

**Trade-off**: Additional complexity in doctor onboarding, but necessary for security and governance

### WHY Resend for Email
**Decision**: Use Resend for transactional emails (doctor invites)

**Reasoning**:
- Modern email API with excellent deliverability
- Simple integration with existing codebase
- Branded HTML templates supported
- Reliable email delivery for critical onboarding
- Environment variable configuration
- Cost-effective for transactional volume

**Trade-off**: External service dependency, but justified for email reliability

### WHY Structured Prescriptions
**Decision**: Store prescriptions as structured Firestore data, not file uploads

**Reasoning**:
- Dynamic generation enables template consistency
- Easier to scale (no file storage management)
- Enables search and analytics on prescription data
- Template changes apply to all prescriptions automatically
- Simpler backup and migration
- No file versioning complexity

**Trade-off**: Requires template rendering logic (implemented)

### WHY Google Meet/Zoom
**Decision**: Use external video platforms instead of custom WebRTC

**Reasoning**:
- Avoid custom WebRTC complexity
- Faster MVP development
- Reliable, battle-tested platforms
- Better mobile support
- Familiar interface for users
- No need to maintain video infrastructure

**Trade-off**: Dependent on third-party platform availability

### WHY Text-Only Support
**Decision**: Support system is text-only, no file attachments

**Reasoning**:
- Simpler implementation
- No file storage requirements
- Faster ticket resolution
- Easier to search and analyze
- Reduced moderation needs
- Lower compliance burden

**Trade-off**: Cannot receive screenshots or files from users

### WHY Modular Architecture
**Decision**: Separate modules for public, patient, doctor, admin

**Reasoning**:
- Clear separation of concerns
- Easier to develop in parallel
- Simpler role-based routing
- Easier to maintain and extend
- Better code organization
- Reduces coupling between features

**Trade-off**: Some code duplication between similar features

### WHY Middleware-Based Routing
**Decision**: Use Next.js middleware for route protection

**Reasoning**:
- Centralized auth logic
- Automatic redirect handling
- Server-side route protection
- Better security (no client-side checks)
- Consistent behavior across app

**Trade-off**: Simplified role checking (would decode token in production)

---

## 14. DEVELOPMENT RULES

### Preserve Modular Architecture
- Keep module separation clear (public, patient, doctor, admin)
- Do not mix concerns between modules
- Use shared components from `/components`
- Keep business logic in `/services`

### Do Not Introduce Upload Systems
- No Firebase Storage integration
- No file upload components
- No attachment fields in forms
- All data must be structured Firestore data

### Preserve Eye Aura Design Language
- Maintain calm, premium aesthetic
- Use warm color palette (teal, neutrals)
- Rounded corners and soft shadows
- Generous whitespace
- Avoid enterprise dashboard feel
- Keep UI minimal and purposeful

### Use Structured Firestore Data
- All data must be typed in `/types/firestore.ts`
- Use converters for Firestore transformations
- Maintain data integrity with proper types
- No unstructured data storage

### Avoid Enterprise Dashboard Feel
- Keep dashboards clean and focused
- Use cards and sections instead of widgets
- Prioritize readability over data density
- Use soft colors and subtle borders
- Avoid overwhelming layouts

### Maintain Type Safety
- Use TypeScript for all new code
- Avoid `any` types where possible
- Update type definitions when schemas change
- Run typecheck before committing

### Follow Existing Patterns
- Use existing component patterns
- Follow established naming conventions
- Maintain consistent file structure
- Reuse existing services and hooks

### Test Before Deploying
- Run TypeScript validation
- Test key user flows
- Verify role-based access
- Check responsive design

---

## 15. CHANGELOG SYSTEM

### IMPORTANT
This changelog section must be updated with every significant change to the platform.

### Changelog Format

```
## [Date] - [Change Description]

### Changed
- [Specific changes made]

### Added
- [New features added]

### Removed
- [Features or code removed]

### Fixed
- [Bugs fixed]

### Technical
- [Technical changes, dependencies, etc.]

### Breaking Changes
- [Changes that break existing functionality]
```

### Changelog Entries

#### 2025-01-14 - Phase 6 Doctor Module Completion
**Changed**
- Added doctor role to middleware
- Updated prescription types (removed pd from EyeData, added to PrescriptionDocument)
- Changed medications/eyeDrops/exercises/recommendations from arrays to strings
- Fixed Badge variant props across doctor pages
- Fixed icon imports (Block → Ban)

**Added**
- `/doctor/dashboard` - Doctor overview with consultations and stats
- `/doctor/appointments` - Doctor appointments list with filters
- `/doctor/appointments/[id]` - Appointment detail with status updates
- `/doctor/slots` - Slot management with create/block/delete
- `/doctor/patients` - Patient list with consultation history
- `/doctor/patients/[id]` - Patient detail with full history
- `/doctor/prescriptions/create/[appointmentId]` - Structured prescription form
- `/doctor/prescriptions/[id]` - Prescription detail with export options
- `/doctor/profile` - Doctor profile settings
- Doctor layout with navigation

**Fixed**
- TypeScript errors in doctor pages
- Prescription converter to include pd field
- getByDoctorId service call with required parameters
- Appointment prescription loading logic

**Technical**
- Updated middleware to include doctor routes
- Fixed timezone service imports
- Removed unused functions from Firestore rules
- Added Firestore index for appointments (patientId, scheduledFor)

---

#### 2026-05-15 - Service-Doctor Assignment & Index Updates

**Changed**
- Updated booking flow to include doctor selection step
- Services now display associated doctors in patient dashboard and booking flow
- Enhanced service creation page to include doctor assignment
- Updated service converter to handle missing doctorIds with fallback to empty array

**Added**
- `doctorIds` field to ServiceDocument type to track which doctors can provide each service
- `/admin/services/[id]/edit` - Edit service page with doctor assignment via checkboxes
- Textarea UI component for multi-line input
- Checkbox UI component for selection lists with Radix UI
- Firestore indexes for doctor_slots (doctorId + startTime ASC)
- Firestore indexes for appointments (status + scheduledFor ASC, doctorId + scheduledFor DESC)

**Fixed**
- Fixed doctor_slots index: changed startTime order from DESC to ASC to match query requirements
- Fixed checkbox infinite loop in edit service page by using onCheckedChange instead of onChange
- Fixed all TypeScript build errors including BookingState doctor field
- Fixed missing doctorIds handling in admin and booking pages
- Resolved Firestore index errors across all pages

**Technical**
- Updated BookingState interface to include doctor field
- Updated service converter to safely handle doctorIds with fallback
- Installed @radix-ui/react-checkbox package
- All Firestore indexes now match actual query patterns used in application

---

#### 2026-05-16 - Phase 8 Scheduling System Refactor

**Changed**
- Refactored booking flow from direct slot booking to request/approval system
- Updated booking page to use bookingRequestsService instead of bookingService
- Changed step titles to reflect request/approval process
- Updated ConfirmationStep to display requested time instead of specific slot
- Updated doctor dashboard to show pending booking requests with accept/reject/reschedule actions
- Updated patient dashboard to show booking requests with status tracking
- Updated middleware for role-based authentication redirects
- Marked doctor_slots collection as deprecated in favor of availability-based system

**Added**
- `/doctor/schedule` - Weekly availability configuration UI for doctors
- `/doctor/requests` - Doctor booking request management page
- `/patient/requests` - Patient booking requests management page
- `/booking/request-submitted/[id]` - Booking request confirmation page
- `doctor_availability` Firestore collection - Weekly availability configuration
- `doctor_blocks` Firestore collection - Doctor blocked time ranges
- `booking_requests` Firestore collection - Patient booking requests
- `bookingRequestsService` - Service for booking requests CRUD operations
- `doctorAvailabilityService` - Service for doctor availability CRUD operations
- `doctorBlocksService` - Service for doctor blocks CRUD operations
- `SlotGenerator` utility class - Smart slot generation from working hours
- FullCalendar integration for doctor slots page with availability and blocks display
- Switch UI component for toggles using Radix UI
- TimeSelectionStep component - Time selection based on doctor availability
- Request status badges and icons for tracking request lifecycle
- Firestore indexes for new collections (doctor_availability, doctor_blocks, booking_requests)

**Fixed**
- Updated TypeScript types for new scheduling system (DoctorAvailabilityDocument, DoctorBlockDocument, BookingRequestDocument)
- Added converters for new collection types
- Fixed middleware role-based redirects for proper routing
- Updated appointment status to include "accepted" for request-approved bookings

**Technical**
- Installed FullCalendar packages (@fullcalendar/react, @fullcalendar/daygrid, @fullcalendar/timegrid, @fullcalendar/interaction)
- Installed @radix-ui/react-switch for Switch component
- Created smart slot generation utility that considers availability, blocks, and existing appointments
- Implemented request/approval workflow with status transitions (requested → accepted/rejected/reschedule_requested)
- Updated dashboards to show real-time request status and pending actions

**Breaking Changes**
- Booking flow no longer uses direct slot selection - patients submit requests that require doctor approval
- doctor_slots collection is deprecated - new system uses doctor_availability + smart generation
- Appointment status now includes "accepted" in addition to existing statuses

---

## 16. FINAL AUDIT

### Verification Checklist

#### All Routes Documented
- ✅ Public routes: `/`, `/services`, `/services/[slug]`
- ✅ Auth routes: `/auth/login`, `/auth/signup`
- ✅ Patient routes: `/patient/dashboard`, `/patient/profile`, `/patient/appointments`, `/patient/appointments/[id]`, `/patient/prescriptions`, `/patient/prescriptions/[id]`, `/patient/support`, `/patient/support/[id]`, `/patient/notifications`, `/patient/requests`
- ✅ Doctor routes: `/doctor/dashboard`, `/doctor/appointments`, `/doctor/appointments/[id]`, `/doctor/slots`, `/doctor/schedule`, `/doctor/requests`, `/doctor/patients`, `/doctor/patients/[id]`, `/doctor/prescriptions/create/[appointmentId]`, `/doctor/prescriptions/[id]`, `/doctor/profile`
- ✅ Booking routes: `/booking`, `/booking/request-submitted/[id]`
- ✅ Admin routes: `/admin/dashboard`, `/admin/doctors`, `/admin/doctors/invite`, `/admin/doctors/[id]`, `/admin/services`, `/admin/services/create`, `/admin/services/[id]/edit`, `/admin/services/[id]`, `/admin/appointments`, `/admin/appointments/[id]`, `/admin/support`, `/admin/support/[id]`, `/admin/users`, `/admin/settings`, `/admin/analytics`
- ✅ Invite routes: `/invite/[token]`

#### All Roles Documented
- ✅ patient role documented
- ✅ doctor role documented
- ✅ admin role documented
- ✅ Role logic flow documented
- ✅ Middleware protection documented

#### All Collections Documented
- ✅ users collection documented
- ✅ appointments collection documented
- ✅ doctor_availability collection documented
- ✅ doctor_blocks collection documented
- ✅ booking_requests collection documented
- ✅ doctor_slots collection documented (deprecated)
- ✅ prescriptions collection documented
- ✅ notifications collection documented
- ✅ support_tickets collection documented
- ✅ payments collection documented
- ✅ services collection documented
- ✅ doctor_invites collection documented

#### All Flows Documented
- ✅ Booking flow documented
- ✅ Prescription flow documented
- ✅ Follow-up flow documented
- ✅ Support flow documented

#### All Phases Documented
- ✅ Phase 1-8 marked as completed
- ✅ Phase 9-11 marked as pending
- ✅ Phase descriptions provided

#### No Outdated Upload/Storage Assumptions
- ✅ Documentation explicitly states NO Firebase Storage
- ✅ Documentation explicitly states NO file uploads
- ✅ Documentation explicitly states prescriptions are generated from structured data
- ✅ Documentation explicitly states support system is text-only

#### Documentation Matches Implementation
- ✅ Routes match actual file structure
- ✅ Collections match actual Firestore schema
- ✅ Types match actual TypeScript definitions
- ✅ Flows match actual business logic
- ✅ Architecture matches actual folder structure

### Conclusion
This document accurately reflects the current state of the Eye Aura platform as of Phase 8 completion. All architectural decisions, business logic, and implementation details are documented for future reference by developers and AI systems.

---

**DOCUMENT MAINTENANCE**
This document must be updated whenever:
- New routes are added
- New collections are added
- Business logic changes
- New phases are completed
- Architecture decisions change
- Type definitions change
- Role logic changes

**LAST UPDATED**: 2026-05-22
**CURRENT PHASE**: Phase 9 In Progress — Payments Complete, UI Polish & Error Hardening
**LAST COMMIT AT UPDATE**: `1059ef2` (profile image fallback fix)
**SESSION CHANGES**: `(uncommitted as of 2026-05-22 20:34 IST)` — hero gap, button alignment, TypeError fix, EA error codes, nav cleanup, tech section copy

---

#### 2026-05-21 — Email Verification Flow (commit `90ff27c`)

**Added**
- Complete email verification gate: unverified users (`emailVerified: false`) cannot access `/patient/*`, `/doctor/*`, `/admin/*`, `/booking/*`
- `/auth/verify-email` page — premium calm UI with "I've verified my email" button, resend cooldown (60s), sign out option
- `reloadUser()` method in auth context to refresh Firebase Auth state without full sign-out
- `sendVerificationEmail()` method with 60-second resend cooldown
- Auto-redirect to dashboard when `emailVerified` becomes `true`
- Email verification enforcement in patient, doctor, admin layouts (client-side)

**Changed**
- Signup flow: after account creation, user is redirected to `/auth/verify-email` (not dashboard)
- Google Sign-In accounts bypass verification (auto-verified)
- Login flow: if `emailVerified: false` → redirect to `/auth/verify-email`

**Fixed**
- Unverified users could previously access protected routes; now blocked at layout level
- Verification page works correctly for both email/password and Google auth paths

**Technical**
- `/auth/verify-email` is a public route (does not require verified session)
- Mobile-responsive down to 320px
- No technical jargon shown to users

---

#### 2026-05-21 — Doctor Invite Flow UX Fix (commit `cfead01`)

**Fixed**
- Doctor invite acceptance page (`/invite/[token]`): email field is now read-only (pre-filled from invite, cannot be changed)
- Verification email is sent automatically after doctor onboarding completes
- Doctor role override prevented: invite flow no longer allows role field to be changed by the client

**Changed**
- Onboarding form email input switched from editable to `readOnly` with pre-filled value from invite document
- Post-onboarding: Firebase verification email triggered via `sendEmailVerification()` before redirect

---

#### 2026-05-21 — Rebrand: New Logo + Doctor Invite Role Override Fix (commit `e0a4a68`)

**Changed**
- Eye Aura logo updated across NavBar, auth pages, and doctor invite flow with new branded asset
- Doctor invite role override hardened: server-side `/api/doctor-onboarding/complete` now rejects any client attempt to set a role other than `"doctor"`
- NavBar updated with new logo image component

**Fixed**
- Edge case where a client could submit a modified role during onboarding; server now enforces `role = "doctor"` unconditionally for invite-based signups

---

#### 2026-05-21 — Landing Page Full Redesign (commit `7f673b3`)

**Added**
- Modular homepage architecture: each section is now a standalone component in `/modules/home/sections/`
  - `NavBar.tsx` — Sticky transparent→frosted nav with mobile hamburger
  - `HeroSection.tsx` — Animated hero with doctor photo, bullet points, dual CTAs, social proof
  - `FounderStory.tsx` — Founder quote layout with portrait and clinic backstory cards
  - `ProblemSection.tsx` — Problem/solution framing
  - `HowItWorks.tsx` — Step-by-step booking process
  - `ServicesSection.tsx` — Dynamic services from Firestore
  - `GenerationsSection.tsx` — Age group targeting cards
  - `WhyEyeAura.tsx` — Differentiators vs traditional clinics
  - `TechnologySection.tsx` — 4-card platform technology grid (dark background)
  - `TestimonialsSection.tsx` — Patient testimonials
  - `FinalCTA.tsx` — Auth-aware final call to action
  - `FooterSection.tsx` — Footer with links and branding
- `LandingPage` wrapper component in `/modules/home/landing-page.tsx`
- Auth-aware CTAs: if logged in → role dashboard; if not → `/booking`
- `ServicesSection` fetches live services from Firestore with doctor count

**Changed**
- Landing page (`app/page.tsx`) now delegates to `LandingPage` component
- Removed Pricing section from homepage
- NavBar "Book Free Consult" → "Book Consultation" (removed "Free" wording)
- Color palette: warm neutrals `#f7f3ee` background, teal `#0f4f4b` primary

**Technical**
- `framer-motion` used for scroll-triggered `whileInView` animations on section entries
- All sections are `"use client"` components with motion

---

#### 2026-05-21 — Prescription Download Fix (commit `ba3ccd3`)

**Fixed**
- Prescription download button on patient prescription detail page (`/patient/prescriptions/[id]`) was routing incorrectly — now correctly navigates to `/prescriptions/[id]/pdf`
- Client-side errors in prescription detail page suppressed (guard added for null prescription before rendering)

**Technical**
- `handleDownload` function updated from broken route to `/prescriptions/${prescription?.id}/pdf`

---

#### 2026-05-22 — Profile: Remove Image Upload (commit `e5ef2ca`)

**Removed**
- Image upload button and `Camera` icon from patient profile page (`/patient/profile`)
- Upload-related state (`fileInputRef`, upload handler) removed
- `authService` import removed (was only used for upload)

**Changed**
- Profile image section now shows Google photo (`user.photoURL`) if available
- If no `photoURL` exists, no image is shown (clean empty state)

**Fixed**
- Broken camera upload UI removed — feature was never functional

---

#### 2026-05-22 — Profile: Image Fallback with Error Handling (commit `1059ef2`)

**Added**
- `imgError` state on patient profile page to track image load failure
- `onError` handler on `<img>` tag: if Google photo URL fails to load, `imgError` is set to `true`
- Fallback `User` icon (lucide-react) rendered inside a teal-tinted rounded container when `imgError === true` or `user.photoURL` is absent

**Changed**
- Profile image logic: `user.photoURL && !imgError` → show `<img>`; else → show `<User>` icon placeholder
- Fallback is always shown — no broken image states

---

#### 2026-05-22 — Current Session (uncommitted)

**Fixed**
- `AppointmentDetailPage` (`/patient/appointments/[id]`): runtime TypeError crash when viewing completed appointments — root cause was operator precedence bug in `canReschedule`:
  ```ts
  // BEFORE (crashes when appointment is null/completed):
  const canReschedule = isUpcoming && appointment.status === "pending" || appointment.status === "confirmed";
  // AFTER:
  const canReschedule = !!appointment && isUpcoming && (appointment.status === "pending" || appointment.status === "confirmed");
  ```
- Book Appointment empty-state button in `/patient/appointments` was left-aligned — fixed by adding `inline-flex` to the `<Link>` wrapper so `text-center` on the parent correctly centers it
- Hero section had excessive bottom padding creating large gap before "Our Story" section — reduced `pb-16/pb-28` to `pb-6/pb-10`

**Added**
- `lib/errors.ts` — centralised EA error code system with format `EA-[DOMAIN]-[NUMBER]`:
  - `EA-AUTH-001..007`: Authentication errors
  - `EA-PAT-001..003`: Patient module
  - `EA-APT-001..005`: Appointment errors
  - `EA-BKG-001..005`: Booking flow
  - `EA-PRE-001..005`: Prescriptions
  - `EA-PAY-001..003`: Payments
  - `EA-SVC-001..003`: Services
  - `EA-SUP-001..004`: Support tickets
  - `EA-DOC-001..006`: Doctor module
  - `EA-ADM-001..006`: Admin module
  - `EA-API-001..004`: API routes
  - `EA-GEN-001..003`: General/unknown
  - `eaError(code, error)` helper: logs full error internally, returns safe user-facing message — users never see Firebase internals
  - `eaMessage(code)` helper: returns formatted user message string
- EA error codes applied to all patient and booking pages (replacing raw `console.error` and `alert()` calls):
  - `patient/prescriptions` → `EA-PRE-001`
  - `patient/prescriptions/[id]` → `EA-PRE-002`
  - `patient/profile` → `EA-PAT-003` (alert replaced with inline error UI)
  - `patient/dashboard` → `EA-PAT-001`
  - `patient/appointments` → `EA-APT-001`
  - `patient/appointments/[id]` → `EA-APT-002`, `EA-APT-003`
  - `patient/requests` → `EA-BKG-001`
  - `patient/support` → `EA-SUP-001`, `EA-SUP-002`
  - `patient/support/[id]` → `EA-SUP-003`, `EA-SUP-004`
  - `patient/notifications` → `EA-GEN-001`
  - `booking/page` → `EA-BKG-001`
  - `booking/confirmation/[id]` → `EA-BKG-003`
  - `booking/reschedule/[id]` → `EA-BKG-004`
  - `booking/request-submitted/[id]` → `EA-BKG-003`
  - `auth/signup` → `EA-AUTH-002` (Google sign-in error no longer leaks Firebase message)

**Changed**
- `NavBar.tsx`: Removed "Pricing" link (section no longer exists on homepage)
- `TechnologySection.tsx`: Card 03 changed from "AI-Assisted Pre-Screening" → "Detailed Patient Intake Form" → **"Doctor-Reviewed Booking Approval"** (reflects real platform feature: request/approval booking system)
- `patient/profile`: `alert()` for save errors replaced with inline red error banner showing EA code
- Phase 9 status updated: Payments (Razorpay) complete, error hardening in progress

**Technical**
- `lib/errors.ts` is the single source of truth for all error codes — add new codes here only
- Pattern: `eaError(EA.DOMAIN_NUM, error)` for catch blocks; return value used for user-facing state
- `@theme` rule lint warning in `globals.css` is a known CSS-in-JS false positive, not a runtime error

---

## 17. STABILIZATION PASS - MAY 16, 2026

### Overview
A comprehensive stabilization, refactor, and synchronization pass was completed to fix inconsistencies across the entire Eye Aura booking, scheduling, dashboard, patient, doctor, navigation, Firestore, and documentation systems.

### Changes Implemented

#### Doctor Invitation Architecture Refactor (Major)
**Problem**: The doctor invite flow was architecturally unsafe with inconsistent lifecycle, permission errors, "email already in use" issues, no resend system, and fragile onboarding. Client-side Firebase Auth operations caused permission errors, and there was no proper invite state management.

**Solution**: Complete redesign of the invitation system with proper lifecycle management, server-side onboarding, and secure role assignment.

**New Invite Status System**:
- Replaced boolean `used` with enum `InviteStatus`: "pending" | "opened" | "completed" | "expired" | "cancelled" | "failed"
- Each status has specific business logic and UI states
- Automatic expiration detection and handling

**New DoctorInviteDocument Schema**:
```typescript
{
  id,
  email,
  role: "doctor",
  status: InviteStatus,
  token,
  expiresAt,
  invitedBy,
  invitedByName,
  openedAt?,
  completedAt?,
  resendCount,
  specialization?,
  consultationTypes?,
  existingUser: boolean,
  createdUserId?,
  errorReason?,
  createdAt,
  updatedAt
}
```

**Server-Side Onboarding Architecture**:
- Created `/api/doctor-onboarding/complete` route for secure onboarding
- Client submits form → Server validates token → Server checks email ownership → Server creates/updates user → Server assigns role → Server marks invite completed
- All operations happen atomically with proper error handling
- Client cannot directly assign roles or create doctor users

**Existing Email Handling**:
- Case A: Email doesn't exist → Proceed normally
- Case B: Email exists, role ≠ doctor → Block with clear error
- Case C: Email exists, role = doctor, onboarding incomplete → Allow resume
- Case D: Email exists, onboarding complete → Redirect to dashboard

**Firestore Security Rules Updates**:
- `doctor_invites`: Admin full control, public read-only for invite acceptance
- `users`: Only patient signup allowed client-side, doctor creation requires server-side API
- Client cannot set `role`, `isActive`, `isSuspended`, or `onboarding` fields

**Admin Invite Management**:
- Created `/admin/doctors/invites` page with sections:
  - Pending Invites (with resend, copy link, cancel actions)
  - Opened Invites (incomplete onboarding)
  - Completed Invites (linked to doctor accounts)
  - Failed Invites (with error diagnostics)
- Real-time invite lifecycle tracking
- Expiration countdown display

**Resend Invite System**:
- Created `/api/doctor-invites/resend` API route
- Generates new secure token
- Invalidates old token (replay protection)
- Extends expiration by 7 days
- Increments resendCount
- Sends fresh email with new link

**Invite Token Security**:
- Cryptographically secure random tokens
- Single-use token lifecycle
- Automatic expiration support
- Replay protection through token regeneration on resend

**Files Updated**:
- `types/firestore.ts` - DoctorInviteDocument schema with new status system
- `services/firestore/doctor-invites.service.ts` - Status management, resend, cancel methods
- `app/api/doctor-onboarding/complete/route.ts` - Server-side onboarding API
- `app/api/doctor-invites/resend/route.ts` - Resend invite API
- `firestore.rules` - Updated security rules for doctor_invites and users
- `app/admin/doctors/invite/page.tsx` - Updated to use new schema
- `app/invite/[token]/page.tsx` - Updated to use server-side API
- `app/admin/doctors/invites/page.tsx` - New invite management page

#### Authentication & Onboarding Architecture Refactor (Major)
**Problem**: The system incorrectly used `onboardingCompleted` to determine user active/disabled status, creating accidental coupling between admin, patient, and doctor modules. Admin users appeared "disabled" because onboardingCompleted was false, but onboarding could only be completed in patient flow.

**Solution**: Complete separation of account status from onboarding state with role-isolated flows.

**User Schema Changes**:
- **Added** `isActive: boolean` - Explicit account activation status
- **Added** `isSuspended: boolean` - Account suspension status
- **Added** `onboarding.patientCompleted: boolean` - Patient-specific onboarding
- **Added** `onboarding.doctorCompleted: boolean` - Doctor-specific onboarding
- **Deprecated** `onboardingCompleted` (computed from role-specific flags for backward compatibility)

**Status Logic**:
- **Active**: `isActive === true && isSuspended !== true`
- **Disabled**: `isActive === false`
- **Suspended**: `isSuspended === true`

**Module Isolation**:
- **Admin**: No onboarding required - immediately functional after login
- **Doctor**: Independent onboarding flow with doctorCompleted flag
- **Patient**: Independent onboarding flow with patientCompleted flag

**Role-Based Login Gating**:
- Middleware handles authentication only (no Firebase Admin SDK calls in edge runtime)
- Page components handle role-specific redirects:
  - Admin → `/admin/dashboard`
  - Doctor → `/doctor/dashboard`
  - Patient → `/patient/dashboard`
- Suspended/disabled users redirected to login

**Dashboard Access Rules**:
- All roles can access their dashboard immediately (no onboarding gate)
- Optional non-blocking banners shown for incomplete onboarding
- Banner message: "Complete your profile for a better consultation experience"

**Security Rules Updates**:
- Users can only update own profile fields (not role, isActive, isSuspended)
- Admins can update all fields including role, isActive, isSuspended
- New users must have `isActive: true` and `isSuspended: false`
- Email and phone validation maintained

**Files Updated**:
- `types/firestore.ts` - UserDocument schema
- `types/auth.ts` - UserProfile schema
- `services/auth/auth.service.ts` - getUserProfile, createUserProfile, updateUserProfile
- `services/firestore/converters.ts` - userConverter
- `lib/auth-server.ts` - getServerSession
- `app/patient/dashboard/page.tsx` - Role-based redirect, onboarding banner
- `app/doctor/dashboard/page.tsx` - Role-based redirect, onboarding banner
- `app/admin/dashboard/page.tsx` - Role-based redirect
- `app/admin/users/page.tsx` - Status badges using isActive/isSuspended
- `app/admin/doctors/page.tsx` - Status badges using isActive/isSuspended
- `app/admin/doctors/[id]/page.tsx` - Status badges using isActive/isSuspended
- `app/patient/profile/page.tsx` - Profile status display
- `app/invite/[token]/page.tsx` - Doctor onboarding with new schema
- `firestore.rules` - Updated user collection rules
- `middleware.ts` - Clarified role handling (page-level redirects)

#### Booking Flow Fixes
- **Booking Request Status**: Changed from "requested" to "pending" for consistency
- **Appointment Creation**: When doctor accepts a booking request, an appointment document is now automatically created
- **Calendar Blocking**: Accepted booking requests now create doctor_blocks to prevent double-booking
- **Service Duration**: Calendar blocking now uses actual service duration instead of hardcoded 30 minutes

#### Data Display Fixes
- **Patient Name Resolution**: Doctor dashboard now resolves patientId to patient displayName and email
- **Booking Request Display**: Patient appointments page now shows booking requests with all statuses (pending, accepted, rejected, reschedule_requested)
- **Date Formatting**: Improved timezone-safe date formatting across dashboards

#### Navigation Fixes
- **Persistent Home Navigation**: Added Home button to patient, doctor, and admin module sidebars and mobile navs
- **Bottom Navigation Refactor**: New order - Dashboard, Appointments, Home (CENTER, elevated), Prescriptions/Calendar, My Account
- **Active State Fixes**: Fixed active state detection in all navigation components
- **Booking Flow Navigation**: Bottom nav no longer hides during booking flow

#### Dashboard Fixes
- **Patient Dashboard Empty States**: Now checks for both upcoming appointments AND pending booking requests before showing empty state
- **Booking Request Indicator**: Patient dashboard shows count of pending booking requests with link to view them

#### Profile Fixes
- **Emergency Contact Fields**: Added emergencyContact and emergencyPhone to UserProfile type
- **Profile Save**: Fixed patient profile save to include emergency contact fields
- **Auth Service**: Updated getUserProfile to read emergency contact fields from Firestore

#### Firestore Security Rules
- **Production Safety**: Enhanced rules with data validation (email format, phone format)
- **Status Transition Controls**: Added strict rules for appointment and booking request status changes
- **Role Protection**: Prevented role escalation and unauthorized field changes
- **Data Validation**: Added null checks, date validation, and amount validation

#### Firestore Indexes
- **Composite Indexes**: Added composite indexes for complex queries (patientId + scheduledFor + status)
- **Booking Request Indexes**: Added doctorId + status + createdAt composite index
- **Appointment Indexes**: Added patientId + scheduledFor + status and doctorId + scheduledFor + status

#### Type System
- **BookingRequestStatus**: Changed "requested" to "pending" in type definition
- **AppointmentStatus**: Removed duplicate statuses (requested, accepted, rejected, reschedule_requested) - these now only exist in booking_requests
- **UserProfile**: Added emergencyContact and emergencyPhone fields

### Status
All high-priority stabilization tasks completed. The booking lifecycle now works end-to-end with proper status transitions, calendar blocking, data enrichment, and navigation consistency.

---

#### 2026-05-20 - Doctor Module Documentation Update

**Changed**
- Updated PRESCRIPTION FLOW section with detailed form structure, real-time preview component layout, Firestore storage details
- Updated prescriptions collection documentation with complete field details including example values and crypto.randomUUID() ID generation
- Updated `/doctor/dashboard` route with detailed business logic (role-based redirects, stats calculation, consultation join logic)
- Updated `/doctor/appointments/[id]` route with detailed business logic (status updates, consultation notes, join logic, status badge colors)
- Updated `/doctor/slots` route with FullCalendar integration details
- Updated `/doctor/schedule` route with weekly availability configuration details
- Updated `/doctor/requests` route with booking request management details
- Updated `/doctor/patients` route with patient list logic
- Updated `/doctor/patients/[id]` route with patient detail logic
- Updated `/doctor/prescriptions/create/[appointmentId]` route with business logic
- Updated `/doctor/prescriptions/[id]` route with display logic
- Updated `/doctor/profile` route with profile management details

**Added**
- Detailed prescription form field structure (Right Eye, Left Eye, PD, Diagnosis, Findings, Medications, Eye Drops, Exercises, Recommendations, Consultation Notes, Follow-Up)
- Real-time Prescription Preview component detailed layout (Header, Patient Info, Eye Examination Results, Findings & Diagnosis, Medications, Eye Drops, Exercises, Recommendations, Consultation Notes, Follow-Up, Footer)
- Doctor dashboard role-based redirect logic (admin → admin, patient → patient, suspended → login)
- Doctor dashboard stats calculation (totalUpcoming, completedToday, pendingPrescriptions, pendingRequests)
- Consultation join time window specification (15 minutes before to 1 hour after)
- FullCalendar configuration details for doctor slots page
- Weekly availability configuration details with copy schedule functionality
- Booking request management details (accept, reject, reschedule actions)
- Patient list grouping and enrichment logic
- Patient detail page consultation history and prescription history sections

**Technical**
- Documented crypto.randomUUID() for prescription ID generation
- Documented prescription redirect flow after save
- Documented appointment prescriptionId update on prescription creation
- Documented doctor_block creation on booking request acceptance
- Updated LAST UPDATED date to 2026-05-20
