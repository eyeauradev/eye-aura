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
- ✅ Phase 8: Scheduling System Refactor (request/approval system, weekly availability, smart slot generation, FullCalendar integration)

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
- **Framer Motion** - Animations for smooth UI transitions

### Architectural Reasoning
- **Next.js App Router**: Modern React framework with server components, optimized performance, and built-in routing
- **TypeScript**: Prevents runtime errors, improves developer experience, enables better IDE support
- **Tailwind CSS**: Rapid UI development, consistent design system, easy customization
- **Shadcn UI**: Accessible, customizable components that match design requirements
- **Firebase Auth**: Managed authentication service with OAuth support
- **Firestore**: Scalable NoSQL database with real-time capabilities, no server infrastructure needed
- **Framer Motion**: Smooth animations for premium feel without complex CSS

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
3. Firebase Auth creates user account
4. User document created in `users/{uid}` collection with `role = "patient"` (automatic)
5. User redirected to `/patient/dashboard`

**IMPORTANT**: Public signup ALWAYS creates patient accounts. Doctor accounts can only be created through admin invite flow.

### Login Flow
1. User navigates to `/auth/login`
2. Enters email and password (or clicks Google sign-in)
3. Firebase Auth authenticates credentials
4. Session cookie (`__session`) set
5. User document fetched from Firestore
6. User redirected to role-appropriate dashboard

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
- `id` (string) - Prescription ID
- `appointmentId` (string) - Reference to appointments collection
- `patientId` (string) - Reference to users collection
- `doctorId` (string) - Reference to users collection
- `rightEye` (object) - Right eye examination data
  - `sph` (string) - Spherical power
  - `cyl` (string) - Cylindrical power
  - `axis` (string) - Axis
  - `va` (string) - Visual acuity
- `leftEye` (object) - Left eye examination data (same structure as rightEye)
- `pd` (string) - Pupillary distance
- `findings` (string) - Examination findings
- `diagnosis` (string) - Diagnosis
- `medications` (string) - Prescribed medications (text-based)
- `eyeDrops` (string) - Prescribed eye drops (text-based)
- `recommendations` (string) - Recommendations (text-based)
- `exercises` (string) - Recommended exercises (text-based)
- `followUpRequired` (boolean) - Whether follow-up is needed
- `followUpDate` (timestamp, optional) - Follow-up date
- `consultationNotes` (string, optional) - Additional consultation notes
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- One-to-one with appointments
- Many-to-one with users (patient)
- Many-to-one with users (doctor)

**Role Access**:
- Patients can read their own prescriptions
- Doctors can read prescriptions they created
- Admins can read all prescriptions

**Business Rules**:
- Prescriptions are generated from structured data, not file uploads
- PDF/PNG export generated from Firestore data
- Shareable links generated from prescription ID
- No file attachments allowed

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
**Purpose**: Store payment information (reserved for future implementation)

**Key Fields**:
- `id` (string) - Payment ID
- `appointmentId` (string) - Reference to appointments collection
- `patientId` (string) - Reference to users collection
- `doctorId` (string) - Reference to users collection
- `amount` (number) - Payment amount
- `currency` (string) - Currency code
- `status` (string) - "pending" | "completed" | "failed" | "refunded"
- `paymentMethod` (string) - Payment method
- `transactionId` (string, optional) - External transaction ID
- `createdAt` (timestamp) - Creation date
- `updatedAt` (timestamp) - Last update date

**Relationships**:
- One-to-one with appointments
- Many-to-one with users (patient)
- Many-to-one with users (doctor)

**Role Access**:
- Patients can read their own payments
- Doctors can read payments for their appointments
- Admins can read all payments

**Business Rules**:
- Payment processing reserved for future phases
- Currently placeholder for payment integration

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
- **Business Logic**: Firebase Auth signup, user document creation

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
- **Business Logic**: Fetch ticket, add response to ticket

#### `/patient/notifications`
- **Purpose**: Patient notifications
- **Accessible Role**: patient
- **Main Features**: Notification list, mark as read, delete
- **Data Dependencies**: Notifications collection
- **Related Firestore Collections**: notifications
- **Business Logic**: Fetch notifications, update read status, delete notification

#### `/patient/requests`
- **Purpose**: Patient booking requests management
- **Accessible Role**: patient
- **Main Features**: View all booking requests, see status changes, respond to reschedule proposals
- **Data Dependencies**: Booking requests collection
- **Related Firestore Collections**: booking_requests
- **Business Logic**: Fetch patient's requests, display status, handle reschedule responses

### DOCTOR ROUTES

#### `/doctor/dashboard`
- **Purpose**: Doctor home dashboard
- **Accessible Role**: doctor
- **Main Features**: Today's consultations, follow-ups, stats, quick actions
- **Data Dependencies**: Appointments, prescriptions
- **Related Firestore Collections**: appointments, prescriptions
- **Business Logic**: Fetch today's appointments, follow-ups, calculate stats

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
- **Data Dependencies**: Appointments, prescriptions
- **Related Firestore Collections**: appointments, prescriptions
- **Business Logic**: Fetch appointment, update status, add notes, create prescription

#### `/doctor/slots`
- **Purpose**: Doctor availability management with FullCalendar integration
- **Accessible Role**: doctor
- **Main Features**: Calendar view of availability and blocks, block time ranges, delete blocks
- **Data Dependencies**: Doctor availability collection, doctor blocks collection
- **Related Firestore Collections**: doctor_availability, doctor_blocks
- **Business Logic**: Display availability and blocks on FullCalendar, create/delete blocks

#### `/doctor/schedule`
- **Purpose**: Doctor weekly availability configuration
- **Accessible Role**: doctor
- **Main Features**: Configure weekly working hours, set off days, set consultation duration, copy schedule between days
- **Data Dependencies**: Doctor availability collection
- **Related Firestore Collections**: doctor_availability
- **Business Logic**: Create/update/delete weekly availability configuration

#### `/doctor/requests`
- **Purpose**: Doctor booking request management
- **Accessible Role**: doctor
- **Main Features**: View pending requests, accept/reject/reschedule requests
- **Data Dependencies**: Booking requests collection
- **Related Firestore Collections**: booking_requests
- **Business Logic**: Fetch pending requests, accept (create appointment), reject (with reason), propose reschedule

#### `/doctor/patients`
- **Purpose**: Doctor patient list
- **Accessible Role**: doctor
- **Main Features**: Patient list with consultation history, follow-up status
- **Data Dependencies**: Appointments collection
- **Related Firestore Collections**: appointments, users
- **Business Logic**: Fetch all patients doctor has consulted with, group by patient

#### `/doctor/patients/[id]`
- **Purpose**: Doctor patient detail
- **Accessible Role**: doctor
- **Main Features**: Patient profile, consultation history, prescriptions, follow-ups
- **Data Dependencies**: Appointments, prescriptions, users
- **Related Firestore Collections**: appointments, prescriptions, users
- **Business Logic**: Fetch patient info, consultation history, prescriptions

#### `/doctor/prescriptions/create/[appointmentId]`
- **Purpose**: Doctor prescription creation
- **Accessible Role**: doctor
- **Main Features**: Structured prescription form, real-time preview
- **Data Dependencies**: Appointments, prescriptions
- **Related Firestore Collections**: appointments, prescriptions
- **Business Logic**: Fetch appointment, create prescription from structured data, update appointment

#### `/doctor/prescriptions/[id]`
- **Purpose**: Doctor prescription detail
- **Accessible Role**: doctor
- **Main Features**: Prescription display, PDF/PNG export, share link
- **Data Dependencies**: Prescriptions collection
- **Related Firestore Collections**: prescriptions
- **Business Logic**: Fetch prescription, generate PDF/PNG (placeholder), generate share link

#### `/doctor/profile`
- **Purpose**: Doctor profile management
- **Accessible Role**: doctor
- **Main Features**: Profile editing, account info
- **Data Dependencies**: Users collection
- **Related Firestore Collections**: users
- **Business Logic**: Update user profile information

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
2. Structured form displayed with fields:
   - Right eye: SPH, CYL, AXIS, VA
   - Left eye: SPH, CYL, AXIS, VA
   - PD: pupillary distance
   - Diagnosis, findings
   - Medications (text)
   - Eye drops (text)
   - Exercises (text)
   - Recommendations (text)
   - Consultation notes (text)
   - Follow-up required toggle
   - Follow-up date (if required)
3. Real-time preview shows branded prescription layout
4. Doctor saves prescription

**Prescription stored in Firestore**
1. Prescription document created in `prescriptions` collection with structured data
2. Appointment document updated with `prescriptionId`
3. Notification sent to patient

**PDF/PNG generated** (placeholder - architecture prepared)
1. Prescription data fetched from Firestore
2. PDF generation library would render branded template
3. PNG generation library would render branded template
4. Export options provided to patient and doctor

**Patient views/downloads/share link**
1. Patient navigates to `/patient/prescriptions/[id]`
2. Prescription displayed in branded template
3. PDF/PNG export buttons available (placeholder)
4. Share link generated from prescription ID
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

**LAST UPDATED**: 2026-05-16
**CURRENT PHASE**: Phase 8 Complete
**NEXT PHASE**: Phase 9 - Payments & Automation
