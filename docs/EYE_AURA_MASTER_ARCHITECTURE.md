# EYE AURA — MASTER ARCHITECTURE DOCUMENT
> **Single Source of Truth — Complete Engineering Memory**
> For AI agents, engineers, designers, and future contributors. A new developer reading this should fully understand the project without needing any other source.

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Tree](#3-folder-tree)
4. [Routing Architecture](#4-routing-architecture)
5. [Role System](#5-role-system)
6. [Firestore Architecture](#6-firestore-architecture)
7. [Data Flow Maps](#7-data-flow-maps)
8. [UI/UX Design System](#8-uiux-design-system)
9. [Component Architecture](#9-component-architecture)
10. [Service Layer](#10-service-layer)
11. [Scheduling System](#11-scheduling-system)
12. [Payment Architecture](#12-payment-architecture)
13. [Prescription System](#13-prescription-system)
14. [Visual Acuity Assessment System](#14-visual-acuity-assessment-system)
15. [Authentication System](#15-authentication-system)
16. [Environment Variables](#16-environment-variables)
17. [Deployment](#17-deployment)
18. [Known Limitations](#18-known-limitations)
19. [Future Roadmap](#19-future-roadmap)
20. [Engineering Rules](#20-engineering-rules)
21. [Changelog](#21-changelog)

---

<!-- SECTION:1 -->
# 1. PROJECT OVERVIEW

Eye Aura is a **premium tele-optometry platform** built for the Indian market. Patients consult eye care specialists entirely online — for routine consultations, prescription renewals, digital eye strain assessments, and visual acuity checks.

## Product Vision
> "Eye care, whenever and wherever you are."

Eye Aura is purpose-built for eye wellness — not a generic telemedicine wrapper. It deliberately avoids the cluttered, enterprise-dashboard aesthetic common in healthcare software. Instead it prioritizes:

- **Calm visual language** — soft warm neutrals, deep teal, warm gold
- **Minimal cognitive load** — one action per screen, no information overload
- **Premium feel** — thoughtful typography, glassmorphism accents, smooth transitions
- **Mobile-first reality** — Indian patients predominantly use mobile

## Target Audience

| Audience | Description |
|---|---|
| **Patients** | Adults seeking convenient eye consultations without hospital visits |
| **Doctors** | Optometrists and ophthalmologists managing digital consultation practices |
| **Admins** | Platform operators managing doctors, services, and system health |

## Core Architectural Decisions

| Decision | Reasoning |
|---|---|
| Request/approval booking model | Doctors control acceptance — reduces no-shows and gives professional authority |
| Invite-only doctors | Quality control over practitioner panel. Admins invite via time-limited tokens. |
| No file uploads or S3 | Prescriptions generated from structured Firestore data via Puppeteer. Reproducible from data. |
| Online payment at booking (Razorpay) | Payment collected up-front before booking request reaches the doctor. Verified server-side via HMAC signature. booking_request created only after verification. |
| No video infrastructure | Consultations on Google Meet / Zoom. Eye Aura manages scheduling only. |
| Firebase-only backend | Zero server infrastructure. Firestore + Admin SDK in API routes covers all needs. |
| Removed FullCalendar | ~200KB bundle, unusable on mobile. Replaced with custom React calendar. |
| Removed Framer Motion | Being phased out. CSS transitions replace it throughout. |

<!-- SECTION:2 -->
# 2. TECH STACK

| Technology | Version | Role | Why Chosen |
|---|---|---|---|
| **Next.js** | 15.5.18 | Full-stack React framework | App Router, API Routes, edge middleware, Vercel-native deployment |
| **TypeScript** | 6.x | Type safety | Every Firestore document has a corresponding TypeScript interface in `/types/firestore.ts` |
| **Tailwind CSS** | 4.x | Utility-first styling | CSS-first config via `@theme inline` in `globals.css` — no separate config file needed |
| **Shadcn UI** | Latest | Component library | Radix UI primitives — accessible, headless, fully overridable |
| **Firebase Auth** | 12.x | Authentication | Email/password + Google OAuth; session managed via `__session` cookie |
| **Firestore** | 12.x | Primary database | Real-time NoSQL; all structured data lives here |
| **Firebase Admin SDK** | 13.x | Server-side privileged operations | Bypasses Firestore security rules; used exclusively in Next.js API routes |
| **Puppeteer** | 25.x | PDF generation | Headless Chromium renders prescription HTML → A4 PDF stream |
| **Resend** | 4.x | Transactional email | Doctor invite emails. `RESEND_API_KEY` is server-side only — never exposed to browser |
| **date-fns** | 4.x | Date utilities | Slot generation, formatting, timezone-safe date math |
| **Lucide React** | 1.x | Icons | Consistent icon set used throughout all components |
| **react-hook-form** | 7.x | Form management | Lightweight, performant form state |
| **Zod** | 4.x | Schema validation | Runtime validation for forms and API inputs |
| **UUID** | 14.x | ID generation | Used in select services for document IDs |

## Dependencies Installed But Being Removed

| Package | Status | Action |
|---|---|---|
| `framer-motion` | In `package.json` but removed from all scheduling/doctor components | Remove after grep confirms zero remaining imports |
| `@fullcalendar/*` | In `package.json` but removed from all UI | Remove in next dependency cleanup — custom React calendar replaces it |

<!-- SECTION:3 -->
# 3. FOLDER TREE

```
/eyeaura
├── /app                                    # Next.js App Router — all pages and API routes
│   ├── globals.css                         # Design tokens, font @face, utility classes
│   ├── layout.tsx                          # Root layout: wraps all pages in AuthProvider
│   ├── loading.tsx                         # Root loading spinner
│   ├── page.tsx                            # Homepage / marketing landing
│   ├── /auth
│   │   ├── /login/page.tsx                 # Email + Google OAuth sign-in
│   │   └── /signup/page.tsx                # Patient self-registration ONLY
│   ├── /booking
│   │   ├── page.tsx                        # 5-step booking wizard
│   │   ├── /confirmation/[id]/page.tsx     # Post-booking appointment view
│   │   ├── /request-submitted/[id]/page.tsx
│   │   └── /reschedule/[id]/page.tsx
│   ├── /patient                            # Patient module (role-guarded)
│   │   ├── layout.tsx                      # Redirects if role != patient
│   │   ├── /dashboard/page.tsx
│   │   ├── /appointments/page.tsx
│   │   ├── /appointments/[id]/page.tsx
│   │   ├── /prescriptions/page.tsx
│   │   ├── /prescriptions/[id]/page.tsx
│   │   ├── /profile/page.tsx
│   │   ├── /notifications/page.tsx
│   │   ├── /support/page.tsx + /[id]/page.tsx
│   │   └── /assessment/page.tsx + /visual-acuity/page.tsx
│   ├── /doctor                             # Doctor module (role-guarded)
│   │   ├── layout.tsx                      # Redirects if role != doctor
│   │   ├── /dashboard/page.tsx
│   │   ├── /appointments/page.tsx
│   │   ├── /appointments/[id]/page.tsx
│   │   ├── /patients/page.tsx
│   │   ├── /patients/[id]/page.tsx
│   │   ├── /prescriptions/[id]/page.tsx
│   │   ├── /prescriptions/create/[appointmentId]/page.tsx
│   │   ├── /profile/page.tsx
│   │   ├── /schedule/page.tsx              # Weekly availability config (modular components)
│   │   └── /slots/page.tsx                 # Custom week-view calendar + block management
│   ├── /admin                              # Admin module (role-guarded)
│   │   ├── layout.tsx
│   │   ├── /dashboard/page.tsx
│   │   ├── /doctors/page.tsx + /invite/page.tsx + /[id]/page.tsx
│   │   ├── /appointments/page.tsx + /[id]/page.tsx
│   │   ├── /services/page.tsx + /create/page.tsx + /[id]/edit/page.tsx
│   │   ├── /assessments/page.tsx            # Vision assessment assignment UI
│   │   ├── /users/page.tsx
│   │   ├── /support/page.tsx + /[id]/page.tsx
│   │   ├── /analytics/page.tsx
│   │   └── /settings/page.tsx
│   ├── /invite/[token]/page.tsx            # Doctor invite acceptance (PUBLIC — no auth)
│   ├── /prescription
│   │   ├── layout.tsx                      # Minimal layout — no nav (Puppeteer target)
│   │   └── /print/[id]/page.tsx            # HTML template rendered by Puppeteer
│   └── /api
│       ├── /doctor-onboarding/complete/route.ts  # Admin SDK: creates doctor Auth + Firestore doc
│       ├── /doctor-invites/route.ts              # Invite management
│       ├── /emails/doctor-invite/route.ts        # Sends invite email via Resend
│       ├── /assessments/assign/route.ts          # Vision assessment assignment API
│       └── /prescription/pdf/route.tsx           # Puppeteer: renders print page → PDF stream
│
├── /components
│   ├── section-container.tsx               # max-w-7xl responsive wrapper
│   ├── /ui                                 # Shadcn UI components (button, card, badge, etc.)
│   ├── /doctor/schedule                    # Modular scheduling components
│   │   ├── ScheduleHeader.tsx              # Page header + save button with status states
│   │   ├── WeeklyAvailabilityCard.tsx      # Per-day accordion: off toggle, duration, time ranges
│   │   ├── TimeRangeRow.tsx                # Single HH:mm start/end row with remove button
│   │   ├── UnavailableBlockCard.tsx        # Add block form (date + start/end + reason)
│   │   └── AvailabilityPreview.tsx         # Read-only 7-day schedule summary
│   └── /prescription
│       └── PrescriptionTemplate.tsx        # Branded prescription HTML layout
│
├── /modules
│   └── /visual-acuity                      # Visual acuity assessment module
│       ├── AcuitySession.tsx               # Unified orchestrator for assessment flow
│       ├── SnellenRenderer.tsx             # SVG optotype renderer with calibrated sizing
│       ├── TestTypeSelector.tsx            # Far/Near/Both selection UI
│       ├── DurationSelector.tsx            # Timer duration selection (2s/3s/4s)
│       ├── types.ts                       # TestType, TimerDuration, AcuityTestResult, EyeAcuityResult
│       ├── optotypes.ts                   # SVG path definitions for all 9 optotypes
│       ├── snellen-data.ts                 # Far vision chart data + utility functions
│       ├── /near
│       │   └── near-vision-data.ts         # Near vision Jaeger chart data
│       ├── /engine
│       │   ├── useLetterTimer.ts          # RAF-driven per-letter timer + advancement
│       │   ├── useAssessmentProgress.ts   # Pure derivation of cross-eye global progress
│       │   └── useVisionProgression.ts     # Line progression with indexRef/failsRef
│       └── /steps
│           ├── WelcomeStep.tsx             # Assessment introduction
│           ├── InstructionsStep.tsx        # Testing instructions
│           ├── CalibrationStep.tsx         # Card calibration UI + pxPerMm calculation
│           ├── TestingStep.tsx             # Far vision test (3m)
│           ├── NearTestingStep.tsx         # Near vision test (40cm)
│           └── ResultsStep.tsx             # Results display with level + notation
│
├── /contexts
│   └── auth-context.tsx                    # AuthProvider + useAuth() hook
│
├── /services
│   ├── /firebase
│   │   ├── client.ts                       # getFirebaseApp(), getFirebaseAuth(), getFirebaseDb()
│   │   ├── admin.ts                        # getAdminAuth(), getAdminDb() — SERVER ONLY
│   │   └── config.ts                       # Firebase client config from NEXT_PUBLIC_* vars
│   ├── /auth
│   │   └── auth.service.ts                 # signIn, signUp, signOut, getUserProfile, updateProfile
│   ├── /firestore
│   │   ├── index.ts                        # Barrel: exports all Firestore service singletons
│   │   ├── converters.ts                   # Firestore Timestamp ↔ JS Date converters per collection
│   │   ├── users.service.ts
│   │   ├── appointments.service.ts
│   │   ├── booking-requests.service.ts     # acceptRequest() creates appointment + doctor_block
│   │   ├── doctor-availability.service.ts
│   │   ├── doctor-blocks.service.ts
│   │   ├── doctor-slots.service.ts         # LEGACY — superseded by availability model
│   │   ├── doctor-invites.service.ts       # CLIENT: reads only. All writes via Admin SDK.
│   │   ├── prescriptions.service.ts
│   │   ├── services.service.ts
│   │   ├── vision-assessments.service.ts   # Vision assessment CRUD
│   │   └── support-tickets.service.ts
│   ├── /booking
│   │   ├── booking.service.ts
│   │   ├── slot-management.ts
│   │   └── transaction.service.ts
│   ├── /email
│   │   └── email.service.ts                # Client: calls /api/emails/* (hides RESEND_API_KEY)
│   └── /notifications
│       └── notifications.service.ts
│
├── /lib
│   ├── utils.ts                            # cn() = clsx + tailwind-merge
│   ├── auth-server.ts                      # getServerSession(), requireRole(), isAdmin()
│   ├── firebase-admin.ts                   # Alternative admin init (used by PDF route)
│   └── send-email.ts                       # Server-side Resend email sender
│
├── /types
│   ├── auth.ts                             # UserRole, UserProfile, AuthState, credentials
│   ├── firestore.ts                        # ALL Firestore document interfaces + enums
│   ├── booking.ts                          # BookingState, BookingStep, SlotGenerationConfig
│   ├── consultation.ts
│   └── notifications.ts
│
├── /modules/home                           # Public homepage marketing sections
├── /hooks                                  # Custom React hooks
├── /docs                                   # Documentation (this file lives here)
│
├── middleware.ts                           # Edge middleware: cookie check + route protection
├── firestore.rules                         # Firestore security rules (deployed via Firebase CLI)
├── firestore.indexes.json                  # Composite index definitions
├── firebase.json                           # Firebase CLI configuration
├── .firebaserc                             # Project alias: eyeaura-3e33f
└── .env.example                            # Template for all required env vars
```

<!-- SECTION:4 -->
# 4. ROUTING ARCHITECTURE

## Route Access Matrix

| Route | Who Can Access | Auth Required | Notes |
|---|---|---|---|
| `/` | Everyone | No | Public homepage |
| `/auth/login` | Everyone | No | Redirects to dashboard if already logged in |
| `/auth/signup` | Everyone | No | Creates patient accounts ONLY |
| `/invite/[token]` | Everyone | **No** | Doctor invite acceptance — fully public |
| `/booking` | Patient | Yes | 5-step booking wizard |
| `/booking/confirmation/[id]` | Patient | Yes | After booking confirmed |
| `/booking/request-submitted/[id]` | Patient | Yes | After request submitted |
| `/patient/assessment` | Patient | Yes | Assessment dashboard (ready/completed/expired) |
| `/patient/assessment/visual-acuity` | Patient | Yes | Visual acuity test UI (requires valid ?id=) |
| `/patient/*` | Patient | Yes | Full patient module |
| `/doctor/*` | Doctor | Yes | Full doctor module |
| `/admin/assessments` | Admin | Yes | Vision assessment assignment UI |
| `/admin/*` | Admin | Yes | Full admin module |
| `/prescription/print/[id]` | Internal | No | Puppeteer render target — not linked in UI |
| `/api/doctor-onboarding/complete` | Public (token-auth) | No | Uses invite token, not session |
| `/api/assessments/assign` | Doctor/Admin | Yes | Vision assessment assignment API |
| `/api/prescription/pdf` | Patient/Doctor | Implicit | Should be auth-gated (known gap) |
| `/api/emails/doctor-invite` | Admin | Should check | Currently open — known gap |

## Middleware (`middleware.ts`) — Edge Runtime

```
Every incoming request
  ↓
Is the path public? (/auth/*, /, /invite/*, /prescription/print/*, /api/*)
  → YES: allow through
  ↓
Does the request have an __session (or auth-token) cookie?
  → NO + protected path: redirect to /auth/login
  → YES + /auth/* path: redirect to /patient/dashboard
  ↓
NextResponse.next()
```

**Critical architectural constraint**: Middleware runs in the **Edge Runtime**, which does NOT support Node.js APIs — therefore Firebase Admin SDK cannot run here. Middleware can only inspect cookies, not verify tokens or check roles. Role-based access control is enforced in layout components using `useAuth()`.

## Role Guard Pattern (used in every module layout)

```typescript
// e.g. /app/doctor/layout.tsx
const { user, loading } = useAuth();
useEffect(() => {
  if (!loading && (!user || user.role !== "doctor")) {
    router.push("/auth/login");
  }
}, [user, loading]);
if (loading || !user) return <LoadingSpinner />;
```

## Key Page Details

### `/invite/[token]` — Doctor Invite Acceptance
- Fully public — no Firebase auth required
- Reads `doctor_invites` by token (Firestore rules allow public reads on this collection)
- All Firestore writes happen server-side via `POST /api/doctor-onboarding/complete`
- After server success: client calls `signInWithEmail()` for auto sign-in → `/doctor/dashboard`

### `/booking` — Patient Booking Wizard (5 Steps)
1. **Service** — `servicesService.getAll()` (public Firestore read)
2. **Doctor** — filtered by `service.doctorIds`, fetches user profiles
3. **Time** — slot generation happens **client-side** from `doctor_availability` data (no extra reads)
4. **Notes** — optional 500-char textarea
5. **Confirm** — creates `booking_requests` document (NOT an appointment yet)

### `/api/prescription/pdf` — PDF Generation Route
- Verifies prescription exists via Admin SDK
- Launches Puppeteer, navigates to `/prescription/print/{id}`
- Sets A4 viewport (794×1123px), generates PDF, returns binary stream
- **Known gap**: Not auth-gated — improvement needed

<!-- SECTION:5 -->
# 5. ROLE SYSTEM

## Three Roles

```typescript
// /types/auth.ts
type UserRole = "patient" | "doctor" | "admin"
```

| Role | How Created | Capabilities |
|---|---|---|
| **patient** | Self-registration or Google OAuth | Book appointments, view prescriptions, raise support tickets |
| **doctor** | Admin invite + server-side onboarding API only | Manage schedule, accept/reject bookings, create prescriptions |
| **admin** | Manually set in Firestore / Firebase Console | Full platform access — all data, all operations |

## Role Assignment Rules

- **Patient**: `role: "patient"` is always set by `authService.signUp()` and `authService.signInWithGoogle()`. There is no way to create a non-patient account via the public auth flow.
- **Doctor**: `role: "doctor"` is only ever set server-side in `/api/doctor-onboarding/complete` via Firebase Admin SDK. Client Firestore writes cannot set this role due to security rules (`request.resource.data.role == "patient"` required on create).
- **Admin**: No automated creation flow. Must be set directly in Firebase Console or by running a one-time Admin SDK script.

## Role Override Rules

Only one cross-role promotion is permitted:

| Existing Role | Invited as Doctor | Outcome |
|---|---|---|
| `patient` | ✅ Allowed | Role upgraded to `doctor`; Auth password updated to the one entered in the invite form; `onboarding.doctorCompleted` set to `true` |
| `doctor` | ✅ Allowed | No role change; onboarding fields updated if incomplete |
| `admin` | ❌ Blocked | Rejected at both the admin invite form (pre-check) and the onboarding API. Error returned. |
| Other / unknown | ❌ Blocked | Rejected by onboarding API |

**Enforcement is double-layered:**
1. **Admin invite form** (`/admin/doctors/invite`) — calls `usersService.getByEmail()` before creating the invite. If the email belongs to an `admin`, the form displays an error and no invite document is created.
2. **Onboarding API** (`/api/doctor-onboarding/complete`) — the server-side Admin SDK handler checks `userData.role` and enforces the same rules, providing a final authoritative gate regardless of what the client sends.

## Onboarding State

Each user has an `onboarding` sub-object in their Firestore document:

```typescript
onboarding: {
  patientCompleted: boolean;  // true after patient fills /patient/profile (name, phone, emergency contact)
  doctorCompleted: boolean;   // true after doctor completes invite acceptance
}
```

`UserProfile.onboardingCompleted` is computed as `patientCompleted || doctorCompleted`.

- Patients with `patientCompleted: false` → prompt to complete profile at `/patient/profile`
- `authService.updateUserProfile()` automatically sets `patientCompleted: true` when profile fields are updated

## Server-Side Role Utilities (`/lib/auth-server.ts`)

```typescript
getServerSession()     // reads __session cookie → verifies via adminAuth → returns UserProfile | null
requireAuth()          // throws "Unauthorized" if no session
requireRole(roles[])   // throws "Forbidden" if role not in list
isAdmin()              // returns boolean — safe, no throws
isDoctor()             // returns boolean
isPatient()            // returns boolean
```

These utilities use `getAdminAuth()` and `getAdminDb()` and are safe to call from any Next.js API route or Server Component. They cannot be used in Client Components or middleware.

<!-- SECTION:6 -->
# 6. FIRESTORE ARCHITECTURE

**Project ID**: `eyeaura-3e33f` | **Database**: `(default)` | **Mode**: Native Firestore

All dates stored as Firestore `Timestamp`; converted to JS `Date` by type converters in `services/firestore/converters.ts`.

## Collection: `users`

**Document ID**: Firebase Auth UID

```typescript
interface UserDocument {
  id: string;               // = Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  role: "patient" | "doctor" | "admin";
  phoneNumber?: string;
  emergencyContact?: string;   // Patient emergency contact name
  emergencyPhone?: string;     // Patient emergency contact phone
  isActive: boolean;           // false = deactivated account
  isSuspended: boolean;        // true = suspended by admin
  onboarding: {
    patientCompleted: boolean;
    doctorCompleted: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Security**: Read: any signed-in user | Create: own patient doc only (role must be "patient") | Update: owner (cannot change role/isActive/isSuspended) or admin | Delete: admin

---

## Collection: `appointments`

**Document ID**: `{patientId}_{doctorId}_{timestamp}`

```typescript
interface AppointmentDocument {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  slotId: string;              // Legacy field — empty string in new bookings
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "cancellation_requested";
  notes?: string;
  prescriptionId?: string;     // Linked after prescription created
  paymentId?: string;
  consultationPlatform: "google_meet" | "zoom" | "phone";
  consultationLink?: string;   // Meet/Zoom URL added by doctor before session
  followUpRequired?: boolean;
  followUpDate?: Date;
  scheduledFor: Date;          // Confirmed datetime of consultation
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}
```

**Status lifecycle**: `booking_request accepted` → `confirmed` → `in_progress` → `completed`

**Security**: Read: own patient or doctor | Create: own patient or doctor/admin | Update: patient (cancel only), doctor (status progress), admin | Delete: admin

---

## Collection: `booking_requests`

**Document ID**: `{patientId}_{doctorId}_{timestamp}`

```typescript
interface BookingRequestDocument {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  requestedTime: Date;         // Patient's preferred consultation time
  proposedTime?: Date;         // Doctor's counter-proposal
  status: "pending" | "accepted" | "reschedule_requested" | "rejected" | "cancelled";
  notes?: string;
  rejectionReason?: string;
  rescheduleReason?: string;
  appointmentId?: string;      // Set when request accepted (links to appointment)
  createdAt: Date;
  updatedAt: Date;
}
```

**When `acceptRequest(id)` is called** (`booking-requests.service.ts`):
1. `getById(requestId)` — fetch request
2. `servicesService.getById(serviceId)` — get consultation `duration`
3. `setDoc` → `appointments/{id}` with `status: "confirmed"`
4. `doctorBlocksService.create` → `doctor_blocks` for that time window (prevents double-booking)
5. `updateDoc` → `booking_requests/{id}` with `status: "accepted", appointmentId`

**Security**: Read: own patient or doctor | Create: patient only, status must be "pending" | Update: doctor (accept/reject/reschedule), patient (cancel if pending), admin | Delete: patient or admin

## Collection: `doctor_availability`

**Document ID**: Auto-generated. **Up to 7 documents per doctor** (one per day of week).

```typescript
interface DoctorAvailabilityDocument {
  id: string;
  doctorId: string;
  dayOfWeek: "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
  timeRanges: Array<{ startTime: string; endTime: string; }>; // "HH:mm" format
  duration: number;    // Consultation slot duration in minutes
  isOff: boolean;      // true = entire day unavailable (overrides timeRanges)
  createdAt: Date;
  updatedAt: Date;
}
```

**Security**: Read: **public** (patients need availability for booking page) | Write: own doctor or admin

---

## Collection: `doctor_blocks`

**Document ID**: Auto-generated. Created manually by doctor OR automatically when a booking request is accepted.

```typescript
interface DoctorBlockDocument {
  id: string;
  doctorId: string;
  start: Date;
  end: Date;
  reason: string;       // "lunch break", "vacation", "Accepted booking request"
  repeatWeekly?: boolean; // Not yet implemented
  createdAt: Date;
  updatedAt: Date;
}
```

**Security**: Read: **public** | Write: own doctor or admin

---

## Collection: `services`

```typescript
interface ServiceDocument {
  id: string;
  title: string;
  description: string;
  type: "visual_acuity_assessment"|"voice_consultation"|"video_consultation"|"contact_lens_consultation"|"digital_eye_strain_guidance";
  price: number;
  currency: string;     // "INR"
  duration: number;     // Minutes per consultation
  suitableFor: string[];
  doctorIds: string[];  // Which doctors provide this service (drives doctor selection in booking)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Security**: Read: **public** | Write: admin only

---

## Collection: `prescriptions`

```typescript
interface PrescriptionDocument {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  rightEye: { sph: string; cyl: string; axis: string; va: string; remarks?: string; };
  leftEye:  { sph: string; cyl: string; axis: string; va: string; remarks?: string; };
  pd: string;                // Pupillary distance
  nearPD?: string;
  nearVisionRight?: { add: string; va: string; remarks: string; };
  nearVisionLeft?:  { add: string; va: string; remarks: string; };
  patientAge?: string;       // Captured at prescription time (snapshot)
  patientGender?: string;
  referredBy?: string;
  findings: string;
  diagnosis: string;
  medications: string;       // Glasses/lens recommendations too
  eyeDrops: string;
  recommendations: string;
  exercises: string;
  reviewAfter?: string;      // "1 month", "3 months"
  followUpRequired: boolean;
  followUpDate?: Date;
  consultationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Security**: Read: own patient or doctor | Create: doctor | Update: own doctor | Delete: admin

---

## Collection: `doctor_invites`

```typescript
interface DoctorInviteDocument {
  id: string;
  email: string;
  role: "doctor";
  status: "pending"|"opened"|"completed"|"expired"|"cancelled"|"failed";
  token: string;             // 128-bit random hex — used in invite URL
  expiresAt: Date;           // 7 days from creation
  doctorName?: string;
  invitedBy: string;         // Admin UID
  openedAt?: Date;
  completedAt?: Date;
  resendCount: number;
  existingUser: boolean;
  createdUserId?: string;    // UID of the created doctor account
  createdAt: Date;
  updatedAt: Date;
}
```

**CRITICAL**: Read: **public** (invite page must load without auth). All status writes (opened, completed) happen **server-side via Admin SDK ONLY**. Client-side writes to this collection are forbidden by architecture and blocked by rules.

---

## Collection: `support_tickets`

```typescript
interface SupportTicketDocument {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: "billing"|"technical"|"appointment"|"prescription"|"general";
  status: "open"|"in_progress"|"resolved"|"closed";
  priority: "low"|"medium"|"high"|"urgent";
  assignedTo?: string;
  responses: Array<{ authorId: string; authorName?: string; message: string; createdAt: Date; isInternal?: boolean; }>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}
```

---

## Collection: `vision_assessments`

```typescript
interface VisionAssessmentDocument {
  id: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  serviceId?: string;
  assignedBy: string;           // UID of assigning user
  assignedRole: "doctor" | "admin" | "system";
  overrideUsed: boolean;        // true for admin bypass
  assessmentTypes: VisionAssessmentType[];  // ["far"] | ["near"] | ["far","near"]
  status: "assigned" | "in_progress" | "completed" | "expired";
  autoAssigned: boolean;
  resultFar?: { rightEye: string; leftEye: string; completedAt: Date };
  resultNear?: { rightEye: string; leftEye: string; completedAt: Date };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;             // 7 days from createdAt
}
```

**Assessment Types**: `far` (Snellen chart, 3m) | `near` (Jaeger chart, 40cm)

**Security**: Read: own patient or assigned doctor or admin | Create: doctor (own doctorId) or admin SDK (API route) | Update: patient (status/result fields only) or doctor (own) or admin | Delete: admin only

**Assignment Flow**: Doctors assign via `/doctor/appointments/[id]` → API creates document. Admins can override via `/admin/assessments`. Service automation can auto-assign on booking acceptance if configured.

---

## Collection: `payments`

```typescript
interface PaymentDocument {
  id: string;
  appointmentId: string;
  userId: string;            // Patient UID
  amount: number;
  currency: string;
  status: "pending"|"processing"|"completed"|"failed"|"refunded"|"cancelled";
  method: "card"|"upi"|"net_banking"|"wallet";
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Current state**: Schema defined. **Razorpay integration not implemented.** Payments collected offline.

---

## Collection: `doctor_slots` (LEGACY)

Original slot-based model, superseded by `doctor_availability` + `booking_requests`. Rules and converters still exist. Not used in active booking flow. Safe to archive.

---

## Firestore Security Rules — Quick Reference

| Collection | Public Read | Auth Read | Write |
|---|---|---|---|
| `users` | No | Any signed-in | Own patient create; owner update; admin all |
| `appointments` | No | Own patient/doctor | Patient cancel; doctor status; admin all |
| `booking_requests` | No | Own patient/doctor | Patient create/cancel; doctor accept/reject; admin |
| `doctor_availability` | **Yes** | — | Own doctor or admin |
| `doctor_blocks` | **Yes** | — | Own doctor or admin |
| `services` | **Yes** | — | Admin only |
| `prescriptions` | No | Own patient/doctor | Doctor create/update; admin |
| `vision_assessments` | No | Own patient/assigned doctor | Patient status/result; doctor own; admin all |
| `support_tickets` | No | Own user | Own user create/update; admin |
| `payments` | No | Own patient | Patient create; admin update |
| `doctor_invites` | **Yes** | — | Admin (client); Admin SDK (server) |

---

## Composite Indexes (`firestore.indexes.json`)

| Collection | Index Fields | Purpose |
|---|---|---|
| `appointments` | `patientId ASC, scheduledFor DESC` | Patient appointment list |
| `appointments` | `doctorId ASC, scheduledFor DESC` | Doctor appointment list |
| `prescriptions` | `patientId ASC, createdAt DESC` | Patient prescriptions |
| `prescriptions` | `doctorId ASC, createdAt DESC` | Doctor prescriptions |
| `booking_requests` | `doctorId ASC, status ASC, createdAt ASC` | Doctor pending queue |
| `booking_requests` | `patientId ASC, createdAt DESC` | Patient's request history |
| `vision_assessments` | `patientId ASC, createdAt DESC` | Patient assessment list |
| `vision_assessments` | `doctorId ASC, createdAt DESC` | Doctor assessment list |
| `vision_assessments` | `status ASC, createdAt DESC` | Assessment status filter |
| `support_tickets` | `userId ASC, createdAt DESC` | User ticket list |
| `doctor_availability` | `doctorId ASC, dayOfWeek ASC` | Schedule by day |
| `doctor_blocks` | `doctorId ASC, start ASC` | Blocks for a period |
| `services` | `isActive ASC, createdAt DESC` | Active service catalogue |
| `doctor_invites` | `email ASC, createdAt DESC` | Invite lookup by email |
| `doctor_invites` | `status ASC, createdAt DESC` | Invite status filter |

<!-- SECTION:7 -->
# 7. DATA FLOW MAPS

## 7.1 Doctor Invite Flow

```
ADMIN                                                                SERVER
/admin/doctors/invite
  │
  ├─ doctorInvitesService.create({ email, doctorName, invitedBy })
  │    → Firestore: doctor_invites (admin client write, rules pass)
  │    → Generates: token = crypto.randomBytes(16).toString("hex")
  │    → expiresAt = now + 7 days, status = "pending"
  │
  ├─ emailService.sendDoctorInviteEmail(email, { doctorName, inviteLink, expiryDate })
  │    → POST /api/emails/doctor-invite ──────────────────────────►
  │                                         sendDoctorInviteEmail() via Resend
  │                                         email: "Accept your invite at eye-aura.vercel.app/invite/{token}"
  │
DOCTOR (receives email)
  │
  └─ Visits /invite/{token}
       │
       ├─ doctorInvitesService.getByToken(token) → Firestore READ (public)
       ├─ Validates: status not "completed"/"cancelled", expiresAt > now
       ├─ Shows form: Full Name, Password, Phone Number
       │
       └─ Submit → POST /api/doctor-onboarding/complete
                                                                     │
                           [Firebase Admin SDK — bypasses all rules] │
                           1. adminDb: query doctor_invites WHERE token=={token}
                           2. Validate status + expiry
                           3. adminDb: update status="opened", openedAt=now
                           4. adminAuth.getUserByEmail(email) → check if exists
                           5a. NEW: adminAuth.createUser({email, password, displayName})
                           5b. adminDb: setDoc users/{uid} {
                                 role:"doctor",
                                 onboarding:{doctorCompleted:true},
                                 isActive:true, isSuspended:false
                               }
                           6. adminDb: update doctor_invites/{id} {
                                 status:"completed",
                                 completedAt:now,
                                 createdUserId:uid
                               }
                           7. Return { success:true, email }
       │
       ├─ signInWithEmail({ email, password })  ← client auto sign-in
       └─ router.push("/doctor/dashboard")
```

---

## 7.2 Patient Booking Flow

```
/booking page (client-side only, except step 5 write)
  │
Step 1 — Service Selection
  ├─ servicesService.getAll() → services (public read)
  ├─ For each service → usersService.getById(doctorId) → users (auth read)
  └─ Patient selects service

Step 2 — Doctor Selection
  ├─ Filters doctors from selected service.doctorIds
  ├─ Patient selects doctor
  └─ doctorAvailabilityService.getByDoctorId(doctorId) → doctor_availability (public read)

Step 3 — Time Selection (100% CLIENT-SIDE — no Firestore reads)
  ├─ Algorithm: iterate next 60 days
  │    match date's dayOfWeek → doctor_availability document
  │    for each timeRange: generate slots at `duration` minute intervals
  │    filter: slot > now
  ├─ Calendar rendered with available dates highlighted
  └─ Patient picks date → picks time slot

Step 4 — Notes
  └─ Optional textarea, max 500 chars

Step 5 — Confirm + Submit
  ├─ bookingRequestsService.create({
  │    patientId, doctorId, serviceId,
  │    requestedTime: selectedTime,
  │    status: "pending",
  │    notes
  │  }) → Firestore: booking_requests
  └─ router.push("/booking/request-submitted/{id}")
```

---

## 7.3 Doctor Accepts Booking Request

```
/doctor/dashboard
  │
  ├─ bookingRequestsService.getByDoctorIdAndStatus(doctorId, "pending")
  │    → booking_requests WHERE doctorId=={id} AND status=="pending"
  │
Doctor clicks "Accept"
  │
  └─ bookingRequestsService.acceptRequest(requestId):
       1. getById(requestId) → fetch booking_requests doc
       2. servicesService.getById(serviceId) → get duration (minutes)
       3. addDoc → appointments/{newId} {
            patientId, doctorId, serviceId,
            status: "confirmed",
            scheduledFor: request.requestedTime,
            consultationPlatform: "google_meet",
            slotId: "",
            notes: request.notes
          }
       4. doctorBlocksService.create({
            doctorId,
            start: requestedTime,
            end: requestedTime + duration,
            reason: "Accepted booking request"
          }) → doctor_blocks
       5. updateDoc → booking_requests/{id} {
            status: "accepted",
            appointmentId: newAppointmentId
          }
```

---

## 7.4 Prescription Creation + PDF Export

```
DOCTOR creates prescription
  │
  ├─ /doctor/prescriptions/create/{appointmentId}
  ├─ Fills eye data, diagnosis, medications, recommendations
  ├─ prescriptionsService.create(data) → Firestore: prescriptions/{id}
  └─ appointmentsService.update(id, { prescriptionId }) → appointments

PATIENT downloads PDF
  │
  ├─ /patient/prescriptions/{id} → "Download PDF" button
  ├─ GET /api/prescription/pdf?id={id}
  │    │
  │    ├─ Admin SDK: db.collection("prescriptions").doc(id).get() → verify exists
  │    ├─ printUrl = `{protocol}://{host}/prescription/print/{id}`
  │    ├─ puppeteer.launch({ headless:true, args:["--no-sandbox","--disable-setuid-sandbox"] })
  │    ├─ page.setViewport({ width:794, height:1123 })  // A4 pixels
  │    ├─ page.goto(printUrl, { waitUntil:"domcontentloaded" })
  │    │    → /prescription/print/{id} renders PrescriptionTemplate.tsx
  │    │    → fetches prescription from Firestore client-side
  │    ├─ page.pdf({ format:"A4", printBackground:true, margin:{0,0,0,0} })
  │    ├─ browser.close()
  │    └─ return NextResponse(buffer, { "Content-Type":"application/pdf", "Content-Disposition":"attachment; filename=eye-aura-prescription-{id}.pdf" })
  │
  └─ Browser downloads: eye-aura-prescription-{id}.pdf
```

---

## 7.5 Email Flow

```
Client component (e.g. admin invite form)
  │
  └─ emailService.sendDoctorInviteEmail(email, { doctorName, inviteLink, expiryDate })
       → fetch POST /api/emails/doctor-invite
            body: { email, doctorName, inviteLink, expiryDate }
            │
            └─ lib/send-email.ts → Resend.emails.send({
                 from: "Eye Aura <noreply@eyeaura.com>",
                 to: email,
                 subject: "You've been invited to join Eye Aura",
                 html: doctorInviteTemplate(...)
               })
               Uses: RESEND_API_KEY (server-side only, never in browser)
```

<!-- SECTION:8 -->
# 8. UI/UX DESIGN SYSTEM

## Color Palette

Defined in `app/globals.css` as CSS custom properties, mapped into Tailwind via `@theme inline`.

```css
--background:          #F7F3EE    /* Warm cream — full page background */
--foreground:          #2B2B2B    /* Near-black — all body text */
--primary:             #0F4F4B    /* Deep teal — brand, headings, nav, primary buttons */
--primary-foreground:  #FFFAF3    /* Off-white — text on primary */
--secondary:           #B5964D    /* Warm gold — prices, selected states, CTA */
--secondary-foreground:#173F3C    /* Dark teal — text on secondary */
--muted:               #EAE2D6    /* Warm beige — subtle backgrounds */
--muted-foreground:    #64605B    /* Warm grey — secondary text, labels */
--accent:              #B7C8BE    /* Sage green — highlights, availability indicators */
--card:       rgba(255,252,247,0.82)  /* Frosted warm white — all card backgrounds */
--border:     rgba(15,79,75,0.14)     /* Translucent teal border */
--ring:       rgba(181,150,77,0.42)   /* Gold focus ring */
--radius:              1.5rem         /* Large radius everywhere — soft, friendly */
```

## Color Usage Rules

| Token | Use For |
|---|---|
| `primary` (#0F4F4B) | All headings, nav items, primary buttons, text links |
| `secondary` (#B5964D) | Prices, selected card ring, step indicators, CTA buttons, star ratings |
| `muted-foreground` | Labels, secondary text, helper text, timestamps |
| `accent` | Hover backgrounds, availability dots, subtle highlights |
| `card` | All Card components — semi-transparent frosted white |

## Typography

| Font | Use | Source |
|---|---|---|
| **Atkinson Hyperlegible** | Body text, UI labels, all default text | Google Fonts CDN |
| **Luciole** | Display headings — add `font-display` class | Local: `/public/fonts/Luciole-Regular.woff2` |

**Rule**: All page titles and major headings use `font-display` class. Body text uses the default sans.

## Body Background System

```css
body {
  background:
    radial-gradient(circle at top left, rgba(183,200,190,0.46), transparent 34rem),
    radial-gradient(circle at 82% 12%, rgba(181,150,77,0.16), transparent 28rem),
    var(--background);
}
```

Two subtle radial gradients — sage green top-left, gold top-right — create the "aura" ambience on every page. These are set at the body level; pages do not repeat this.

## Component Style Conventions

| Element | Class Pattern |
|---|---|
| Cards | `border-primary/10 shadow-sm` (Shadcn Card default with border) |
| Glass panel | `.glass-panel` utility: `backdrop-blur-[22px] bg-white/72 border-white/64` |
| Page backgrounds | `bg-gradient-to-br from-[#F7F4EF] via-[#DDE5DF] to-[#F7F4EF]` |
| Interactive cards | `hover:-translate-y-1 hover:shadow-lg transition cursor-pointer` |
| Selected state | `border-secondary ring-2 ring-secondary/20` |
| Rounded corners | `rounded-2xl` on cards/panels, `rounded-full` on avatars/badges, `rounded-lg` on inputs |
| Focus state | `focus-visible:ring-2 focus-visible:ring-secondary/50` |

## Custom Utility Classes (in `globals.css`)

```css
.font-display { font-family: var(--font-display); }
.glass-panel  { background: rgba(255,252,247,0.72); border: 1px solid rgba(255,255,255,0.64);
                box-shadow: 0 24px 80px rgba(15,79,75,0.12); backdrop-filter: blur(22px); }
.aura-gradient { background: linear-gradient(135deg, #0f4f4b 0%, #376f63 48%, #b5964d 100%); }
.soft-shadow  { box-shadow: 0 24px 70px rgba(15,79,75,0.11); }
```

## Animation Policy

- **CSS transitions only**: `transition` class (Tailwind default 150ms) or `transition-all duration-200`
- **No Framer Motion**: Being actively removed. Do not add `motion.div` or any framer-motion imports.
- **Reduced motion**: `globals.css` includes `@media (prefers-reduced-motion)` block — all animations disabled for users with accessibility preferences

## Responsive Strategy

- **Breakpoints**: `sm:` (640px) — the main mobile breakpoint for most layouts
- **Pattern**: `px-5 sm:px-8`, `p-3 sm:p-6`, `grid-cols-1 sm:grid-cols-2`
- **Typography**: `text-2xl sm:text-3xl`, `text-3xl sm:text-4xl`
- **Navigation**: Mobile-first hamburger or bottom nav implied

<!-- SECTION:9 -->
# 9. COMPONENT ARCHITECTURE

## Component Ownership

| Directory | Owns | Rule |
|---|---|---|
| `/components/ui/` | Shadcn UI primitives | Never modify directly. Extend by composition. |
| `/components/doctor/schedule/` | Doctor scheduling components | Only used in `/doctor/schedule` and `/doctor/slots`. |
| `/components/prescription/` | Prescription rendering | Only used in `/prescription/print/[id]`. |
| `/modules/home/` | Homepage marketing sections | Only for public landing pages. |

## Reusable Components

### `SectionContainer` (`components/section-container.tsx`)

Wrapper providing consistent layout: `max-w-7xl mx-auto px-5 sm:px-8`. Use on every page section.

```tsx
<SectionContainer>
  <h1>Page Title</h1>
  <p>Content...</p>
</SectionContainer>
```

---

## Doctor Schedule Components (`/components/doctor/schedule/`)

These modular components were extracted from `/doctor/schedule/page.tsx` to improve maintainability.

| Component | Props | Responsibility |
|---|---|---|
| `ScheduleHeader` | `onSave: () => void, saving: boolean, saved: boolean` | Page header with title, subtitle, save button with status feedback (Save / Saving / Saved) |
| `WeeklyAvailabilityCard` | `day: DayOfWeek, availability: DoctorAvailabilityDocument \| null, onChange: (doc: DoctorAvailabilityDocument) => void` | Accordion-style card per weekday: off toggle, duration input, list of TimeRangeRows |
| `TimeRangeRow` | `range: TimeRange, onChange: (range: TimeRange) => void, onRemove: () => void` | Single start/end HH:mm time range with remove button |
| `UnavailableBlockCard` | `doctorId: string, onBlockAdded: () => void` | Form to add doctor_blocks: date picker, start time, end time, reason |
| `AvailabilityPreview` | `availabilities: DoctorAvailabilityDocument[]` | Read-only 7-day grid showing configured working hours |

---

## Prescription Component

### `PrescriptionTemplate` (`components/prescription/PrescriptionTemplate.tsx`)

Branded HTML layout rendered by Puppeteer for PDF generation. Contains:
- Eye Aura logo and letterhead
- Patient name, age, gender, consultation date
- Doctor name and credentials
- Binocular eye prescription table (Right Eye + Left Eye columns for Sph, Cyl, Axis, VA)
- Near vision add powers
- Pupillary distance
- Diagnosis and findings
- Medications / glasses recommendations
- Eye drops
- Recommendations and exercises
- Review instructions
- Follow-up date
- Doctor signature area

Styled with Tailwind and inline CSS for print context.

---

## State Management

No external state management library (Redux, Zustand). State is:

- **Local**: `useState` in page components
- **Global auth**: `AuthContext` via `useAuth()` hook (only auth state)
- **Server**: Firestore real-time reads NOT used — data fetched on mount via `getDocs()` pattern

## Data Fetching Pattern

All pages fetch data in `useEffect` on mount:

```typescript
const [data, setData] = useState<DocType[]>(null);
useEffect(() => {
  async function load() {
    const fetched = await someService.getByXxx(id);
    setData(fetched);
  }
  load();
}, [id]);
```

No SWR, no React Query. Simple async/await fetch on mount. This is intentional — keeps architecture simple.

<!-- SECTION:10 -->
# 10. SERVICE LAYER ARCHITECTURE

## Architecture Principle

```
Client Components
  → Firestore Services (client SDK, subject to security rules)

API Routes
  → Admin SDK directly (bypasses rules)
  → OR Firestore Services (client SDK, runs unauthenticated on server — AVOID for writes)
```

**IMPORTANT**: Firestore client SDK services in API routes run **unauthenticated** (no Firebase user session on the server). Therefore, API routes should ALWAYS use `adminDb` directly for writes. Client SDK services in API routes are acceptable only for reads, but even then, prefer Admin SDK for consistency.

## Service Class Pattern

All Firestore services follow this pattern:

```typescript
class XxxService {
  private db = getFirebaseDb();  // Client SDK
  private collection = collection(this.db, "collection_name").withConverter(xxxConverter);

  async getById(id: string): Promise<XxxDocument | null>
  async create(data: XxxDocument): Promise<XxxDocument>
  async update(id: string, updates: Partial<XxxDocument>): Promise<XxxDocument>
  async delete(id: string): Promise<void>
  async query(constraints: QueryConstraint[]): Promise<XxxDocument[]>
  // Domain-specific methods...
}

export const xxxService = new XxxService();  // Singleton
```

## Service Responsibilities

| Service | Key Methods | Notes |
|---|---|---|
| `usersService` | `getById`, `create`, `update`, `getByEmail` | Used everywhere for user lookups |
| `appointmentsService` | `getByPatientId`, `getByDoctorId`, `updateStatus`, `getUpcomingForPatient` | Core appointment queries |
| `bookingRequestsService` | `getByDoctorIdAndStatus`, `acceptRequest`, `rejectRequest`, `requestReschedule` | `acceptRequest()` creates appointment + doctor_block |
| `doctorAvailabilityService` | `getByDoctorId`, `upsertForDay` | Weekly schedule CRUD |
| `doctorBlocksService` | `getByDoctorId`, `getByDoctorIdInRange`, `create`, `delete` | Block management |
| `doctorInvitesService` | `getByToken`, `getAll`, `getByStatus` | **Client reads only**. All writes via Admin SDK. |
| `prescriptionsService` | `getByPatientId`, `getByDoctorId`, `create`, `update` | Prescription CRUD |
| `servicesService` | `getAll`, `getActive`, `getById` | Service catalogue |
| `supportTicketsService` | `getByUserId`, `create`, `addResponse`, `updateStatus` | Support system |

## `authService` (Special)

Lives in `/services/auth/auth.service.ts` — not in `/services/firestore/`.

Key behaviors:
- `signUp()` always creates `role: "patient"` — doctor creation is impossible via this method
- `getUserProfile()` auto-creates a user document if not found (safety fallback)
- `updateUserProfile()` sets `onboarding.patientCompleted: true` when profile fields are updated

## Email Service Pattern

```typescript
// Client-side (safe to call from browser)
emailService.sendDoctorInviteEmail(email, props)
  → POST /api/emails/doctor-invite
    → lib/send-email.ts (server-side Resend call)
      → Uses RESEND_API_KEY (never exposed to browser)
```

This pattern keeps the API key server-only while allowing client components to trigger emails.

## Converters (`services/firestore/converters.ts`)

Firestore stores dates as `Timestamp`. Converters transform to/from JavaScript `Date`:

```typescript
const xxxConverter = {
  toFirestore: (doc: XxxDocument) => ({
    ...doc,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }),
  fromFirestore: (snap: QueryDocumentSnapshot) => ({
    ...snap.data(),
    createdAt: snap.data().createdAt?.toDate() || new Date(),
    updatedAt: snap.data().updatedAt?.toDate() || new Date(),
  }),
};
```

Each collection has its own converter.

<!-- SECTION:11 -->
# 11. SCHEDULING SYSTEM ARCHITECTURE

## Why FullCalendar Was Removed

The original implementation used `@fullcalendar/react` with drag-and-drop, time grid views, and complex event management. It was removed because:

1. **Bundle size**: ~200KB added to JavaScript bundle
2. **Mobile unusability**: FullCalendar's time grid is unusable on mobile screens
3. **Complexity mismatch**: Features needed (weekly availability config + block management) don't require a full calendar library
4. **Design conflict**: FullCalendar's default UI conflicts with Eye Aura's calm design language

## Two-Layer Scheduling Model

```
Layer 1: Recurring Weekly Template (doctor_availability)
  - Defines: which days and what hours the doctor works each week
  - Stored as: 7 documents per doctor (one per day of week)
  - Fields: dayOfWeek, timeRanges[], duration, isOff

Layer 2: Specific Exceptions (doctor_blocks)
  - Defines: specific datetime periods when doctor is NOT available
  - Created: manually by doctor OR automatically when booking request accepted
  - Stored as: individual block documents with start/end datetimes
```

---

## `doctor_availability` Structure

**One document per day of week per doctor** (up to 7 docs per doctor).

```typescript
interface DoctorAvailabilityDocument {
  id: string;
  doctorId: string;
  dayOfWeek: "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
  timeRanges: Array<{ startTime: string; endTime: string; }>; // "HH:mm"
  duration: number;    // Consultation slot duration in minutes
  isOff: boolean;      // true = entire day unavailable (overrides timeRanges)
}
```

**Business rules**:
- Multiple time ranges per day allow split schedules (e.g., 9-12, 14-17)
- `isOff: true` overrides all time ranges — marks entire day unavailable
- `duration` is constant per day — all slots on that day are the same length

---

## `doctor_blocks` Structure

**One document per blocked period**.

```typescript
interface DoctorBlockDocument {
  id: string;
  doctorId: string;
  start: Date;
  end: Date;
  reason: string;       // "lunch break", "vacation", "Accepted booking request"
  repeatWeekly?: boolean; // Not yet implemented
}
```

**Created when**:
- Doctor manually adds a block in `/doctor/slots`
- Booking request is accepted (automatic block for that time window — prevents double-booking)

---

## Slot Generation Algorithm (Client-Side)

Used in `/booking/page.tsx` `TimeSelectionStep`. Runs 100% client-side — no extra Firestore reads.

```typescript
// For each day in the next 60 days:
for each date {
  dayOfWeek = date.getDay()
  availability = doctor_availability.find(a => a.dayOfWeek == dayName && !a.isOff)
  
  if (availability) {
    for each timeRange in availability.timeRanges {
      slotStart = date + timeRange.startTime
      endBoundary = date + timeRange.endTime
      
      while (slotStart + duration <= endBoundary) {
        if (slotStart > now) add slotStart to available slots
        slotStart += duration minutes
      }
    }
  }
}
```

**Known limitation**: Doctor blocks are NOT subtracted during this generation. Patients may select times that overlap with blocks. This is a bug to be fixed.

---

## `/doctor/schedule` Page

Uses modular components from `/components/doctor/schedule/`:

- **7 weekday cards** (accordion-style)
- Each card: off toggle, duration input, list of TimeRangeRows
- "Copy to..." functionality to replicate a day's schedule to other days
- Preview section shows resulting 7-day availability summary

---

## `/doctor/slots` Page

Custom React implementation (no FullCalendar):

- **Week navigation**: prev/next week buttons
- **7-day horizontal strip**: each day shows:
  - Green dot = has availability configured
  - Red dot = has blocks for that day
- **Selected day detail**: shows working hours + blocks for that day
- **Add block form**: date, start time, end time, reason
- **Upcoming blocks list**: with delete buttons

This custom implementation is mobile-friendly and ~50x smaller than FullCalendar.

<!-- SECTION:12 -->
# 12. PAYMENT ARCHITECTURE

## Status: IMPLEMENTED (Razorpay)

Razorpay is fully integrated as of this revision. Online payment is **required** before a booking request reaches the doctor. Payments are collected up-front; the booking request is created only after server-side verification succeeds.

---

## Payment Lifecycle

```
Patient selects service → doctor → time → adds notes
  │
  └─ Step 5: ConfirmationStep — "Pay {currency} {price} & Book" button
       │
       ├─ 1. POST /api/payments/create-order
       │       Auth: Bearer <Firebase ID token>
       │       Body: { doctorId, serviceId, requestedTime, notes, amount, currency }
       │       Server: creates Razorpay order via Razorpay REST API
       │       Server: persists payments/{id} { status: "pending", razorpayOrderId }
       │       Returns: { orderId, amount (paise), currency, paymentId, keyId }
       │
       ├─ 2. Razorpay checkout.js loaded dynamically
       │       window.Razorpay({ key, amount, currency, order_id, handler, ... })
       │       Patient selects UPI / card / net-banking and completes payment
       │
       ├─ 3. Razorpay calls handler(response) on success
       │       response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
       │
       ├─ 4. POST /api/payments/verify-payment
       │       Auth: Bearer <Firebase ID token>
       │       Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId }
       │       Server: HMAC-SHA256 signature verification (CRITICAL SECURITY STEP)
       │       Server: creates booking_requests/{id} with paymentId linkage
       │       Server: updates payments/{id} { status: "completed", razorpayPaymentId, bookingRequestId }
       │       Returns: { success: true, bookingRequestId }
       │
       └─ 5. Client redirects → /booking/request-submitted/{bookingRequestId}
```

**CRITICAL RULE:** `booking_requests` are NEVER created by the client directly. They are created exclusively by the `/api/payments/verify-payment` API route after signature verification succeeds. Appointments are still created only after the doctor accepts the request — payment does not auto-create appointments.

---

## Firestore Schema — payments collection

```typescript
interface PaymentDocument {
  id: string;                    // "pay_{userId}_{timestamp}"
  userId: string;                // Patient UID
  doctorId: string;              // Doctor UID
  serviceId: string;             // Service UID
  amount: number;                // Human-readable INR (e.g. 500, not 50000 paise)
  currency: string;              // "INR"
  status: PaymentStatus;         // "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled"
  // Razorpay identifiers
  razorpayOrderId: string;       // rzp_live_... / rzp_test_... order ID
  razorpayPaymentId?: string;    // pay_... — set after successful payment
  razorpaySignature?: string;    // HMAC signature — stored for audit
  // Booking linkage
  bookingRequestId?: string;     // Set after verify-payment creates the booking_request
  // Booking snapshot at payment time (preserved even if booking_request is later cancelled)
  requestedTime: Date;
  notes?: string;
  method?: PaymentMethod;        // "card" | "upi" | "net_banking" | "wallet"
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  refundedAt?: Date;
  refundReason?: string;
  // Deprecated (kept for backward schema compatibility)
  appointmentId?: string;
  transactionId?: string;
}
```

## Firestore Schema — booking_requests payment fields

```typescript
interface BookingRequestDocument {
  // ... all existing fields ...
  paymentId?: string;        // Links to payments collection
  paymentStatus?: string;    // "completed" at creation time
  paymentAmount?: number;    // Amount paid in INR
}
```

---

## API Routes

### POST /api/payments/create-order

| Property | Value |
|---|---|
| File | `app/api/payments/create-order/route.ts` |
| Auth | Firebase ID token in `Authorization: Bearer <token>` header |
| Role | `patient` only |
| Idempotency | Returns existing pending order if same userId+doctorId+serviceId already has a pending payment |

**Request body:**
```json
{
  "doctorId": "string",
  "serviceId": "string",
  "requestedTime": "ISO8601 string",
  "notes": "string | null",
  "amount": 500,
  "currency": "INR"
}
```

**Response:**
```json
{
  "orderId": "order_...",
  "amount": 50000,
  "currency": "INR",
  "paymentId": "pay_{userId}_{ts}",
  "keyId": "rzp_test_..."
}
```

---

### POST /api/payments/verify-payment

| Property | Value |
|---|---|
| File | `app/api/payments/verify-payment/route.ts` |
| Auth | Firebase ID token in `Authorization: Bearer <token>` header |
| Role | `patient` only |
| Idempotency | If `bookingRequestId` already set on payment doc, returns it immediately |

**Request body:**
```json
{
  "razorpayOrderId": "order_...",
  "razorpayPaymentId": "pay_...",
  "razorpaySignature": "hex string",
  "paymentId": "pay_{userId}_{ts}"
}
```

**Signature verification (SECURITY CRITICAL):**
```typescript
const body = `${razorpayOrderId}|${razorpayPaymentId}`;
const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
  .update(body).digest("hex");

if (expected !== razorpaySignature) {
  // Mark payment failed, return 400
}
```

**Response:**
```json
{
  "success": true,
  "bookingRequestId": "{patientId}_{doctorId}_{ts}"
}
```

---

## Client-Side Integration (booking page)

Located in `app/booking/page.tsx` — `handleConfirm` function:

1. `getFirebaseAuth().currentUser.getIdToken()` — get ID token for API auth
2. `POST /api/payments/create-order` — get order details
3. `loadRazorpayScript()` — dynamically loads `checkout.razorpay.com/v1/checkout.js`
4. `new window.Razorpay(options).open()` — opens checkout modal
5. On success: `POST /api/payments/verify-payment` → redirect
6. On dismiss: loading cleared, button re-enabled (user can retry)
7. On `payment.failed` event: error shown in UI, user can retry

**Theme:**
```typescript
theme: { color: "#0F4F4B" }  // Eye Aura primary (deep teal)
```

---

## Authentication Pattern for Payment API Routes

The payment routes use `Authorization: Bearer <Firebase ID token>` headers instead of cookie-based auth. This is intentional:

- Firebase Auth does not automatically set HTTP cookies (only manages state in memory/localStorage)
- The `auth-token` cookie in `lib/auth-server.ts` is reserved for server-rendered page auth
- For client-initiated API calls, the Firebase ID token is fetched via `auth.currentUser.getIdToken()` and passed explicitly
- The Admin SDK's `verifyIdToken()` validates the JWT on the server — no cookie dependency

---

## Security Design

| Threat | Mitigation |
|---|---|
| Client faking payment success | HMAC-SHA256 signature verification on server — impossible to forge without `RAZORPAY_KEY_SECRET` |
| Secret key exposure | `RAZORPAY_KEY_SECRET` is server-only env var — never in `NEXT_PUBLIC_*` |
| Duplicate payments | Idempotency check in create-order returns existing pending order |
| Duplicate booking_requests | verify-payment checks `bookingRequestId` field before creating |
| Unauthorized payment modification | All payment writes via Admin SDK — Firestore rules set `allow create, update, delete: if false` for clients |
| Payment for wrong user | verify-payment validates `payment.userId === req.uid` before processing |

---

## Failure Handling

| Scenario | Behavior |
|---|---|
| User dismisses Razorpay modal | Loading cleared, "Pay & Book" button re-enabled, no error shown |
| Payment declined by bank | `payment.failed` event fires, error message shown, user can retry |
| Network error during verify | Error shown, user can retry — verify-payment is idempotent |
| Signature mismatch | Payment marked `failed` in Firestore, 400 returned, user told to contact support |
| Firestore write failure in verify | Payment remains `pending`, no booking_request created — support can manually resolve |
| Page refresh after payment but before verify | User would need to re-initiate payment — Razorpay order is reused via idempotency check |
| Doctor rejects after payment | Booking request shows "rejected" status — refund policy handled separately |

---

## Amount Handling

- `ServiceDocument.price` = human-readable INR amount (e.g. `500`)
- Razorpay API expects paise: `amount * 100` sent to Razorpay REST API in create-order
- `PaymentDocument.amount` = human-readable INR (500) — stored for display and refund reference
- `orderData.amount` from create-order response = paise (50000) — passed directly to Razorpay checkout `amount` field

---

## Mobile UX

- Razorpay checkout is a full-screen overlay modal — works on mobile without any special handling
- Theme color `#0F4F4B` matches Eye Aura's teal palette in the Razorpay header
- Button shows "Pay INR 500 & Book" — clear, unambiguous call to action
- Security note "256-bit encrypted · Powered by Razorpay" reassures patients
- Loading state uses `Loader2` spinner — no button flash on slow connections

---

## Environment Variables Required

```bash
# Public key — safe to expose to browser (used in Razorpay checkout options)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Server-side only — NEVER expose to browser
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Note: `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` should have the same value. The duplication exists because Next.js requires the `NEXT_PUBLIC_` prefix for browser access, while the server-side API route uses the plain `RAZORPAY_KEY_ID` for Razorpay REST API Basic auth.

---

## New Service

`services/firestore/payments.service.ts` — client-side read service:

```typescript
paymentsService.getById(id)                         // Single payment doc
paymentsService.getByUserId(userId)                  // Patient's payment history
paymentsService.getByBookingRequestId(bookingRequestId) // Payment for a booking
```

All writes go through Admin SDK in API routes only.

---

## Refund Architecture

### Refund Lifecycle (with `after()` pattern)

```
Doctor clicks "Decline" on a pending booking request
  │
  └─ 1. Doctor types rejection reason in styled Dialog (no window.prompt)
       │
       ├─ 2. POST /api/payments/refund
       │       Auth: Bearer <doctor Firebase ID token>
       │       Body: { bookingRequestId, reason }
       │       Server: verifies doctor owns the request
       │       Server: updates booking_request { status: "rejected", refundStatus: "pending" }
       │       Server: loads linked payment document
       │       Server: marks payment { refundStatus: "pending" }
       │       Server: schedules Razorpay call via after(() => ...) — runs AFTER response sent
       │       Server: returns { success: true, refundStatus: "pending" } in <3s
       │       │
       │       └─ [AFTER RESPONSE SENT] Background task:
       │               Server: calls Razorpay refund API with X-Razorpay-Idempotency-Key
       │               Server: if success → payment { refundStatus: "processed", refundId, refundFailureReason: null }
       │               Server: if success → booking_request { refundStatus: "processed" }
       │               Server: if failure → payment { refundStatus: "failed", refundFailureReason }
       │               Server: if failure → booking_request { refundStatus: "failed" }
       │
       └─ 3. Patient sees on /patient/requests:
               "Consultation request declined. Refund being initiated…"
               → refreshes page → sees "Refund initiated — expect 5–7 business days"
```

**CRITICAL RULE:** Refunds are initiated ONLY server-side via `/api/payments/refund`. The doctor client never calls Razorpay. The patient client never initiates refunds.

### Why `after()`?

The `after()` function (stable in Next.js 15.2+) decouples the HTTP response from long-running operations:

- **Response time:** <3s regardless of Razorpay latency (no Vercel timeout)
- **Background execution:** Razorpay API call runs after response is sent (up to 30s with `maxDuration = 30`)
- **No aborts:** Sequential Firestore reads + Razorpay fetch previously exceeded 8–10s, triggering AbortController

### Refund Idempotency

| Scenario | Behaviour |
|---|---|
| Doctor clicks Decline twice | Second call hits `status === "rejected"` + `refundStatus: "processed"` check — returns early, no duplicate refund |
| Payment already refunded (`refundStatus === "processed"`) | Syncs booking_request and returns existing `refundId` — no re-refund |
| No payment attached (old or free flow) | Sets `refundStatus: "none"` — no refund attempted |
| No `razorpayPaymentId` on payment | Marks `refundStatus: "failed"`, still rejects booking — support resolves manually |
| Retry after timeout (`refundStatus: "pending"` or `"failed"`) | Falls through to retry with same `X-Razorpay-Idempotency-Key` — Razorpay returns existing refund or processes new one |

### Razorpay Idempotency Key

```
Header: X-Razorpay-Idempotency-Key: refund-{bookingRequestId}
```

- Razorpay deduplicates refund requests with the same key
- Retrying `/api/payments/refund` never creates a duplicate refund
- Doctor can click "Retry Refund" button on `/doctor/requests` safely

### Refund Failure Handling

If Razorpay API returns a non-2xx response:
- Booking request remains `status: "rejected"` (patient cannot be re-admitted)
- Payment marked `refundStatus: "failed"`, `refundFailureReason` set
- Patient sees: *"Refund processing is taking longer than expected. Our team has been notified."*
- **Doctor can retry:** "Retry Refund" button appears on `/doctor/requests` for `refundStatus: "pending"` or `"failed"`
- On successful retry: `refundFailureReason` is cleared to prevent stale error display

### Payment State Transitions

```
pending → completed   (via verify-payment after checkout success)
pending → failed      (via verify-payment if signature mismatch)
completed → refunded  (via refund after doctor rejection)
completed → failed    (if refund initiation fails — manual recovery or retry)
pending → processed   (via background Razorpay call in after() callback)
failed → processed   (via retry on doctor's requests page)
```

### Refund Schema Extensions

```typescript
// PaymentDocument additions
refundStatus?: "none" | "pending" | "processed" | "failed";
refundId?: string;            // Razorpay rfnd_... ID
refundFailureReason?: string; // Populated if refundStatus === "failed"

// BookingRequestDocument addition
refundStatus?: "none" | "pending" | "processed" | "failed";
// Mirrors payment.refundStatus for quick client-side display (avoids extra Firestore read)
```

### New API Route

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/payments/refund` | POST | Doctor Bearer token | Reject booking + initiate Razorpay refund |

### Patient UX for Refund States

| `refundStatus` | Patient-facing message |
|---|---|
| `pending` | "Refund being initiated…" (spinner) |
| `processed` | "Refund initiated — expect 5–7 business days" |
| `failed` | "Refund processing is taking longer than expected. Our team has been notified." |
| `none` / not set | No refund message shown |

### New Pages

| Route | Role | Description |
|---|---|---|
| `/doctor/requests` | Doctor | Full booking requests management — all statuses (pending, accepted, declined, cancelled), filterable tabs, styled Decline dialog, refund status display, "Retry Refund" button for stuck/failed refunds |
| `/patient/requests` | Patient | All booking requests with status, refund status, rejection reason, "Book Again" CTA for rejected, appointment link for accepted |
| `/patient/requests/[id]` | Patient | Individual booking request detail — status, doctor info, service details, requested time, notes, rejection reason, refund status with timestamps |
| `/admin/payments` | Admin | Payments & refunds dashboard — expandable cards with patient, doctor, service, full timeline (created, completed, refunded), all transaction IDs (Order, Payment, Refund, Booking), stats row (Revenue, Refunded, Pending, Failed, Net), view toggle (Payments vs Refunds), filter pills, search |

### Admin Payments Dashboard Features

**Stats Row:**
- Revenue (total from completed payments)
- Refunded (total amount refunded)
- Refund Pending (stuck/in-progress refunds)
- Refund Failed (count with red highlight if > 0)
- Net Revenue (revenue minus refunds)

**View Toggle:**
- Payments tab — filterable by status (All / Completed / Refunded / Pending / Failed)
- Refunds tab — filtered view of only transactions with refunds (All / Pending / Processed / Failed)

**Per-Card Details (expanded):**
- Patient section: Name, Email, Phone, UID
- Doctor section: Name, Email, Phone, UID
- Service section: Title, Type, Duration, Price
- Timeline section: Payment created, Payment received, Requested time, Refunded at, Refund reason, Last updated, Payment method
- Transaction IDs section: Order ID, Payment ID, Refund ID, Booking Request ID (all monospace)
- Failure banner: Only shown if `refundStatus === "failed"` — displays exact failure reason

**Card Design:**
- Collapsed view: Patient name, Doctor name, Service title, Payment timestamp, Status badges, Amount, Expand chevron
- Expanded view: Tappable sections with labeled detail rows
- Responsive: Works from 320px upward
- Visual cues: Red accent strip for failed refunds, amber border for pending refunds

<!-- SECTION:13 -->
# 13. PRESCRIPTION SYSTEM ARCHITECTURE

## Philosophy

Prescriptions are **structured data** rendered into a **branded PDF template** on demand. They are never stored as uploaded files. The prescription data in Firestore is the source of truth — the PDF is always re-generatable from it.

## Data Structure

Prescription data is highly structured in Firestore:

```typescript
interface PrescriptionDocument {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  rightEye: { sph: string; cyl: string; axis: string; va: string; remarks?: string; };
  leftEye:  { sph: string; cyl: string; axis: string; va: string; remarks?: string; };
  pd: string;                // Pupillary distance
  nearPD?: string;
  nearVisionRight?: { add: string; va: string; remarks: string; };
  nearVisionLeft?:  { add: string; va: string; remarks: string; };
  patientAge?: string;       // Snapshot at prescription time
  patientGender?: string;
  findings: string;
  diagnosis: string;
  medications: string;       // Also used for glasses recommendations
  eyeDrops: string;
  recommendations: string;
  exercises: string;
  reviewAfter?: string;      // "1 month", "3 months"
  followUpRequired: boolean;
  followUpDate?: Date;
  consultationNotes?: string;
}
```

## Rendering Stack

```
1. Doctor creates prescription
   /doctor/prescriptions/create/{appointmentId}
   → prescriptionsService.create(data) → Firestore
   → appointmentsService.update(id, { prescriptionId }) → Firestore

2. Patient downloads PDF
   /patient/prescriptions/{id} → "Download PDF" button
   → GET /api/prescription/pdf?id={id}
     ├─ Admin SDK: verify prescription exists
     ├─ Compute printUrl = /prescription/print/{id}
     ├─ puppeteer.launch({ headless:true, args:["--no-sandbox","--disable-setuid-sandbox"] })
     ├─ page.setViewport({ width:794, height:1123, deviceScaleFactor:2 }) // A4 @ 2x resolution
     ├─ page.goto(printUrl, { waitUntil:"domcontentloaded" })
     │    → /prescription/print/{id} renders PrescriptionTemplate.tsx
     │    → Fetches prescription from Firestore client-side
     │    → Renders SVG header (prescription_header.svg) at 794px width
     ├─ page.pdf({ format:"A4", printBackground:true, margin:{0,0,0,0} })
     ├─ browser.close()
     └─ Return NextResponse with Content-Type:application/pdf

3. Browser downloads: eye-aura-prescription-{id}.pdf
```

## Header SVG

The prescription header is rendered as an SVG file (`/public/prescription_header.svg`) instead of a PNG. This provides:
- Infinite scalability without quality loss
- Smaller file size
- Crisp rendering at any resolution
- Full-bleed layout (794px width, 220px height)

The SVG is rendered with `width: 100%` to fill the entire card width. The card has no side padding; all body content is wrapped in an inner div with `padding: 12px 45px 30px`.

## PrescriptionTemplate (`components/prescription/PrescriptionTemplate.tsx`)

Branded HTML layout rendered by Puppeteer. Contains:

- Eye Aura logo and letterhead
- Patient name, age, gender, consultation date
- Doctor name and credentials
- Binocular eye prescription table (Right Eye + Left Eye columns for Sph, Cyl, Axis, VA)
- Near vision add powers
- Pupillary distance
- Diagnosis and findings
- Medications / glasses recommendations
- Eye drops
- Recommendations and exercises
- Review instructions
- Follow-up date
- Doctor signature area

Styled with Tailwind CSS. The layout uses the same CSS pipeline as the rest of the app since Puppeteer renders the actual Next.js page.

## Why Not File Uploads?

- Prescriptions can be re-edited and re-generated
- No file storage infrastructure needed (no S3, no Firebase Storage)
- Data is queryable and searchable
- Consistent branding enforced by template
- Smaller storage costs (text vs PDF)

<!-- SECTION:14 -->
# 14. VISUAL ACUITY ASSESSMENT SYSTEM

## Philosophy

Visual acuity assessments are **doctor-controlled, appointment-driven, and clinically calibrated**. Patients cannot self-start an assessment. All access is gated through an assigned `VisionAssessmentDocument` in the `vision_assessments` Firestore collection. The assessment engine uses SVG-based optotype rendering with physical calibration to ensure clinical accuracy.

## Assessment Types

| Type   | Description                    | Distance |
|--------|--------------------------------|----------|
| `far`  | Far Vision — Snellen chart     | 3 metres |
| `near` | Near Vision — Jaeger chart     | 40 cm    |

Assessments can be assigned individually or together (`["far", "near"]`).

## Assignment Flow

### Doctor Assignment
- Doctor opens `/doctor/appointments/[id]`
- Selects Far / Near / Both using toggle buttons
- Clicks "Assign Assessment"
- Frontend calls `POST /api/assessments/assign` with doctor's Firebase ID token
- Server validates: token → doctor role → appointment ownership → patient match
- `vision_assessments` document created with `assignedRole: "doctor"`, `autoAssigned: false`
- Patient sees assessment on dashboard

### Admin Override
- Admin uses `/admin/assessments`
- Searches for patient by name/email
- Selects assessment type(s)
- Calls `POST /api/assessments/assign` with `assignedRole: "admin"`, `overrideUsed: true`
- No appointment linkage required
- Stored with full audit metadata

### Service Automation (Instant Trigger)
- Trigger: Doctor accepts booking request via `/doctor/requests`
- System checks `service.assessmentAutomation.enabled` AND `triggerMode === "instant"`
- If true: `vision_assessments` document created with `assignedRole: "system"`, `autoAssigned: true`
- Patient's dashboard shows assessment as "Ready"
- Failure is non-fatal — acceptance proceeds regardless

## Assessment Lifecycle

```
assigned  →  in_progress  →  completed
    ↓
  expired  (7 days after creation if not started)
```

| Status        | Set when                                           |
|---------------|----------------------------------------------------|
| `assigned`    | Created by doctor / admin / system                |
| `in_progress` | Patient first opens the assessment URL             |
| `completed`   | AcuitySession reports results                      |
| `expired`     | 7 days pass without completion (cron/manual)       |

## Clinical Calibration Engine

### Card Calibration Flow

1. Display an on-screen rectangle
2. User resizes it (slider + ±1/5px buttons) to match a physical **ISO/IEC 7810 ID-1** card (85.60 × 53.98 mm)
3. `pxPerMm = cardWidthPx / 85.60`

This is the **only** valid pixel-per-mm reference. All rendering uses it.

### CalibrationData type

```typescript
interface CalibrationData {
  pxPerMm: number;       // CSS px per physical mm (the key value)
  cardWidthPx: number;   // calibrated card width in CSS px
  deviceWidth: number;   // window.innerWidth at calibration time
  deviceHeight: number;  // window.innerHeight at calibration time
  dpr: number;           // devicePixelRatio at calibration time
  timestamp: number;     // Date.now() — stored for 24hr cache
}
```

### Invalidation Rules

Stored calibration is discarded when:
- Age > 24 hours
- `window.innerWidth` or `innerHeight` changed (orientation / resize)

## SVG Text Rendering Engine

### Architecture

```
rawCapPx   = exactHeightMm × pxPerMm
capPx      = max(rawCapPx, MIN_CAP_PX)       // device floor only
fontSize   = capPx / CAP_HEIGHT_RATIO         // = capPx / 0.711
baselineY  = padV + capPx                     // alphabetic baseline position
```

Letters rendered as `<text>` inside an exact-dimension `<svg>`:

```tsx
<svg width={svgW} height={svgH}>                   // exact px — no browser scaling
  <text x={center} y={baselineY} fontSize={fontSize}
        fontFamily="'Helvetica Neue', 'Arial', sans-serif"
        fontWeight="700">E</text>
</svg>
```

### Cap Height Compensation

SVG `fontSize` refers to the **em-square**, not the capital letter height.

```
Arial cap height = 1456 / 2048 UPM = 0.711 × font-size
```

Without correction: a 10px font produces ~7.1px capital letters.
With correction: `fontSize = targetCapPx / 0.711` produces exactly `targetCapPx` capital height.

### Font Selection

`'Helvetica Neue', 'Arial', 'Liberation Sans', sans-serif` is used because:
- Standard clinical Snellen charts use bold sans-serif letterforms
- Arial/Helvetica cap height ratio (0.711) is consistent across browsers and OS
- Real ophthalmic letter shapes: proper curved O, C, D — not geometric blocks
- Available on all platforms without web font loading

## Assessment Flow

```
type_select → instructions → calibration → duration_select → testing → results
```

### Testing phases per eye

```
eye_intro → reading (auto-advance by setInterval) → self_report
```

### Line advancement

Lines advance through a single, RAF-driven state machine in `useLetterTimer`.
Each per-letter `requestAnimationFrame` tick computes the elapsed delta from
`Date.now()` and dispatches a `TICK` action; on rollover the reducer
increments `letterIndex` and resets `remainingMs`; on the final letter it
transitions `status → "done"` and `onAllComplete` flips the shell into
`self_report`. Pause / Resume / Visibility-Hide / Visibility-Show gate the
same loop, so there are no parallel timers.

### Self-report screen

After all lines are shown, the user selects the **smallest line they could read clearly**.
Buttons show: `Level N · 20/xx · label`.

## Key Files

| File                                   | Responsibility                              |
|----------------------------------------|---------------------------------------------|
| `modules/visual-acuity/AcuitySession.tsx` | Unified orchestrator for assessment flow    |
| `modules/visual-acuity/SnellenRenderer.tsx` | SVG optotype renderer with calibrated sizing |
| `modules/visual-acuity/TestTypeSelector.tsx` | Far/Near/Both selection UI                |
| `modules/visual-acuity/DurationSelector.tsx` | Timer duration selection (2s/3s/4s)        |
| `modules/visual-acuity/types.ts`        | TestType, TimerDuration, AcuityTestResult  |
| `modules/visual-acuity/optotypes.ts`     | SVG path definitions for all 9 optotypes    |
| `modules/visual-acuity/snellen-data.ts`  | Far vision chart data + utility functions   |
| `modules/visual-acuity/near/near-vision-data.ts` | Near vision Jaeger chart data           |
| `modules/visual-acuity/engine/useLetterTimer.ts` | RAF-driven per-letter timer + advancement |
| `modules/visual-acuity/engine/useAssessmentProgress.ts` | Pure derivation of cross-eye global progress |
| `modules/visual-acuity/steps/TestingShell.tsx` | Shared eye-intro / reading / self-report shell |
| `modules/visual-acuity/engine/useVisionProgression.ts` | Line progression with indexRef/failsRef |
| `modules/visual-acuity/steps/WelcomeStep.tsx` | Assessment introduction              |
| `modules/visual-acuity/steps/InstructionsStep.tsx` | Testing instructions               |
| `modules/visual-acuity/steps/CalibrationStep.tsx` | Card calibration UI + pxPerMm calculation |
| `modules/visual-acuity/steps/TestingStep.tsx` | Far vision test (3m)                 |
| `modules/visual-acuity/steps/NearTestingStep.tsx` | Near vision test (40cm)             |
| `modules/visual-acuity/steps/ResultsStep.tsx` | Results display with level + notation |
| `services/firestore/vision-assessments.service.ts` | Vision assessment CRUD            |
| `app/api/assessments/assign/route.ts`   | Vision assessment assignment API          |
| `app/patient/assessment/page.tsx`        | Patient assessment dashboard              |
| `app/patient/assessment/visual-acuity/page.tsx` | Visual acuity test UI              |
| `app/admin/assessments/page.tsx`         | Admin assessment assignment UI             |

## Design Decisions

- **NO per-line scoring**: All lines auto-advance by timer only (Pause is the only control during reading)
- **Self-report after completion**: Patient selects smallest line they could read
- **Snellen letter size formula**: H = denominator × (testingDistanceM / 6) × 1.454 mm (clinically accurate)
- **SnellenRenderer min floor**: 10 CSS px to prevent sub-pixel collapse on near lines
- **SVG fully responsive**: width:100%/height:auto + viewBox
- **onComplete returns**: { right: EyeAcuityResult; left: EyeAcuityResult } — no LineResult arrays
- **testingDistance**: far=3m, near=0.35m
- **Doctor note footer**: On every active test screen
- **timerStartRef pattern**: Used in both TestingStep and NearTestingStep to break circular dep

## Minimum Device Requirements

For reliable near vision testing (lines at 0.58–1.45 mm):
- Screen PPI ≥ 150 (3.74 CSS px/mm at 100% zoom / no OS scaling)
- Below this, near vision lines fall below 4–6 px and cannot be clinically distinguished
- The debug panel flags clamped lines with `⚠ clamped`

<!-- SECTION:15 -->
# 16. AUTHENTICATION SYSTEM

## Auth Stack

```
Firebase Auth (client SDK)
  → Manages: email/password login, Google OAuth, session tokens
  → Sets: __session cookie (Firebase's native session cookie)

Firebase Admin SDK (server SDK)
  → Used in: /lib/auth-server.ts, /app/api/* routes
  → Verifies: ID tokens server-side
  → Bypasses: All Firestore security rules
```

## Client-Side Auth Flow (`contexts/auth-context.tsx`)

```typescript
AuthProvider wraps entire app in /app/layout.tsx

onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    authService.getCurrentUserProfile() → reads users/{uid} from Firestore
    setState({ user: userProfile })
  } else {
    setState({ user: null })
  }
})
```

Exposes via `useAuth()`:
- `user: UserProfile | null`
- `loading: boolean`
- `signInWithEmail(credentials)`
- `signInWithGoogle()`
- `signUp(credentials)` — always creates `role: "patient"`
- `signOut()`
- `resetPassword(email)`
- `updateUserProfile(updates)`

## Server-Side Auth (`lib/auth-server.ts`)

Utilities for use in Next.js API routes and Server Components:

```typescript
getServerSession()
  → reads cookies().get("auth-token")
  → adminAuth.verifyIdToken(token)
  → adminDb.collection("users").doc(uid).get()
  → Returns UserProfile or null

requireAuth()
  → throws "Unauthorized" if no session
  → Returns UserProfile

requireRole(allowedRoles[])
  → throws "Forbidden" if role not in allowed
  → Returns UserProfile

isAdmin()  → returns boolean (safe, no throws)
isDoctor() → returns boolean
isPatient() → returns boolean
```

These utilities use `getAdminAuth()` and `getAdminDb()`. They cannot be used in Client Components or middleware.

## Firebase Admin SDK Setup (`services/firebase/admin.ts`)

```typescript
getAdminAuth() → getAuth(initializeApp({ credential: cert(serviceAccount) }))
getAdminDb()   → getFirestore(adminApp)

serviceAccount = {
  projectId:   FIREBASE_ADMIN_PROJECT_ID
  clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL
  privateKey:  FIREBASE_ADMIN_PRIVATE_KEY  // \n replaced with \\n in env var
}
```

**CRITICAL**: Admin SDK environment variables must NEVER use `NEXT_PUBLIC_` prefix. They are server-side only and must not leak to the browser.

## Google OAuth

```typescript
// services/firebase/client.ts
const googleAuthProvider = new GoogleAuthProvider()
googleAuthProvider.setCustomParameters({ prompt: "select_account" })

// auth.service.ts
signInWithPopup(auth, googleAuthProvider)
```

Google OAuth always creates `role: "patient"` on first sign-in. Doctors must use the invite flow (`/invite/[token]` → server-side Admin SDK creates doctor account).

## Session Management

Firebase Auth sets the `__session` cookie automatically when user signs in. Middleware reads this cookie to verify session presence. The cookie is HTTP-only and secure.

## Role Enforcement Pattern

Role-based access is enforced at the **page layout level** (not middleware):

```typescript
// Example: /app/doctor/layout.tsx
const { user, loading } = useAuth();
useEffect(() => {
  if (!loading && (!user || user.role !== "doctor")) {
    router.push("/auth/login");
  }
}, [user, loading]);
```

Middleware only checks for cookie presence — it cannot verify roles due to Edge Runtime limitations.

## Email Verification

Email verification is **mandatory** for all email/password sign-ups. Google Sign-In accounts are automatically verified by Firebase.

### Verification Flow

```
Patient signs up with email/password
  │
  ├─ 1. Firebase Auth creates user account (emailVerified: false)
  │
  ├─ 2. Server-side API creates Firestore user document via Admin SDK
  │     (bypasses client-side security rules, more reliable)
  │
  ├─ 3. Verification email sent via Firebase Auth (sendEmailVerification)
  │     with actionCodeSettings (URL for redirect after verification)
  │
  └─ 4. User redirected to /auth/verify-email
          │
          ├─ User sees: "Please verify your email to continue"
          ├─ Email address displayed
          ├─ "I've verified my email" button → reloads Firebase Auth user
          ├─ "Resend verification email" button (60-second cooldown)
          └─ "Sign out" button

User clicks verification link in email
  │
  ├─ 5. Firebase Auth marks emailVerified: true
  │
  └─ 6. User returns to /auth/verify-email
          │
          ├─ Clicks "I've verified my email"
          ├─ reloadUser() refreshes Firebase Auth state
          ├─ emailVerified now true
          └─ Redirects to /patient/dashboard
```

### Verification Enforcement

Unverified users (`emailVerified: false`) **cannot access**:
- `/patient/*` routes
- `/doctor/*` routes
- `/admin/*` routes
- `/booking/*` routes
- Payment flows
- Booking request creation
- Support ticket creation

Enforcement happens at two levels:

**1. Page Layout Level (Client-Side)**
```typescript
// /app/patient/layout.tsx, /app/doctor/layout.tsx, /app/admin/layout.tsx
useEffect(() => {
  if (!loading && user && !user.emailVerified) {
    router.push("/auth/verify-email");
  }
}, [user, loading, router]);
```

**2. Login/Signup Redirects**
- `/auth/signup` → after signup, redirect to `/auth/verify-email`
- `/auth/login` → if emailVerified: false, redirect to `/auth/verify-email`
- Google Sign-In → auto-verified, redirect directly to dashboard

### Verification Page UI (`/auth/verify-email`)

The verification screen is designed to be calm, premium, and wellness-oriented:

**Visual Elements:**
- Eye Aura logo with soft gradient background
- Mail icon in a circular container
- User's email displayed prominently
- Subtle success/error states
- Clean typography with proper spacing

**User Actions:**
- "I've verified my email" → reloads Firebase Auth state via `reloadUser()`
- "Resend verification email" → triggers `sendVerificationEmail()`
- "Sign out" → logs out and redirects to login

**UX Philosophy:**
- Reassuring, not alarming
- Clear instructions
- No technical jargon
- Mobile-responsive (320px minimum)
- Calm color palette (teal, warm neutrals)

### Auth Context Extensions

`useAuth()` now exposes:

```typescript
{
  // ... existing methods
  sendVerificationEmail(): Promise<void>  // Triggers Firebase Auth email verification with actionCodeSettings
  reloadUser(): Promise<UserProfile>       // Reloads Firebase Auth user (refreshes emailVerified)
}
```

**actionCodeSettings Configuration:**
```typescript
const actionCodeSettings = {
  url: typeof window !== 'undefined'
    ? `${window.location.origin}/auth/verify-email`
    : 'http://localhost:3000/auth/verify-email',
  handleCodeInApp: false,
};
await sendEmailVerification(user, actionCodeSettings);
```

This ensures the verification link redirects to the correct URL after verification.

### UserProfile Type Extension

```typescript
interface UserProfile {
  // ... existing fields
  emailVerified: boolean;  // Firebase Auth email verification status
}
```

### Server-Side User Document Creation

To avoid Firestore security rule issues during signup, user documents are created via a server-side API route using Firebase Admin SDK:

**API Route:** `/api/auth/create-user-document`

```typescript
// services/auth/auth.service.ts
const response = await fetch("/api/auth/create-user-document", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    uid: userCredential.user.uid,
    email: credentials.email,
    displayName: credentials.displayName,
    role: "patient",
  }),
});
```

**Why Server-Side:**
- Firebase Admin SDK bypasses Firestore security rules
- No dependency on client-side auth token propagation timing
- More reliable than client-side Firestore writes
- Prevents "Missing or insufficient permissions" errors

### Server-Side Verification Check

`lib/auth-server.ts` now includes `emailVerified` from Firebase Auth token:

```typescript
const profile: UserProfile = {
  // ... existing fields
  emailVerified: decodedToken.emailVerified || false,
};
```

### Forgot Password Flow

Users can reset their password via `/auth/forgot-password`:

**Flow:**
1. User navigates to `/auth/forgot-password`
2. Enters email address
3. Firebase Auth sends password reset email
4. User clicks reset link in email
5. User is redirected to Firebase password reset page
6. User sets new password
7. User can sign in with new password

**Implementation:**
```typescript
// services/auth/auth.service.ts
async resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(this.auth, email);
}
```

**Forgot Password Page:**
- Premium, calm UI matching Eye Aura aesthetic
- Email input form
- Success state showing email confirmation
- Link back to login page
- Mobile-responsive (320px minimum)

**Login Page Integration:**
- "Forgot your password?" link below sign-in form
- Links to `/auth/forgot-password`

### Google Sign-In Exception

Google OAuth accounts are automatically marked as `emailVerified: true` by Firebase Auth. No verification screen shown for Google users.

### Security Rationale

Email verification prevents:
- Temporary/disposable email addresses
- Spam account creation
- Unauthorized access to protected features
- Payment fraud (unverified users cannot make payments)

### Verification Status Persistence

`emailVerified` is stored in Firebase Auth (source of truth). It is NOT stored in Firestore. The client-side `UserProfile.emailVerified` is synchronized from Firebase Auth on every auth state change.

### Multi-Tab Behavior

If user verifies email in another tab:
- `onAuthStateChanged` fires in all tabs
- Auth context updates with new `emailVerified: true`
- Verification page detects change and redirects to dashboard

### Resend Verification Cooldown

To prevent abuse, the resend verification button has a 60-second cooldown:

```typescript
const [cooldown, setCooldown] = useState(0);

useEffect(() => {
  if (cooldown > 0) {
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }
}, [cooldown]);

const handleResend = async () => {
  if (cooldown > 0) return;
  // ... send verification email
  setCooldown(60); // Start cooldown
};
```

Button shows countdown timer during cooldown period.

### Auth-Loading States

Protected route layouts (patient, doctor, admin) show loading spinners to prevent dashboard flash before redirect:

```typescript
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0EDE8]">
      <RefreshCw className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
}
```

This prevents:
- Auth flicker
- Dashboard flash before redirect
- Stale auth rendering

<!-- SECTION:16 -->
# 16. ENVIRONMENT VARIABLES

## Complete Variable Reference

```bash
# ============================================================
# PUBLIC (Safe for browser — bundled into client-side JS)
# Prefix: NEXT_PUBLIC_
# ============================================================

NEXT_PUBLIC_FIREBASE_API_KEY=          # Firebase web API key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=      # e.g. eyeaura-3e33f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=       # eyeaura-3e33f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=   # eyeaura-3e33f.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=   # Optional: Google Analytics

# ============================================================
# PRIVATE (Server-side only — NEVER add NEXT_PUBLIC_ prefix)
# These MUST NOT leak to the browser
# ============================================================

# Firebase Admin SDK (from service account JSON)
FIREBASE_ADMIN_PROJECT_ID=eyeaura-3e33f
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@eyeaura-3e33f.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Note: Copy private_key from service account JSON exactly as is, but wrap in quotes
# The \n characters must be preserved or replaced with \\n in the .env file

# Resend API (transactional emails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================================
# RAZORPAY (Payment Gateway)
# ============================================================

# Safe to expose — used in Razorpay checkout options client-side
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx

# Server-side only — NEVER add NEXT_PUBLIC_ prefix to these
# Used for Razorpay REST API Basic auth in /api/payments/create-order
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
# Used for HMAC-SHA256 signature verification in /api/payments/verify-payment
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Note on Razorpay key duplication:** `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID` hold the same key ID value. The duplication is required because Next.js only exposes `NEXT_PUBLIC_*` prefixed variables to the browser. The server needs `RAZORPAY_KEY_ID` for the Basic auth header to the Razorpay REST API.

## Critical Rules

1. **NEVER add `NEXT_PUBLIC_` prefix to Firebase Admin SDK keys** — they must stay server-only
2. **NEVER add `NEXT_PUBLIC_` prefix to `RAZORPAY_KEY_SECRET`** — exposing this breaks all payment security
3. **NEVER commit `.env.local`** — this file contains actual secrets
4. **DO commit `.env.example`** — this serves as a template for other developers
5. **Admin SDK private key must preserve newlines** — copy exactly from service account JSON

## How to Get Firebase Admin SDK Keys

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download JSON file
4. Copy these fields to your `.env.local`:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (wrap in quotes, preserve `\n`)

## How to Get Resend API Key

1. Go to resend.com → API Keys
2. Create new API key
3. Copy to `.env.local` as `RESEND_API_KEY`

## How to Get Razorpay Keys

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys
2. Generate test/live key pair
3. Copy `Key ID` to both `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID`
4. Copy `Key Secret` to `RAZORPAY_KEY_SECRET`
5. Use `rzp_test_*` keys for development; switch to `rzp_live_*` for production

<!-- SECTION:16 -->
# 17. DEPLOYMENT ARCHITECTURE

## Deployment Target

**Vercel** — Next.js native deployment platform.

## Deployment Architecture

```
Vercel
  ↓
Next.js Application (Client + Server Components)
  ↓
Firebase Auth (client SDK for browser, Admin SDK for server)
  ↓
Firestore (client SDK for browser reads, Admin SDK for server writes)
  ↓
Firebase CLI (for rules and indexes deployment)
```

## Deployment Commands

```bash
# Deploy to Vercel
vercel

# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

## Firebase CLI Configuration

**Project alias**: `eyeaura-3e33f` (defined in `.firebaserc`)

**Firebase CLI commands**:
```bash
firebase login
firebase use eyeaura-3e33f
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Environment Variables on Vercel

All environment variables from Section 15 must be set in Vercel project settings:
- Public vars (`NEXT_PUBLIC_*`) → exposed to browser
- Private vars (`FIREBASE_ADMIN_*`, `RESEND_API_KEY`) → server-only

**Important**: Never set `NEXT_PUBLIC_` prefix on Firebase Admin SDK keys in Vercel.

## Build Configuration

```json
// next.config.ts
{
  "output": "standalone"  // Optional: for Docker/container deployments
}
```

Current deployment uses default Vercel build.

## Firestore Rules Deployment

Firestore security rules are deployed via Firebase CLI, NOT via the app. This separation is intentional:
- Rules are infrastructure-as-code managed separately
- Rules changes require careful testing before deployment
- Rules deployment can be rolled back independently

## Deployment Process

1. Code changes → push to main branch
2. Vercel auto-deploys (or manual trigger)
3. Verify deployment on preview URL
4. If rules changed: `firebase deploy --only firestore:rules`
5. If indexes changed: `firebase deploy --only firestore:indexes`
6. Smoke test key flows (login, booking, doctor invite)

## Monitoring

- Vercel Analytics for web vitals and error tracking
- Firebase Crashlytics for client-side errors (if integrated)
- Firebase Performance Monitoring for API latency (if integrated)

<!-- SECTION:17 -->
# 18. KNOWN LIMITATIONS & TECHNICAL DEBT

## Known Bugs

| Bug | Severity | Description | Fix Required |
|---|---|---|---|
| Slot generation ignores doctor blocks | High | In `/booking/page.tsx`, slot generation doesn't subtract `doctor_blocks`. Patients may select times that overlap with blocks. | Fetch doctor blocks and subtract during slot generation |
| PDF API not auth-gated | Medium | `/api/prescription/pdf` doesn't verify user is patient or doctor. Anyone with prescription ID can download. | Add `requireRole(["patient","doctor"])` check |
| Email API not auth-gated | Medium | `/api/emails/doctor-invite` doesn't verify caller is admin. | Add admin role check |

## Technical Debt

| Item | Impact | Action |
|---|---|---|
| `framer-motion` in `package.json` | Low | Remove after confirming zero imports via grep |
| `@fullcalendar/*` in `package.json` | Low | Remove — custom calendar replaced it |
| `doctor_slots` collection | Low | Archive rules and converters — superseded by availability model |
| No SWR/React Query | Low | Consider for future if data fetching complexity grows |
| No automated tests | High | Add unit tests for services, E2E tests for key flows |
| No error boundary | Medium | Add React Error Boundary to catch component crashes |
| No loading skeletons | Low | Add skeleton states for better perceived performance |

## Architectural Limitations

1. **Firestore query limitations**: No native full-text search, complex joins are difficult. Workaround: client-side filtering for small datasets.
2. **Middleware cannot verify roles**: Edge Runtime limitation. Role checks happen in layout components.
3. **No file uploads**: Intentional design choice, but limits future features like photo uploads.
4. **Puppeteer cold starts**: First PDF generation after deployment may be slow as Puppeteer launches browser.
5. **No real-time updates**: Firestore real-time listeners not used. Data is fetched on mount only.

## Security Gaps

| Gap | Risk | Mitigation |
|---|---|---|
| PDF API open | Anyone can download any prescription if they guess the ID | Add auth check in API route |
| Email API open | Anyone can trigger emails | Add admin role check |
| No rate limiting on invite API | Abuse possible | Add rate limiting middleware |

<!-- SECTION:18 -->
# 19. FUTURE ROADMAP

## Short Term (Next 1-2 months)

- [ ] Fix slot generation to subtract doctor blocks
- [ ] Add auth guards to PDF and email API routes
- [ ] Remove `framer-motion` and `@fullcalendar/*` dependencies
- [ ] Add React Error Boundary to root layout
- [ ] Add loading skeletons for better UX
- [ ] Implement Razorpay payment integration
- [ ] Add rate limiting to public APIs

## Medium Term (Next 3-6 months)

- [ ] Add automated tests (Jest for services, Playwright for E2E)
- [ ] Implement doctor block repeat-weekly feature
- [ ] Add notification system (in-app + email)
- [ ] Implement appointment reminders (email/SMS)
- [ ] Add patient photo upload (if needed)
- [ ] Implement real-time updates for appointment status
- [ ] Add analytics dashboard for admins
- [ ] Implement doctor performance metrics

## Long Term (6+ months)

- [ ] Mobile app (React Native)
- [ ] Video integration (custom WebRTC or embedded Meet/Zoom)
- [ ] Multi-language support
- [ ] Advanced reporting (doctor earnings, patient history)
- [ ] Integration with optical labs for direct prescription fulfillment
- [ ] AI-powered eye health recommendations
- [ ] Telehealth compliance certifications (HIPAA, Indian telemedicine guidelines)

## Deprioritized

- [ ] FullCalendar re-integration (custom calendar is preferred)
- [ ] Framer Motion re-adoption (CSS transitions are sufficient)
- [ ] Firebase Storage (no file upload requirement currently)

<!-- SECTION:19 -->
# 20. ENGINEERING RULES

## Code Style

- **TypeScript everywhere** — no `.js` or `.jsx` files
- **Strict mode enabled** — no `any` types unless absolutely necessary
- **Functional components only** — no class components
- **ESLint and Prettier configured** — auto-format on save

## Component Rules

- **Components in `/components/` only** — page components stay in `/app`
- **Props interfaces defined at top of file** — clear contracts
- **No prop drilling beyond 2 levels** — use context if needed
- **Components should be < 300 lines** — extract if larger

## Firestore Rules

- **All Firestore document interfaces in `/types/firestore.ts`** — single source of truth
- **Use type converters in `/services/firestore/converters.ts`** — handle Timestamp ↔ Date
- **Client SDK for reads** — subject to security rules
- **Admin SDK for server-side writes** — bypass rules for privileged operations

## API Route Rules

- **API routes in `/app/api/`** — follow Next.js App Router convention
- **Use Admin SDK for all writes** — never use client SDK services for writes
- **Return proper HTTP status codes** — 200/201 success, 400 bad request, 401/403 auth errors
- **Error messages in response body** — help debugging

## Environment Variable Rules

- **NEVER commit `.env.local`** — contains secrets
- **DO commit `.env.example`** — template for other developers
- **NO `NEXT_PUBLIC_` on Admin SDK keys** — server-side only
- **`NEXT_PUBLIC_` only for client-safe config** — Firebase web API keys, etc.

## Security Rules

- **Role checks in layout components** — middleware cannot verify roles
- **All doctor invite writes via Admin SDK** — client-side writes forbidden
- **Verify webhooks with signatures** — for future payment integration
- **Never expose API keys to browser** — server-side proxy for external APIs

## Testing Rules (Future)

- **Unit tests for all services** — Jest or Vitest
- **E2E tests for key flows** — Playwright or Cypress
- **Test Firestore rules** — use Firebase emulators
- **Coverage target: 70%** — minimum for new code

## Git Workflow

- **Main branch is production** — protect from direct pushes
- **Feature branches** — `feature/description` or `fix/description`
- **PR required for main merge** — code review mandatory
- **Squash merge to main** — keep history clean

## Documentation Rules

- **Update this architecture document** — for major architectural changes
- **Document new Firestore collections** — add schema to this doc
- **Update `.env.example`** — when adding new env vars
- **Comment complex logic** — explain "why", not just "what"

## Performance Rules

- **Lazy load heavy components** — use dynamic imports for modals, charts
- **Optimize images** — use Next.js Image component
- **Avoid large bundles** — monitor bundle size, remove unused deps
- **Server components for data fetching** — reduce client-side JS

## Accessibility Rules

- **Use semantic HTML** — headings, buttons, landmarks
- **ARIA labels where needed** — icon-only buttons
- **Keyboard navigation** — all interactive elements reachable via Tab
- **Respect `prefers-reduced-motion`** — already in globals.css

<!-- SECTION:20 -->
# 21. CHANGELOG

This section tracks major architectural changes to the Eye Aura codebase.

## 2026-05 (Visual Acuity Assessment Module)

### Visual Acuity Assessment System
- **Change**: Added complete visual acuity assessment module with clinically calibrated SVG optotype rendering
- **New Module**: `/modules/visual-acuity/` — self-contained assessment engine
- **Key Components**:
  - `AcuitySession.tsx` — Unified orchestrator for assessment flow (type_select → instructions → calibration → duration_select → testing → results)
  - `SnellenRenderer.tsx` — SVG optotype renderer with calibrated sizing (10px min floor, responsive SVG)
  - `CalibrationStep.tsx` — Card calibration UI using ISO/IEC 7810 ID-1 card (85.60 × 53.98 mm) for pxPerMm calculation
  - `TestingStep.tsx` — Far vision test (3m) with auto-advance by timer
  - `NearTestingStep.tsx` — Near vision test (40cm) with Jaeger chart
  - `ResultsStep.tsx` — Results display with level + notation
- **Clinical Accuracy**:
  - Snellen letter size formula: H = denominator × (testingDistanceM / 6) × 1.454 mm
  - Cap height compensation: Arial cap height = 0.711 × font-size
  - Calibration invalidation: Age > 24 hours or window resize/orientation change
- **Assignment Flow**:
  - Doctor assignment via `/doctor/appointments/[id]` → API creates `vision_assessments` document
  - Admin override via `/admin/assessments` with `overrideUsed: true` for audit
  - Service automation on booking acceptance if `service.assessmentAutomation.enabled` and `triggerMode === "instant"`
- **New Firestore Collection**: `vision_assessments` with fields for patientId, doctorId, appointmentId, assessmentTypes, status, resultFar, resultNear
- **New API Route**: `POST /api/assessments/assign` — Firebase ID token auth, doctor/admin roles only
- **New Pages**:
  - `/patient/assessment` — Patient assessment dashboard (ready/completed/expired)
  - `/patient/assessment/visual-acuity` — Visual acuity test UI (requires valid ?id=)
  - `/admin/assessments` — Admin assessment assignment UI
- **Design Decisions**:
  - NO per-line scoring — all lines auto-advance by timer only
  - Self-report after completion — patient selects smallest line they could read
  - SVG fully responsive — width:100%/height:auto + viewBox
  - onComplete returns { right: EyeAcuityResult; left: EyeAcuityResult } — no LineResult arrays
- **Files Changed**:
  - `/modules/visual-acuity/*` — New module directory with 15+ files
  - `/services/firestore/vision-assessments.service.ts` — New service
  - `/app/api/assessments/assign/route.ts` — New API route
  - `/app/patient/assessment/page.tsx` — New patient dashboard
  - `/app/patient/assessment/visual-acuity/page.tsx` — New test UI
  - `/app/admin/assessments/page.tsx` — New admin assignment UI
  - `/types/firestore.ts` — Added VisionAssessmentDocument, VisionAssessmentType
  - `/firestore.indexes.json` — Added vision_assessments composite indexes
  - `/firestore.rules` — Added vision_assessments security rules
- **Impact**: Patients can now complete clinically accurate visual acuity tests at home with doctor-controlled assignment

### Prescription PDF SVG Header
- **Change**: Replaced PNG header with SVG for infinite scalability and smaller file size
- **File**: `/public/prescription_header.svg` — Full-bleed layout (794px width, 220px height)
- **Rendering**: SVG rendered with `width: 100%` to fill entire card width
- **Layout Change**: Card has no side padding; all body content wrapped in inner div with `padding: 12px 45px 30px`
- **PDF Resolution**: Added `deviceScaleFactor: 2` to Puppeteer viewport for 2x resolution (sharper PDF)
- **Files Changed**:
  - `/app/api/prescription/pdf/route.tsx` — Added deviceScaleFactor: 2
  - `/app/prescriptions/[id]/pdf/page.tsx` — Updated layout for SVG header, removed card side padding
- **Impact**: Crisp header rendering at any resolution, smaller file size, full-bleed layout

## 2025-01 (Architecture Refactor)

### Doctor Invite Flow Security Fix
- **Issue**: "Missing or insufficient permissions" error when accepting doctor invites
- **Root Cause**: Client-side Firestore writes to `doctor_invites` collection violated security rules
- **Fix**: Moved all invite status writes (opened, completed) to server-side Admin SDK in `/api/doctor-onboarding/complete`
- **Files Changed**:
  - `/app/api/doctor-onboarding/complete/route.ts` — complete rewrite using Admin SDK only
  - `/app/invite/[token]/page.tsx` — removed client-side Firestore writes, now calls server API
  - `/firestore.rules` — updated `doctor_invites` rules to allow public read, admin-only write
- **Impact**: Doctor onboarding now works securely without permission errors

### Firestore Indexes Deployment Fix
- **Issue**: Index deployment errors due to problematic single-field indexes
- **Fix**: Removed single-field indexes, kept only composite indexes
- **Files Changed**: `/firestore.indexes.json`
- **Impact**: Indexes deploy successfully via Firebase CLI

### Environment Variable Clarification
- **Issue**: Confusion about Firebase Admin SDK key prefixes
- **Clarification**: Admin SDK keys must NOT use `NEXT_PUBLIC_` prefix (server-side only)
- **Files Updated**: `.env.example`, documentation

### Modular Scheduling Components
- **Change**: Extracted doctor schedule UI into modular components
- **New Components**:
  - `ScheduleHeader.tsx` — page header with save status
  - `WeeklyAvailabilityCard.tsx` — per-day accordion
  - `TimeRangeRow.tsx` — single time range input
  - `UnavailableBlockCard.tsx` — block creation form
  - `AvailabilityPreview.tsx` — read-only 7-day summary
- **Files Changed**: `/components/doctor/schedule/*`, `/app/doctor/schedule/page.tsx`
- **Impact**: Improved maintainability, easier to modify schedule UI

### Custom Calendar Implementation
- **Change**: Replaced FullCalendar with custom React calendar for doctor slots
- **Removed**: `@fullcalendar/react` dependency (still in package.json, pending cleanup)
- **New**: Custom week-view calendar in `/app/doctor/slots/page.tsx`
- **Impact**: ~200KB bundle reduction, mobile-friendly, design-consistent

### Framer Motion Removal (In Progress)
- **Change**: Replaced Framer Motion animations with CSS transitions
- **Status**: Removed from scheduling/doctor components, pending full grep and package.json cleanup
- **Impact**: Smaller bundle, simpler animations

### Master Reference Update
- **File**: `/docs/EYE_AURA_MASTER_REFERENCE.md`
- **Changes**: Updated to reflect removal of FullCalendar, addition of modular scheduling components

## 2024-12 (Initial Architecture)

### Project Setup
- **Tech Stack**: Next.js 15, TypeScript, Tailwind CSS v4, Firebase (Auth + Firestore + Admin SDK)
- **Design System**: Custom color palette (deep teal, warm gold, cream), Luciole display font
- **Architecture**: Firebase-only backend, no external server infrastructure

### Core Features Implemented
- Patient self-registration (email/password + Google OAuth)
- Doctor invite-only onboarding flow
- Request/approval booking model
- Weekly availability configuration
- Prescription generation via Puppeteer
- Admin dashboard for doctor and service management

### Firestore Schema Initial
- Collections: users, appointments, booking_requests, doctor_availability, doctor_blocks, services, prescriptions, doctor_invites, support_tickets, payments
- Security rules: role-based access, ownership checks
- Composite indexes: deployed for all query patterns

<!-- SECTION:21 -->
# 21. COMPLETE FEATURE → FILE RESPONSIBILITY MAP

This section maps every major feature to its owning files, responsibilities, and boundaries. Future contributors must respect these ownership boundaries to prevent architectural drift.

---

## Authentication & User Management

**Files:**
- `/services/auth/auth.service.ts` — Client auth operations
- `/contexts/auth-context.tsx` — Auth state provider
- `/services/firestore/users.service.ts` — User document CRUD
- `/types/auth.ts` — Auth type definitions
- `/lib/auth-server.ts` — Server-side auth utilities

**Responsibilities:**
- Sign in (email/password, Google OAuth)
- Sign up (patient-only, always creates `role: "patient"`)
- Sign out
- Password reset
- User profile CRUD
- Onboarding state management
- Session verification (server-side)

**Boundaries:**
- `authService.signUp()` MUST always set `role: "patient"` — doctor creation is forbidden
- `authService.getUserProfile()` auto-creates user doc if missing (safety fallback)
- `authService.updateUserProfile()` sets `onboarding.patientCompleted: true`
- Server auth utilities MUST use Admin SDK only
- Client auth uses Firebase Auth SDK only

**Must NEVER:**
- Create doctor accounts (use invite flow + Admin SDK)
- Set admin roles (manual Firestore/Console operation only)
- Bypass Firestore security rules on client
- Use Admin SDK in client components

---

## Booking System

**Files:**
- `/app/booking/page.tsx` — Booking wizard UI
- `/services/firestore/booking-requests.service.ts` — Booking request CRUD
- `/services/firestore/appointments.service.ts` — Appointment CRUD
- `/services/firestore/services.service.ts` — Service catalogue
- `/services/firestore/doctor-availability.service.ts` — Availability reads
- `/services/firestore/doctor-blocks.service.ts` — Block reads
- `/types/booking.ts` — Booking type definitions

**Responsibilities:**
- Multi-step booking wizard (service → doctor → time → notes → confirm)
- Booking request creation (NOT appointment)
- Booking request acceptance → appointment creation
- Booking request rejection
- Booking request cancellation
- Slot generation (client-side from availability data)

**Boundaries:**
- Booking flow creates `booking_requests` ONLY — never `appointments` directly
- Only `bookingRequestsService.acceptRequest()` can create appointments
- `acceptRequest()` automatically creates `doctor_block` for the time window
- Slot generation is 100% client-side — no extra Firestore reads
- Service selection filters doctors by `service.doctorIds`

**Must NEVER:**
- Create `appointments` directly from booking wizard
- Create payments (payment integration separate)
- Mutate user documents
- Generate prescriptions
- Modify doctor availability during booking

---

## Doctor Scheduling

**Files:**
- `/app/doctor/schedule/page.tsx` — Weekly availability config UI
- `/app/doctor/slots/page.tsx` — Block management UI
- `/components/doctor/schedule/ScheduleHeader.tsx` — Schedule header
- `/components/doctor/schedule/WeeklyAvailabilityCard.tsx` — Per-day config
- `/components/doctor/schedule/TimeRangeRow.tsx` — Time range input
- `/components/doctor/schedule/UnavailableBlockCard.tsx` — Block creation
- `/components/doctor/schedule/AvailabilityPreview.tsx` — Read-only preview
- `/services/firestore/doctor-availability.service.ts` — Availability CRUD
- `/services/firestore/doctor-blocks.service.ts` — Block CRUD

**Responsibilities:**
- Weekly recurring schedule configuration (7 days, one doc per day)
- Time range CRUD per day
- Duration configuration per day
- Day-level off toggle
- Manual block creation (lunch, vacation, etc.)
- Block deletion
- Availability preview

**Boundaries:**
- Availability is per-day-of-week recurring template
- Blocks are specific datetime exceptions
- Up to 7 availability docs per doctor (one per day)
- Blocks are created manually OR automatically when booking accepted
- Availability is public-read (patients need it for booking)
- Blocks are public-read (patients should subtract during slot generation — currently a bug)

**Must NEVER:**
- Create appointments directly
- Mutate booking requests
- Use FullCalendar (custom implementation only)
- Use Framer Motion (CSS transitions only)
- Create more than 7 availability docs per doctor

---

## Prescription System

**Files:**
- `/app/doctor/prescriptions/create/[appointmentId]/page.tsx` — Prescription form
- `/app/prescription/print/[id]/page.tsx` — Print template (Puppeteer target)
- `/app/api/prescription/pdf/route.tsx` — PDF generation API
- `/components/prescription/PrescriptionTemplate.tsx` — Branded HTML layout
- `/services/firestore/prescriptions.service.ts` — Prescription CRUD
- `/services/firestore/appointments.service.ts` — Link prescription to appointment

**Responsibilities:**
- Prescription data entry (eye data, diagnosis, medications, etc.)
- Prescription storage in Firestore
- PDF generation via Puppeteer
- Prescription download
- Prescription viewing (patient/doctor)

**Boundaries:**
- Prescriptions are structured data — NOT file uploads
- PDF is generated on-demand from Firestore data
- Only doctors can create prescriptions
- Prescription must be linked to an appointment
- PDF rendering uses Puppeteer headless browser
- Print page is minimal layout (no nav)

**Must NEVER:**
- Upload prescription PDFs to storage
- Create prescriptions without appointment
- Allow patients to create prescriptions
- Store prescription data as unstructured text
- Use client-side PDF generation (server Puppeteer only)

---

## Support Tickets

**Files:**
- `/app/patient/support/page.tsx` — Patient ticket creation
- `/app/patient/support/[id]/page.tsx` — Patient ticket view
- `/app/admin/support/page.tsx` — Admin ticket list
- `/app/admin/support/[id]/page.tsx` — Admin ticket management
- `/services/firestore/support-tickets.service.ts` — Ticket CRUD

**Responsibilities:**
- Ticket creation (category, subject, message)
- Ticket status management (open → in_progress → resolved → closed)
- Ticket responses (admin replies)
- Ticket priority assignment
- Ticket assignment to admins

**Boundaries:**
- Patients create tickets with status "open"
- Admins can update status and add responses
- Responses include author ID and timestamp
- Internal-only responses possible
- Tickets are per-user scoped

**Must NEVER:**
- Allow patients to modify ticket status
- Allow patients to delete tickets
- Create tickets for other users
- Modify user documents from ticket flow

---

## Notifications

**Files:**
- `/services/notifications/notifications.service.ts` — Notification service (placeholder)
- `/services/email/email.service.ts` — Email trigger service

**Responsibilities:**
- Email sending (via Resend API)
- In-app notifications (future implementation)

**Boundaries:**
- Email sending uses server-side API routes
- Resend API key is server-only
- Email templates are server-rendered

**Must NEVER:**
- Expose Resend API key to browser
- Use client-side email sending
- Send emails without user consent

---

## Doctor Onboarding

**Files:**
- `/app/invite/[token]/page.tsx` — Invite acceptance UI (public)
- `/app/api/doctor-onboarding/complete/route.ts` — Server-side onboarding API
- `/services/firebase/admin.ts` — Admin SDK initialization
- `/services/firestore/doctor-invites.service.ts` — Invite reads (client)
- `/types/firestore.ts` — Invite type definition

**Responsibilities:**
- Invite token validation
- Doctor account creation (Firebase Auth + Firestore)
- Invite status updates (opened → completed)
- Auto sign-in after onboarding
- Redirect to doctor dashboard

**Boundaries:**
- Invite page is PUBLIC (no auth required)
- All Firestore writes happen server-side via Admin SDK
- Client-side invite service READS ONLY
- Admin SDK creates doctor account with `role: "doctor"`
- Invite token is 128-bit random hex
- Invite expires in 7 days

**Must NEVER:**
- Use client-side Firestore writes for invite status
- Create doctor accounts via client SDK
- Allow invite reuse after completion
- Create admin accounts via invite flow
- Expose Admin SDK credentials to browser

---

## Doctor Invites (Admin)

**Files:**
- `/app/admin/doctors/invite/page.tsx` — Invite creation UI
- `/services/firestore/doctor-invites.service.ts` — Invite CRUD
- `/services/email/email.service.ts` — Email trigger
- `/app/api/emails/doctor-invite/route.ts` — Email sending API

**Responsibilities:**
- Invite creation (email, doctor name, expiry)
- Invite email sending via Resend
- Invite status tracking
- Invite resend

**Boundaries:**
- Only admins can create invites
- Invite token generated server-side
- Invite email sent via server API
- Invite status tracked in Firestore
- Invite expiry is 7 days from creation

**Must NEVER:**
- Allow non-admins to create invites
- Expose Resend API key
- Send invites without email
- Reuse invite tokens

---

## PDF Generation

**Files:**
- `/app/api/prescription/pdf/route.tsx` — PDF generation API
- `/app/prescription/print/[id]/page.tsx` — Print template
- `/components/prescription/PrescriptionTemplate.tsx` — HTML layout
- `/lib/firebase-admin.ts` — Admin SDK (alternative init)

**Responsibilities:**
- Verify prescription exists (Admin SDK)
- Launch Puppeteer headless browser
- Render print template at A4 viewport
- Generate PDF stream
- Return PDF as binary response

**Boundaries:**
- PDF generation is server-only
- Uses Puppeteer headless browser
- Renders actual Next.js page (print template)
- A4 viewport: 794×1123px
- Print template uses client-side Firestore reads
- Currently NOT auth-gated (known security gap)

**Must NEVER:**
- Use client-side PDF generation
- Store PDFs in database
- Generate PDFs without prescription data
- Use Puppeteer in client components

---

## Payments (Future)

**Files:**
- `/types/firestore.ts` — Payment document interface
- `/services/firestore/payments.service.ts` — Payment CRUD (placeholder)

**Responsibilities:**
- Payment order creation (future)
- Payment status tracking (future)
- Razorpay integration (future)
- Webhook verification (future)

**Boundaries:**
- Not yet implemented
- Schema exists for future integration
- Must use Razorpay for Indian market
- Must verify webhook signatures
- Must link payments to appointments

**Must NEVER:**
- Implement without webhook signature verification
- Store payment gateway secrets in client code
- Allow payment modification after completion
- Implement without refund handling

---

## Admin Management

**Files:**
- `/app/admin/doctors/page.tsx` — Doctor list
- `/app/admin/doctors/[id]/page.tsx` — Doctor detail
- `/app/admin/services/page.tsx` — Service list
- `/app/admin/services/create/page.tsx` — Service creation
- `/app/admin/services/[id]/edit/page.tsx` — Service editing
- `/app/admin/users/page.tsx` — User list
- `/app/admin/analytics/page.tsx` — Analytics dashboard
- `/services/firestore/users.service.ts` — User CRUD
- `/services/firestore/services.service.ts` — Service CRUD

**Responsibilities:**
- Doctor management (view, deactivate)
- Service management (CRUD)
- User management (view, deactivate)
- Analytics (future)
- Settings (future)

**Boundaries:**
- Only admins can access these pages
- Role enforcement in layout component
- Admin cannot self-create admin role
- Service doctorIds must be valid UIDs
- Deactivation sets `isActive: false`

**Must NEVER:**
- Allow non-admins to access admin routes
- Create admin accounts via client SDK
- Modify security rules from admin UI
- Delete critical data without confirmation

---

## Patient Dashboard

**Files:**
- `/app/patient/dashboard/page.tsx` — Dashboard home
- `/app/patient/appointments/page.tsx` — Appointment list
- `/app/patient/appointments/[id]/page.tsx` — Appointment detail
- `/app/patient/prescriptions/page.tsx` — Prescription list
- `/app/patient/prescriptions/[id]/page.tsx` — Prescription detail
- `/app/patient/profile/page.tsx` — Profile management

**Responsibilities:**
- Appointment viewing
- Prescription viewing/downloading
- Profile management
- Support ticket access

**Boundaries:**
- Only patients can access
- Role enforcement in layout component
- Patients can only view their own data
- Patients cannot modify prescriptions
- Patients can cancel pending bookings only

**Must NEVER:**
- Allow patients to view other patients' data
- Allow patients to modify prescriptions
- Allow patients to modify doctor data
- Bypass role checks

---

## Doctor Dashboard

**Files:**
- `/app/doctor/dashboard/page.tsx` — Dashboard home
- `/app/doctor/appointments/page.tsx` — Appointment list
- `/app/doctor/appointments/[id]/page.tsx` — Appointment detail
- `/app/doctor/patients/page.tsx` — Patient list
- `/app/doctor/patients/[id]/page.tsx` — Patient history
- `/app/doctor/prescriptions/[id]/page.tsx` — Prescription view
- `/app/doctor/prescriptions/create/[appointmentId]/page.tsx` — Prescription creation
- `/app/doctor/profile/page.tsx` — Profile management

**Responsibilities:**
- Appointment management (view, status progression)
- Booking request management (accept/reject)
- Prescription creation
- Patient history viewing
- Schedule management

**Boundaries:**
- Only doctors can access
- Role enforcement in layout component
- Doctors can only view their own appointments/patients
- Doctors can create prescriptions for their appointments only
- Doctors manage their own schedule only

**Must NEVER:**
- Allow doctors to view other doctors' data
- Allow doctors to modify patient profiles
- Allow doctors to create prescriptions for others' appointments
- Bypass role checks

<!-- SECTION:22 -->
# 22. COMPLETE FEATURE FLOW MAPS

This section maps every major user action to the files involved, Firestore writes, and side effects. Future contributors must consult this table before implementing new features or modifying existing flows.

---

| User Action | Files Involved | Firestore Writes | Side Effects |
|---|---|---|---|
| **Patient signs up** | `/auth/signup/page.tsx`, `/services/auth/auth.service.ts`, `/services/firestore/users.service.ts` | `users/{uid}` (create with `role: "patient"`) | Firebase Auth user created, auto-sign-in |
| **Patient signs in** | `/auth/login/page.tsx`, `/services/auth/auth.service.ts` | None | Session cookie set, user profile fetched |
| **Patient books appointment** | `/app/booking/page.tsx`, `/services/firestore/booking-requests.service.ts` | `booking_requests/{id}` (create with `status: "pending"`) | None (notification system not yet implemented) |
| **Doctor accepts booking request** | `/app/doctor/appointments/page.tsx`, `/services/firestore/booking-requests.service.ts` | `appointments/{id}` (create with `status: "confirmed"`), `doctor_blocks/{id}` (create for time window), `booking_requests/{id}` (update `status: "accepted"`, `appointmentId`) | None (notification system not yet implemented) |
| **Doctor rejects booking request** | `/app/doctor/appointments/page.tsx`, `/services/firestore/booking-requests.service.ts` | `booking_requests/{id}` (update `status: "rejected"`, `rejectionReason`) | None (notification system not yet implemented) |
| **Doctor creates prescription** | `/app/doctor/prescriptions/create/[appointmentId]/page.tsx`, `/services/firestore/prescriptions.service.ts`, `/services/firestore/appointments.service.ts` | `prescriptions/{id}` (create), `appointments/{appointmentId}` (update `prescriptionId`) | None |
| **Patient downloads prescription PDF** | `/app/patient/prescriptions/[id]/page.tsx`, `/app/api/prescription/pdf/route.tsx`, `/app/prescription/print/[id]/page.tsx` | None (read-only) | Puppeteer launches, PDF generated and streamed |
| **Admin invites doctor** | `/app/admin/doctors/invite/page.tsx`, `/services/firestore/doctor-invites.service.ts`, `/services/email/email.service.ts`, `/app/api/emails/doctor-invite/route.ts` | `doctor_invites/{id}` (create with `status: "pending"`, token, expiry) | Email sent via Resend |
| **Doctor accepts invite** | `/app/invite/[token]/page.tsx`, `/app/api/doctor-onboarding/complete/route.ts` | `users/{uid}` (create with `role: "doctor"` via Admin SDK), `doctor_invites/{id}` (update `status: "opened"` then `status: "completed"` via Admin SDK) | Firebase Auth user created, auto-sign-in, redirect to doctor dashboard |
| **Doctor updates schedule** | `/app/doctor/schedule/page.tsx`, `/services/firestore/doctor-availability.service.ts` | `doctor_availability/{id}` (upsert per day) | None |
| **Doctor adds block** | `/app/doctor/slots/page.tsx`, `/services/firestore/doctor-blocks.service.ts` | `doctor_blocks/{id}` (create) | None |
| **Patient creates support ticket** | `/app/patient/support/page.tsx`, `/services/firestore/support-tickets.service.ts` | `support_tickets/{id}` (create with `status: "open"`) | None (notification system not yet implemented) |
| **Admin responds to ticket** | `/app/admin/support/[id]/page.tsx`, `/services/firestore/support-tickets.service.ts` | `support_tickets/{id}` (update `status`, add response to `responses` array) | None (notification system not yet implemented) |
| **Patient cancels pending booking** | `/app/patient/appointments/[id]/page.tsx`, `/services/firestore/booking-requests.service.ts` | `booking_requests/{id}` (update `status: "cancelled"`) | None |
| **Doctor updates appointment status** | `/app/doctor/appointments/[id]/page.tsx`, `/services/firestore/appointments.service.ts` | `appointments/{id}` (update `status`) | None (notification system not yet implemented) |
| **Patient updates profile** | `/app/patient/profile/page.tsx`, `/services/auth/auth.service.ts`, `/services/firestore/users.service.ts` | `users/{uid}` (update profile fields, set `onboarding.patientCompleted: true`) | None |
| **Admin creates service** | `/app/admin/services/create/page.tsx`, `/services/firestore/services.service.ts` | `services/{id}` (create with `isActive: true`) | None |
| **Admin deactivates user** | `/app/admin/users/page.tsx`, `/services/firestore/users.service.ts` | `users/{uid}` (update `isActive: false`) | None |

---

## Flow Notes

### Booking Request Acceptance is Atomic

The `bookingRequestsService.acceptRequest()` method performs three Firestore writes atomically (in sequence, not a true transaction):
1. Create appointment
2. Create doctor block
3. Update booking request status

If any step fails, the system is left in an inconsistent state. Future improvement: use Firestore transactions.

### Doctor Onboarding is Server-Only

All Firestore writes during doctor onboarding happen via Firebase Admin SDK in `/app/api/doctor-onboarding/complete/route.ts`. Client-side code only reads invite data and submits the form.

### PDF Generation is Read-Then-Render

The PDF generation flow:
1. API route verifies prescription exists (Admin SDK read)
2. Puppeteer navigates to print URL
3. Print page fetches prescription data (client SDK read)
4. Puppeteer renders HTML to PDF

No Firestore writes occur during PDF generation.

### Email Sending is Server-Only

Email sending always goes through server API routes. Client components call `/api/emails/*` which uses the Resend SDK with server-side API key.

<!-- SECTION:23 -->
# 23. BUSINESS RULES & DOMAIN CONSTRAINTS

This section documents ALL non-negotiable business rules. Future contributors must preserve these rules to prevent business logic corruption.

---

## Booking Rules

### Request vs Appointment Separation
- **Booking requests are NOT appointments** — they are pending requests that may be accepted or rejected
- Only doctors can convert booking requests into appointments
- Patients cannot directly create appointments
- Patients cannot modify appointment status
- Only `bookingRequestsService.acceptRequest()` can create appointments

### Booking Request Lifecycle
- Booking requests start in `status: "pending"`
- Only the assigned doctor can accept or reject
- Patients can cancel only if status is "pending"
- Once accepted, booking request becomes immutable
- Accepted booking requests link to the created appointment via `appointmentId`

### Appointment Status Progression
- Appointments start at `status: "confirmed"` (after request acceptance)
- Only doctors can progress status: `confirmed` → `in_progress` → `completed`
- Patients can cancel appointments (sets `status: "cancelled"`)
- Doctors can request cancellation (sets `status: "cancellation_requested"`)
- Completed appointments cannot be reopened

### Time Blocking
- Accepting a booking request automatically creates a `doctor_block` for the time window
- This prevents double-booking
- Blocks are created with `reason: "Accepted booking request"`
- Manual blocks (lunch, vacation) are separate from booking blocks

---

## Scheduling Rules

### Availability Model
- Availability is a weekly recurring template (7 documents max per doctor)
- One document per day of week (monday through sunday)
- Each document contains time ranges for that day
- `isOff: true` overrides all time ranges for that day
- Duration is constant per day (all slots same length)

### Block Model
- Blocks are specific datetime exceptions to availability
- Blocks can be created manually by doctors
- Blocks are created automatically when booking requests accepted
- Blocks are public-read (patients should subtract during slot generation — currently a bug)
- Blocks do not repeat weekly (feature not yet implemented)

### Slot Generation
- Slot generation is 100% client-side (no extra Firestore reads)
- Algorithm iterates next 60 days
- Matches date's day-of-week to availability document
- Generates slots at configured duration intervals
- Filters slots that are in the past
- **BUG**: Currently does not subtract doctor blocks

---

## Prescription Rules

### Prescription Creation
- Only doctors can create prescriptions
- Prescription must be linked to an existing appointment
- Prescription cannot be created without appointment ID
- Prescription data is structured (eye data, diagnosis, medications)
- Prescriptions are NOT file uploads

### Prescription Ownership
- Patients can view their own prescriptions
- Doctors can view prescriptions for their own appointments
- Admins can view all prescriptions
- Patients cannot modify prescriptions
- Only the prescribing doctor can modify their own prescriptions

### Prescription Data
- Eye data includes sph, cyl, axis, VA for both eyes
- Near vision data is optional
- Pupillary distance is required
- Diagnosis and findings are required fields
- Medications field also used for glasses/lens recommendations

---

## Authentication Rules

### Role Assignment
- Patient accounts ALWAYS created with `role: "patient"` via `authService.signUp()`
- Doctor accounts ONLY created via invite flow + Admin SDK
- Admin accounts NEVER created via automated flow (manual Firestore/Console only)
- Role cannot be changed via client-side Firestore writes (blocked by security rules)
- Only admins can modify roles via Admin SDK

### Onboarding State
- Patient onboarding: `onboarding.patientCompleted` set to `true` when profile updated
- Doctor onboarding: `onboarding.doctorCompleted` set to `true` when invite completed
- `onboardingCompleted` computed as `patientCompleted || doctorCompleted`
- Users with incomplete onboarding redirected to profile/invite

### Session Management
- Firebase Auth manages sessions via `__session` cookie
- Middleware checks cookie presence only (not role verification)
- Role verification happens in layout components
- Server-side auth uses Admin SDK for token verification

---

## Support System Rules

### Ticket Creation
- Only patients can create tickets
- Tickets start with `status: "open"`
- Tickets are per-user scoped
- Category is required (billing, technical, appointment, prescription, general)
- Priority defaults to "medium"

### Ticket Management
- Only admins can update ticket status
- Only admins can add responses
- Responses include author ID, author name, message, timestamp
- Internal-only responses possible (`isInternal: true`)
- Patients cannot modify or delete tickets

### Ticket Lifecycle
- `open` → `in_progress` → `resolved` → `closed`
- Status progression is one-way (cannot go backward)
- `resolvedAt` timestamp set when status becomes "resolved"

---

## Payment Rules (Future)

### Payment Creation
- Payments must be linked to appointments
- Payments must use Razorpay for Indian market
- Payment webhook MUST be verified with signature
- Payment status progression: `pending` → `processing` → `completed`/`failed`
- Refunds must track `refundReason` and `refundedAt`

### Payment Constraints
- Payments cannot be modified after `status: "completed"`
- Payment gateway secrets must be server-only
- Razorpay keys must NOT use `NEXT_PUBLIC_` prefix

---

## Doctor Invite Rules

### Invite Creation
- Only admins can create invites
- Invite email must be unique
- Invite token is 128-bit random hex
- Invite expires in 7 days from creation
- Invite status starts as "pending"

### Invite Acceptance
- Invite page is PUBLIC (no auth required)
- Invite token validation happens server-side
- All Firestore writes during onboarding use Admin SDK
- Client-side code READS ONLY for invite data
- Invite status progression: `pending` → `opened` → `completed`

### Invite Constraints
- Invite cannot be reused after completion
- Invite cannot be accepted after expiry
- Invite cannot create admin accounts
- Existing user check prevents duplicate accounts

---

## Admin Rules

### Admin Access
- Only users with `role: "admin"` can access admin routes
- Role enforcement happens in layout components
- Admin cannot self-create admin role
- Admin cannot modify security rules from UI

### Admin Operations
- Admins can view all users
- Admins can deactivate users (set `isActive: false`)
- Admins can manage doctors (view, deactivate)
- Admins can manage services (CRUD)
- Admins can manage support tickets

### Admin Constraints
- Admins cannot delete critical data without confirmation
- Admins cannot modify user passwords
- Admins cannot bypass Firestore security rules

<!-- SECTION:24 -->
# 24. STATE TRANSITION TABLES

This section documents all valid and invalid state transitions for important entities. Future contributors must enforce these transitions to prevent state corruption.

---

## Appointments

| Current State | Allowed Next States | Who Can Transition | Invalid Transitions |
|---|---|---|---|
| `pending` | `confirmed` | Doctor (via booking request acceptance) | `pending` → `completed` (must accept first) |
| `confirmed` | `in_progress`, `cancelled` | Doctor (to in_progress), Patient (to cancelled) | `confirmed` → `completed` (must start first) |
| `in_progress` | `completed`, `cancellation_requested` | Doctor (to completed), Doctor (to cancellation_requested) | `in_progress` → `cancelled` (must request cancellation first) |
| `cancellation_requested` | `cancelled` | Patient (confirming cancellation) | `cancellation_requested` → `completed` (cannot revert) |
| `cancelled` | None (terminal) | — | Cannot transition from cancelled |
| `completed` | None (terminal) | — | Cannot transition from completed |

**Notes:**
- Appointments never start at `pending` — they start at `confirmed` after booking request acceptance
- `cancellation_requested` is a doctor-initiated state that requires patient confirmation
- Once cancelled or completed, appointment is immutable

---

## Booking Requests

| Current State | Allowed Next States | Who Can Transition | Invalid Transitions |
|---|---|---|---|
| `pending` | `accepted`, `rejected`, `cancelled` | Doctor (to accepted/rejected), Patient (to cancelled) | `pending` → `completed` (not a valid state) |
| `accepted` | None (terminal) | — | Cannot transition from accepted (links to appointment) |
| `rejected` | None (terminal) | — | Cannot transition from rejected |
| `cancelled` | None (terminal) | — | Cannot transition from cancelled |
| `reschedule_requested` | `accepted`, `rejected` | Doctor (to accepted/rejected with proposed time) | `reschedule_requested` → `cancelled` (must reject first) |

**Notes:**
- Once accepted, booking request becomes immutable and links to created appointment
- `reschedule_requested` is a future state not yet implemented
- Rejected requests can be re-created as new requests

---

## Support Tickets

| Current State | Allowed Next States | Who Can Transition | Invalid Transitions |
|---|---|---|---|
| `open` | `in_progress`, `closed` | Admin (to in_progress), Admin (to closed) | `open` → `resolved` (must go through in_progress) |
| `in_progress` | `resolved`, `closed` | Admin (to resolved), Admin (to closed) | `in_progress` → `open` (cannot revert) |
| `resolved` | `closed` | Admin (to closed) | `resolved` → `open` or `in_progress` (cannot reopen) |
| `closed` | None (terminal) | — | Cannot transition from closed |

**Notes:**
- Status progression is one-way only
- `resolvedAt` timestamp set when transitioning to `resolved`
- Closed tickets cannot be reopened

---

## Doctor Invites

| Current State | Allowed Next States | Who Can Transition | Invalid Transitions |
|---|---|---|---|
| `pending` | `opened`, `expired`, `cancelled` | Doctor (to opened), System (to expired), Admin (to cancelled) | `pending` → `completed` (must open first) |
| `opened` | `completed`, `expired`, `failed` | Server (to completed), System (to expired), Server (to failed) | `opened` → `pending` (cannot revert) |
| `completed` | None (terminal) | — | Cannot transition from completed |
| `expired` | None (terminal) | — | Cannot transition from expired |
| `cancelled` | None (terminal) | — | Cannot transition from cancelled |
| `failed` | None (terminal) | — | Cannot transition from failed |

**Notes:**
- `pending` → `opened` happens when doctor visits invite page
- `opened` → `completed` happens when doctor completes onboarding form
- System auto-transitions to `expired` after 7 days
- `failed` state used when onboarding encounters errors

---

## Payments (Future)

| Current State | Allowed Next States | Who Can Transition | Invalid Transitions |
|---|---|---|---|
| `pending` | `processing`, `cancelled` | Server (to processing), Patient (to cancelled) | `pending` → `completed` (must process first) |
| `processing` | `completed`, `failed` | Webhook (to completed), Webhook (to failed) | `processing` → `cancelled` (must fail first) |
| `completed` | `refunded` | Admin (to refunded) | `completed` → `pending` (cannot revert) |
| `failed` | `pending` (retry) | Patient (to pending for retry) | `failed` → `completed` (must process again) |
| `cancelled` | None (terminal) | — | Cannot transition from cancelled |
| `refunded` | None (terminal) | — | Cannot transition from refunded |

**Notes:**
- `processing` → `completed`/`failed` happens via Razorpay webhook
- `refunded` state tracks refund with `refundReason` and `refundedAt`
- Failed payments can be retried by transitioning back to `pending`

---

## User Account Status

| Current State | Allowed Next States | Who Can Transition | Invalid Transitions |
|---|---|---|---|
| `isActive: true` | `isActive: false` | Admin (deactivation) | — |
| `isActive: false` | `isActive: true` | Admin (reactivation) | — |
| `isSuspended: false` | `isSuspended: true` | Admin (suspension) | — |
| `isSuspended: true` | `isSuspended: false` | Admin (unsuspension) | — |

**Notes:**
- `isActive: false` prevents login (enforced by middleware or layout)
- `isSuspended: true` prevents login but preserves data
- Both flags can be set independently

<!-- SECTION:25 -->
# 25. ARCHITECTURAL DECISIONS & RATIONALE

This section documents WHY each major architectural decision exists. Future contributors must understand the rationale before considering changes.

---

## Why Firestore Over SQL

**Decision:** Use Firebase Firestore (NoSQL) instead of a SQL database like PostgreSQL.

**Rationale:**
- **Zero infrastructure:** No server provisioning, no connection pooling, no migrations
- **Real-time capability:** Built-in real-time listeners (though not currently used)
- **Built-in auth integration:** Firebase Auth and Firestore share the same user identity system
- **Mobile-first:** Firestore has excellent mobile SDKs for future React Native app
- **Scalability:** Automatic scaling without manual sharding or replication
- **Security rules:** Declarative, role-based access control at the database level
- **Cost-effective for MVP:** Pay-as-you-go pricing, no fixed server costs

**Alternatives rejected:**
- PostgreSQL + Prisma: Requires server infrastructure, more complex to deploy
- MongoDB: Similar benefits but requires self-hosting or Atlas (more complex than Firebase)
- Supabase: Good alternative but Firebase's security rules are more mature

**Future contributors must preserve:**
- Firestore as the primary database
- Security rules as the primary access control mechanism
- No SQL database layer

---

## Why No File Uploads

**Decision:** Store all data as structured Firestore documents instead of file uploads (no Firebase Storage, no S3).

**Rationale:**
- **Prescriptions as data:** Eye prescriptions are highly structured (sph, cyl, axis, VA). Storing as text enables search, analysis, and re-generation.
- **PDF generation on-demand:** Puppeteer renders HTML to PDF from Firestore data. No storage needed.
- **Data portability:** Structured data can be exported, migrated, and analyzed more easily than binary files.
- **Cost reduction:** No storage costs for PDFs, no CDN costs for serving files.
- **Version control:** Data changes are trackable. File uploads create unversioned blobs.
- **Consistency:** All data lives in one system (Firestore). No split between database and file storage.

**Alternatives rejected:**
- Firebase Storage: Would require managing file lifecycle, cleanup, and CDN
- S3: Adds external dependency, increases complexity
- Base64 in Firestore: Would hit document size limits (1MB per doc)

**Future contributors must preserve:**
- Prescriptions as structured data
- PDF generation from data
- No file upload infrastructure unless absolutely necessary

---

## Why No Redux

**Decision:** Use React context (`AuthContext`) and local state instead of Redux or other state management libraries.

**Rationale:**
- **Simplicity:** Redux adds significant boilerplate (actions, reducers, dispatchers, selectors)
- **Scale mismatch:** Eye Aura is not a complex application. Global state is minimal (auth only).
- **Context API sufficient:** React Context handles auth state perfectly
- **Bundle size:** Redux adds ~15KB to bundle. Context is built-in.
- **Learning curve:** Redux requires understanding actions, reducers, middleware. Context is straightforward.
- **Data fetching pattern:** Data is fetched on mount via `useEffect`. No need for complex data flow.

**Alternatives rejected:**
- Redux: Over-engineering for this scale
- Zustand: Lighter than Redux but still unnecessary
- Recoil: Facebook's solution, but adds complexity
- Jotai: Atomic state, but not needed

**Future contributors must preserve:**
- Context for auth state only
- Local state for component-specific data
- No global state management library

---

## Why No FullCalendar

**Decision:** Build custom React calendar for doctor slots instead of using FullCalendar.

**Rationale:**
- **Bundle size:** FullCalendar adds ~200KB to JavaScript bundle. Custom implementation is ~5KB.
- **Mobile unusability:** FullCalendar's time grid is unusable on mobile screens. Custom implementation is mobile-first.
- **Design conflict:** FullCalendar's default UI conflicts with Eye Aura's calm design language. Custom implementation uses design tokens.
- **Feature mismatch:** Eye Aura needs weekly availability config + block management. FullCalendar is overkill for this.
- **Customization difficulty:** FullCalendar's theming is complex. Custom React components are easier to style.

**Alternatives rejected:**
- FullCalendar: Too large, not mobile-friendly
- React Big Calendar: Similar issues to FullCalendar
- Calendar.js: Too complex to customize

**Future contributors must preserve:**
- Custom calendar implementation
- Mobile-first calendar UI
- No FullCalendar dependency

---

## Why No Framer Motion

**Decision:** Use CSS transitions instead of Framer Motion for animations.

**Rationale:**
- **Bundle size:** Framer Motion adds ~40KB. CSS transitions are built-in.
- **Simplicity:** CSS transitions are declarative and browser-native.
- **Performance:** CSS transitions are hardware-accelerated. Framer Motion adds JS overhead.
- **Maintenance:** CSS transitions are easier to debug. Framer Motion adds a layer of abstraction.
- **Sufficient:** Eye Aura doesn't need complex physics-based animations. Simple transitions are enough.

**Alternatives rejected:**
- Framer Motion: Overkill for simple transitions
- React Spring: Similar issues to Framer Motion
- GSAP: Too complex for this use case

**Future contributors must preserve:**
- CSS transitions for animations
- No Framer Motion
- Respect `prefers-reduced-motion` accessibility

---

## Why No Video Infrastructure

**Decision:** Use external video platforms (Google Meet, Zoom) instead of building custom video infrastructure.

**Rationale:**
- **Complexity:** Building WebRTC infrastructure is extremely complex (signaling, STUN/TURN servers, peer connection management).
- **Reliability:** Google Meet and Zoom have battle-tested infrastructure. Custom WebRTC is fragile.
- **Cost:** Video infrastructure requires significant server resources (bandwidth, TURN servers).
- **Feature parity:** Meet/Zoom provide screen sharing, recording, chat. Building these from scratch is unrealistic.
- **User familiarity:** Doctors and patients already use Meet/Zoom. No learning curve.

**Alternatives rejected:**
- Custom WebRTC: Too complex, unreliable
- Agora/Twilio Video: Expensive, adds dependency
- Jitsi: Self-hosted, requires infrastructure

**Future contributors must preserve:**
- External video platforms only
- No custom WebRTC infrastructure
- Consultation links stored as URLs in Firestore

---

## Why Request-Based Booking Model

**Decision:** Patients create booking requests, not direct appointments. Doctors accept/reject requests.

**Rationale:**
- **Doctor control:** Doctors control their schedule. They can reject requests that don't fit.
- **Reduced no-shows:** Request/approval model creates commitment. Direct booking increases no-shows.
- **Professional authority:** Doctors review patient needs before accepting. This is standard in healthcare.
- **Flexibility:** Doctors can propose alternative times (reschedule_requested state, not yet implemented).
- **Quality control:** Doctors can filter requests based on their availability and expertise.

**Alternatives rejected:**
- Direct booking: Too transactional, increases no-shows
- Instant booking: Gives patients too much control over doctor schedule

**Future contributors must preserve:**
- Booking request → appointment flow
- Doctor acceptance required
- No direct appointment creation by patients

---

## Why Mobile-First Design

**Decision:** Design for mobile screens first, then scale up to desktop.

**Rationale:**
- **Indian market reality:** Indian patients predominantly use mobile phones. Desktop usage is low.
- **Touch interfaces:** Mobile-first ensures touch targets are large enough.
- **Performance:** Mobile devices have less power. Mobile-first forces performance optimization.
- **Responsive scaling:** It's easier to add complexity for desktop than to simplify for mobile.

**Alternatives rejected:**
- Desktop-first: Would result in poor mobile experience
- Separate mobile app: Unnecessary complexity for MVP

**Future contributors must preserve:**
- Mobile-first breakpoints
- Touch-friendly UI
- Responsive scaling to desktop

---

## Why No Enterprise UX

**Decision:** Avoid enterprise dashboard aesthetics (dense tables, complex filters, many columns).

**Rationale:**
- **Calm wellness focus:** Eye Aura is about eye wellness, not hospital operations. Enterprise UX feels clinical and stressful.
- **Cognitive load reduction:** Enterprise dashboards are information-heavy. Eye Aura prioritizes clarity.
- **Premium feel:** Enterprise UX feels utilitarian. Eye Aura wants to feel premium and approachable.
- **Target audience:** Patients and individual doctors, not hospital IT departments.
- **Differentiation:** Most telehealth platforms look like enterprise software. Eye Aura stands out by being different.

**Alternatives rejected:**
- Enterprise dashboard style: Conflicts with brand identity
- Data-heavy admin panels: Not needed at current scale

**Future contributors must preserve:**
- Calm, minimal UI
- Limited information per screen
- Premium, approachable aesthetic
- No dense tables or complex filters

---

## Why Firebase-Only Backend

**Decision:** No custom server. All backend logic runs in Next.js API routes using Firebase Admin SDK.

**Rationale:**
- **Zero server infrastructure:** No EC2, no Docker, no Kubernetes. Vercel handles hosting.
- **Simplified deployment:** Deploy via `git push`. No server provisioning.
- **Cost reduction:** No always-on server costs. Serverless functions pay per execution.
- **Scalability:** Firebase and Vercel auto-scale. No manual scaling needed.
- **Developer velocity:** No DevOps overhead. Focus on application code.

**Alternatives rejected:**
- Express.js server: Requires infrastructure, more complex deployment
- Node.js API: Same issues as Express
- Serverless functions on AWS: More complex than Vercel

**Future contributors must preserve:**
- Firebase as the only backend
- Next.js API routes for server logic
- No custom server infrastructure

---

## Why Invite-Only Doctors

**Decision:** Doctors can only join via admin invite. No self-registration.

**Rationale:**
- **Quality control:** Admins vet doctors before inviting. Ensures qualified practitioners.
- **Trust:** Patients trust a curated doctor panel. Open registration reduces trust.
- **Onboarding control:** Admins can provide guidance during onboarding.
- **Scalability:** Invite-only model scales better than vetting self-registered doctors.
- **Legal compliance:** Easier to verify credentials before onboarding.

**Alternatives rejected:**
- Self-registration: Would require vetting workflow, reduces quality
- Public sign-up: Would reduce trust, increase risk

**Future contributors must preserve:**
- Invite-only doctor onboarding
- Admin-controlled doctor panel
- No self-registration for doctors

---

## Why Online Payment at Booking (Razorpay)

**Decision:** Collect payment up-front during the booking flow, before the booking request reaches the doctor.

**Rationale:**
- **Commitment:** Pre-payment commits patients. Reduces speculative booking requests.
- **Doctor quality:** Doctors see only paid requests — higher signal, less noise.
- **Server-side verification:** HMAC-SHA256 signature verification ensures payment authenticity. Client cannot forge a successful payment.
- **Separation of concerns:** Payment lifecycle (pending → completed) is decoupled from booking lifecycle (pending → accepted → appointment). Refund logic operates on payment status independently.
- **Razorpay's reach:** Supports UPI, cards, net-banking, wallets — covers the Indian market comprehensively.

**Architecture preserved:**
- `booking_request` is still created ONLY after payment verification — never before
- Doctor still must accept for appointment to be created — payment does not auto-confirm
- Payment and booking_request are separate entities linked via `paymentId` field
- All payment writes via Admin SDK — Firestore rules deny client writes to payments collection

**Alternatives rejected:**
- Payment at consultation (offline): Creates debt collection problem, no commitment from patient
- Pre-paid packages: Adds accounting/credits complexity
- Collect after doctor accepts: Race condition — patient may not pay, doctor slot wasted

---

## Why Admin SDK for Server Writes

**Decision:** All server-side Firestore writes use Firebase Admin SDK, not client SDK.

**Rationale:**
- **Bypass security rules:** Admin SDK has full access. Server operations should not be constrained by client rules.
- **Privileged operations:** Doctor onboarding, invite status updates require elevated permissions.
- **Consistency:** Server operations are trusted. Client operations are untrusted.
- **Security:** Prevents privilege escalation via client SDK.

**Alternatives rejected:**
- Client SDK in API routes: Runs unauthenticated, cannot perform privileged writes

**Future contributors must preserve:**
- Admin SDK for all server-side writes
- Client SDK for client-side reads and limited writes
- Never use client SDK for privileged operations in API routes

<!-- SECTION:26 -->
# 26. PERFORMANCE & SCALABILITY RULES

This section documents performance and scalability philosophy. Future contributors must follow these rules to maintain application performance.

---

## Firestore Optimization Strategy

### Query Philosophy

- **Use composite indexes:** All queries that filter on multiple fields must have corresponding composite indexes in `firestore.indexes.json`
- **Limit result sets:** Always use `.limit()` on queries that could return large result sets
- **Avoid large result sets:** Fetch only the data needed for the current view
- **Pagination for long lists:** Implement cursor-based pagination for lists that could exceed 50 items
- **Avoid unnecessary listeners:** Do not use Firestore real-time listeners (`onSnapshot`) unless real-time updates are explicitly required

### Document Size Limits

- **Stay under 1MB per document:** Firestore has a 1MB document size limit. Keep documents lean.
- **Avoid nested arrays:** Large nested arrays cause performance issues. Use subcollections or separate documents instead.
- **Denormalize when necessary:** Duplicate data across collections to avoid expensive joins.
- **Timestamps only:** Store dates as Firestore `Timestamp`, not strings. Use converters to transform to JS `Date`.

### Read/Write Patterns

- **Batch writes when possible:** Use `batch()` for multiple writes that should succeed together
- **Avoid frequent writes:** Firestore has write quotas. Aggregate writes when possible.
- **Read-heavy optimization:** Structure data for read efficiency. Write complexity is acceptable.
- **Client-side filtering:** For small datasets, fetch more data and filter client-side to reduce query complexity.

---

## Bundle Size Philosophy

### Dependency Management

- **Avoid heavy libraries:** Do not add libraries that add >50KB to bundle unless absolutely necessary
- **Tree-shake aggressively:** Ensure imports are specific (e.g., `import { Button } from "shadcn-ui"` not `import * from "shadcn-ui"`)
- **Remove unused dependencies:** Regularly audit `package.json` and remove unused packages
- **Prefer built-in APIs:** Use browser APIs instead of libraries when possible (e.g., `fetch` instead of `axios`)

### Code Splitting

- **Lazy load heavy components:** Use `next/dynamic` for modals, charts, and non-critical components
- **Route-based splitting:** Next.js App Router automatically splits routes. No manual splitting needed.
- **Avoid large chunks:** Keep individual route chunks under 200KB gzipped

### Monitoring

- **Monitor bundle size:** Use `@next/bundle-analyzer` to identify large chunks
- **Set size budgets:** Configure webpack to fail if bundle exceeds target size
- **Audit regularly:** Check bundle size after significant feature additions

---

## Rendering Philosophy

### Server Components

- **Default to Server Components:** Use Server Components for data fetching. Only use Client Components when interactivity is needed.
- **Minimize Client Components:** Client Components increase bundle size. Use sparingly.
- **Data fetching on server:** Fetch data in Server Components using Admin SDK or fetch. Pass data to Client Components as props.

### Client-Side Rendering

- **Fetch on mount:** Use `useEffect` with `async/await` for data fetching in Client Components
- **Avoid over-fetching:** Fetch only what the component needs
- **Loading states:** Show loading spinners during fetch. Avoid empty states without feedback

### Re-renders

- **Memoize expensive computations:** Use `useMemo` for expensive calculations
- **Memoize callbacks:** Use `useCallback` for callbacks passed to child components
- **Avoid unnecessary state:** Keep component state minimal. Lift state only when necessary

---

## Pagination Strategy

### Cursor-Based Pagination

- **Use cursor pagination:** Use Firestore's `startAfter()` for pagination (not offset-based)
- **Store last document:** Keep track of the last document ID to fetch next page
- **Infinite scroll vs pagination:** Use pagination for predictable navigation. Infinite scroll adds complexity.

### Pagination Rules

- **Default page size:** 20 items per page for lists, 50 for admin tables
- **Maximum page size:** 100 items per page (hard limit)
- **Show total count:** Fetch count separately if total count is needed (use `count()` aggregation query)

---

## Image Optimization Rules

- **Use Next.js Image component:** Always use `next/image` for images
- **Optimize on upload:** Use image optimization service (e.g., Cloudinary, Vercel Blob) if implementing uploads
- **WebP format:** Serve WebP when browser supports it
- **Lazy load below fold:** Use `loading="lazy"` for images below viewport
- **Responsive images:** Provide multiple sizes for responsive images

---

## Caching Expectations

### Browser Caching

- **Static assets:** Vercel handles static asset caching automatically
- **API responses:** Cache GET requests when appropriate (e.g., service catalogue)
- **Cache headers:** Set appropriate `Cache-Control` headers for API routes

### Firestore Caching

- **Firestore SDK caching:** Firestore SDK automatically caches recent reads
- **No manual caching:** Do not implement manual caching layer. Firestore SDK handles this.
- **Offline support:** Firestore SDK provides offline support. Do not implement custom offline logic.

---

## Performance Monitoring

### Web Vitals

- **Monitor Core Web Vitals:** LCP, FID, CLS
- **Set performance budgets:** Fail build if performance degrades
- **Use Vercel Analytics:** Built-in analytics for web vitals

### Firestore Performance

- **Monitor query performance:** Use Firebase Performance Monitoring
- **Identify slow queries:** Optimize queries that take >500ms
- **Monitor read/write quotas:** Stay within Firestore free tier or paid tier limits

---

## Scalability Rules

### Horizontal Scaling

- **Firestore auto-scales:** No manual scaling needed for Firestore
- **Vercel auto-scales:** No manual scaling needed for Next.js on Vercel
- **Puppeteer bottleneck:** PDF generation is CPU-bound. Consider queue if load increases.

### Vertical Scaling

- **Serverless limits:** Vercel functions have execution time limits (60s for Hobby, 900s for Pro)
- **Puppeteer timeout:** PDF generation must complete within function timeout
- **Memory limits:** Stay within Vercel function memory limits (1GB for Hobby, 4GB for Pro)

### Database Scaling

- **Firestore limits:** 1MB per document, 20,000 fields per document
- **Collection size:** No hard limit on collection size, but query performance degrades with large collections
- **Sharding strategy:** If collection grows beyond 10M documents, consider sharding by time or user ID

---

## Anti-Patterns to Avoid

- **Giant client bundles:** Avoid >500KB gzipped bundles
- **Unnecessary re-renders:** Avoid component re-renders that don't change UI
- **Deep component trees:** Avoid deeply nested component trees (>10 levels)
- **Over-fetching:** Avoid fetching data that isn't displayed
- **N+1 queries:** Avoid fetching related data one-by-one. Batch when possible.
- **Blocking main thread:** Avoid synchronous operations that block UI
- **Memory leaks:** Clean up event listeners and subscriptions in `useEffect` cleanup

<!-- SECTION:27 -->
# 27. FIRESTORE DESIGN PHILOSOPHY

This section explains the design philosophy behind Firestore schema and access patterns. Future contributors must understand these principles before modifying the data model.

---

## Why Flat Collections

**Decision:** Use flat top-level collections instead of deeply nested subcollections.

**Rationale:**
- **Query simplicity:** Flat collections are easier to query. No complex collection group queries needed.
- **Index simplicity:** Composite indexes work predictably on flat collections.
- **Portability:** Flat collections are easier to export and migrate.
- **Read performance:** No need to traverse collection hierarchies for common queries.

**Examples:**
- `appointments` is a top-level collection, not `users/{uid}/appointments`
- `prescriptions` is a top-level collection, not `appointments/{id}/prescriptions`
- `doctor_availability` is a top-level collection, not `users/{uid}/availability`

**Exceptions:**
- Subcollections are acceptable for truly hierarchical data where parent-child relationship is strict and query scope is always within parent.

**Future contributors must preserve:**
- Flat collections for core entities
- Subcollections only when parent-child relationship is strict
- Avoid collection group queries (complex, harder to debug)

---

## Why Denormalization Exists

**Decision:** Duplicate data across collections (denormalization) instead of normalizing everything.

**Rationale:**
- **Read efficiency:** Firestore has no joins. Denormalization avoids multiple queries.
- **Query simplicity:** Single query fetches all needed data.
- **Cost reduction:** Fewer reads = lower Firestore costs.
- **Real-time readiness:** Denormalized data works better with real-time listeners (if implemented).

**Examples:**
- `appointments` contains `doctorId`, `patientId`, `serviceId` — no need to fetch related docs for basic display
- `booking_requests` contains `doctorId`, `patientId`, `serviceId` — complete context in one doc
- `prescriptions` contains `patientId`, `doctorId`, `appointmentId` — all relationships preserved

**Trade-offs:**
- **Write complexity:** Updating related data requires multiple writes
- **Data consistency:** Risk of inconsistency if writes fail partially
- **Storage cost:** Slightly higher storage cost (negligible for text data)

**Mitigation:**
- Use batch writes for multi-document updates
- Accept eventual consistency for most use cases
- Use transactions when strong consistency is required (not currently implemented)

**Future contributors must preserve:**
- Denormalization for read-heavy data
- Batch writes for multi-document updates
- Accept eventual consistency for non-critical data

---

## Why Subcollections Are Avoided

**Decision:** Prefer flat collections over subcollections for most entities.

**Rationale:**
- **Query scope:** Subcollections limit query scope to parent. Flat collections enable broader queries.
- **Index management:** Subcollection indexes are per-parent. Flat collection indexes are global.
- **Security rules:** Subcollection rules are more complex to write and debug.
- **Portability:** Flat collections are easier to export and analyze.

**When to use subcollections:**
- Data that is truly owned by parent and never queried independently
- Data that has strict parent-child lifecycle (delete parent → delete children)
- Data that is accessed only within parent context

**Examples of flat collections (not subcollections):**
- `appointments` — queried by patient, doctor, status independently
- `prescriptions` — queried by patient, doctor independently
- `doctor_blocks` — queried by doctor independently

**Future contributors must preserve:**
- Flat collections for independently queried entities
- Subcollections only for strictly parent-owned data
- Avoid subcollection group queries

---

## Indexing Philosophy

**Decision:** Use composite indexes for all multi-field queries. Avoid single-field auto-indexes.

**Rationale:**
- **Query performance:** Composite indexes enable efficient multi-field queries.
- **Predictable behavior:** Explicit indexes make query behavior predictable.
- **Cost control:** Auto-indexes can create unexpected costs.
- **Debugging:** Explicit indexes are easier to understand and debug.

**Indexing rules:**
- Every query with `where()` on multiple fields must have a composite index
- Order matters in composite indexes (must match query order)
- Indexes defined in `firestore.indexes.json`
- Deploy indexes via `firebase deploy --only firestore:indexes`

**Examples:**
- `appointments` query by `patientId` + `scheduledFor` → index: `patientId ASC, scheduledFor DESC`
- `booking_requests` query by `doctorId` + `status` + `createdAt` → index: `doctorId ASC, status ASC, createdAt ASC`

**Future contributors must preserve:**
- Composite indexes for all multi-field queries
- Index definitions in `firestore.indexes.json`
- Deploy indexes via Firebase CLI

---

## Document Ownership Philosophy

**Decision:** Each document has a clear owner. Access control is based on ownership.

**Rationale:**
- **Security:** Ownership-based rules are simple and predictable.
- **Debugging:** Easy to understand who can access what.
- **Audit:** Clear audit trail for data access.

**Ownership patterns:**
- `users/{uid}` owned by user with that UID
- `appointments` owned by patient (can read) and doctor (can read/write status)
- `prescriptions` owned by patient (can read) and doctor (can read/write)
- `doctor_availability` owned by doctor
- `doctor_blocks` owned by doctor
- `services` owned by admin
- `doctor_invites` owned by admin

**Security rules reflect ownership:**
- `allow read: if request.auth != null && (resource.data.patientId == request.auth.uid || resource.data.doctorId == request.auth.uid)`
- `allow write: if request.auth != null && (resource.data.doctorId == request.auth.uid || isAdmin())`

**Future contributors must preserve:**
- Clear ownership for every document
- Security rules based on ownership
- Admin override for critical collections

---

## Public-Read Strategy for Scheduling

**Decision:** `doctor_availability` and `doctor_blocks` are public-read (no auth required).

**Rationale:**
- **Patient booking:** Patients need to see availability before booking. Requiring auth would add friction.
- **Simplicity:** No need to pass auth state to booking page.
- **Performance:** One fewer auth check for a frequently accessed data set.

**Security implications:**
- Public-read is acceptable because data is not sensitive
- Writes are still protected (doctor/admin only)
- No personal data in these collections

**Future contributors must preserve:**
- Public-read for non-sensitive scheduling data
- Write protection for scheduling data
- Public-read only for truly non-sensitive data

---

## Timestamp Philosophy

**Decision:** Store dates as Firestore `Timestamp`, convert to JS `Date` via converters.

**Rationale:**
- **Type safety:** Firestore `Timestamp` is the native date type in Firestore.
- **Timezone safety:** `Timestamp` preserves timezone information.
- **Consistency:** All dates use same type across the codebase.
- **Converter pattern:** Centralized conversion logic in `converters.ts`.

**Converter pattern:**
```typescript
const xxxConverter = {
  toFirestore: (doc) => ({ ...doc, createdAt: serverTimestamp() }),
  fromFirestore: (snap) => ({ ...snap.data(), createdAt: snap.data().createdAt?.toDate() || new Date() }),
};
```

**Future contributors must preserve:**
- Firestore `Timestamp` for storage
- JS `Date` for application logic
- Converters in `services/firestore/converters.ts`
- Never store dates as strings

---

## Document ID Philosophy

**Decision:** Use descriptive document IDs or auto-generated IDs based on business logic.

**Rationale:**
- **Predictability:** Descriptive IDs make debugging easier.
- **Uniqueness:** Business-logic-based IDs prevent duplicates.
- **Readability:** Human-readable IDs are easier to work with in Firebase Console.

**ID patterns:**
- `users`: Firebase Auth UID (auto-generated)
- `appointments`: `{patientId}_{doctorId}_{timestamp}` (predictable, unique)
- `booking_requests`: `{patientId}_{doctorId}_{timestamp}` (predictable, unique)
- `prescriptions`: Auto-generated Firestore ID (sufficient)
- `doctor_invites`: Auto-generated Firestore ID (token is separate field)

**Future contributors must preserve:**
- Descriptive IDs for core entities
- Auto-generated IDs for less critical entities
- Consistent ID patterns per collection

<!-- SECTION:28 -->
# 28. SECURITY ARCHITECTURE

This section documents the complete security architecture. Future contributors must understand these principles before making security-related changes.

---

## Firebase Admin SDK Isolation

**Principle:** Firebase Admin SDK is the only mechanism for privileged operations. It bypasses Firestore security rules entirely.

**Where Admin SDK is used:**
- `/app/api/doctor-onboarding/complete/route.ts` — Doctor account creation, invite status updates
- `/lib/auth-server.ts` — Server-side auth verification
- `/app/api/prescription/pdf/route.tsx` — Prescription verification
- `/lib/firebase-admin.ts` — Alternative Admin SDK initialization

**Why Admin SDK isolation matters:**
- **Privilege escalation prevention:** Client SDK cannot perform privileged writes even with valid auth
- **Server-side trust boundary:** Server operations are trusted. Client operations are untrusted.
- **Security rules bypass:** Admin SDK has full access. Client SDK is constrained by rules.

**Rules:**
- All server-side Firestore writes MUST use Admin SDK
- Never use client SDK in API routes for writes (runs unauthenticated)
- Admin SDK environment variables must NOT use `NEXT_PUBLIC_` prefix

---

## Why Middleware is Minimal

**Principle:** Middleware checks only for session cookie presence. Role verification happens in layout components.

**Why middleware is minimal:**
- **Edge Runtime limitation:** Middleware runs in Edge Runtime, which does NOT support Node.js APIs
- **No Admin SDK in Edge:** Firebase Admin SDK requires Node.js runtime
- **Role verification requires Admin SDK:** Cannot verify roles in middleware
- **Simple is better:** Cookie check is sufficient for basic route protection

**What middleware does:**
- Checks for `__session` or `auth-token` cookie
- Redirects unauthenticated users from protected routes to `/auth/login`
- Redirects authenticated users from `/auth/*` to dashboard

**What middleware does NOT do:**
- Verify Firebase Auth tokens
- Check user roles
- Access Firestore
- Use Admin SDK

**Role enforcement pattern:**
```typescript
// In layout components (e.g., /app/doctor/layout.tsx)
const { user, loading } = useAuth();
useEffect(() => {
  if (!loading && (!user || user.role !== "doctor")) {
    router.push("/auth/login");
  }
}, [user, loading]);
```

**Future contributors must preserve:**
- Minimal middleware (cookie check only)
- Role verification in layout components
- No Admin SDK in middleware

---

## Why Roles Are Enforced in Layouts

**Principle:** Role-based access control is enforced in React layout components, not middleware or API routes.

**Why layouts:**
- **Full React context:** Layout components have access to React Context (`useAuth()`)
- **Client-side state:** Role information is available in client state
- **Flexibility:** Layouts can handle redirects, loading states, error states
- **Simplicity:** No need for server-side role checks in most cases

**Layout enforcement pattern:**
```typescript
// /app/doctor/layout.tsx
const { user, loading } = useAuth();
useEffect(() => {
  if (!loading && (!user || user.role !== "doctor")) {
    router.push("/auth/login");
  }
}, [user, loading]);
if (loading || !user) return <LoadingSpinner />;
return <>{children}</>;
```

**Server-side role checks (when needed):**
```typescript
// In API routes or Server Components
import { requireRole } from "@/lib/auth-server";
const user = await requireRole(["admin", "doctor"]);
```

**Future contributors must preserve:**
- Role enforcement in layout components for client routes
- Server-side role checks only in API routes and Server Components
- No role checks in middleware

---

## Firestore Security Rules Philosophy

**Principle:** Firestore security rules are the primary access control mechanism. They enforce ownership and role-based access.

**Rule patterns:**
- **Ownership-based:** Users can read/write their own data
- **Role-based:** Admins have elevated privileges
- **Public-read for non-sensitive data:** Scheduling data is public-read
- **Client-side constraints:** Prevent privilege escalation via client writes

**Key rule examples:**
```javascript
// Users collection
allow read: if request.auth != null;
allow create: if request.auth != null && request.resource.data.role == "patient";
allow update: if request.auth != null && 
  (request.auth.uid == resource.id || 
   (request.auth.token.email == "admin@eyeaura.com" && 
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(["role", "isActive", "isSuspended"])));

// Appointments collection
allow read: if request.auth != null && 
  (resource.data.patientId == request.auth.uid || 
   resource.data.doctorId == request.auth.uid);
allow create: if request.auth != null && 
  (request.resource.data.patientId == request.auth.uid || 
   resource.data.doctorId == request.auth.uid);
allow update: if request.auth != null && 
  ((resource.data.patientId == request.auth.uid && request.resource.data.status == "cancelled") ||
   (resource.data.doctorId == request.auth.uid && !request.resource.data.diff(resource.data).affectedKeys().hasAny(["patientId", "doctorId", "serviceId", "scheduledFor"])));
```

**Rule deployment:**
- Rules defined in `/firestore.rules`
- Deployed via `firebase deploy --only firestore:rules`
- Rules versioned in Git

**Future contributors must preserve:**
- Ownership-based rules
- Role-based admin override
- Client-side write constraints
- Rules deployment via Firebase CLI

---

## Invite-Token Security

**Principle:** Doctor invite tokens are the only mechanism for doctor account creation. Token security is critical.

**Token generation:**
```typescript
const token = crypto.randomBytes(16).toString("hex"); // 128-bit random hex
```

**Token properties:**
- 128-bit random hex (32 characters)
- Stored in `doctor_invites` document
- Used in invite URL: `/invite/{token}`
- Expires in 7 days

**Token security rules:**
- Token is public (sent in email URL)
- Token alone is not sufficient for account creation
- Server-side validation required (check status, expiry, email match)
- Token cannot be reused after completion

**Invite acceptance flow:**
1. Patient visits `/invite/{token}` (public, no auth)
2. Client reads invite by token (public-read rule)
3. Client submits form to `/api/doctor-onboarding/complete`
4. Server validates token, expiry, status via Admin SDK
5. Server creates doctor account via Admin SDK
6. Server updates invite status to "completed" via Admin SDK

**Security assumptions:**
- Token is hard to guess (128-bit random)
- Token expiry limits attack window
- Server-side validation prevents replay attacks
- Email delivery is assumed secure (Resend uses TLS)

**Future contributors must preserve:**
- 128-bit random tokens
- 7-day expiry
- Server-side validation
- Public-read for invites (invite page must work without auth)

---

## API Route Trust Boundaries

**Principle:** API routes are trusted server-side code. They must validate all inputs and enforce access controls.

**Trust boundary rules:**
- **Never trust client input:** Validate all request bodies
- **Never trust client auth:** Verify tokens server-side
- **Use Admin SDK for writes:** Client SDK in API routes is unauthenticated
- **Return proper HTTP status codes:** 200/201 success, 400 bad request, 401/403 auth errors

**API route auth pattern:**
```typescript
import { requireAuth, requireRole } from "@/lib/auth-server";

// In API route
const user = await requireAuth(); // Throws 401 if no session
const adminUser = await requireRole(["admin"]); // Throws 403 if not admin
```

**Public API routes:**
- `/api/doctor-onboarding/complete` — Uses invite token, not session
- `/api/emails/doctor-invite` — Should be admin-gated (known security gap)
- `/api/prescription/pdf` — Should be auth-gated (known security gap)

**Future contributors must preserve:**
- Server-side input validation
- Server-side auth verification
- Admin SDK for writes
- Proper HTTP status codes

---

## Public vs Protected Collections

**Principle:** Some collections are public-read for UX reasons. Writes are always protected.

**Public-read collections:**
- `doctor_availability` — Patients need to see availability before booking
- `doctor_blocks` — Patients should see blocked times (currently not subtracted in slot generation)
- `doctor_invites` — Invite page must load without auth
- `services` — Service catalogue is public

**Protected collections (auth required):**
- `users` — Personal data
- `appointments` — Patient/doctor data
- `prescriptions` — Medical data
- `booking_requests` — Patient/doctor data
- `support_tickets` — User data
- `payments` — Financial data

**Write protection:**
- All collections have write protection
- Public-read does NOT imply public-write
- Writes require role-based authorization

**Future contributors must preserve:**
- Public-read only for truly non-sensitive data
- Write protection for all collections
- Clear distinction between public-read and protected

---

## Sensitive Operations

**Principle:** Certain operations are privileged and require elevated permissions.

**Privileged operations:**
- Doctor account creation (Admin SDK only)
- Invite status updates (Admin SDK only)
- Role changes (Admin SDK only, manual operation)
- User deactivation (Admin only)
- Service management (Admin only)

**How privileged operations are protected:**
- Admin SDK bypasses Firestore rules but requires server credentials
- Admin SDK environment variables are server-only (no `NEXT_PUBLIC_` prefix)
- Role changes require manual Firestore/Console operation
- Admin role cannot be self-created

**Future contributors must preserve:**
- Admin SDK for privileged operations
- Server-only Admin SDK credentials
- Manual operation for role changes

---

## Known Security Assumptions

**Assumption 1: Email delivery is secure**
- Resend uses TLS for email delivery
- Invite tokens in email URLs are assumed to reach intended recipient
- If email is compromised, invite could be used by attacker

**Assumption 2: Firebase Auth is secure**
- Firebase Auth handles password hashing, session management
- We rely on Firebase Auth's security guarantees
- No custom auth logic implemented

**Assumption 3: Firestore rules are correctly deployed**
- Rules must be deployed via Firebase CLI
- Rules versioned in Git
- No manual rule changes in Firebase Console

**Assumption 4: Admin SDK credentials are secure**
- Admin SDK environment variables are server-only
- Vercel environment variables are encrypted at rest
- No Admin SDK credentials in client code

**Future contributors must preserve:**
- Document security assumptions
- Review assumptions before making changes
- Challenge assumptions if they become invalid

<!-- SECTION:29 -->
# 29. AI AGENT CONTRIBUTION GUIDE

This section provides strict operational rules for future AI agents contributing to Eye Aura. Agents must follow these guidelines to maintain architectural consistency.

---

## Core Principles

1. **Preserve modular architecture** — Do not create giant components. Extract when >300 lines.
2. **Preserve calm wellness UI** — Do not introduce enterprise aesthetics. Keep design calm, minimal, premium.
3. **Preserve mobile-first behavior** — Design for mobile, scale up to desktop.
4. **Reuse existing services** — Do not create duplicate service classes. Use existing Firestore services.
5. **Avoid unnecessary abstractions** — Do not create over-engineered abstraction layers. Keep it simple.
6. **Maintain type safety** — All Firestore documents must have TypeScript interfaces in `/types/firestore.ts`.
7. **Prefer consistency over cleverness** — Follow existing patterns. Do not introduce novel approaches without justification.

---

## Approaching New Features

### Step 1: Read This Document
- Read the relevant sections of this architecture document
- Understand the feature → file responsibility map
- Understand the business rules and constraints
- Understand the data flow maps

### Step 2: Check Existing Patterns
- Look for similar existing features
- Copy the pattern from existing code
- Do not reinvent the wheel

### Step 3: Design for Firestore
- Define the Firestore document structure
- Add TypeScript interface to `/types/firestore.ts`
- Define the converter in `/services/firestore/converters.ts`
- Define the service class in `/services/firestore/xxx.service.ts`
- Add composite index to `/firestore.indexes.json` if needed
- Add security rules to `/firestore.rules` if needed

### Step 4: Implement UI
- Use existing components from `/components/ui/` (Shadcn UI)
- Follow the design system (colors, typography, spacing)
- Use mobile-first breakpoints
- Keep components <300 lines
- Extract reusable components when appropriate

### Step 5: Test
- Manually test the feature end-to-end
- Verify Firestore writes happen correctly
- Verify security rules are enforced
- Verify role-based access control works

---

## Approaching Refactors

### When to Refactor
- Code is >300 lines and cannot be reasonably extracted
- Performance issue requires architectural change
- Security issue requires architectural change
- Business rule requires architectural change

### When NOT to Refactor
- Code is "ugly" but works
- Code uses a pattern you don't like but is consistent with the codebase
- Code is "not how I would do it" but follows Eye Aura patterns

### Refactor Process
1. Document the reason for refactor in this architecture document
2. Make minimal changes to achieve the goal
3. Preserve existing behavior
4. Update tests if they exist
5. Update this architecture document

---

## Handling Firestore Changes

### Adding a New Collection
1. Add TypeScript interface to `/types/firestore.ts`
2. Add converter to `/services/firestore/converters.ts`
3. Create service class in `/services/firestore/xxx.service.ts`
4. Export from `/services/firestore/index.ts`
5. Add security rules to `/firestore.rules`
6. Add composite indexes to `/firestore.indexes.json` if needed
7. Deploy rules and indexes via Firebase CLI
8. Update this architecture document

### Modifying an Existing Collection
1. Update TypeScript interface in `/types/firestore.ts`
2. Update converter if needed
3. Update service class if needed
4. Update security rules if access patterns change
5. Update indexes if query patterns change
6. Deploy rules and indexes via Firebase CLI
7. Update this architecture document

### Deleting a Collection
1. Remove TypeScript interface from `/types/firestore.ts`
2. Remove converter
3. Remove service class
4. Remove from `/services/firestore/index.ts`
5. Remove security rules
6. Remove indexes
7. Deploy rules and indexes via Firebase CLI
8. Update this architecture document

---

## Preserving UI Philosophy

### Design System Rules
- Use the defined color palette (Section 8)
- Use the defined typography (Atkinson Hyperlegible + Luciole display)
- Use the defined spacing and radius rules
- Use the defined animation rules (CSS transitions only)
- Use the defined responsive breakpoints

### Component Rules
- Use Shadcn UI components as building blocks
- Do not modify Shadcn UI components directly
- Extend via composition, not modification
- Keep components <300 lines
- Extract when complexity grows

### Page Rules
- Use `SectionContainer` wrapper for page sections
- Use mobile-first breakpoints
- Limit information per screen
- Use loading states during data fetch
- Use error states when operations fail

---

## Do Not Introduce These Patterns

### State Management
- **Do not introduce Redux** — Use React Context for global state, local state for component state
- **Do not introduce Zustand** — Same as Redux
- **Do not introduce Recoil** — Same as Redux
- **Do not introduce Jotai** — Same as Redux

### Data Fetching
- **Do not introduce SWR** — Current pattern is `useEffect` + async/await
- **Do not introduce React Query** — Current pattern is sufficient
- **Do not introduce Apollo Client** — No GraphQL in this project

### Styling
- **Do not introduce CSS-in-JS libraries** — Use Tailwind CSS
- **Do not introduce styled-components** — Use Tailwind CSS
- **Do not introduce Emotion** — Use Tailwind CSS
- **Do not introduce Sass** — Use Tailwind CSS

### Forms
- **Do not introduce Formik** — Use react-hook-form (if needed)
- **Do not introduce React Hook Form** if not needed — Use native HTML forms
- **Do not introduce Final Form** — Use react-hook-form or native forms

### Animation
- **Do not introduce Framer Motion** — Use CSS transitions
- **Do not introduce React Spring** — Use CSS transitions
- **Do not introduce GSAP** — Use CSS transitions

### Scheduling
- **Do not introduce FullCalendar** — Use custom calendar implementation
- **Do not introduce React Big Calendar** — Use custom calendar implementation
- **Do not introduce Calendar.js** — Use custom calendar implementation

---

## Bypassing Firestore Services

### When to Bypass
- Never bypass Firestore services in client components
- Never bypass Firestore services for reads
- Bypass Firestore services in API routes ONLY when using Admin SDK for writes

### How to Bypass Correctly
```typescript
// In API route, using Admin SDK for writes
import { getAdminDb } from "@/services/firebase/admin";
const adminDb = getAdminDb();
await adminDb.collection("xxx").doc(id).set(data);
```

### How NOT to Bypass
```typescript
// WRONG: Using client SDK in API route for writes
import { getFirebaseDb } from "@/services/firebase/client";
const db = getFirebaseDb();
await db.collection("xxx").doc(id).set(data); // Runs unauthenticated!
```

---

## Maintaining Type Safety

### Firestore Documents
- All Firestore documents must have TypeScript interfaces in `/types/firestore.ts`
- Do not use `any` types for Firestore documents
- Use converters to transform Firestore `Timestamp` to JS `Date`

### API Routes
- Define request/response types for API routes
- Use Zod for runtime validation (if needed)
- Return proper HTTP status codes

### Components
- Define props interfaces for components
- Do not use `any` for props
- Use TypeScript for all component logic

---

## Error Handling

### Client-Side Errors
- Show user-friendly error messages
- Log errors to console for debugging
- Do not expose internal error details to users

### Server-Side Errors
- Return appropriate HTTP status codes (400, 401, 403, 500)
- Log errors for debugging
- Do not expose internal error details in responses

### Firestore Errors
- Handle permission errors gracefully
- Handle network errors gracefully
- Show user-friendly messages

---

## Testing Philosophy (Future)

### Unit Tests
- Test Firestore service methods
- Test utility functions
- Test type converters

### E2E Tests
- Test critical user flows (booking, prescription, invite)
- Test role-based access control
- Test security rules

### When to Add Tests
- Add tests when fixing bugs
- Add tests when adding critical features
- Add tests when refactoring critical code

---

## Documentation Updates

### When to Update This Document
- When adding a new collection
- When modifying an existing collection
- When adding a new major feature
- When changing the architecture
- When changing business rules
- When adding new dependencies

### How to Update
- Add new sections or update existing sections
- Keep the table of contents updated
- Keep the changelog updated
- Be specific and detailed

---

## Final Checklist Before Submitting Changes

- [ ] Read the relevant sections of this architecture document
- [ ] Followed existing patterns (no reinvention)
- [ ] Added TypeScript interfaces for Firestore documents
- [ ] Added converters if needed
- [ ] Added service classes if needed
- [ ] Updated security rules if needed
- [ ] Updated indexes if needed
- [ ] Followed design system rules
- [ ] Kept components <300 lines
- [ ] Used mobile-first breakpoints
- [ ] Did not introduce forbidden dependencies
- [ ] Did not bypass Firestore services incorrectly
- [ ] Maintained type safety
- [ ] Updated this architecture document
- [ ] Tested the changes manually

<!-- SECTION:30 -->
# 30. COMMON PITFALLS & ENGINEERING WARNINGS

This section documents dangerous areas and common mistakes. Future contributors must read this section to prevent regressions.

---

## Middleware Cannot Use Admin SDK

**Pitfall:** Attempting to use Firebase Admin SDK in Next.js middleware.

**Why it fails:**
- Middleware runs in Edge Runtime
- Edge Runtime does NOT support Node.js APIs
- Firebase Admin SDK requires Node.js runtime

**Correct approach:**
- Middleware only checks for cookie presence
- Role verification happens in layout components
- Server-side role checks use Admin SDK in API routes or Server Components

**Example of WRONG code:**
```typescript
// middleware.ts - THIS WILL FAIL
import { getAdminAuth } from "@/services/firebase/admin";
export async function middleware(request: NextRequest) {
  const adminAuth = getAdminAuth(); // ERROR: Edge Runtime
}
```

---

## Firestore Client SDK in API Routes is Unauthenticated

**Pitfall:** Using client-side Firestore SDK in API routes for writes.

**Why it's dangerous:**
- Client SDK in API routes runs without Firebase Auth context
- It's as if an unauthenticated user is making the request
- Firestore security rules will reject the write
- Even if rules allow, it's a security hole

**Correct approach:**
- Use Firebase Admin SDK in API routes for all writes
- Client SDK is for client-side reads and limited writes

**Example of WRONG code:**
```typescript
// app/api/xxx/route.ts - THIS IS DANGEROUS
import { getFirebaseDb } from "@/services/firebase/client";
const db = getFirebaseDb();
await db.collection("xxx").doc(id).set(data); // Unauthenticated!
```

**Example of CORRECT code:**
```typescript
// app/api/xxx/route.ts - CORRECT
import { getAdminDb } from "@/services/firebase/admin";
const adminDb = getAdminDb();
await adminDb.collection("xxx").doc(id).set(data); // Authenticated via Admin SDK
```

---

## Booking Requests Are Not Appointments

**Pitfall:** Treating booking requests as appointments.

**Why it's wrong:**
- Booking requests are pending requests that may be accepted or rejected
- Only doctors can convert booking requests into appointments
- Patients cannot directly create appointments
- Business logic assumes request/approval flow

**Correct approach:**
- Patients create booking requests
- Doctors accept/reject requests
- Acceptance creates appointment
- Never create appointments directly from patient actions

---

## Doctor Availability is Public-Read Intentionally

**Pitfall:** Adding auth requirement to `doctor_availability` or `doctor_blocks` collections.

**Why it's wrong:**
- Patients need to see availability before booking
- Requiring auth adds friction to booking flow
- Data is not sensitive (just time ranges)
- Current design intentionally public-read

**Correct approach:**
- Keep `doctor_availability` public-read
- Keep `doctor_blocks` public-read
- Writes remain protected (doctor/admin only)
- Only add auth requirement if data becomes sensitive

---

## PDF Rendering Depends on Puppeteer Runtime

**Pitfall:** Assuming PDF generation works in any environment.

**Why it's fragile:**
- Puppeteer requires Node.js runtime
- Puppeteer requires specific system libraries
- Puppeteer cold starts are slow
- Vercel function timeout may be exceeded

**Correct approach:**
- PDF generation is server-only
- Monitor PDF generation performance
- Consider queue if load increases
- Handle Puppeteer errors gracefully

---

## Invite Flow Must Remain Public

**Pitfall:** Adding auth requirement to `/invite/[token]` route.

**Why it breaks the flow:**
- Invite page must work without auth (doctor hasn't signed up yet)
- Invite token is the authentication mechanism
- Adding auth requirement breaks onboarding

**Correct approach:**
- Keep `/invite/[token]` public
- Validate token server-side
- Create account server-side via Admin SDK
- Auto-sign-in after account creation

---

## Environment Variables: Admin SDK Keys Must Be Private

**Pitfall:** Adding `NEXT_PUBLIC_` prefix to Firebase Admin SDK environment variables.

**Why it's dangerous:**
- `NEXT_PUBLIC_` prefix exposes variable to browser
- Admin SDK credentials would leak to client
- Attacker could gain full database access

**Correct approach:**
- Admin SDK keys must NOT use `NEXT_PUBLIC_` prefix
- Admin SDK keys are server-only
- Only Firebase web API keys use `NEXT_PUBLIC_` prefix

**Example of WRONG code:**
```bash
# .env.local - WRONG
NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

**Example of CORRECT code:**
```bash
# .env.local - CORRECT
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

---

## Firestore Indexes Must Match Query Order

**Pitfall:** Creating composite indexes in wrong order.

**Why queries fail:**
- Firestore requires index order to match query order
- Query: `where("doctorId", "==", "xxx").where("status", "==", "pending").orderBy("createdAt", "desc")`
- Index must be: `doctorId ASC, status ASC, createdAt DESC`
- Wrong order causes query to fail

**Correct approach:**
- Check query order
- Create index in same order
- Test query after index deployment

---

## Security Rules Must Be Deployed via Firebase CLI

**Pitfall:** Manually editing rules in Firebase Console.

**Why it's dangerous:**
- Console changes are not versioned in Git
- Console changes can be overwritten by CLI deployment
- No audit trail for rule changes
- Hard to collaborate on rule changes

**Correct approach:**
- Edit rules in `/firestore.rules`
- Deploy via `firebase deploy --only firestore:rules`
- Commit rule changes to Git
- Never edit rules in Console

---

## Client-Side Firestore Writes for Doctor Invites

**Pitfall:** Using client-side Firestore SDK to update doctor invite status.

**Why it fails:**
- Firestore rules restrict invite writes to admins only
- Client SDK cannot perform privileged writes
- Results in "Missing or insufficient permissions" error

**Correct approach:**
- All invite status updates use Admin SDK
- Server-side API route handles updates
- Client-side code only reads invite data

---

## Slot Generation Ignores Doctor Blocks (Current Bug)

**Pitfall:** Assuming slot generation subtracts doctor blocks.

**Current state:**
- Slot generation in `/app/booking/page.tsx` does NOT fetch doctor blocks
- Patients can select times that overlap with blocks
- This is a known bug

**Future fix:**
- Fetch doctor blocks during slot generation
- Subtract blocked times from available slots
- Display only available slots

---

## Date Storage as Strings

**Pitfall:** Storing dates as strings in Firestore.

**Why it's wrong:**
- Strings don't preserve timezone information
- No date arithmetic possible
- Inconsistent date formats
- Type safety lost

**Correct approach:**
- Store dates as Firestore `Timestamp`
- Use converters to transform to JS `Date`
- Never store dates as strings

---

## Component State vs URL State

**Pitfall:** Using component state for navigation state that should be in URL.

**Why it's wrong:**
- URL state is shareable
- Component state is lost on page refresh
- Back button doesn't work with component state
- Deep linking doesn't work with component state

**Correct approach:**
- Use URL params for navigation state
- Use component state for transient UI state (modals, dropdowns)
- Use URL search params for filters, pagination, selection

---

## Missing Loading States

**Pitfall:** Not showing loading states during async operations.

**Why it's bad UX:**
- Users don't know if app is working
- Users may click multiple times
- App feels unresponsive
- Users may think app is broken

**Correct approach:**
- Always show loading spinner during fetch
- Disable buttons during submit
- Show skeleton states for lists
- Use optimistic UI when appropriate

---

## Missing Error States

**Pitfall:** Not handling errors gracefully.

**Why it's bad UX:**
- Users see cryptic error messages
- App crashes without feedback
- Users don't know how to recover
- Debugging is harder

**Correct approach:**
- Show user-friendly error messages
- Provide recovery actions (retry, go back)
- Log errors to console for debugging
- Never expose internal error details to users

---

## Over-Fetching Data

**Pitfall:** Fetching more data than needed for the current view.

**Why it's wasteful:**
- Increases Firestore costs
- Slows down rendering
- Increases bundle size
- Unnecessary complexity

**Correct approach:**
- Fetch only fields needed for current view
- Use `.select()` to limit fields
- Fetch related data only when needed
- Denormalize to avoid joins

---

## Giant Client Bundles

**Pitfall:** Adding heavy libraries without monitoring bundle size.

**Why it's bad:**
- Slow initial page load
- Poor mobile performance
- Higher bandwidth costs
- Poor user experience

**Correct approach:**
- Monitor bundle size with `@next/bundle-analyzer`
- Avoid libraries >50KB unless necessary
- Use `next/dynamic` for lazy loading
- Remove unused dependencies

---

## Direct Appointment Creation by Patients

**Pitfall:** Allowing patients to create appointments directly.

**Why it violates business rules:**
- Booking requests are NOT appointments
- Doctors must approve requests
- Direct booking increases no-shows
- Violates request/approval model

**Correct approach:**
- Patients create booking requests
- Doctors accept/reject requests
- Acceptance creates appointment
- Never allow direct appointment creation by patients

---

## Modifying Prescription Data as Unstructured Text

**Pitfall:** Storing prescription data as unstructured text blob.

**Why it's wrong:**
- Cannot search or analyze prescriptions
- Cannot generate consistent PDFs
- Cannot validate prescription fields
- Data is not queryable

**Correct approach:**
- Store prescriptions as structured data
- Define TypeScript interface for prescription fields
- Generate PDF from structured data
- Never store prescriptions as unstructured text

---

## Self-Creating Admin Role

**Pitfall:** Allowing users to set their own role to "admin".

**Why it's a security hole:**
- Admin role has full system access
- Self-elevation is a privilege escalation vulnerability
- Compromised account could take over system

**Correct approach:**
- Admin role can only be set via manual Firestore/Console operation
- Client SDK cannot modify role (blocked by security rules)
- Admin SDK can modify role but requires server credentials
- Never allow self-creation of admin role

<!-- SECTION:31 -->
# 31. UI PATTERN LIBRARY

This section documents UI conventions and when to use them. Future contributors must follow these patterns to maintain UI consistency.

---

## Situation → Preferred Pattern

| Situation | Preferred Pattern | Component/Implementation |
|---|---|---|
| Grouped data | Cards | `Card` from Shadcn UI with `CardHeader`, `CardContent` |
| Multi-step flow | Wizard (stepper) | Custom stepper with progress indicator |
| Status indicator | Badge | `Badge` from Shadcn UI with variant (success/warning) |
| Empty state | Illustration + message | Custom empty state component with icon and text |
| Confirmation action | Modal | `Dialog` from Shadcn UI with confirm/cancel buttons |
| Form submission | Loading button | `Button` with `disabled` and loading state |
| Data list | Simple list or cards | `ul/li` with consistent spacing, or cards for rich items |
| Navigation between sections | Tabs | `Tabs` from Shadcn UI for horizontal navigation |
| Mobile navigation | Bottom nav or hamburger | Custom bottom nav for mobile, hamburger for desktop |
| Date selection | Native date picker | `<input type="date">` styled with Tailwind |
| Time selection | Native time picker | `<input type="time">` styled with Tailwind |
| Rich text display | Markdown or HTML | Render with `react-markdown` if needed |
| File upload (future) | Drag-drop zone | Custom component with visual feedback |
| Search | Input with icon | `Input` from Shadcn UI with search icon |
| Filter | Dropdown or sidebar | `DropdownMenu` from Shadcn UI or sidebar filter |
| Sort | Dropdown | `DropdownMenu` from Shadcn UI |
| Pagination | Simple page buttons | Custom pagination component |
| Alert/Notification | Toast | `useToast` hook from Shadcn UI |
| Error display | Alert banner | `Alert` from Shadcn UI with destructive variant |
| Success display | Alert banner | `Alert` from Shadcn UI with success variant |
| Info display | Alert banner | `Alert` from Shadcn UI with default variant |
| Loading skeleton | Skeleton | `Skeleton` from Shadcn UI |
| Avatar | Avatar component | `Avatar` from Shadcn UI |
| Dropdown menu | Dropdown menu | `DropdownMenu` from Shadcn UI |
| Context menu | Context menu | `ContextMenu` from Shadcn UI |
| Tooltip | Tooltip | `Tooltip` from Shadcn UI |
| Popover | Popover | `Popover` from Shadcn UI |
| Collapsible content | Accordion | `Accordion` from Shadcn UI |
| Switch/toggle | Switch | `Switch` from Shadcn UI |
| Checkbox | Checkbox | `Checkbox` from Shadcn UI |
| Radio group | Radio group | `RadioGroup` from Shadcn UI |
| Select dropdown | Select | `Select` from Shadcn UI |
| Slider | Slider | `Slider` from Shadcn UI |
| Progress bar | Progress | `Progress` from Shadcn UI |

---

## Spacing Rules

### Base Spacing Scale
- Use Tailwind's spacing scale: `4` (16px), `6` (24px), `8` (32px), `12` (48px), `16` (64px)
- Use `space-y-4` for vertical spacing between elements
- Use `gap-4` for grid/flex gaps
- Use `p-4` for padding inside containers
- Use `px-4 py-2` for button padding

### Section Spacing
- Sections: `py-12` (48px vertical padding)
- Subsections: `py-8` (32px vertical padding)
- Cards: `p-6` (24px padding)
- Form groups: `space-y-4` (16px between fields)

### Mobile Spacing
- Reduce spacing on mobile: `py-8` instead of `py-12`
- Use responsive spacing: `py-8 md:py-12`

---

## Typography Hierarchy

### Display Font (Luciole)
- Hero titles: `text-4xl md:text-5xl font-display font-semibold`
- Page titles: `text-3xl font-display font-semibold`
- Section titles: `text-2xl font-display font-medium`

### Body Font (Atkinson Hyperlegible)
- Headings: `text-xl font-semibold`
- Subheadings: `text-lg font-medium`
- Body text: `text-base`
- Small text: `text-sm`
- Caption: `text-xs`

### Text Colors
- Primary text: `text-gray-900` (dark gray)
- Secondary text: `text-gray-600` (medium gray)
- Muted text: `text-gray-500` (light gray)
- Primary action: `text-teal-700` (brand color)
- Success text: `text-green-600`
- Warning text: `text-amber-600`
- Error text: `text-red-600`

---

## Card Usage

### When to Use Cards
- Grouping related information (e.g., appointment details, prescription data)
- Displaying list items with rich content
- Creating visual hierarchy

### Card Structure
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  {actions && <CardFooter>{actions}</CardFooter>}
</Card>
```

### Card Variants
- Default: White background, subtle border
- Active: Teal border, slightly darker background
- Disabled: Gray background, muted text

---

## Button Hierarchy

### Primary Button
- Usage: Main action (submit, confirm, create)
- Style: `bg-teal-700 hover:bg-teal-800 text-white`
- Size: Default `h-10 px-4 py-2`

### Secondary Button
- Usage: Alternative action (cancel, back)
- Style: `bg-gray-100 hover:bg-gray-200 text-gray-900`
- Size: Default `h-10 px-4 py-2`

### Destructive Button
- Usage: Destructive action (delete, remove)
- Style: `bg-red-600 hover:bg-red-700 text-white`
- Size: Default `h-10 px-4 py-2`

### Ghost Button
- Usage: Low-emphasis action (edit, view)
- Style: `hover:bg-gray-100 text-gray-900`
- Size: Default `h-10 px-4 py-2`

### Button States
- Loading: Show spinner, disable button
- Disabled: `opacity-50 cursor-not-allowed`
- Icon-only: `p-2` square button

---

## Empty States

### Empty State Structure
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-gray-400 mb-4" />
  <h3 className="text-lg font-semibold mb-2">Title</h3>
  <p className="text-gray-600 mb-4">Description</p>
  {action && <Button>Action</Button>}
</div>
```

### Empty State Icons
- No appointments: Calendar icon
- No prescriptions: File icon
- No messages: Chat icon
- No data: Database icon

---

## Form Layouts

### Form Structure
```tsx
<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="field">Label</Label>
    <Input id="field" type="text" />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
  {/* More fields */}
  <Button type="submit">Submit</Button>
</form>
```

### Form Rules
- Use `space-y-4` between form groups
- Use `space-y-2` between label, input, and error
- Labels should be above inputs (not beside)
- Error messages below inputs
- Submit button at bottom
- Disable submit during loading

---

## Mobile-First Patterns

### Responsive Breakpoints
- Mobile: Default (no breakpoint)
- Tablet: `md:` (768px)
- Desktop: `lg:` (1024px)

### Mobile Navigation
- Bottom navigation bar for primary navigation
- Hamburger menu for secondary navigation
- Full-width cards on mobile
- Stacked layouts on mobile

### Touch Targets
- Minimum touch target: 44×44px
- Buttons: `h-10` (40px) minimum
- Links: `py-2 px-4` minimum
- Form inputs: `h-10` minimum

---

## Loading States

### Page Loading
- Full-page spinner: Centered in viewport
- Skeleton screens: For content-heavy pages
- Progress bar: For multi-step processes

### Component Loading
- Spinner in button: For form submission
- Skeleton for lists: For data lists
- Shimmer effect: For cards

### Loading Spinner
```tsx
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## Modal Patterns

### Confirmation Modal
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm action</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="secondary">Cancel</Button>
      <Button variant="destructive">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Modal
- Use for complex forms (create, edit)
- Full-screen on mobile
- Centered dialog on desktop

---

## Color Usage

### Brand Colors
- Primary: `teal-700` (#0f766e)
- Primary light: `teal-600` (#0d9488)
- Primary dark: `teal-800` (#115e59)

### Accent Colors
- Gold: `amber-500` (#f59e0b)
- Cream: `stone-50` (#fafaf9)

### Semantic Colors
- Success: `green-600` (#16a34a)
- Warning: `amber-600` (#d97706)
- Error: `red-600` (#dc2626)
- Info: `blue-600` (#2563eb)

### Neutral Colors
- Background: `white` or `stone-50`
- Surface: `white`
- Border: `gray-200`
- Text primary: `gray-900`
- Text secondary: `gray-600`
- Text muted: `gray-500`

---

## Icon Usage

### Icon Library
- Use Lucide React icons
- Consistent icon size: `h-5 w-5` for inline, `h-6 w-6` for headers

### Common Icons
- Calendar: `Calendar`
- Clock: `Clock`
- User: `User`
- Doctor: `Stethoscope`
- Prescription: `FileText`
- Settings: `Settings`
- Logout: `LogOut`
- Menu: `Menu`
- Close: `X`
- Check: `Check`
- Alert: `AlertCircle`
- Success: `CheckCircle`
- Info: `Info`
- Search: `Search`
- Filter: `Filter`
- Sort: `ArrowUpDown`
- Edit: `Pencil`
- Delete: `Trash2`
- Add: `Plus`
- Remove: `Minus`
- Chevron down: `ChevronDown`
- Chevron up: `ChevronUp`
- Chevron left: `ChevronLeft`
- Chevron right: `ChevronRight`

---

## Animation Rules

### CSS Transitions Only
- Use CSS transitions for all animations
- Respect `prefers-reduced-motion` (defined in globals.css)
- Default duration: `duration-200` (200ms)
- Default easing: `ease-in-out`

### Transition Classes
- Fade in: `animate-in fade-in duration-200`
- Slide up: `animate-in slide-in-from-bottom duration-200`
- Scale in: `animate-in zoom-in duration-200`

### When to Animate
- Modal open/close
- Page transitions (if implemented)
- Button hover states
- Card hover states

### When NOT to Animate
- Form inputs (no focus animation beyond outline)
- Static content
- Loading states (spinner is enough)

<!-- SECTION:32 -->
# 32. ERROR HANDLING PHILOSOPHY

This section documents error handling patterns and expectations. Future contributors must follow these patterns to maintain consistent error UX.

---

## Loading State Strategy

### Client-Side Loading
- Show loading spinner during async operations
- Disable buttons during submit to prevent double-submit
- Show skeleton states for data lists
- Show full-page spinner for page-level loading

### Loading State Pattern
```tsx
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await operation();
  } finally {
    setLoading(false);
  }
};

return (
  <Button disabled={loading}>
    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
    {loading ? "Submitting..." : "Submit"}
  </Button>
);
```

---

## Toast Strategy

### When to Use Toasts
- Success feedback (e.g., "Profile updated")
- Error feedback for non-critical errors (e.g., "Failed to save")
- Info notifications (e.g., "Invite sent")

### When NOT to Use Toasts
- Critical errors that block action (use inline error)
- Validation errors (use inline error)
- Loading states (use loading spinner)

### Toast Pattern
```tsx
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();

toast({
  title: "Success",
  description: "Your changes have been saved",
  variant: "default",
});
```

### Toast Variants
- `default`: Info/neutral
- `destructive`: Error
- Custom: Success (green border)

---

## Retry Philosophy

### When to Offer Retry
- Network errors (fetch failed)
- Timeout errors
- Temporary server errors (5xx)

### When NOT to Offer Retry
- Validation errors (4xx)
- Permission errors (401, 403)
- Not found errors (404)
- Business logic errors (invalid state)

### Retry Pattern
```tsx
const [error, setError] = useState<Error | null>(null);

const handleRetry = () => {
  setError(null);
  loadData();
};

if (error) {
  return (
    <div>
      <p className="text-red-600">Failed to load data</p>
      <Button onClick={handleRetry}>Retry</Button>
    </div>
  );
}
```

---

## Optimistic UI Rules

### When to Use Optimistic UI
- Like/unlike actions
- Toggle switches
- Simple status changes

### When NOT to Use Optimistic UI
- Critical operations (payment, appointment booking)
- Complex operations with side effects
- Operations that may fail frequently

### Optimistic UI Pattern
```tsx
const [items, setItems] = useState(initialItems);

const handleToggle = async (id: string) => {
  // Optimistic update
  setItems(items.map(item => 
    item.id === id ? { ...item, active: !item.active } : item
  ));
  
  try {
    await updateItem(id, { active: !item.active });
  } catch (error) {
    // Revert on error
    setItems(items); // or re-fetch
    toast({ title: "Error", description: "Failed to update", variant: "destructive" });
  }
};
```

---

## Server Error Handling

### API Route Error Pattern
```tsx
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // ... operation
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad request (invalid input)
- `401`: Unauthorized (no session)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Internal server error

### Error Response Format
```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE" // optional
}
```

---

## Firestore Write Handling

### Firestore Error Pattern
```tsx
const handleSubmit = async () => {
  try {
    await xxxService.create(data);
    toast({ title: "Success", description: "Created successfully" });
  } catch (error) {
    console.error("Firestore error:", error);
    if (error.code === "permission-denied") {
      toast({ title: "Permission denied", description: "You don't have permission", variant: "destructive" });
    } else if (error.code === "unavailable") {
      toast({ title: "Network error", description: "Please check your connection", variant: "destructive" });
    } else {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  }
};
```

### Common Firestore Error Codes
- `permission-denied`: Security rules rejected the operation
- `unavailable`: Network error or service unavailable
- `already-exists`: Document with same ID exists
- `not-found`: Document does not exist
- `invalid-argument`: Invalid data format

---

## Fallback UX Expectations

### When Data Fails to Load
- Show error message
- Provide retry button
- Show cached data if available
- Do not crash the page

### When Action Fails
- Show error message
- Preserve user input (don't clear form)
- Provide retry option
- Log error for debugging

### Error Message Guidelines
- Be user-friendly (no technical jargon)
- Be specific (what went wrong)
- Be actionable (what user can do)
- Be concise (one sentence preferred)

---

## Inline Error Handling

### Form Validation Errors
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validate = () => {
  const newErrors: Record<string, string> = {};
  if (!email) newErrors.email = "Email is required";
  if (!password) newErrors.password = "Password is required";
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Inline Error Display
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
</div>
```

---

## Error Logging

### Client-Side Error Logging
- Log errors to console for debugging
- Do not expose internal errors to users
- Use `console.error` for errors, `console.log` for debug info

### Server-Side Error Logging
- Log errors with context (user ID, operation, data)
- Do not log sensitive data (passwords, tokens)
- Use structured logging if possible

---

## Error Boundaries

### React Error Boundary (Future)
- Wrap app in Error Boundary to catch component crashes
- Show fallback UI when error occurs
- Log error for debugging
- Provide recovery option (refresh page)

### Error Boundary Pattern
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

---

## Graceful Degradation

### When Feature Fails
- Disable feature temporarily
- Show message explaining issue
- Provide alternative if possible
- Do not break entire app

### Example: PDF Generation Fails
- If Puppeteer fails, show error message
- Provide alternative (show prescription data instead)
- Do not crash the page

---

## Network Error Handling

### Detecting Network Errors
```tsx
const isNetworkError = (error: any) => {
  return error.code === "unavailable" || 
         error.code === "network-request-failed" ||
         !navigator.onLine;
};
```

### Network Error UX
- Show "Network error" message
- Provide retry button
- Show offline indicator if offline
- Queue operations if possible (future)

---

## Timeout Handling

### Timeout Pattern
```tsx
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (operation: Promise<any>, ms: number) => {
  try {
    return await Promise.race([
      operation,
      timeout(ms).then(() => { throw new Error("Timeout"); })
    ]);
  } catch (error) {
    if (error.message === "Timeout") {
      toast({ title: "Timeout", description: "Operation took too long", variant: "destructive" });
    }
    throw error;
  }
};
```

---

## Validation Errors

### Client-Side Validation
- Validate before submitting
- Show inline errors
- Prevent invalid submissions

### Server-Side Validation
- Validate all inputs in API routes
- Return 400 with error messages
- Do not trust client-side validation

---

## Authentication Errors

### 401 Unauthorized
- Redirect to login page
- Clear invalid session
- Show "Session expired" message

### 403 Forbidden
- Show "Permission denied" message
- Redirect to appropriate page
- Do not redirect to login (user is logged in)

---

## Critical vs Non-Critical Errors

### Critical Errors (Block User Action)
- Permission errors
- Authentication errors
- Business logic errors
- Network errors (if blocking)

### Non-Critical Errors (Allow Retry)
- Temporary server errors
- Timeout errors
- Retryable network errors

---

## Error Recovery

### Auto-Recovery
- Retry failed network requests (with exponential backoff)
- Re-fetch data on page refresh
- Re-authenticate on session expiry

### Manual Recovery
- Provide retry button
- Provide refresh page option
- Provide alternative action

<!-- SECTION:33 -->
# 33. ABSOLUTE DO-NOT RULES

This section lists architectural anti-patterns that MUST NEVER be introduced. These rules protect the architecture from degradation.

---

## State Management

### DO NOT Introduce Redux
- Redux is over-engineering for this scale
- React Context is sufficient for global state
- Local state is sufficient for component state
- Redux adds unnecessary boilerplate and bundle size

### DO NOT Introduce Zustand
- Zustand is lighter than Redux but still unnecessary
- No need for global state management
- Use React Context if needed

### DO NOT Introduce Recoil
- Recoil is Facebook's solution but adds complexity
- Not needed for this application scale

### DO NOT Introduce Jotai
- Atomic state is not needed
- Keep it simple with React hooks

---

## Data Fetching

### DO NOT Introduce SWR
- Current pattern (`useEffect` + async/await) is sufficient
- SWR adds complexity for minimal benefit
- No real-time updates required currently

### DO NOT Introduce React Query
- React Query is powerful but unnecessary
- Current data fetching pattern works well
- Adds bundle size and complexity

### DO NOT Introduce Apollo Client
- No GraphQL in this project
- Firestore is the database
- GraphQL would add an unnecessary layer

---

## Styling

### DO NOT Introduce CSS-in-JS Libraries
- Use Tailwind CSS only
- styled-components adds runtime overhead
- Emotion adds runtime overhead
- CSS-in-JS conflicts with Tailwind's utility-first approach

### DO NOT Introduce Sass
- Tailwind CSS replaces Sass
- Sass adds build complexity
- Nesting is discouraged in Tailwind philosophy

---

## Forms

### DO NOT Introduce Formik
- Formik is over-engineering for simple forms
- Native HTML forms work well
- Use react-hook-form only if complex validation is needed

### DO NOT Introduce React Hook Form Unless Needed
- Native HTML forms are sufficient for most cases
- Only use react-hook-form for complex validation
- Keep it simple

### DO NOT Introduce Final Form
- Not needed for this application
- Keep forms simple with native HTML

---

## Animation

### DO NOT Introduce Framer Motion
- CSS transitions are sufficient
- Framer Motion adds 40KB to bundle
- Over-engineering for simple transitions
- Respect `prefers-reduced-motion` with CSS

### DO NOT Introduce React Spring
- CSS transitions are sufficient
- React Spring adds complexity
- Not needed for this application

### DO NOT Introduce GSAP
- GSAP is powerful but overkill
- CSS transitions work well
- Adds significant bundle size

---

## Scheduling

### DO NOT Reintroduce FullCalendar
- Custom calendar is mobile-friendly and lightweight
- FullCalendar adds ~200KB to bundle
- FullCalendar is unusable on mobile
- Custom implementation matches design system

### DO NOT Introduce React Big Calendar
- Same issues as FullCalendar
- Not mobile-friendly
- Conflicts with design system

### DO NOT Introduce Calendar.js
- Too complex to customize
- Custom implementation is simpler
- Not needed for this use case

---

## Database

### DO NOT Introduce SQL Database
- Firestore is the primary database
- No SQL database layer
- No PostgreSQL, MySQL, etc.
- Firestore scales automatically

### DO NOT Introduce MongoDB
- Firestore is the chosen solution
- No self-hosted database
- No Atlas MongoDB
- Stick with Firebase

### DO NOT Introduce Prisma
- No ORM needed for Firestore
- Prisma is for SQL databases
- Firestore has its own SDK

---

## File Storage

### DO NOT Introduce Firebase Storage
- No file uploads currently
- Prescriptions are data, not files
- PDFs are generated on-demand
- Avoid file infrastructure complexity

### DO NOT Introduce S3
- No file uploads currently
- S3 adds external dependency
- Adds cost and complexity

### DO NOT Introduce Cloudinary
- No image uploads currently
- Cloudinary adds external dependency
- Not needed for current features

---

## Server Infrastructure

### DO NOT Introduce Custom Server
- Next.js API routes are sufficient
- No Express.js server
- No Node.js custom server
- Serverless is the architecture

### DO NOT Introduce Docker
- Vercel handles deployment
- No containerization needed
- Adds deployment complexity
- Serverless is the architecture

### DO NOT Introduce Kubernetes
- No orchestration needed
- Firebase and Vercel auto-scale
- Over-engineering for this scale

---

## Authentication

### DO NOT Introduce Custom Auth
- Firebase Auth is the solution
- No custom auth implementation
- No JWT handling manually
- Use Firebase Auth SDK

### DO NOT Introduce Auth0
- Firebase Auth is sufficient
- Auth0 adds external dependency
- Adds cost and complexity

### DO NOT Introduce NextAuth
- Firebase Auth is the chosen solution
- NextAuth is for OAuth providers
- Firebase Auth handles this

---

## Video Infrastructure

### DO NOT Introduce Custom WebRTC
- Use external video platforms
- WebRTC is extremely complex
- External platforms are more reliable
- Custom WebRTC is fragile

### DO NOT Introduce Agora
- External platforms are sufficient
- Agora adds cost
- Not needed for current requirements

### DO NOT Introduce Twilio Video
- External platforms are sufficient
- Twilio adds cost
- Not needed for current requirements

---

## Payment Gateway

### DO NOT Introduce Stripe
- Razorpay is for Indian market
- Stripe is not optimized for India
- Stick with Razorpay when implemented

### DO NOT Introduce PayPal
- Razorpay is the chosen solution
- PayPal adds complexity
- Not optimized for India

### DO NOT Introduce Razorpay Without Webhook Verification
- Webhook signature verification is mandatory
- Never trust unverified webhooks
- Security requirement

---

## Email Service

### DO NOT Introduce SendGrid
- Resend is the chosen solution
- SendGrid adds complexity
- Resend is simpler

### DO NOT Introduce Mailgun
- Resend is the chosen solution
- Mailgun adds complexity
- Resend is simpler

### DO NOT Introduce AWS SES
- Resend is the chosen solution
- AWS SES adds infrastructure
- Resend is simpler

---

## Testing Frameworks

### DO NOT Introduce Jest Without Need
- No tests currently
- Add tests when needed
- Don't add Jest prematurely

### DO NOT Introduce Cypress Without Need
- No E2E tests currently
- Add E2E tests when needed
- Don't add Cypress prematurely

### DO NOT Introduce Playwright Without Need
- No E2E tests currently
- Add E2E tests when needed
- Don't add Playwright prematurely

---

## UI Components

### DO NOT Introduce Material-UI
- Shadcn UI is the chosen solution
- Material-UI conflicts with design system
- Material-UI is enterprise-style

### DO NOT Introduce Chakra UI
- Shadcn UI is the chosen solution
- Chakra UI conflicts with design system
- Shadcn UI is more flexible

### DO NOT Introduce Ant Design
- Shadcn UI is the chosen solution
- Ant Design is enterprise-style
- Conflicts with calm wellness design

---

## Documentation

### DO NOT Modify This Document Without Justification
- This document is the single source of truth
- Update only when architecture changes
- Be specific and detailed

### DO NOT Create Duplicate Documentation
- Keep documentation in one place
- This document is the master reference
- Avoid scattered documentation

### DO NOT Document Trivial Changes
- Document only architectural changes
- Not every code change needs documentation
- Focus on impactful changes

---

## Code Organization

### DO NOT Create Giant Components
- Extract when >300 lines
- Keep components focused
- Modular architecture

### DO NOT Create Giant Abstraction Layers
- Keep it simple
- Avoid over-engineering
- Direct code is better

### DO NOT Create Duplicate Service Classes
- Reuse existing services
- Don't duplicate logic
- Single source of truth

---

## Security

### DO NOT Expose Admin SDK Credentials to Browser
- Admin SDK keys are server-only
- Never use `NEXT_PUBLIC_` prefix
- Security violation

### DO NOT Use Client SDK for Privileged Writes
- Use Admin SDK for privileged operations
- Client SDK is unauthenticated in API routes
- Security violation

### DO NOT Modify Security Rules in Console
- Edit rules in `/firestore.rules`
- Deploy via Firebase CLI
- Version control is mandatory

---

## Performance

### DO NOT Add Heavy Libraries Without Monitoring
- Monitor bundle size
- Avoid libraries >50KB
- Use `@next/bundle-analyzer`

### DO NOT Add Unnecessary Re-renders
- Use `useMemo` and `useCallback` appropriately
- Keep component state minimal
- Avoid unnecessary prop drilling

### DO NOT Fetch More Data Than Needed
- Fetch only fields needed
- Use `.select()` to limit fields
- Denormalize to avoid joins

---

## Business Logic

### DO NOT Allow Direct Appointment Creation by Patients
- Patients create booking requests
- Doctors accept requests
- Request/approval model is mandatory

### DO NOT Allow Self-Creation of Admin Role
- Admin role is manual operation
- Security violation
- Privilege escalation vulnerability

### DO NOT Allow Prescription Creation Without Appointment
- Prescriptions require appointment
- Business rule violation
- Data integrity issue

---

## Deployment

### DO NOT Deploy Rules via Console
- Use Firebase CLI
- Version control is mandatory
- Audit trail required

### DO NOT Deploy Without Testing
- Manual test before deploy
- Verify critical flows
- Smoke test after deploy

### DO NOT Deploy Environment Variables Manually
- Use Vercel environment variables
- Version control `.env.example`
- Never commit `.env.local`

---

## Anti-Patterns Summary

| Anti-Pattern | Why It's Forbidden | Alternative |
|---|---|---|
| Redux | Over-engineering, bundle size | React Context, local state |
| SWR/React Query | Unnecessary complexity | `useEffect` + async/await |
| CSS-in-JS | Conflicts with Tailwind | Tailwind CSS |
| Framer Motion | Bundle size, over-engineering | CSS transitions |
| FullCalendar | Bundle size, not mobile-friendly | Custom calendar |
| Firebase Storage | Unnecessary complexity | Data-only storage |
| Custom server | Unnecessary infrastructure | Next.js API routes |
| Custom auth | Firebase Auth is sufficient | Firebase Auth |
| Custom WebRTC | Too complex, unreliable | External video platforms |
| Material-UI | Conflicts with design system | Shadcn UI |
| Giant components | Hard to maintain | Extract when >300 lines |
| Duplicate services | Violates DRY | Reuse existing services |
| Expose Admin SDK keys | Security violation | Server-only variables |
| Client SDK for privileged writes | Security violation | Admin SDK in API routes |
| Direct appointment creation | Violates business rules | Booking request flow |
| Self-create admin role | Security violation | Manual operation |

<!-- SECTION:34 -->
# 34. PROJECT PHILOSOPHY & PRODUCT IDENTITY

This section deeply documents what Eye Aura IS and what Eye Aura is NOT. Future contributors must preserve this identity.

---

## What Eye Aura IS

### Calm
- Eye Aura is emotionally lightweight
- Reduces anxiety around healthcare
- Uses soothing colors (teal, cream, gold)
- Avoids clinical or stressful aesthetics
- Feels like a spa, not a hospital

### Premium
- Eye Aura feels high-quality
- Uses sophisticated typography (Luciole display)
- Uses refined color palette
- Avoids cheap or generic design
- Feels exclusive, not mass-market

### Wellness-Focused
- Eye Aura is about eye wellness, not just treatment
- Emphasizes prevention and care
- Focuses on long-term eye health
- Not transactional (unlike many telehealth platforms)
- Builds relationships between patients and doctors

### Minimal
- Eye Aura is not cluttered
- Limited information per screen
- Clear hierarchy
- No unnecessary features
- Focus on what matters

### Approachable
- Eye Aura is easy to use
- Simple navigation
- Clear language
- No medical jargon
- Feels welcoming, not intimidating

### Mobile-First
- Eye Aura is designed for mobile devices
- Indian market reality (mobile-dominant)
- Touch-friendly interfaces
- Responsive design
- Works on small screens

---

## What Eye Aura is NOT

### NOT ERP Software
- Eye Aura is not an enterprise resource planning system
- Not for hospital operations
- Not for inventory management
- Not for billing and invoicing (simplified only)
- Not for staff scheduling (simplified only)

### NOT Hospital Operations System
- Eye Aura is not for hospital administration
- Not for bed management
- Not for surgery scheduling
- Not for lab management
- Not for pharmacy management

### NOT Analytics-Heavy Admin Platform
- Eye Aura is not a data analytics platform
- Not for deep business intelligence
- Not for complex reporting
- Not for KPI dashboards
- Not for data visualization

### NOT Enterprise Scheduling Suite
- Eye Aura is not a complex scheduling system
- Not for multi-resource scheduling
- Not for shift management
- Not for calendar integration
- Not for team coordination

### NOT Clinical EMR
- Eye Aura is not a full electronic medical record system
- Not for comprehensive medical history
- Not for lab results
- Not for imaging (PACS)
- Not for clinical notes (simplified only)

### NOT Marketplace
- Eye Aura is not a doctor marketplace
- Not for comparing doctors
- Not for reviews and ratings
- Not for bidding on appointments
- Not for dynamic pricing

### NOT Social Network
- Eye Aura is not a social platform
- Not for patient communities
- Not for doctor networking
- Not for forums or groups
- Not for chat between patients

---

## Emotional Design Goals

### Reduce Healthcare Anxiety
- Healthcare is stressful
- Eye Aura makes it feel calm
- Soothing colors and typography
- Gentle language
- No urgency in design

### Build Trust
- Professional but warm design
- Consistent experience
- Clear communication
- No hidden fees or complexity
- Transparent processes

### Create Emotional Connection
- Not just transactional
- Focus on doctor-patient relationship
- Personal touches (prescription branding)
- Follow-up reminders
- Long-term engagement

---

## User Psychology Goals

### Empower Patients
- Patients feel in control
- Clear information
- Easy booking process
- Access to their data
- Transparent pricing

### Respect Doctors' Time
- Efficient scheduling
- Clear appointment details
- No unnecessary friction
- Focus on consultation, not paperwork
- Automated reminders (future)

### Reduce Cognitive Load
- Simple interfaces
- Limited information per screen
- Clear hierarchy
- No decision paralysis
- Progressive disclosure

---

## Healthcare Experience Philosophy

### Human-Centered
- Technology serves humans, not vice versa
- Doctor-patient relationship is sacred
- Technology should enhance, not replace
- Preserve human touch
- Avoid automation where human interaction matters

### Privacy-First
- Patient data is sacred
- Secure by default
- Minimal data collection
- Clear privacy policy
- No data selling

### Accessibility-First
- Accessible to all users
- Screen reader friendly
- Keyboard navigation
- High contrast options
- Font size options (future)

---

## Cognitive Load Reduction Philosophy

### Information Architecture
- Progressive disclosure
- Show only what's needed when it's needed
- Hide complexity behind simple interfaces
- Use defaults to reduce decisions
- Provide guidance, not overwhelming options

### Decision Support
- Guide users through complex processes
- Provide recommendations
- Simplify choices
- Reduce number of steps
- Clear next actions

### Visual Hierarchy
- Clear primary actions
- Secondary actions de-emphasized
- Information grouped logically
- Use size and color to indicate importance
- Consistent patterns

---

## Design Language

### Color Philosophy
- Teal (primary): Calming, trustworthy, medical
- Gold (accent): Premium, warmth, attention
- Cream (background): Soft, approachable, not sterile white
- Gray (text): Readable, not harsh black
- Semantic colors: Green (success), Red (error), Amber (warning)

### Typography Philosophy
- Luciole display: Friendly, approachable, human
- Atkinson Hyperlegible: Readable, accessible, clear
- Large headings: Clear hierarchy
- Generous line height: Readable
- Limited font sizes: Consistent scale

### Spacing Philosophy
- Generous whitespace: Breathing room
- Consistent spacing: Predictable
- Mobile spacing: Tighter on small screens
- Section breaks: Clear visual separation
- Padding: Comfortable, not cramped

### Shape Philosophy
- Rounded corners: Friendly, approachable
- Soft shadows: Depth without harshness
- No sharp edges: Calm feeling
- Organic shapes: Where appropriate
- Consistent radius: Predictable

---

## Brand Voice

### Tone
- Warm but professional
- Clear but not clinical
- Friendly but not casual
- Confident but not arrogant
- Empathetic but not emotional

### Language
- Simple words
- No medical jargon
- No acronyms
- No buzzwords
- Clear instructions

### Personality
- Caring
- Knowledgeable
- Trustworthy
- Calm
- Professional

---

## Differentiation from Competitors

### vs. Practo
- Practo: Marketplace, reviews, ratings, crowded
- Eye Aura: Curated doctors, calm design, relationship-focused

### vs. Apollo 24|7
- Apollo: Pharmacy-first, crowded, transactional
- Eye Aura: Wellness-focused, calm, relationship-focused

### vs. 1mg
- 1mg: E-commerce, crowded, transactional
- Eye Aura: Wellness-focused, calm, relationship-focused

### vs. Teladoc
- Teladoc: Corporate, enterprise-style, cold
- Eye Aura: Warm, premium, human

### vs. Doctor On Demand
- Doctor On Demand: Urgent care, transactional
- Eye Aura: Wellness-focused, relationship-focused

---

## Target User Persona

### Patient Persona
- Age: 25-55
- Location: Urban India
- Tech-savvy but not technical
- Values: Convenience, trust, quality
- Pain points: Healthcare anxiety, confusing systems, long wait times
- Goals: Easy booking, trusted doctors, clear information

### Doctor Persona
- Age: 30-60
- Location: Urban India
- Tech-savvy but prefers simplicity
- Values: Efficiency, autonomy, fair compensation
- Pain points: Complex scheduling, no-shows, administrative burden
- Goals: Manage schedule easily, see patients efficiently, reduce friction

---

## Brand Promise

### To Patients
"Your eye health, simplified. Book trusted doctors, get clear prescriptions, focus on wellness."

### To Doctors
"Manage your practice effortlessly. Focus on patients, not paperwork."

---

## Brand Values

### Trust
- We are trustworthy
- We protect your data
- We are transparent
- We deliver on promises

### Care
- We care about your health
- We care about your time
- We care about your experience
- We are empathetic

### Simplicity
- We are easy to use
- We are clear
- We are straightforward
- We reduce complexity

### Quality
- We are premium
- We are professional
- We are reliable
- We are consistent

---

## Future Brand Evolution

### What Will Never Change
- Calm wellness design
- Premium feel
- Human-centered approach
- Privacy-first philosophy
- Mobile-first design

### What May Evolve
- Features (as needs change)
- Services (as market changes)
- Technology (as it improves)
- Scale (as we grow)
- Reach (as we expand)

### What Will Be Preserved
- Brand identity
- Design language
- Core values
- User experience philosophy
- Emotional design goals

<!-- SECTION:35 -->
# 35. FUTURE DOCUMENTATION MAINTENANCE RULES

This section documents how to maintain this architecture document going forward. This ensures the document remains relevant and accurate.

---

## When to Update This Document

### Must Update (Mandatory)
- Adding a new Firestore collection
- Modifying an existing Firestore collection schema
- Changing the architecture (e.g., new service layer pattern)
- Changing business rules
- Adding new major features
- Changing security architecture
- Changing deployment architecture
- Adding new dependencies that affect architecture

### Should Update (Recommended)
- Changing UI patterns significantly
- Adding new components that are reused widely
- Changing routing architecture
- Changing authentication flow
- Changing data flow patterns
- Refactoring major systems

### May Update (Optional)
- Minor bug fixes that don't affect architecture
- Small UI tweaks
- Code organization changes that don't affect architecture
- Performance optimizations that don't change architecture

---

## How to Update This Document

### Step 1: Identify the Section
- Determine which section needs updating
- Read the section to understand current state
- Identify what needs to change

### Step 2: Make the Change
- Use the `edit` tool to make precise changes
- Be specific and detailed
- Explain the change in the edit explanation
- Preserve existing content

### Step 3: Update Table of Contents
- If adding a new section, update the table of contents
- Update section numbers if needed
- Ensure internal links still work

### Step 4: Update Changelog
- Add an entry to Section 20 (Changelog)
- Describe the change
- Include date and reason

### Step 5: Commit the Change
- Commit with descriptive message
- Reference this document in commit message
- Example: "docs: Update Section 27 for new collection pattern"

---

## Documentation Style Guidelines

### Be Specific
- Use concrete examples
- Reference actual file paths
- Reference actual function names
- Avoid vague language

### Explain WHY
- Document the rationale, not just the what
- Explain trade-offs
- Explain alternatives considered
- Explain why decisions were made

### Be Complete
- Cover all aspects of the topic
- Don't leave gaps
- Assume reader has no context
- Provide examples

### Be Consistent
- Use consistent terminology
- Use consistent formatting
- Use consistent structure
- Follow existing patterns

### Be Concise
- Avoid unnecessary words
- Avoid repetition
- Focus on what matters
- Use bullet points for lists

---

## Section-Specific Update Guidelines

### Section 1-20: Core Architecture
- Update when core architecture changes
- Update when tech stack changes
- Update when deployment changes
- Update when major features are added

### Section 21: Feature → File Responsibility Map
- Update when new features are added
- Update when file responsibilities change
- Update when features are removed
- Keep the map complete and accurate

### Section 22: Feature Flow Maps
- Update when data flows change
- Update when new flows are added
- Update when flows are removed
- Keep the table up to date

### Section 23: Business Rules & Domain Constraints
- Update when business rules change
- Update when constraints change
- Update when rules are added or removed
- Keep rules current

### Section 24: State Transition Tables
- Update when state transitions change
- Update when new states are added
- Update when transitions are removed
- Keep tables accurate

### Section 25: Architectural Decisions & Rationale
- Add new decisions when made
- Update rationale when understanding changes
- Remove decisions when reversed (document why)
- Keep decision history

### Section 26: Performance & Scalability Rules
- Update when performance rules change
- Update when new performance patterns emerge
- Update when scalability needs change
- Keep rules relevant

### Section 27: Firestore Design Philosophy
- Update when Firestore patterns change
- Update when new collections are added
- Update when design philosophy evolves
- Keep philosophy accurate

### Section 28: Security Architecture
- Update when security architecture changes
- Update when new security patterns are added
- Update when security assumptions change
- Keep security documentation current

### Section 29: AI Agent Contribution Guide
- Update when contribution patterns change
- Update when new rules are added
- Update when forbidden patterns change
- Keep guide relevant for AI agents

### Section 30: Common Pitfalls & Engineering Warnings
- Add new pitfalls when discovered
- Update when pitfalls are fixed
- Remove pitfalls when no longer relevant
- Keep warnings current

### Section 31: UI Pattern Library
- Update when UI patterns change
- Add new patterns when introduced
- Remove patterns when deprecated
- Keep library complete

### Section 32: Error Handling Philosophy
- Update when error handling patterns change
- Add new patterns when introduced
- Update when error expectations change
- Keep philosophy current

### Section 33: Absolute Do-Not Rules
- Add new rules when new anti-patterns emerge
- Update rules when context changes
- Remove rules when no longer applicable
- Keep rules relevant

### Section 34: Project Philosophy & Product Identity
- Update when brand identity evolves
- Update when product positioning changes
- Update when target users change
- Keep philosophy accurate

### Section 35: Future Documentation Maintenance Rules
- Update when documentation process changes
- Update when maintenance rules change
- Keep this section self-referential

---

## Documentation Review Process

### Regular Review Schedule
- Review document quarterly
- Review after major releases
- Review after architecture changes
- Review when new team members join

### Review Checklist
- [ ] All sections are accurate
- [ ] All file paths are correct
- [ ] All code examples are current
- [ ] All business rules are current
- [ ] All state transitions are current
- [ ] All security assumptions are valid
- [ ] All do-not rules are relevant
- [ ] Table of contents is up to date
- [ ] Changelog is up to date

### Review Process
1. Read the entire document
2. Compare document to current codebase
3. Identify discrepancies
4. Update document to match reality
5. Update changelog
6. Commit changes

---

## Documentation Ownership

### Who Can Update
- Any developer can update this document
- Updates should be reviewed by at least one other developer
- Major changes should be discussed with the team

### Who Owns Which Sections
- No formal ownership
- Collaborative ownership
- Team responsibility
- Anyone can fix errors

### Approval Process
- Small changes: Self-approve, commit directly
- Medium changes: Get one review, then commit
- Large changes: Discuss with team, get consensus, then commit

---

## Documentation Versioning

### Versioning Strategy
- Use semantic versioning for the document
- Major version: Architecture changes, new sections
- Minor version: Section updates, pattern changes
- Patch version: Typos, minor clarifications

### Version History
- Keep version history in changelog
- Document major version changes
- Document breaking changes

### Backward Compatibility
- Maintain backward compatibility when possible
- Document breaking changes clearly
- Provide migration guidance if needed

---

## Documentation Accessibility

### Where This Document Lives
- Primary: `/docs/EYE_AURA_MASTER_ARCHITECTURE.md`
- Backup: Git history
- No other copies (avoid duplication)

### Who Should Read This Document
- All developers
- All AI agents contributing to the project
- Designers (for design system sections)
- Future maintainers

### How to Reference This Document
- Link to this document in README
- Link to this document in onboarding materials
- Reference this document in code comments when relevant

---

## Documentation Anti-Patterns

### DO NOT Create Duplicate Documentation
- Keep documentation in one place
- This document is the master reference
- Avoid scattered documentation
- Avoid contradictory documentation

### DO NOT Document Trivial Changes
- Document only architectural changes
- Not every code change needs documentation
- Focus on impactful changes
- Avoid noise

### DO NOT Let Documentation Stagnate
- Keep document current
- Update when architecture changes
- Review regularly
- Remove outdated information

### DO NOT Document Without Understanding
- Understand what you're documenting
- Ask questions if unclear
- Verify accuracy before committing
- Don't guess

---

## Documentation Tools

### Recommended Tools
- Markdown editor (VS Code with Markdown extensions)
- Spell checker
- Link checker (verify internal links)
- Diff tool (compare versions)

### Markdown Best Practices
- Use proper heading hierarchy
- Use proper list formatting
- Use code blocks for code
- Use tables for structured data
- Use bold for emphasis

### Link Management
- Use internal links extensively
- Link related sections
- Link to file paths
- Keep links up to date

---

## Documentation Debt

### What is Documentation Debt
- Outdated sections
- Missing sections
- Inaccurate information
- Incomplete documentation

### How to Reduce Documentation Debt
- Regular reviews
- Update as you go
- Fix when you notice
- Don't let it accumulate

### Documentation Debt Tracking
- Track in project backlog
- Prioritize along with technical debt
- Address in regular sprints
- Keep debt manageable

---

## Final Notes

### This Document is Living
- It will evolve with the project
- It will grow as the project grows
- It will change as the project changes
- It must stay relevant

### This Document is Sacred
- It is the single source of truth
- It must be accurate
- It must be complete
- It must be maintained

### This Document is for Everyone
- It is for developers
- It is for AI agents
- It is for future maintainers
- It is for the project

---

## End of Document

This concludes the EYE_AURA_MASTER_ARCHITECTURE.md document. All 35 sections are complete. This document serves as the permanent engineering memory, AI agent onboarding guide, architectural governance document, and contributor operating manual for the Eye Aura project.

**Document Version:** 1.0.0  
**Last Updated:** [Date when Section 35 was added]  
**Maintained By:** Eye Aura Development Team

<!-- END_OF_DOCUMENT -->

<!-- SECTION:36 -->
# 36. FEATURE → FILE OWNERSHIP MATRIX (OPERATIONAL)

This section provides an operational governance layer for feature ownership. It builds on Section 21 but adds explicit AI-agent safety constraints, change-approval requirements, and anti-drift mechanisms.

---

## Governance Principles

### Change Approval Matrix
| Feature Type | AI Agent Can Modify | Requires Human Review | Breaking Changes |
|---|---|---|---|
| Authentication flow | NO | YES | NO |
| Booking logic | NO | YES | NO |
| Prescription creation | NO | YES | NO |
| Security rules | NO | YES | NO |
| UI components | YES | NO | NO |
| Firestore schema | NO | YES | YES |
| Business rules | NO | YES | YES |

### File Modification Restrictions

**AI-AGENT-RESTRICTED FILES (Human Review Required):**
- `/middleware.ts` — Authentication boundary
- `/lib/auth-server.ts` — Server-side auth verification
- `/services/firebase/admin.ts` — Admin SDK initialization
- `/firestore.rules` — Security rules
- `/firestore.indexes.json` — Database indexes
- `/lib/firebase-admin.ts` — Alternative Admin SDK
- `/app/api/doctor-onboarding/complete/route.ts` — Privileged account creation
- `/app/api/prescription/pdf/route.tsx` — PDF generation

**AI-AGENT-PERMITTED FILES (With Constraints):**
- `/app/patient/*` — Patient UI (must preserve UX patterns)
- `/app/doctor/*` — Doctor UI (must preserve UX patterns)
- `/app/admin/*` — Admin UI (must preserve UX patterns)
- `/components/ui/*` — UI components (must follow design system)
- `/services/firestore/*.service.ts` — Firestore services (must use existing patterns)

---

## Booking System (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/booking/page.tsx` | Booking Team | YES (UI only) | Low |
| `/services/firestore/booking-requests.service.ts` | Backend Team | NO | High |
| `/services/firestore/appointments.service.ts` | Backend Team | NO | High |
| Booking request creation logic | Backend Team | NO | Critical |
| Booking acceptance logic | Backend Team | NO | Critical |
| Doctor block creation on acceptance | Backend Team | NO | Critical |

### Anti-Drift Constraints
- **MUST** always create booking request before appointment
- **MUST** use `bookingRequestsService.acceptRequest()` for all acceptances
- **MUST** create doctor block when accepting request
- **MUST NOT** bypass booking request flow
- **MUST NOT** create appointments directly from patient actions

### Change Approval Process
1. Any change to booking logic requires backend team review
2. Any change to acceptance flow requires security review
3. Any change to block creation requires data integrity review
4. UI changes can proceed with AI agent (if following Section 31 patterns)

### Cross-Reference
- See Section 23 for business rules
- See Section 24 for state transitions
- See Section 27 for Firestore design philosophy

---

## Authentication System (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/middleware.ts` | Security Team | NO | Critical |
| `/lib/auth-server.ts` | Security Team | NO | Critical |
| `/services/auth/auth.service.ts` | Auth Team | NO | High |
| `/contexts/auth-context.tsx` | Frontend Team | YES (UI only) | Medium |
| Firebase Auth configuration | Security Team | NO | Critical |

### Anti-Drift Constraints
- **MUST** preserve middleware cookie-check-only behavior
- **MUST NOT** add Admin SDK to middleware (Edge Runtime limitation)
- **MUST** use Admin SDK for all server-side auth verification
- **MUST** use client SDK for client-side auth operations
- **MUST** enforce roles in layout components, not middleware
- **MUST** preserve `role: "patient"` default for self-signup

### Change Approval Process
1. Any middleware change requires security team review
2. Any auth-server change requires security team review
3. Any role enforcement change requires security review
4. UI context changes can proceed with AI agent

### Cross-Reference
- See Section 28 for security architecture
- See Section 25 for Admin SDK isolation rationale

---

## Scheduling System (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/doctor/slots/page.tsx` | Scheduling Team | YES (UI only) | Low |
| `/services/firestore/doctor-availability.service.ts` | Backend Team | NO | High |
| `/services/firestore/doctor-blocks.service.ts` | Backend Team | NO | High |
| Slot generation algorithm | Backend Team | NO | High |
| Availability model | Backend Team | NO | High |

### Anti-Drift Constraints
- **MUST** preserve two-layer model (availability + blocks)
- **MUST** preserve client-side slot generation (no extra Firestore reads)
- **MUST** preserve weekly recurring availability template
- **MUST NOT** introduce FullCalendar or similar libraries
- **MUST** preserve mobile-first calendar UI
- **MUST** eventually fix block subtraction in slot generation (known bug)

### Change Approval Process
1. Any availability model change requires backend team review
2. Any slot generation algorithm change requires backend team review
3. Any calendar library change requires architecture review
4. UI changes can proceed with AI agent (if following Section 31 patterns)

### Cross-Reference
- See Section 25 for custom calendar rationale
- See Section 33 for FullCalendar prohibition

---

## Prescription System (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/doctor/prescriptions/create/page.tsx` | Prescription Team | YES (UI only) | Low |
| `/app/prescription/print/[id]/page.tsx` | Prescription Team | YES (UI only) | Low |
| `/services/firestore/prescriptions.service.ts` | Backend Team | NO | High |
| `/app/api/prescription/pdf/route.tsx` | Backend Team | NO | High |
| `/components/prescription/PrescriptionTemplate.tsx` | Prescription Team | YES (UI only) | Low |

### Anti-Drift Constraints
- **MUST** preserve structured prescription data (no file uploads)
- **MUST** preserve PDF generation from data (Puppeteer)
- **MUST** require appointment ID for prescription creation
- **MUST** preserve prescription ownership (doctor can modify own, patient can read own)
- **MUST NOT** introduce file upload infrastructure
- **MUST NOT** store prescriptions as unstructured text

### Change Approval Process
1. Any prescription schema change requires backend team review
2. Any PDF generation change requires backend team review
3. Any data model change requires medical team review
4. UI template changes can proceed with AI agent

### Cross-Reference
- See Section 25 for no-file-uploads rationale
- See Section 30 for PDF generation warnings

---

## Support System (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/patient/support/page.tsx` | Support Team | YES (UI only) | Low |
| `/app/admin/support/[id]/page.tsx` | Admin Team | YES (UI only) | Low |
| `/services/firestore/support-tickets.service.ts` | Backend Team | NO | High |
| Ticket status transitions | Backend Team | NO | High |

### Anti-Drift Constraints
- **MUST** preserve one-way status progression (open → in_progress → resolved → closed)
- **MUST** preserve admin-only status updates
- **MUST** preserve admin-only response additions
- **MUST NOT** allow patient to modify ticket status
- **MUST NOT** allow patient to delete tickets

### Change Approval Process
1. Any status transition logic change requires backend team review
2. Any permission change requires security review
3. UI changes can proceed with AI agent

### Cross-Reference
- See Section 23 for support rules
- See Section 24 for ticket state transitions

---

## Payment System (Operational Governance - Future)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| Razorpay integration | Payment Team | NO | Critical |
| Webhook verification | Security Team | NO | Critical |
| `/services/firestore/payments.service.ts` | Backend Team | NO | High |
| Payment status transitions | Backend Team | NO | High |

### Anti-Drift Constraints
- **MUST** use Razorpay for Indian market (not Stripe)
- **MUST** verify webhook signatures (never trust unverified webhooks)
- **MUST** use Admin SDK for payment writes
- **MUST** preserve payment-at-consultation-time philosophy
- **MUST NOT** introduce Stripe or other gateways
- **MUST NOT** expose Razorpay secrets to browser

### Change Approval Process
1. Any payment integration change requires security team review
2. Any webhook change requires security team review
3. Any gateway change requires executive approval

### Cross-Reference
- See Section 25 for payment-at-consultation rationale
- See Section 33 for Razorpay requirement

---

## Notification System (Operational Governance - Future)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| Email service integration | Backend Team | NO | High |
| `/app/api/emails/*` routes | Backend Team | NO | High |
- **MUST** preserve Resend as email provider
- **MUST** use server-side API routes for email sending
- **MUST NOT** expose Resend API key to browser
- **MUST NOT** introduce other email providers

### Change Approval Process
1. Any email provider change requires backend team review
2. Any template change requires marketing team review

### Cross-Reference
- See Section 25 for Resend rationale

---

## Doctor Onboarding (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/invite/[token]/page.tsx` | Onboarding Team | YES (UI only) | Low |
| `/app/api/doctor-onboarding/complete/route.ts` | Backend Team | NO | Critical |
- **MUST** preserve invite-only doctor onboarding
- **MUST** preserve public invite page (no auth required)
- **MUST** use Admin SDK for all onboarding writes
- **MUST** preserve invite status progression (pending → opened → completed)
- **MUST NOT** allow self-registration for doctors
- **MUST NOT** add auth requirement to invite page

### Change Approval Process
1. Any onboarding flow change requires backend team review
2. Any invite security change requires security team review
3. UI changes can proceed with AI agent

### Cross-Reference
- See Section 28 for invite-token security
- See Section 30 for invite flow warnings

---

## Doctor Invites (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/admin/invites/create/page.tsx` | Admin Team | YES (UI only) | Low |
| `/services/firestore/doctor-invites.service.ts` | Backend Team | NO | High |
- **MUST** preserve admin-only invite creation
- **MUST** preserve 128-bit random tokens
- **MUST** preserve 7-day token expiry
- **MUST** preserve public-read for invites (invite page access)
- **MUST NOT** allow self-creation of invites
- **MUST NOT** reuse tokens after completion

### Change Approval Process
1. Any invite security change requires security team review
2. Any token generation change requires security team review

### Cross-Reference
- See Section 28 for invite-token security

---

## Admin Management (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/admin/*` | Admin Team | YES (UI only) | Low |
- **MUST** preserve admin-only access to admin routes
- **MUST** preserve manual admin role creation (no self-creation)
- **MUST** preserve admin role as manual Firestore/Console operation
- **MUST NOT** allow self-elevation to admin role
- **MUST NOT** introduce admin self-creation flow

### Change Approval Process
1. Any admin permission change requires security team review
2. Any role modification change requires executive approval

### Cross-Reference
- See Section 28 for sensitive operations
- See Section 30 for self-creation warning

---

## Patient Dashboard (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/patient/*` | Patient Team | YES (UI only) | Low |
- **MUST** preserve calm wellness aesthetic
- **MUST** preserve mobile-first design
- **MUST** follow Section 31 UI patterns
- **MUST NOT** introduce enterprise dashboard aesthetics
- **MUST NOT** add dense tables or complex filters

### Change Approval Process
1. Any UX pattern change requires design team review
2. UI changes can proceed with AI agent (if following Section 31)

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Doctor Dashboard (Operational Governance)

### Ownership Matrix
| Component | Owner | AI Agent Can Modify | Change Impact |
|---|---|---|---|
| `/app/doctor/*` | Doctor Team | YES (UI only) | Low |
- **MUST** preserve calm wellness aesthetic
- **MUST** preserve mobile-first design
- **MUST** follow Section 31 UI patterns
- **MUST NOT** introduce enterprise dashboard aesthetics
- **MUST NOT** add dense tables or complex filters

### Change Approval Process
1. Any UX pattern change requires design team review
2. UI changes can proceed with AI agent (if following Section 31)

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Cross-Feature Dependencies

### Dependency Graph
```
Authentication → All features (auth prerequisite)
Doctor Invites → Doctor Onboarding → Scheduling → Booking → Appointments
Scheduling → Booking (availability prerequisite)
Booking → Appointments (acceptance creates appointment)
Appointments → Prescriptions (appointment prerequisite)
Services → Booking (service selection)
```

### Dependency Change Rules
- **Authentication changes** affect all features — requires full regression testing
- **Scheduling changes** affect booking — requires booking regression testing
- **Booking changes** affect appointments — requires appointment regression testing
- **Firestore schema changes** affect all dependent features — requires full regression testing

### Change Impact Assessment
Before modifying any file:
1. Identify all dependent features
2. Assess impact on dependent features
3. Plan regression testing
4. Get approval from dependent feature owners

---

## File Modification Checklist

Before modifying any file, AI agents must:

- [ ] Identify file ownership (using matrix above)
- [ ] Check if AI agent is permitted to modify
- [ ] Identify dependent features
- [ ] Assess change impact
- [ ] Cross-reference relevant sections (21-35)
- [ ] Follow anti-drift constraints
- [ ] Preserve existing patterns
- [ ] Update this document if architecture changes

<!-- SECTION:37 -->
# 37. BUSINESS RULES & DOMAIN CONSTRAINTS (OPERATIONAL)

This section provides operational governance for business rules. It builds on Section 23 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints.

---

## Booking Rules (Operational)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
| Booking requests ≠ appointments | Service layer | NO | Critical |
| Only doctors accept requests | Service layer + security rules | NO | Critical |
| Acceptance creates appointment | Service layer | NO | Critical |
| Acceptance creates doctor block | Service layer | NO | Critical |
| Patients cannot create appointments | Service layer + security rules | NO | Critical |

### Validation Requirements
**Before creating booking request:**
- Validate doctor availability (check availability collection)
- Validate doctor is active (`isActive: true`)
- Validate service exists and is active
- Validate patient has completed onboarding

**Before accepting booking request:**
- Validate request is in `status: "pending"`
- Validate doctor owns the request
- Validate doctor is active
- Validate slot is still available (check for overlapping blocks)

**Before cancelling booking request:**
- Validate request is in `status: "pending"`
- Validate patient owns the request
- Validate cancellation is allowed (business rule)

### AI-Agent Safety Constraints
- **MUST** use `bookingRequestsService.createRequest()` for all request creation
- **MUST** use `bookingRequestsService.acceptRequest()` for all acceptances
- **MUST NOT** bypass service layer
- **MUST NOT** create appointments directly
- **MUST NOT** modify booking request status outside service methods

### Cross-Reference
- See Section 23 for business rules
- See Section 24 for state transitions
- See Section 36 for ownership matrix

---

## Scheduling Rules (Operational)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
| Two-layer model (availability + blocks) | Service layer | NO | Critical |
- **MUST** use `doctorAvailabilityService` for availability operations
- **MUST** use `doctorBlocksService` for block operations
- **MUST** preserve weekly recurring availability template
- **MUST** preserve client-side slot generation
- **MUST NOT** introduce FullCalendar or similar libraries
- **MUST NOT** move slot generation to server (performance constraint)

### Validation Requirements
**Before creating availability:**
- Validate day of week is valid
- Validate time ranges do not overlap
- Validate duration is positive
- Validate doctor is active

**Before creating block:**
- Validate doctor owns the block
- Validate block start < block end
- Validate block does not overlap existing blocks (optional, for UX)
- Validate doctor is active

### AI-Agent Safety Constraints
- **MUST** preserve availability as weekly recurring template
- **MUST** preserve blocks as specific datetime exceptions
- **MUST** eventually fix block subtraction in slot generation
- **MUST NOT** introduce complex scheduling libraries
- **MUST NOT** change slot generation to server-side

### Cross-Reference
- See Section 23 for scheduling rules
- See Section 25 for custom calendar rationale
- See Section 36 for ownership matrix

---

## Prescription Rules (Operational)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
- **MUST** use `prescriptionsService.create()` for prescription creation
- **MUST** require appointment ID for prescription creation
- **MUST** validate appointment exists and belongs to doctor
- **MUST** validate appointment is completed
- **MUST** preserve structured prescription data
- **MUST NOT** introduce file upload infrastructure
- **MUST NOT** store prescriptions as unstructured text

### Validation Requirements
**Before creating prescription:**
- Validate appointment ID exists
- Validate appointment belongs to doctor
- Validate appointment status is `completed`
- Validate required fields (eye data, diagnosis)
- Validate pupillary distance is provided

**Before modifying prescription:**
- Validate doctor owns the prescription
- Validate prescription is not locked (future feature)
- Validate modifications are within allowed scope

### AI-Agent Safety Constraints
- **MUST** preserve prescription as structured data
- **MUST** preserve PDF generation from data
- **MUST** preserve prescription ownership rules
- **MUST NOT** allow patients to modify prescriptions
- **MUST NOT** introduce file upload infrastructure

### Cross-Reference
- See Section 23 for prescription rules
- See Section 25 for no-file-uploads rationale
- See Section 36 for ownership matrix

---

## Authentication Rules (Operational)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
- **MUST** use `authService.signUp()` for patient registration
- **MUST** set `role: "patient"` for self-signup
- **MUST** use Admin SDK for doctor account creation
- **MUST** preserve invite-only doctor onboarding
- **MUST** enforce roles in layout components
- **MUST NOT** allow self-creation of admin role
- **MUST NOT** allow role changes via client SDK

### Validation Requirements
**Before patient sign-up:**
- Validate email format
- Validate password strength (if enforced)
- Validate email is not already in use
- Set `role: "patient"` by default

**Before doctor onboarding:**
- Validate invite token exists
- Validate invite status is `pending` or `opened`
- Validate invite has not expired
- Validate email matches invite email

### AI-Agent Safety Constraints
- **MUST** preserve `role: "patient"` default for self-signup
- **MUST** use Admin SDK for doctor account creation
- **MUST** preserve invite-only doctor onboarding
- **MUST NOT** allow self-creation of admin role
- **MUST NOT** allow role changes via client SDK

### Cross-Reference
- See Section 23 for authentication rules
- See Section 28 for security architecture
- See Section 36 for ownership matrix

---

## Support Rules (Operational)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
- **MUST** use `supportTicketsService.create()` for ticket creation
- **MUST** set initial `status: "open"`
- **MUST** preserve one-way status progression
- **MUST** preserve admin-only status updates
- **MUST** preserve admin-only response additions
- **MUST NOT** allow patients to modify ticket status
- **MUST NOT** allow patients to delete tickets

### Validation Requirements
**Before creating ticket:**
- Validate user is authenticated
- Validate category is valid
- Validate message is not empty
- Set `status: "open"` by default

**Before updating ticket status:**
- Validate user is admin
- Validate status transition is valid (one-way)
- Set `resolvedAt` when status becomes `resolved`

### AI-Agent Safety Constraints
- **MUST** preserve one-way status progression
- **MUST** preserve admin-only status updates
- **MUST** preserve admin-only response additions
- **MUST NOT** allow patients to modify ticket status
- **MUST NOT** allow patients to delete tickets

### Cross-Reference
- See Section 23 for support rules
- See Section 24 for state transitions
- See Section 36 for ownership matrix

---

## Payment Rules (Operational - Future)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
- **MUST** use Razorpay for Indian market
- **MUST** verify webhook signatures
- **MUST** use Admin SDK for payment writes
- **MUST** preserve payment-at-consultation-time philosophy
- **MUST NOT** introduce Stripe or other gateways
- **MUST NOT** expose Razorpay secrets to browser

### Validation Requirements
**Before creating payment:**
- Validate appointment exists
- Validate appointment belongs to patient
- Validate amount is positive
- Validate currency is INR

**Before processing webhook:**
- Verify webhook signature
- Validate payment ID exists
- Validate amount matches
- Update payment status based on Razorpay response

### AI-Agent Safety Constraints
- **MUST** use Razorpay for Indian market
- **MUST** verify webhook signatures
- **MUST** use Admin SDK for payment writes
- **MUST NOT** introduce Stripe or other gateways
- **MUST NOT** expose Razorpay secrets to browser

### Cross-Reference
- See Section 23 for payment rules
- See Section 25 for payment-at-consultation rationale
- See Section 36 for ownership matrix

---

## Doctor Invite Rules (Operational)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
- **MUST** preserve admin-only invite creation
- **MUST** generate 128-bit random tokens
- **MUST** set 7-day token expiry
- **MUST** preserve public-read for invites
- **MUST** use Admin SDK for invite status updates
- **MUST NOT** allow self-creation of invites
- **MUST NOT** reuse tokens after completion

### Validation Requirements
**Before creating invite:**
- Validate admin is authenticated
- Validate email is not already invited
- Validate email format
- Generate 128-bit random token
- Set expiry to 7 days from now

**Before accepting invite:**
- Validate invite token exists
- Validate invite status is `pending` or `opened`
- Validate invite has not expired
- Validate email matches invite email
- Use Admin SDK for account creation

### AI-Agent Safety Constraints
- **MUST** preserve admin-only invite creation
- **MUST** generate 128-bit random tokens
- **MUST** set 7-day token expiry
- **MUST** preserve public-read for invites
- **MUST NOT** allow self-creation of invites
- **MUST NOT** reuse tokens after completion

### Cross-Reference
- See Section 23 for doctor invite rules
- See Section 28 for invite-token security
- See Section 36 for ownership matrix

---

## Admin Rules (Operational)

### Rule Enforcement Matrix
| Rule | Enforcement Location | AI Agent Can Modify | Violation Impact |
|---|---|---|---|
- **MUST** preserve admin-only access to admin routes
- **MUST** preserve manual admin role creation
- **MUST** preserve admin role as manual Firestore/Console operation
- **MUST** use Admin SDK for role changes
- **MUST NOT** allow self-elevation to admin role
- **MUST NOT** introduce admin self-creation flow

### Validation Requirements
**Before accessing admin routes:**
- Validate user is authenticated
- Validate user has `role: "admin"`
- Redirect to appropriate page if not admin

**Before modifying user role:**
- Validate modifier is admin
- Validate role change is allowed
- Use Admin SDK for Firestore write
- Document reason for role change

### AI-Agent Safety Constraints
- **MUST** preserve admin-only access to admin routes
- **MUST** preserve manual admin role creation
- **MUST** preserve admin role as manual Firestore/Console operation
- **MUST NOT** allow self-elevation to admin role
- **MUST NOT** introduce admin self-creation flow

### Cross-Reference
- See Section 23 for admin rules
- See Section 28 for sensitive operations
- See Section 36 for ownership matrix

---

## Rule Violation Detection

### Automated Detection (Future)
Implement validation functions that check:
- Booking requests are not created as appointments
- Doctors do not create appointments directly
- Prescriptions require completed appointments
- Admin roles are not self-created
- Invite tokens are not reused

### Manual Detection
During code review, check for:
- Bypass of service layer
- Direct Firestore writes in client components
- Role changes via client SDK
- Business rule violations in new code

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

---

## Rule Change Process

### Proposing a Rule Change
1. Document the current rule
2. Explain why the change is needed
3. Assess impact on existing features
4. Get approval from relevant teams
5. Update this document
6. Implement the change

### Rule Change Approval
- **Booking rules:** Backend team + medical team
- **Scheduling rules:** Backend team + scheduling team
- **Prescription rules:** Backend team + medical team
- **Authentication rules:** Security team
- **Payment rules:** Security team + finance team
- **Admin rules:** Security team + executive approval

### Rule Change Rollout
1. Update this document first
2. Implement validation logic
3. Update service layer
4. Update security rules if needed
5. Deploy to staging
6. Test thoroughly
7. Deploy to production

<!-- SECTION:38 -->
# 38. STATE TRANSITION MATRICES (OPERATIONAL)

This section provides operational governance for state transitions. It builds on Section 24 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing invalid state transitions.

---

## Booking Requests (Operational)

### State Transition Matrix
| Current State | Allowed Next States | Invalid Transitions | Enforcement Location | AI Agent Can Modify |
|---|---|---|---|---|
| pending | accepted, rejected, cancelled | completed | Service layer + security rules | NO |
| accepted | none | pending, rejected, cancelled | Service layer | NO |
| rejected | none | pending, accepted, cancelled | Service layer | NO |
| cancelled | none | pending, accepted, rejected | Service layer | NO |

### Transition Rationale
**Why `pending` → `accepted` is allowed:**
- Doctor has reviewed request
- Slot is confirmed available
- Creates appointment and doctor block
- Business rule: request/approval model

**Why `pending` → `rejected` is allowed:**
- Doctor declined request
- Patient can submit new request
- No side effects

**Why `pending` → `cancelled` is allowed:**
- Patient cancelled before doctor review
- No side effects

**Why `accepted` has no next states:**
- Acceptance is terminal state
- Appointment is created separately
- Booking request is historical record

**Why `rejected` has no next states:**
- Rejection is terminal state
- Patient can submit new request
- No re-opening rejected requests

**Why `cancelled` has no next states:**
- Cancellation is terminal state
- Patient can submit new request
- No re-opening cancelled requests

### Validation Requirements
**Before `pending` → `accepted`:**
- Validate request is in `status: "pending"`
- Validate doctor owns the request
- Validate doctor is active
- Validate slot is still available
- Use `bookingRequestsService.acceptRequest()`

**Before `pending` → `rejected`:**
- Validate request is in `status: "pending"`
- Validate doctor owns the request
- Use `bookingRequestsService.rejectRequest()`

**Before `pending` → `cancelled`:**
- Validate request is in `status: "pending"`
- Validate patient owns the request
- Use `bookingRequestsService.cancelRequest()`

### AI-Agent Safety Constraints
- **MUST** use service methods for all transitions
- **MUST** validate current state before transition
- **MUST** validate ownership before transition
- **MUST NOT** bypass service layer
- **MUST NOT** allow invalid transitions
- **MUST NOT** transition from terminal states

### Cross-Reference
- See Section 24 for state transitions
- See Section 37 for booking rules
- See Section 36 for ownership matrix

---

## Appointments (Operational)

### State Transition Matrix
| Current State | Allowed Next States | Invalid Transitions | Enforcement Location | AI Agent Can Modify |
|---|---|---|---|---|
| scheduled | completed, cancelled | pending | Service layer + security rules | NO |
| completed | none | scheduled, cancelled | Service layer | NO |
| cancelled | none | scheduled, completed | Service layer | NO |

### Transition Rationale
**Why `scheduled` → `completed` is allowed:**
- Consultation completed
- Doctor marks appointment as done
- Enables prescription creation
- Business rule: prescriptions require completed appointments

**Why `scheduled` → `cancelled` is allowed:**
- Appointment cancelled before consultation
- Patient or doctor can cancel
- No side effects

**Why `completed` has no next states:**
- Completion is terminal state
- Historical record of consultation
- No re-opening completed appointments

**Why `cancelled` has no next states:**
- Cancellation is terminal state
- Historical record of cancellation
- No re-opening cancelled appointments

**Why `pending` is invalid:**
- Appointments are created as `scheduled`
- No `pending` state exists
- Booking request handles pending state

### Validation Requirements
**Before `scheduled` → `completed`:**
- Validate appointment is in `status: "scheduled"`
- Validate doctor owns the appointment
- Validate consultation actually occurred
- Use `appointmentsService.completeAppointment()`

**Before `scheduled` → `cancelled`:**
- Validate appointment is in `status: "scheduled"`
- Validate user owns appointment (patient or doctor)
- Validate cancellation is allowed (time-based rule)
- Use `appointmentsService.cancelAppointment()`

### AI-Agent Safety Constraints
- **MUST** use service methods for all transitions
- **MUST** validate current state before transition
- **MUST** validate ownership before transition
- **MUST NOT** bypass service layer
- **MUST NOT** allow invalid transitions
- **MUST NOT** transition from terminal states
- **MUST NOT** create appointments with `status: "pending"`

### Cross-Reference
- See Section 24 for state transitions
- See Section 37 for booking rules
- See Section 36 for ownership matrix

---

## Support Tickets (Operational)

### State Transition Matrix
| Current State | Allowed Next States | Invalid Transitions | Enforcement Location | AI Agent Can Modify |
|---|---|---|---|---|
| open | in_progress, resolved, closed | pending | Service layer + security rules | NO |
| in_progress | resolved, closed | open, pending | Service layer + security rules | NO |
| resolved | closed | open, in_progress, pending | Service layer + security rules | NO |
| closed | none | open, in_progress, resolved, pending | Service layer + security rules | NO |

### Transition Rationale
**Why `open` → `in_progress` is allowed:**
- Admin started working on ticket
- One-way progression (no going back)
- Indicates active work

**Why `open` → `resolved` is allowed:**
- Issue resolved immediately
- Skips `in_progress` state
- One-way progression

**Why `open` → `closed` is allowed:**
- Issue closed without resolution
- One-way progression
- Terminal state

**Why `in_progress` → `resolved` is allowed:**
- Issue resolved after work
- One-way progression
- Sets `resolvedAt` timestamp

**Why `in_progress` → `closed` is allowed:**
- Issue closed without resolution
- One-way progression
- Terminal state

**Why `resolved` → `closed` is allowed:**
- Final closure after resolution
- One-way progression
- Terminal state

**Why terminal states have no next states:**
- Historical record
- No re-opening tickets
- New ticket for new issues

**Why `pending` is invalid:**
- Tickets start as `open`
- No `pending` state exists

### Validation Requirements
**Before `open` → `in_progress`:**
- Validate ticket is in `status: "open"`
- Validate user is admin
- Use `supportTicketsService.updateStatus()`

**Before `open` → `resolved`:**
- Validate ticket is in `status: "open"`
- Validate user is admin
- Validate response is provided
- Use `supportTicketsService.updateStatus()`

**Before any transition:**
- Validate user is admin
- Validate current state
- Validate transition is valid (one-way)
- Use `supportTicketsService.updateStatus()`

### AI-Agent Safety Constraints
- **MUST** use service methods for all transitions
- **MUST** validate user is admin
- **MUST** validate current state before transition
- **MUST** validate one-way progression
- **MUST NOT** bypass service layer
- **MUST NOT** allow patients to modify status
- **MUST NOT** allow invalid transitions
- **MUST NOT** transition from terminal states
- **MUST NOT** transition backwards

### Cross-Reference
- See Section 24 for state transitions
- See Section 37 for support rules
- See Section 36 for ownership matrix

---

## Doctor Invites (Operational)

### State Transition Matrix
| Current State | Allowed Next States | Invalid Transitions | Enforcement Location | AI Agent Can Modify |
|---|---|---|---|---|
| pending | opened, completed, failed | accepted | Service layer + security rules | NO |
| opened | completed, failed | pending, accepted | Service layer + security rules | NO |
| completed | none | pending, opened, failed | Service layer + security rules | NO |
| failed | none | pending, opened, completed | Service layer + security rules | NO |

### Transition Rationale
**Why `pending` → `opened` is allowed:**
- Doctor viewed invite page
- Indicates interest
- No side effects

**Why `pending` → `completed` is allowed:**
- Doctor completed onboarding
- Creates Firebase Auth user
- Creates Firestore user document
- Terminal state

**Why `pending` → `failed` is allowed:**
- Onboarding failed
- Error occurred
- Terminal state

**Why `opened` → `completed` is allowed:**
- Doctor completed onboarding after viewing
- Creates Firebase Auth user
- Creates Firestore user document
- Terminal state

**Why `opened` → `failed` is allowed:**
- Onboarding failed after viewing
- Error occurred
- Terminal state

**Why terminal states have no next states:**
- Historical record
- No re-using invites
- New invite for new onboarding

**Why `accepted` is invalid:**
- Invites are not "accepted"
- They are "completed"
- Different terminology for clarity

### Validation Requirements
**Before `pending` → `opened`:**
- Validate invite is in `status: "pending"`
- Validate invite has not expired
- Use `doctorInvitesService.markAsOpened()`

**Before `pending` → `completed`:**
- Validate invite is in `status: "pending"` or `opened`
- Validate invite has not expired
- Validate email matches invite email
- Use Admin SDK for account creation
- Use `doctorInvitesService.markAsCompleted()`

**Before `pending` → `failed`:**
- Validate invite is in `status: "pending"` or `opened`
- Use `doctorInvitesService.markAsFailed()`

### AI-Agent Safety Constraints
- **MUST** use service methods for all transitions
- **MUST** validate invite has not expired
- **MUST** use Admin SDK for account creation
- **MUST NOT** bypass service layer
- **MUST NOT** allow invalid transitions
- **MUST NOT** transition from terminal states
- **MUST NOT** re-use completed invites
- **MUST NOT** re-use failed invites

### Cross-Reference
- See Section 24 for state transitions
- See Section 37 for doctor invite rules
- See Section 36 for ownership matrix

---

## Payments (Operational - Future)

### State Transition Matrix
| Current State | Allowed Next States | Invalid Transitions | Enforcement Location | AI Agent Can Modify |
|---|---|---|---|---|
| pending | completed, failed | cancelled | Service layer + security rules | NO |
| completed | none | pending, failed, cancelled | Service layer + security rules | NO |
| failed | none | pending, completed, cancelled | Service layer + security rules | NO |

### Transition Rationale
**Why `pending` → `completed` is allowed:**
- Payment succeeded
- Razorpay webhook confirmed
- Terminal state

**Why `pending` → `failed` is allowed:**
- Payment failed
- Razorpay webhook confirmed failure
- Terminal state

**Why terminal states have no next states:**
- Historical record
- No retrying failed payments
- New payment for retry

**Why `cancelled` is invalid:**
- Payments are not cancelled
- They either succeed or fail
- Different business model

### Validation Requirements
**Before `pending` → `completed`:**
- Validate payment is in `status: "pending"`
- Verify webhook signature
- Validate Razorpay response
- Use Admin SDK for payment write
- Use `paymentsService.markAsCompleted()`

**Before `pending` → `failed`:**
- Validate payment is in `status: "pending"`
- Verify webhook signature
- Validate Razorpay failure response
- Use Admin SDK for payment write
- Use `paymentsService.markAsFailed()`

### AI-Agent Safety Constraints
- **MUST** use service methods for all transitions
- **MUST** verify webhook signatures
- **MUST** use Admin SDK for payment writes
- **MUST NOT** bypass service layer
- **MUST NOT** allow invalid transitions
- **MUST NOT** transition from terminal states
- **MUST NOT** allow client SDK for payment writes

### Cross-Reference
- See Section 24 for state transitions
- See Section 37 for payment rules
- See Section 36 for ownership matrix

---

## User Account Status (Operational)

### State Transition Matrix
| Current State | Allowed Next States | Invalid Transitions | Enforcement Location | AI Agent Can Modify |
|---|---|---|---|---|
| active | inactive | pending | Admin SDK + Firestore rules | NO |
| inactive | active | pending | Admin SDK + Firestore rules | NO |

### Transition Rationale
**Why `active` → `inactive` is allowed:**
- Admin deactivated user
- User cannot access system
- Reversible by admin

**Why `inactive` → `active` is allowed:**
- Admin reactivated user
- User can access system again
- Reversible by admin

**Why `pending` is invalid:**
- No `pending` state for user accounts
- Accounts are active immediately after creation
- Different from invite status

### Validation Requirements
**Before `active` → `inactive`:**
- Validate user is in `isActive: true`
- Validate modifier is admin
- Use Admin SDK for Firestore write
- Document reason for deactivation

**Before `inactive` → `active`:**
- Validate user is in `isActive: false`
- Validate modifier is admin
- Use Admin SDK for Firestore write
- Document reason for reactivation

### AI-Agent Safety Constraints
- **MUST** use Admin SDK for status changes
- **MUST** validate modifier is admin
- **MUST** document reason for status change
- **MUST NOT** allow self-deactivation
- **MUST NOT** allow self-reactivation
- **MUST NOT** use client SDK for status changes

### Cross-Reference
- See Section 24 for state transitions
- See Section 37 for admin rules
- See Section 36 for ownership matrix

---

## Transition Violation Prevention

### Automated Validation (Future)
Implement validation functions that:
- Check current state before transition
- Validate transition is allowed
- Validate ownership before transition
- Validate user permissions before transition
- Log all state transitions

### Manual Validation
During code review, check for:
- Direct state field modification (bypassing service)
- Missing state validation
- Invalid transitions
- Backwards transitions
- Terminal state transitions

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

---

## State Transition Testing

### Test Coverage Requirements
For each entity:
- Test all valid transitions
- Test all invalid transitions (should fail)
- Test ownership validation
- Test permission validation
- Test concurrent transitions (if applicable)

### Test Data Management
- Use test Firestore project
- Isolate test data from production
- Clean up test data after tests
- Use deterministic test data

### Test Execution
- Run tests before deployment
- Run tests on every PR
- Run tests on schedule (daily)
- Monitor test results

<!-- SECTION:39 -->
# 39. FIRESTORE DESIGN PHILOSOPHY (OPERATIONAL)

This section provides operational governance for Firestore design decisions. It builds on Section 27 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing Firestore architectural drift.

---

## Flat Collections Philosophy (Operational)

### Why Flat Collections
- **Simplicity:** No complex joins or subcollection navigation
- **Performance:** Single-collection queries are faster
- **Scalability:** Flat collections scale better than deep nesting
- **Flexibility:** Denormalization allows query optimization

### Anti-Drift Constraints
- **MUST** prefer flat collections over subcollections
- **MUST** use subcollections only for one-to-many with clear parent-child relationship
- **MUST NOT** nest subcollections deeper than 2 levels
- **MUST NOT** create subcollections for relationships that should be denormalized

### Validation Requirements
**Before creating a subcollection:**
- Validate that parent-child relationship is strict
- Validate that subcollection data is truly owned by parent
- Validate that queries will not need to span multiple subcollections
- Get approval from backend team

### AI-Agent Safety Constraints
- **MUST** prefer flat collections
- **MUST** document rationale if subcollection is used
- **MUST NOT** introduce deep nesting (3+ levels)
- **MUST NOT** use subcollections for denormalized data

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 36 for ownership matrix

---

## Denormalization Philosophy (Operational)

### Why Denormalization is Acceptable
- **Read performance:** No need for joins
- **Query simplicity:** Single-collection queries
- **Scalability:** Reads are the bottleneck in most apps
- **Cost reduction:** Fewer reads = lower Firestore costs

### Anti-Drift Constraints
- **MUST** denormalize when read performance is critical
- **MUST** document denormalization strategy in this document
- **MUST** update denormalized data atomically (or as close as possible)
- **MUST NOT** denormalize without clear performance benefit
- **MUST NOT** denormalize data that changes frequently (write performance)

### Validation Requirements
**Before denormalizing data:**
- Validate that read performance is a bottleneck
- Validate that data is read more than written
- Validate that denormalization simplifies queries
- Document denormalization strategy

**After denormalizing data:**
- Add comments in code explaining denormalization
- Update this document with denormalization strategy
- Ensure atomic updates (or document limitations)

### AI-Agent Safety Constraints
- **MUST** validate performance benefit before denormalizing
- **MUST** document denormalization strategy
- **MUST NOT** denormalize frequently-changing data
- **MUST NOT** denormalize without clear query benefit

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 26 for performance rules

---

## Document Ownership Philosophy (Operational)

### Why Document Ownership Matters
- **Security:** Firestore rules enforce ownership
- **Data integrity:** Prevents unauthorized modifications
- **Auditability:** Clear ownership for all data
- **Access control:** Role-based access is built on ownership

### Anti-Drift Constraints
- **MUST** define owner field for all collections
- **MUST** enforce ownership in Firestore rules
- **MUST** validate ownership in service layer
- **MUST NOT** create collections without ownership
- **MUST NOT** allow writes without ownership validation

### Validation Requirements
**Before creating a new collection:**
- Define owner field (e.g., `doctorId`, `patientId`)
- Add ownership enforcement to Firestore rules
- Add ownership validation to service layer
- Document ownership model

**Before adding a document:**
- Validate owner field is set
- Validate ownership in service layer
- Validate ownership in Firestore rules

### AI-Agent Safety Constraints
- **MUST** define owner field for all collections
- **MUST** enforce ownership in Firestore rules
- **MUST** validate ownership in service layer
- **MUST NOT** create collections without ownership
- **MUST NOT** bypass ownership validation

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 28 for security architecture

---

## Public-Read Philosophy (Operational)

### Why Public-Read for Scheduling Data
- **Frictionless booking:** Patients can see availability without signing up
- **Better UX:** No auth barrier to viewing availability
- **Performance:** No auth check overhead for availability queries
- **Business model:** Availability is not sensitive data

### Anti-Drift Constraints
- **MUST** keep `doctor_availability` public-read
- **MUST** keep `doctor_blocks` public-read
- **MUST** keep `services` public-read
- **MUST NOT** add auth requirement to scheduling data
- **MUST NOT** make sensitive data public-read

### Validation Requirements
**Before making a collection public-read:**
- Validate data is not sensitive
- Validate public-read does not expose PII
- Validate public-read does not expose business secrets
- Get approval from security team

**Before making a collection private:**
- Validate data is sensitive
- Validate auth requirement does not break UX
- Validate auth requirement is necessary
- Get approval from security team

### AI-Agent Safety Constraints
- **MUST** preserve public-read for scheduling data
- **MUST** validate sensitivity before making public-read
- **MUST NOT** make sensitive data public-read
- **MUST NOT** add auth requirement to scheduling data without approval

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 28 for security architecture

---

## Indexing Philosophy (Operational)

### Why Composite Indexes Matter
- **Query performance:** Firestore requires indexes for compound queries
- **Cost optimization:** Proper indexes reduce read costs
- **Query flexibility:** Enables complex queries
- **Scalability:** Indexes scale with data growth

### Anti-Drift Constraints
- **MUST** add composite indexes for all compound queries
- **MUST** deploy indexes via Firebase CLI (not Console)
- **MUST** version control `firestore.indexes.json`
- **MUST NOT** edit indexes in Console
- **MUST NOT** deploy without verifying indexes

### Validation Requirements
**Before adding a compound query:**
- Identify required composite index
- Add index to `firestore.indexes.json`
- Deploy index via Firebase CLI
- Test query after index deployment

**Before modifying an existing query:**
- Check if index needs modification
- Update `firestore.indexes.json` if needed
- Deploy index via Firebase CLI
- Test query after index deployment

### AI-Agent Safety Constraints
- **MUST** add composite indexes for compound queries
- **MUST** use Firebase CLI for index deployment
- **MUST** version control `firestore.indexes.json`
- **MUST NOT** edit indexes in Console
- **MUST NOT** deploy without verifying indexes

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 30 for index order warnings

---

## Document ID Philosophy (Operational)

### Why Document IDs Matter
- **Predictability:** Consistent ID patterns make queries easier
- **Performance:** Document ID queries are faster than field queries
- **Scalability:** Document ID queries scale better
- **Data integrity:** Consistent IDs prevent duplicate documents

### Anti-Drift Constraints
- **MUST** use Firebase Auth UID for user documents
- **MUST** use auto-generated IDs for most collections
- **MUST** use custom IDs only when necessary (e.g., invite tokens)
- **MUST NOT** use arbitrary strings as document IDs
- **MUST NOT** use sequential IDs (scalability issue)

### Validation Requirements
**Before using custom document IDs:**
- Validate that custom ID is necessary
- Validate that custom ID is unique
- Validate that custom ID is stable (won't change)
- Document rationale for custom ID

**Before using auto-generated IDs:**
- Validate that auto-generated ID is sufficient
- Validate that document can be queried by other fields
- Validate that document ID is not needed for business logic

### AI-Agent Safety Constraints
- **MUST** use Firebase Auth UID for user documents
- **MUST** prefer auto-generated IDs
- **MUST NOT** use sequential IDs
- **MUST NOT** use arbitrary strings as document IDs
- **MUST NOT** use custom IDs without rationale

### Cross-Reference
- See Section 27 for Firestore design philosophy

---

## Timestamp Philosophy (Operational)

### Why Firestore Timestamps Matter
- **Consistency:** Firestore Timestamps are timezone-aware
- **Querying:** Timestamps enable time-based queries
- **Sorting:** Timestamps enable chronological sorting
- **Auditing:** Timestamps provide audit trail

### Anti-Drift Constraints
- **MUST** use Firestore `Timestamp` for all date fields
- **MUST** use converters to transform to JS `Date`
- **MUST NOT** store dates as strings
- **MUST NOT** store dates as numbers (timestamps)
- **MUST** use server timestamps for creation/update times

### Validation Requirements
**Before adding a date field:**
- Use Firestore `Timestamp` type
- Add converter transformation to JS `Date`
- Add timestamp to document on creation
- Update timestamp on document update

**Before querying by date:**
- Convert JS `Date` to Firestore `Timestamp`
- Use Firestore timestamp comparison operators
- Handle timezone conversion if needed

### AI-Agent Safety Constraints
- **MUST** use Firestore `Timestamp` for all date fields
- **MUST** use converters for timestamp transformation
- **MUST NOT** store dates as strings
- **MUST NOT** store dates as numbers
- **MUST** use server timestamps for creation/update times

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 30 for date storage warnings

---

## Query Optimization Philosophy (Operational)

### Why Query Optimization Matters
- **Cost reduction:** Optimized queries reduce Firestore costs
- **Performance:** Optimized queries are faster
- **Scalability:** Optimized queries scale better
- **User experience:** Faster queries improve UX

### Anti-Drift Constraints
- **MUST** use `.select()` to limit fields
- **MUST** use pagination for large result sets
- **MUST** use composite indexes for compound queries
- **MUST NOT** fetch entire collections
- **MUST NOT** fetch unnecessary fields

### Validation Requirements
**Before adding a query:**
- Identify required fields
- Use `.select()` to limit fields
- Add pagination if result set may be large
- Add composite index if compound query
- Test query performance

**Before modifying an existing query:**
- Check if fields can be limited
- Check if pagination can be added
- Check if index is needed
- Test query performance

### AI-Agent Safety Constraints
- **MUST** use `.select()` to limit fields
- **MUST** use pagination for large result sets
- **MUST NOT** fetch entire collections
- **MUST NOT** fetch unnecessary fields
- **MUST** optimize queries before deployment

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 26 for performance rules

---

## Collection Creation Process (Operational)

### Step 1: Define Document Structure
- Add TypeScript interface to `/types/firestore.ts`
- Define all required fields
- Define all optional fields
- Define field types (use Firestore types)

### Step 2: Add Converter
- Add converter to `/services/firestore/converters.ts`
- Transform Firestore `Timestamp` to JS `Date`
- Transform Firestore data to TypeScript interface
- Transform TypeScript interface to Firestore data

### Step 3: Create Service Class
- Create service class in `/services/firestore/xxx.service.ts`
- Implement CRUD methods
- Add ownership validation
- Add business logic validation

### Step 4: Add Security Rules
- Add collection rules to `/firestore.rules`
- Enforce ownership
- Enforce role-based access
- Enforce data validation

### Step 5: Add Indexes
- Add composite indexes to `/firestore.indexes.json`
- Deploy indexes via Firebase CLI
- Test queries after index deployment

### Step 6: Export Service
- Export from `/services/firestore/index.ts`
- Make service available to application
- Document service usage

### Step 7: Update Documentation
- Update this document (Section 27)
- Update feature → file responsibility map (Section 21)
- Update business rules (Section 23)

### AI-Agent Safety Constraints
- **MUST** follow all steps in order
- **MUST** get approval for new collections
- **MUST** update documentation
- **MUST NOT** skip steps
- **MUST NOT** create collections without documentation

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 36 for ownership matrix

---

## Firestore Schema Validation (Future)

### Automated Validation
Implement validation that checks:
- All collections have TypeScript interfaces
- All collections have converters
- All collections have service classes
- All collections have security rules
- All collections have required indexes

### Manual Validation
During code review, check for:
- Missing TypeScript interfaces
- Missing converters
- Missing service classes
- Missing security rules
- Missing indexes

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

<!-- SECTION:40 -->
# 40. SECURITY ARCHITECTURE & TRUST BOUNDARIES (OPERATIONAL)

This section provides operational governance for security architecture. It builds on Section 28 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing security drift.

---

## Trust Boundary Diagram (Operational)

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (UNTRUSTED)                        │
│  - Client SDK (unauthenticated writes blocked by rules)     │
│  - No Admin SDK                                              │
│  - No server credentials                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              EDGE MIDDLEWARE (MINIMAL TRUST)                 │
│  - Cookie presence check only                               │
│  - No Admin SDK (Edge Runtime limitation)                   │
│  - No role verification                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           LAYOUT COMPONENTS (CLIENT-SIDE TRUST)              │
│  - Role verification (client-side enforcement)               │
│  - Redirects for unauthorized access                         │
│  - No privileged writes                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           API ROUTES (SERVER-SIDE TRUST)                     │
│  - Admin SDK for privileged writes                          │
│  - Server-side validation                                   │
│  - Server-only environment variables                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          FIRESTORE RULES (DATABASE TRUST)                    │
│  - Ownership enforcement                                    │
│  - Role-based access control                                 │
│  - Data validation                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Firebase Admin SDK Isolation (Operational)

### Why Admin SDK Isolation Matters
- **Security:** Admin SDK has full database access
- **Trust boundary:** Server-only access prevents credential leakage
- **Auditability:** Server-side writes are logged
- **Access control:** Client SDK cannot perform privileged operations

### Anti-Drift Constraints
- **MUST** use Admin SDK only in API routes and Server Components
- **MUST** use Admin SDK for all privileged writes
- **MUST** keep Admin SDK credentials server-only (no `NEXT_PUBLIC_`)
- **MUST NOT** use Admin SDK in client components
- **MUST NOT** use Admin SDK in middleware (Edge Runtime limitation)

### Validation Requirements
**Before using Admin SDK:**
- Validate code is in API route or Server Component
- Validate environment variables are server-only
- Validate Admin SDK is initialized correctly
- Validate Admin SDK is used only for privileged operations

**Before using Client SDK for writes:**
- Validate write is not privileged
- Validate Firestore rules allow the write
- Validate user has permission
- Consider if Admin SDK is more appropriate

### AI-Agent Safety Constraints
- **MUST** use Admin SDK in API routes for privileged writes
- **MUST** use Admin SDK in Server Components for privileged reads
- **MUST NOT** use Admin SDK in client components
- **MUST NOT** use Admin SDK in middleware
- **MUST NOT** expose Admin SDK credentials to browser

### Cross-Reference
- See Section 28 for security architecture
- See Section 30 for Admin SDK warnings

---

## Middleware Minimalism (Operational)

### Why Middleware is Minimal
- **Edge Runtime limitation:** Edge Runtime does not support Node.js APIs
- **Admin SDK incompatibility:** Admin SDK requires Node.js runtime
- **Performance:** Minimal middleware reduces latency
- **Simplicity:** Cookie check is sufficient for most cases

### Anti-Drift Constraints
- **MUST** keep middleware minimal (cookie check only)
- **MUST** NOT add Admin SDK to middleware
- **MUST** NOT add role verification to middleware
- **MUST** NOT add complex logic to middleware
- **MUST** enforce roles in layout components instead

### Validation Requirements
**Before adding to middleware:**
- Validate that Edge Runtime supports the operation
- Validate that operation is necessary in middleware
- Validate that operation cannot be done in layout component
- Get approval from security team

**Before removing from middleware:**
- Validate that removal does not break authentication
- Validate that removal does not expose protected routes
- Get approval from security team

### AI-Agent Safety Constraints
- **MUST** keep middleware minimal
- **MUST** NOT add Admin SDK to middleware
- **MUST** NOT add role verification to middleware
- **MUST** NOT add complex logic to middleware
- **MUST** enforce roles in layout components

### Cross-Reference
- See Section 28 for security architecture
- See Section 30 for middleware warnings

---

## Role Enforcement in Layouts (Operational)

### Why Role Enforcement in Layouts
- **Flexibility:** Layout components can access React context
- **User experience:** Better UX with client-side redirects
- **Simplicity:** Role verification is straightforward
- **Security:** Firestore rules provide server-side enforcement

### Anti-Drift Constraints
- **MUST** enforce roles in layout components
- **MUST** use React context for role access
- **MUST** redirect unauthorized users
- **MUST** NOT rely solely on client-side enforcement
- **MUST** ensure Firestore rules enforce server-side

### Validation Requirements
**Before adding role enforcement:**
- Validate role is defined in user document
- Validate Firestore rules enforce the role
- Validate redirect is appropriate
- Test role enforcement

**Before removing role enforcement:**
- Validate that Firestore rules still enforce access
- Validate that removal does not expose protected data
- Get approval from security team

### AI-Agent Safety Constraints
- **MUST** enforce roles in layout components
- **MUST** use React context for role access
- **MUST** redirect unauthorized users
- **MUST** NOT rely solely on client-side enforcement
- **MUST** ensure Firestore rules enforce server-side

### Cross-Reference
- See Section 28 for security architecture
- See Section 36 for ownership matrix

---

## Firestore Rules Philosophy (Operational)

### Why Firestore Rules Matter
- **Server-side enforcement:** Rules enforce access regardless of client
- **Ownership enforcement:** Rules prevent unauthorized modifications
- **Role-based access:** Rules enforce role permissions
- **Data validation:** Rules validate data structure

### Anti-Drift Constraints
- **MUST** enforce ownership in Firestore rules
- **MUST** enforce role-based access in Firestore rules
- **MUST** validate data in Firestore rules
- **MUST** deploy rules via Firebase CLI (not Console)
- **MUST** version control Firestore rules

### Validation Requirements
**Before modifying Firestore rules:**
- Validate that change does not break existing access
- Validate that change does not expose sensitive data
- Validate that change is necessary
- Get approval from security team
- Test rules in test environment

**Before deploying Firestore rules:**
- Deploy via Firebase CLI
- Test rules in test environment
- Verify rules in production
- Monitor for rule violations

### AI-Agent Safety Constraints
- **MUST** enforce ownership in Firestore rules
- **MUST** enforce role-based access in Firestore rules
- **MUST** validate data in Firestore rules
- **MUST** deploy rules via Firebase CLI
- **MUST** version control Firestore rules
- **MUST NOT** edit rules in Console

### Cross-Reference
- See Section 28 for security architecture
- See Section 30 for Console warnings

---

## Invite Token Security (Operational)

### Why Invite Token Security Matters
- **Doctor onboarding:** Invite tokens are the authentication mechanism
- **Prevention of abuse:** Secure tokens prevent unauthorized account creation
- **Time-limited access:** Expiry prevents long-term token abuse
- **Auditability:** Token usage can be tracked

### Anti-Drift Constraints
- **MUST** generate 128-bit random tokens
- **MUST** set 7-day token expiry
- **MUST** validate token before account creation
- **MUST** mark token as used after account creation
- **MUST NOT** reuse tokens after completion
- **MUST NOT** expose tokens to browser

### Validation Requirements
**Before generating invite token:**
- Use cryptographically secure random generator
- Generate 128-bit random token
- Set expiry to 7 days from now
- Store token securely in Firestore

**Before accepting invite:**
- Validate token exists
- Validate token has not expired
- Validate token status is `pending` or `opened`
- Validate email matches invite email
- Use Admin SDK for account creation

### AI-Agent Safety Constraints
- **MUST** generate 128-bit random tokens
- **MUST** set 7-day token expiry
- **MUST** validate token before account creation
- **MUST** mark token as used after account creation
- **MUST NOT** reuse tokens after completion
- **MUST NOT** expose tokens to browser

### Cross-Reference
- See Section 28 for security architecture
- See Section 30 for invite flow warnings

---

## API Route Trust Boundaries (Operational)

### Why API Route Trust Boundaries Matter
- **Server-side validation:** API routes can validate requests server-side
- **Admin SDK access:** API routes can use Admin SDK for privileged operations
- **Environment isolation:** API routes have access to server-only environment variables
- **Security:** API routes provide a secure server-side boundary

### Anti-Drift Constraints
- **MUST** use Admin SDK for privileged writes in API routes
- **MUST** validate requests server-side
- **MUST** return appropriate HTTP status codes
- **MUST** handle errors gracefully
- **MUST NOT** use Client SDK for privileged writes

### Validation Requirements
**Before creating API route:**
- Validate that operation requires server-side execution
- Validate that Admin SDK is needed for writes
- Validate that request validation is needed
- Define HTTP status codes
- Define error handling

**Before modifying API route:**
- Validate that change does not break existing clients
- Validate that change does not introduce security issues
- Test API route
- Get approval from security team

### AI-Agent Safety Constraints
- **MUST** use Admin SDK for privileged writes
- **MUST** validate requests server-side
- **MUST** return appropriate HTTP status codes
- **MUST** handle errors gracefully
- **MUST NOT** use Client SDK for privileged writes

### Cross-Reference
- See Section 28 for security architecture
- See Section 30 for Client SDK warnings

---

## Server-Only Environment Variables (Operational)

### Why Server-Only Variables Matter
- **Security:** Server-only variables are not exposed to browser
- **Credential protection:** Admin SDK credentials are protected
- **API key protection:** Third-party API keys are protected
- **Configuration isolation:** Server configuration is isolated from client

### Anti-Drift Constraints
- **MUST** use `NEXT_PUBLIC_` prefix only for client-side variables
- **MUST** NOT use `NEXT_PUBLIC_` prefix for Admin SDK credentials
- **MUST** NOT use `NEXT_PUBLIC_` prefix for API keys
- **MUST** NOT use `NEXT_PUBLIC_` prefix for secrets
- **MUST** version control `.env.example`

### Validation Requirements
**Before adding environment variable:**
- Validate that variable is needed
- Validate that variable is server-side or client-side
- Use `NEXT_PUBLIC_` prefix only for client-side
- Add variable to `.env.example`
- Document variable usage

**Before using environment variable:**
- Validate that variable is defined
- Validate that variable has correct value
- Handle missing variable gracefully
- Log variable usage (for debugging)

### AI-Agent Safety Constraints
- **MUST** use `NEXT_PUBLIC_` prefix only for client-side variables
- **MUST** NOT use `NEXT_PUBLIC_` prefix for Admin SDK credentials
- **MUST** NOT use `NEXT_PUBLIC_` prefix for API keys
- **MUST** NOT use `NEXT_PUBLIC_` prefix for secrets
- **MUST** version control `.env.example`

### Cross-Reference
- See Section 28 for security architecture
- See Section 30 for environment variable warnings

---

## Public vs Protected Collections (Operational)

### Why Public Collections Exist
- **Frictionless UX:** Public-read collections reduce auth barriers
- **Performance:** No auth check overhead for public data
- **Business model:** Some data is not sensitive (availability, services)
- **Scalability:** Public-read queries scale better

### Anti-Drift Constraints
- **MUST** keep `doctor_availability` public-read
- **MUST** keep `doctor_blocks` public-read
- **MUST** keep `services` public-read
- **MUST** protect sensitive collections with auth
- **MUST** validate public-read does not expose PII

### Validation Requirements
**Before making collection public-read:**
- Validate data is not sensitive
- Validate public-read does not expose PII
- Validate public-read does not expose business secrets
- Get approval from security team

**Before making collection private:**
- Validate data is sensitive
- Validate auth requirement does not break UX
- Validate auth requirement is necessary
- Get approval from security team

### AI-Agent Safety Constraints
- **MUST** preserve public-read for scheduling data
- **MUST** validate sensitivity before making public-read
- **MUST** protect sensitive collections with auth
- **MUST** validate public-read does not expose PII
- **MUST** get approval before changing read permissions

### Cross-Reference
- See Section 28 for security architecture
- See Section 39 for public-read philosophy

---

## Privileged Operations List (Operational)

### Operations Requiring Admin SDK
- Doctor account creation (via invite acceptance)
- User role modification
- User activation/deactivation
- Invite status updates
- Payment status updates (webhook processing)
- Any write that bypasses Firestore rules

### Operations Requiring Server-Side Validation
- Invite token validation
- Webhook signature verification
- Payment processing
- Admin role assignment
- Sensitive data access

### AI-Agent Safety Constraints
- **MUST** use Admin SDK for privileged operations
- **MUST** perform server-side validation
- **MUST** log privileged operations
- **MUST** audit privileged operations
- **MUST NOT** perform privileged operations client-side

### Cross-Reference
- See Section 28 for security architecture
- See Section 36 for ownership matrix

---

## Security Change Process (Operational)

### Proposing a Security Change
1. Document current security model
2. Explain why change is needed
3. Assess impact on existing features
4. Identify potential security risks
5. Get approval from security team
6. Implement the change
7. Test in staging environment
8. Deploy to production

### Security Change Approval
- **Firestore rules changes:** Security team approval
- **Middleware changes:** Security team approval
- **Role enforcement changes:** Security team approval
- **Invite token changes:** Security team approval
- **API route changes:** Security team approval

### Security Change Rollout
1. Update this document first
2. Implement security change
3. Update Firestore rules if needed
4. Deploy to staging
5. Test thoroughly
6. Deploy to production
7. Monitor for security violations

### Violation Response
- **Critical violations:** Block deployment immediately
- **High violations:** Block deployment, require fix
- **Medium violations:** Require fix before merge
- **Low violations:** Document and address later

<!-- SECTION:41 -->
# 41. AI AGENT CONTRIBUTION GUIDE (OPERATIONAL)

This section provides operational governance for AI agents contributing to Eye Aura. It builds on Section 29 but adds enforcement mechanisms, validation requirements, and explicit safety constraints.

---

## Before Adding Any Feature (Operational)

### Mandatory Pre-Work Checklist
- [ ] Read relevant sections of this architecture document (21-47)
- [ ] Check Section 36 for file ownership and AI agent permissions
- [ ] Check Section 37 for business rules and constraints
- [ ] Check Section 33 for absolute do-not rules
- [ ] Identify existing patterns in the codebase
- [ ] Copy existing patterns instead of inventing new ones
- [ ] Assess change impact on dependent features
- [ ] Plan regression testing

### Documentation Requirements
- [ ] Update Section 21 (feature → file responsibility map) if adding new feature
- [ ] Update Section 23 (business rules) if changing business logic
- [ ] Update Section 24 (state transitions) if adding new states
- [ ] Update Section 27 (Firestore design) if adding new collection
- [ ] Update Section 28 (security architecture) if changing security model

### Approval Requirements
- **Security changes:** Security team approval
- **Firestore schema changes:** Backend team approval
- **Business rule changes:** Relevant team approval
- **UI pattern changes:** Design team approval
- **Major architectural changes:** Executive approval

---

## AI Agent DO Rules (Operational)

### Preserve Modular Architecture
- **MUST** extract components when >300 lines
- **MUST** keep components focused on single responsibility
- **MUST** avoid giant monolithic components
- **MUST** use composition over inheritance
- **MUST** keep service layer separate from UI

### Preserve Calm Wellness UI
- **MUST** follow Section 31 UI pattern library
- **MUST** use defined color palette (teal, cream, gold)
- **MUST** use defined typography (Luciole + Atkinson Hyperlegible)
- **MUST** preserve mobile-first design
- **MUST** avoid enterprise aesthetics
- **MUST** avoid clutter and complexity

### Preserve Mobile-First Behavior
- **MUST** design for mobile first, scale up to desktop
- **MUST** use mobile breakpoints (default, md, lg)
- **MUST** ensure touch targets are 44×44px minimum
- **MUST** test on mobile viewport
- **MUST** avoid desktop-only patterns

### Reuse Existing Services
- **MUST** use existing Firestore services
- **MUST** not create duplicate service classes
- **MUST** not bypass service layer
- **MUST** extend existing services if needed
- **MUST** follow existing service patterns

### Maintain Type Safety
- **MUST** add TypeScript interfaces for Firestore documents
- **MUST** use converters for Firestore Timestamp → Date
- **MUST** not use `any` types
- **MUST** define props interfaces for components
- **MUST** use TypeScript for all logic

### Prefer Consistency Over Cleverness
- **MUST** follow existing patterns
- **MUST** not introduce novel approaches without justification
- **MUST** not optimize prematurely
- **MUST** prefer readable code over clever code
- **MUST** prefer simple solutions over complex ones

---

## AI Agent DO-NOT Rules (Operational)

### State Management
- **MUST NOT** introduce Redux
- **MUST NOT** introduce Zustand
- **MUST NOT** introduce Recoil
- **MUST NOT** introduce Jotai
- **MUST** use React Context for global state
- **MUST** use local state for component state

### Data Fetching
- **MUST NOT** introduce SWR
- **MUST NOT** introduce React Query
- **MUST NOT** introduce Apollo Client
- **MUST** use `useEffect` + async/await pattern
- **MUST** fetch only required data

### Styling
- **MUST NOT** introduce CSS-in-JS libraries
- **MUST NOT** introduce styled-components
- **MUST NOT** introduce Emotion
- **MUST NOT** introduce Sass
- **MUST** use Tailwind CSS only

### Forms
- **MUST NOT** introduce Formik
- **MUST NOT** introduce React Hook Form unless needed
- **MUST NOT** introduce Final Form
- **MUST** use native HTML forms
- **MUST** use react-hook-form only for complex validation

### Animation
- **MUST NOT** introduce Framer Motion
- **MUST NOT** introduce React Spring
- **MUST NOT** introduce GSAP
- **MUST** use CSS transitions only
- **MUST** respect `prefers-reduced-motion`

### Scheduling
- **MUST NOT** reintroduce FullCalendar
- **MUST NOT** introduce React Big Calendar
- **MUST NOT** introduce Calendar.js
- **MUST** use custom calendar implementation
- **MUST** preserve mobile-friendly calendar UI

### Database
- **MUST NOT** introduce SQL database
- **MUST NOT** introduce MongoDB
- **MUST NOT** introduce Prisma
- **MUST** use Firestore only
- **MUST** follow Firestore design philosophy (Section 27)

### File Storage
- **MUST NOT** introduce Firebase Storage
- **MUST NOT** introduce S3
- **MUST NOT** introduce Cloudinary
- **MUST** use data-only storage
- **MUST** not introduce file upload infrastructure

### Server Infrastructure
- **MUST NOT** introduce custom server
- **MUST NOT** introduce Docker
- **MUST NOT** introduce Kubernetes
- **MUST** use Next.js API routes
- **MUST** use serverless architecture

### Authentication
- **MUST NOT** introduce custom auth
- **MUST NOT** introduce Auth0
- **MUST NOT** introduce NextAuth
- **MUST** use Firebase Auth only
- **MUST** follow security architecture (Section 28)

### Video Infrastructure
- **MUST NOT** introduce custom WebRTC
- **MUST NOT** introduce Agora
- **MUST NOT** introduce Twilio Video
- **MUST** use external video platforms
- **MUST** not build custom video infrastructure

### Payment Gateway
- **MUST NOT** introduce Stripe
- **MUST NOT** introduce PayPal
- **MUST** use Razorpay for Indian market
- **MUST** verify webhook signatures
- **MUST** follow payment rules (Section 37)

### Email Service
- **MUST NOT** introduce SendGrid
- **MUST NOT** introduce Mailgun
- **MUST NOT** introduce AWS SES
- **MUST** use Resend only
- **MUST** use server-side API routes

### Testing Frameworks
- **MUST NOT** introduce Jest without need
- **MUST NOT** introduce Cypress without need
- **MUST NOT** introduce Playwright without need
- **MUST** add tests when fixing bugs
- **MUST** add tests when adding critical features

### UI Components
- **MUST NOT** introduce Material-UI
- **MUST NOT** introduce Chakra UI
- **MUST NOT** introduce Ant Design
- **MUST** use Shadcn UI only
- **MUST** follow UI pattern library (Section 31)

---

## Refactor Rules (Operational)

### When Refactors Are Acceptable
- Code is >300 lines and cannot be reasonably extracted
- Performance issue requires architectural change
- Security issue requires architectural change
- Business rule requires architectural change
- Technical debt is blocking development

### When Preservation Is Preferred
- Code is "ugly" but works
- Code uses a pattern you don't like but is consistent
- Code is "not how I would do it" but follows Eye Aura patterns
- Refactor does not provide clear benefit
- Refactor introduces risk without reward

### Refactor Process
1. Document the reason for refactor in this document
2. Make minimal changes to achieve the goal
3. Preserve existing behavior
4. Update tests if they exist
5. Update this architecture document
6. Get approval from relevant team
7. Test thoroughly

### Refactor Approval
- **Minor refactors:** Self-approve, commit directly
- **Medium refactors:** Get one review, then commit
- **Major refactors:** Discuss with team, get consensus, then commit
- **Architectural refactors:** Executive approval required

---

## Bypassing Firestore Services (Operational)

### When to Bypass
- **NEVER** bypass Firestore services in client components
- **NEVER** bypass Firestore services for reads
- **ONLY** bypass Firestore services in API routes when using Admin SDK for writes

### How to Bypass Correctly
```typescript
// In API route, using Admin SDK for writes
import { getAdminDb } from "@/services/firebase/admin";
const adminDb = getAdminDb();
await adminDb.collection("xxx").doc(id).set(data);
```

### How NOT to Bypass
```typescript
// WRONG: Using client SDK in API route for writes
import { getFirebaseDb } from "@/services/firebase/client";
const db = getFirebaseDb();
await db.collection("xxx").doc(id).set(data); // Runs unauthenticated!
```

### AI-Agent Safety Constraints
- **MUST** use Admin SDK in API routes for privileged writes
- **MUST** use Client SDK in client components
- **MUST** use service methods for all operations
- **MUST NOT** bypass service layer
- **MUST NOT** use Client SDK for privileged writes

### Cross-Reference
- See Section 28 for security architecture
- See Section 30 for Client SDK warnings

---

## Maintaining Type Safety (Operational)

### Firestore Documents
- **MUST** add TypeScript interfaces to `/types/firestore.ts`
- **MUST** not use `any` types for Firestore documents
- **MUST** use converters to transform Firestore `Timestamp` to JS `Date`
- **MUST** keep interfaces in sync with Firestore schema

### API Routes
- **MUST** define request/response types
- **MUST** use Zod for runtime validation (if needed)
- **MUST** return proper HTTP status codes
- **MUST** not use `any` for request/response

### Components
- **MUST** define props interfaces
- **MUST** not use `any` for props
- **MUST** use TypeScript for all component logic
- **MUST** handle optional props correctly

### AI-Agent Safety Constraints
- **MUST** add TypeScript interfaces for Firestore documents
- **MUST** not use `any` types
- **MUST** use converters for timestamp transformation
- **MUST** define props interfaces for components

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 39 for timestamp philosophy

---

## Error Handling (Operational)

### Client-Side Errors
- **MUST** show user-friendly error messages
- **MUST** log errors to console for debugging
- **MUST** not expose internal error details to users
- **MUST** provide recovery actions

### Server-Side Errors
- **MUST** return appropriate HTTP status codes
- **MUST** log errors for debugging
- **MUST** not expose internal error details in responses
- **MUST** handle errors gracefully

### Firestore Errors
- **MUST** handle permission errors gracefully
- **MUST** handle network errors gracefully
- **MUST** show user-friendly messages
- **MUST** log errors for debugging

### AI-Agent Safety Constraints
- **MUST** show user-friendly error messages
- **MUST** log errors for debugging
- **MUST** not expose internal error details
- **MUST** provide recovery actions

### Cross-Reference
- See Section 32 for error handling philosophy

---

## Testing Philosophy (Operational)

### Unit Tests
- **MUST** test Firestore service methods
- **MUST** test utility functions
- **MUST** test type converters
- **MUST** add tests when fixing bugs

### E2E Tests
- **MUST** test critical user flows (booking, prescription, invite)
- **MUST** test role-based access control
- **MUST** test security rules
- **MUST** add tests when adding critical features

### When to Add Tests
- **MUST** add tests when fixing bugs
- **MUST** add tests when adding critical features
- **MUST** add tests when refactoring critical code
- **MUST** not add tests prematurely

### AI-Agent Safety Constraints
- **MUST** add tests when fixing bugs
- **MUST** add tests when adding critical features
- **MUST** test critical user flows
- **MUST** not add tests prematurely

### Cross-Reference
- See Section 29 for testing philosophy

---

## Documentation Updates (Operational)

### When to Update This Document
- **MUST** update when adding a new collection
- **MUST** update when modifying an existing collection
- **MUST** update when adding a new major feature
- **MUST** update when changing the architecture
- **MUST** update when changing business rules
- **MUST** update when adding new dependencies

### How to Update
- **MUST** add new sections or update existing sections
- **MUST** keep the table of contents updated
- **MUST** keep the changelog updated
- **MUST** be specific and detailed

### AI-Agent Safety Constraints
- **MUST** update this document when architecture changes
- **MUST** update this document when business rules change
- **MUST** update this document when collections change
- **MUST** not skip documentation updates

### Cross-Reference
- See Section 35 for documentation maintenance rules

---

## Final Checklist Before Submitting Changes (Operational)

### Pre-Submission Checklist
- [ ] Read the relevant sections of this architecture document
- [ ] Followed existing patterns (no reinvention)
- [ ] Added TypeScript interfaces for Firestore documents
- [ ] Added converters if needed
- [ ] Added service classes if needed
- [ ] Updated security rules if needed
- [ ] Updated indexes if needed
- [ ] Followed design system rules (Section 31)
- [ ] Kept components <300 lines
- [ ] Used mobile-first breakpoints
- [ ] Did not introduce forbidden dependencies (Section 33)
- [ ] Did not bypass Firestore services incorrectly
- [ ] Maintained type safety
- [ ] Updated this architecture document
- [ ] Tested the changes manually
- [ ] Got approval if required

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

<!-- SECTION:42 -->
# 42. COMMON PITFALLS & ENGINEERING WARNINGS (OPERATIONAL)

This section provides operational governance for avoiding common pitfalls. It builds on Section 30 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing regressions.

---

## Middleware Pitfalls (Operational)

### Pitfall: Adding Admin SDK to Middleware
**Why it fails:** Edge Runtime does not support Node.js APIs required by Admin SDK
**What breaks:** Build fails with "Edge Runtime does not support Node.js APIs"
**How to avoid:** Keep middleware minimal (cookie check only). Use API routes for Admin SDK operations.
**AI-Agent constraint:** **MUST NOT** add Admin SDK to middleware

### Pitfall: Adding Role Verification to Middleware
**Why it fails:** Cannot access Firebase Auth in Edge Runtime
**What breaks:** Build fails or role verification doesn't work
**How to avoid:** Enforce roles in layout components instead
**AI-Agent constraint:** **MUST** enforce roles in layout components

### Cross-Reference
- See Section 28 for security architecture
- See Section 40 for trust boundaries

---

## Firestore Client SDK in API Routes (Operational)

### Pitfall: Using Client SDK for Writes in API Routes
**Why it fails:** Client SDK in API routes runs unauthenticated (no Firebase Auth context)
**What breaks:** Firestore rules block unauthenticated writes, data corruption if rules allow
**How to avoid:** Use Admin SDK for all writes in API routes
**AI-Agent constraint:** **MUST** use Admin SDK in API routes for writes

### Pitfall: Using Client SDK for Privileged Reads in API Routes
**Why it fails:** Client SDK in API routes runs unauthenticated
**What breaks:** Firestore rules block unauthenticated reads
**How to avoid:** Use Admin SDK for privileged reads in API routes
**AI-Agent constraint:** **MUST** use Admin SDK in API routes for privileged reads

### Cross-Reference
- See Section 28 for security architecture
- See Section 40 for trust boundaries

---

## Booking Request vs Appointment Confusion (Operational)

### Pitfall: Treating Booking Requests as Appointments
**Why it fails:** Booking requests are not appointments
**What breaks:** Business logic violation, data corruption
**How to avoid:** Always create booking request first, accept request to create appointment
**AI-Agent constraint:** **MUST** create booking request before appointment

### Pitfall: Creating Appointments Directly
**Why it fails:** Bypasses business logic (request/approval model)
**What breaks:** No doctor block created, no audit trail, business logic violation
**How to avoid:** Use `bookingRequestsService.acceptRequest()` for all acceptances
**AI-Agent constraint:** **MUST** use service methods for booking logic

### Cross-Reference
- See Section 23 for booking rules
- See Section 37 for business rules

---

## Doctor Block Subtraction (Operational)

### Pitfall: Not Subtracting Blocks During Slot Generation
**Why it fails:** Blocks are not subtracted from availability during slot generation
**What breaks:** Patients can book blocked time slots
**How to avoid:** Fix slot generation algorithm to subtract blocks from availability
**AI-Agent constraint:** **MUST** eventually fix block subtraction in slot generation

### Pitfall: Assuming Blocks Are Subtracted
**Why it fails:** Blocks are not currently subtracted (known bug)
**What breaks:** Patients can book blocked time slots
**How to avoid:** Be aware of this bug, fix it when possible
**AI-Agent constraint:** **MUST** document this bug until fixed

### Cross-Reference
- See Section 23 for scheduling rules
- See Section 37 for business rules

---

## Invite Flow Pitfalls (Operational)

### Pitfall: Adding Auth Requirement to Invite Page
**Why it fails:** Invite page must be public for invite-based onboarding
**What breaks:** Doctors cannot access invite page to complete onboarding
**How to avoid:** Keep `/app/invite/[token]/page.tsx` public (no auth requirement)
**AI-Agent constraint:** **MUST** preserve public invite page

### Pitfall: Client-Side Firestore Write in Invite Acceptance
**Why it fails:** Client SDK cannot perform privileged operations
**What breaks:** User creation fails, invite status update fails
**How to avoid:** Use API route with Admin SDK for invite acceptance
**AI-Agent constraint:** **MUST** use Admin SDK for account creation

### Cross-Reference
- See Section 28 for security architecture
- See Section 37 for doctor invite rules

---

## PDF Generation Pitfalls (Operational)

### Pitfall: Assuming Puppeteer is Always Available
**Why it fails:** Puppeteer requires specific runtime (Node.js), not available in Edge Runtime
**What breaks:** PDF generation fails in Edge Runtime
**How to avoid:** Ensure PDF generation API route uses Node.js runtime, not Edge Runtime
**AI-Agent constraint:** **MUST** use Node.js runtime for PDF generation

### Pitfall: Not Handling Puppeteer Errors
**Why it fails:** Puppeteer can fail for various reasons (timeout, memory, network)
**What breaks:** PDF generation fails, user sees error
**How to avoid:** Add error handling, timeout handling, retry logic
**AI-Agent constraint:** **MUST** handle Puppeteer errors gracefully

### Cross-Reference
- See Section 30 for PDF generation warnings
- See Section 36 for ownership matrix

---

## Environment Variable Pitfalls (Operational)

### Pitfall: Using NEXT_PUBLIC_ for Server-Only Variables
**Why it fails:** NEXT_PUBLIC_ exposes variables to browser
**What breaks:** Admin SDK credentials exposed to browser (security violation)
**How to avoid:** Use server-only variables (no NEXT_PUBLIC_) for Admin SDK credentials
**AI-Agent constraint:** **MUST NOT** use NEXT_PUBLIC_ for Admin SDK credentials

### Pitfall: Not Preserving Newlines in Service Account Key
**Why it fails:** Service account key requires preserved newlines for JSON parsing
**What breaks:** Admin SDK fails to initialize
**How to avoid:** Ensure environment variable preserves newlines (use \n or proper formatting)
**AI-Agent constraint:** **MUST** preserve newlines in service account key

### Cross-Reference
- See Section 28 for security architecture
- See Section 40 for server-only variables

---

## Firestore Console Pitfalls (Operational)

### Pitfall: Editing Firestore Rules in Console
**Why it fails:** Console edits are not version-controlled
**What breaks:** Rules drift, no audit trail, hard to roll back
**How to avoid:** Always deploy rules via Firebase CLI, version control in git
**AI-Agent constraint:** **MUST** deploy rules via Firebase CLI

### Pitfall: Editing Indexes in Console
**Why it fails:** Console edits are not version-controlled
**What breaks:** Indexes drift, no audit trail, hard to roll back
**How to avoid:** Always deploy indexes via Firebase CLI, version control in git
**AI-Agent constraint:** **MUST** deploy indexes via Firebase CLI

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 39 for indexing philosophy

---

## State Transition Pitfalls (Operational)

### Pitfall: Allowing Invalid State Transitions
**Why it fails:** State transitions should be one-way or follow specific rules
**What breaks:** Business logic violation, data corruption
**How to avoid:** Use service methods for state transitions, validate transitions
**AI-Agent constraint:** **MUST** use service methods for state transitions

### Pitfall: Transitioning from Terminal States
**Why it fails:** Terminal states should have no next states
**What breaks:** Business logic violation, audit trail corruption
**How to avoid:** Validate state before transition, use service methods
**AI-Agent constraint:** **MUST NOT** transition from terminal states

### Cross-Reference
- See Section 24 for state transitions
- See Section 38 for state transition matrices

---

## Service Layer Bypass Pitfalls (Operational)

### Pitfall: Direct Firestore Writes in Client Components
**Why it fails:** Bypasses business logic validation
**What breaks:** Business logic violation, data corruption
**How to avoid:** Always use service methods for Firestore operations
**AI-Agent constraint:** **MUST** use service methods for Firestore operations

### Pitfall: Direct Firestore Writes in API Routes (Using Client SDK)
**Why it fails:** Client SDK in API routes runs unauthenticated
**What breaks:** Firestore rules block writes, data corruption
**How to avoid:** Use Admin SDK for writes in API routes
**AI-Agent constraint:** **MUST** use Admin SDK in API routes for writes

### Cross-Reference
- See Section 28 for security architecture
- See Section 41 for AI agent contribution guide

---

## Type Safety Pitfalls (Operational)

### Pitfall: Using Any Types for Firestore Documents
**Why it fails:** Loses type safety, allows invalid data
**What breaks:** Type errors at runtime, data corruption
**How to avoid:** Add TypeScript interfaces for all Firestore documents
**AI-Agent constraint:** **MUST** add TypeScript interfaces for Firestore documents

### Pitfall: Not Using Converters for Timestamps
**Why it fails:** Firestore Timestamp is not JS Date
**What breaks:** Type errors, date operations fail
**How to avoid:** Use converters to transform Firestore Timestamp to JS Date
**AI-Agent constraint:** **MUST** use converters for timestamp transformation

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 39 for timestamp philosophy

---

## Index Order Pitfalls (Operational)

### Pitfall: Wrong Index Order in Compound Queries
**Why it fails:** Firestore requires specific index order for compound queries
**What breaks:** Query fails with "Index not found" error
**How to avoid:** Add composite index in correct order, deploy via Firebase CLI
**AI-Agent constraint:** **MUST** add composite indexes for compound queries

### Pitfall: Not Deploying Indexes
**Why it fails:** Indexes must be deployed before use
**What breaks:** Query fails with "Index not found" error
**How to avoid:** Deploy indexes via Firebase CLI before using queries
**AI-Agent constraint:** **MUST** deploy indexes via Firebase CLI

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 39 for indexing philosophy

---

## Role Enforcement Pitfalls (Operational)

### Pitfall: Relying Solely on Client-Side Role Enforcement
**Why it fails:** Client-side enforcement can be bypassed
**What breaks:** Unauthorized access to protected routes
**How to avoid:** Ensure Firestore rules enforce server-side role enforcement
**AI-Agent constraint:** **MUST** ensure Firestore rules enforce server-side

### Pitfall: Not Enforcing Roles in Layout Components
**Why it fails:** Layout components are the place for role-based redirects
**What breaks:** Unauthorized access to protected routes
**How to avoid:** Enforce roles in layout components, redirect unauthorized users
**AI-Agent constraint:** **MUST** enforce roles in layout components

### Cross-Reference
- See Section 28 for security architecture
- See Section 40 for trust boundaries

---

## Public-Read Pitfalls (Operational)

### Pitfall: Making Sensitive Data Public-Read
**Why it fails:** Public-read exposes data to unauthenticated users
**What breaks:** Security violation, data exposure
**How to avoid:** Validate data is not sensitive before making public-read
**AI-Agent constraint:** **MUST** validate sensitivity before making public-read

### Pitfall: Adding Auth Requirement to Scheduling Data
**Why it fails:** Scheduling data should be public-read for frictionless UX
**What breaks:** UX degradation, business model violation
**How to avoid:** Keep scheduling data public-read
**AI-Agent constraint:** **MUST** preserve public-read for scheduling data

### Cross-Reference
- See Section 27 for Firestore design philosophy
- See Section 39 for public-read philosophy

---

## Pitfall Detection Process (Operational)

### Automated Detection (Future)
Implement linting rules that check for:
- Admin SDK usage in client components
- Client SDK usage in API routes for writes
- Direct Firestore writes bypassing service layer
- Missing TypeScript interfaces
- Missing converters for timestamps
- Wrong index order

### Manual Detection
During code review, check for:
- Bypass of service layer
- Direct Firestore writes
- Missing type safety
- Missing error handling
- Invalid state transitions

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

---

## Pitfall Prevention Checklist (Operational)

### Before Submitting Code
- [ ] Checked for Admin SDK in client components
- [ ] Checked for Client SDK in API routes for writes
- [ ] Checked for direct Firestore writes bypassing service layer
- [ ] Checked for missing TypeScript interfaces
- [ ] Checked for missing converters for timestamps
- [ ] Checked for invalid state transitions
- [ ] Checked for wrong index order
- [ ] Checked for security violations
- [ ] Checked for business logic violations
- [ ] Updated documentation if needed

### AI-Agent Safety Constraints
- **MUST** check for common pitfalls before submitting
- **MUST** follow anti-drift constraints
- **MUST** update documentation if architecture changes
- **MUST** get approval if required

<!-- SECTION:43 -->
# 43. UI PATTERN LIBRARY (OPERATIONAL)

This section provides operational governance for UI patterns. It builds on Section 31 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing UI drift.

---

## Component Selection Matrix (Operational)

| Situation | Preferred Pattern | Shadcn Component | AI Agent Can Modify |
|---|---|---|---|
| Grouped data | Cards | `Card` | YES |
| Multi-step flow | Wizard | Custom (Tabs + Progress) | YES |
| Status display | Badge | `Badge` | YES |
| Empty state | Illustration + CTA | Custom + `Button` | YES |
| Confirmation action | Modal | `Dialog` + `AlertDialog` | YES |
| Settings sections | Accordion cards | `Accordion` | YES |
| Form input | Input with label | `Input` + `Label` | YES |
| Form selection | Select dropdown | `Select` | YES |
| Form checkbox | Checkbox with label | `Checkbox` + `Label` | YES |
| Form toggle | Switch | `Switch` | YES |
| Date picker | Custom calendar | Custom (no FullCalendar) | YES |
| Time picker | Custom time input | Custom | YES |
| Navigation | Sidebar or tabs | `Tabs` or custom sidebar | YES |
| Loading state | Spinner | `Loader2` icon | YES |
| Success message | Toast | `useToast` hook | YES |
| Error message | Toast or inline | `useToast` hook or `Alert` | YES |
| Data table | Simple table | `Table` | YES |
| Rich text | Textarea | `Textarea` | YES |
| File upload | Data-only (no upload) | N/A (forbidden) | NO |
| Video embed | External platform | N/A (forbidden) | NO |

---

## Spacing Philosophy (Operational)

### Tailwind Spacing Scale
- **Base unit:** 4px (Tailwind default)
- **Small gaps:** `gap-2` (8px), `gap-3` (12px)
- **Medium gaps:** `gap-4` (16px), `gap-6` (24px)
- **Large gaps:** `gap-8` (32px), `gap-12` (48px)
- **Section padding:** `p-4` (mobile), `p-6` (tablet), `p-8` (desktop)

### Anti-Drift Constraints
- **MUST** use Tailwind spacing scale
- **MUST** use consistent spacing across similar elements
- **MUST** use tighter spacing on mobile
- **MUST NOT** use arbitrary pixel values
- **MUST NOT** use inconsistent spacing

### AI-Agent Safety Constraints
- **MUST** use Tailwind spacing scale
- **MUST** be consistent with spacing
- **MUST** use mobile-first spacing
- **MUST NOT** use arbitrary pixel values

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Typography Hierarchy (Operational)

### Font Scale
- **Display:** Luciole, 48px+ (hero headings)
- **Heading 1:** Luciole, 36px (page titles)
- **Heading 2:** Luciole, 28px (section titles)
- **Heading 3:** Atkinson Hyperlegible, 20px (card titles)
- **Body:** Atkinson Hyperlegible, 16px (paragraphs)
- **Small:** Atkinson Hyperlegible, 14px (labels, metadata)
- **Caption:** Atkinson Hyperlegible, 12px (footnotes)

### Font Weights
- **Bold:** 700 (headings, emphasis)
- **Semibold:** 600 (subheadings)
- **Medium:** 500 (labels)
- **Regular:** 400 (body text)

### Line Heights
- **Tight:** `leading-tight` (headings)
- **Normal:** `leading-normal` (body)
- **Relaxed:** `leading-relaxed` (long text)

### Anti-Drift Constraints
- **MUST** use Luciole for display and headings
- **MUST** use Atkinson Hyperlegible for body text
- **MUST** follow font scale
- **MUST NOT** introduce new fonts
- **MUST NOT** use arbitrary font sizes

### AI-Agent Safety Constraints
- **MUST** use Luciole for headings
- **MUST** use Atkinson Hyperlegible for body
- **MUST** follow font scale
- **MUST NOT** introduce new fonts

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Button Hierarchy (Operational)

### Primary Button
- **Use case:** Main action on page
- **Style:** Teal background, white text
- **Size:** `h-10` (default), `h-12` (large)
- **Padding:** `px-4` (default), `px-6` (large)
- **Shadcn:** `Button` with default variant

### Secondary Button
- **Use case:** Alternative action
- **Style:** Gold accent, dark text
- **Size:** `h-10` (default)
- **Padding:** `px-4` (default)
- **Shadcn:** `Button` with outline or secondary variant

### Ghost Button
- **Use case:** Low-priority action
- **Style:** Transparent background, dark text, hover background
- **Size:** `h-10` (default)
- **Padding:** `px-4` (default)
- **Shadcn:** `Button` with ghost variant

### Destructive Button
- **Use case:** Dangerous action (delete, cancel)
- **Style:** Red background, white text
- **Size:** `h-10` (default)
- **Padding:** `px-4` (default)
- **Shadcn:** `Button` with destructive variant

### Anti-Drift Constraints
- **MUST** use button hierarchy correctly
- **MUST** limit primary buttons per page (1-2 max)
- **MUST** use consistent button sizes
- **MUST NOT** use arbitrary button styles
- **MUST NOT** use too many primary buttons

### AI-Agent Safety Constraints
- **MUST** use button hierarchy correctly
- **MUST** limit primary buttons
- **MUST** use consistent sizes
- **MUST NOT** use arbitrary styles

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Card Usage (Operational)

### When to Use Cards
- **Grouping related data:** Doctor profile, appointment details
- **Creating visual hierarchy:** Dashboard widgets
- **Separating content sections:** Settings pages
- **Displaying lists:** Appointment list, doctor list

### Card Structure
- **Header:** Title + optional action button
- **Content:** Main content area
- **Footer:** Optional metadata or actions
- **Padding:** `p-4` (mobile), `p-6` (desktop)
- **Border:** `border` with subtle color
- **Radius:** `rounded-lg` (8px)

### Anti-Drift Constraints
- **MUST** use Shadcn `Card` component
- **MUST** follow card structure
- **MUST** use consistent padding
- **MUST NOT** create custom card components
- **MUST NOT** use inconsistent card styles

### AI-Agent Safety Constraints
- **MUST** use Shadcn `Card` component
- **MUST** follow card structure
- **MUST** be consistent with card styles
- **MUST NOT** create custom card components

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Empty State Pattern (Operational)

### Empty State Structure
- **Illustration:** Friendly SVG or icon
- **Heading:** Clear message explaining state
- **Description:** Optional explanation
- **Action:** CTA button to resolve state
- **Spacing:** `py-12` (vertical padding)
- **Alignment:** Centered

### Empty State Examples
- **No appointments:** "No appointments yet" + "Book an appointment" button
- **No prescriptions:** "No prescriptions yet" + "Consult a doctor" button
- **No results:** "No results found" + "Try different filters" button

### Anti-Drift Constraints
- **MUST** use friendly illustrations
- **MUST** provide clear action
- **MUST** be centered
- **MUST NOT** use technical jargon
- **MUST NOT** leave users without action

### AI-Agent Safety Constraints
- **MUST** use friendly illustrations
- **MUST** provide clear action
- **MUST** be centered
- **MUST NOT** use technical jargon

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Form Layout Philosophy (Operational)

### Form Structure
- **Label:** Above input (mobile-first)
- **Input:** Full width
- **Helper text:** Below input (optional)
- **Error message:** Below input (red text)
- **Spacing:** `space-y-4` between fields
- **Alignment:** Left-aligned

### Form Groups
- **Related fields:** Group in `Card`
- **Optional sections:** Use `Accordion`
- **Progress indication:** Use `Progress` bar
- **Submit button:** Primary button at bottom

### Anti-Drift Constraints
- **MUST** use labels above inputs
- **MUST** use full-width inputs
- **MUST** provide error messages
- **MUST** use consistent spacing
- **MUST NOT** use side-by-side labels (desktop-only pattern)

### AI-Agent Safety Constraints
- **MUST** use labels above inputs
- **MUST** use full-width inputs
- **MUST** provide error messages
- **MUST** be consistent with spacing
- **MUST NOT** use side-by-side labels

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Mobile-First Interaction Rules (Operational)

### Touch Targets
- **Minimum size:** 44×44px
- **Button size:** `h-10` (40px minimum)
- **Input size:** `h-10` (40px minimum)
- **Link size:** Large tap area

### Mobile Navigation
- **Bottom navigation:** For primary navigation (future)
- **Hamburger menu:** For secondary navigation
- **Back buttons:** Clear back navigation
- **Gesture support:** Swipe where appropriate

### Mobile Layout
- **Single column:** Default layout
- **Stacked content:** Vertical stacking
- **Full width:** Use available width
- **No hover states:** Touch interactions only

### Anti-Drift Constraints
- **MUST** use 44×44px minimum touch targets
- **MUST** design for single column
- **MUST** stack content vertically
- **MUST NOT** use hover-only interactions
- **MUST NOT** use desktop-only patterns

### AI-Agent Safety Constraints
- **MUST** use 44×44px minimum touch targets
- **MUST** design for single column
- **MUST** stack content vertically
- **MUST NOT** use hover-only interactions

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Loading State Patterns (Operational)

### Page Loading
- **Full page spinner:** `Loader2` icon, centered
- **Skeleton screens:** For content-heavy pages
- **Progressive loading:** Load content as it arrives

### Action Loading
- **Button spinner:** `Loader2` icon in button
- **Button disable:** Disable button during loading
- **Optimistic UI:** Show result immediately if safe

### Anti-Drift Constraints
- **MUST** show loading state for all async operations
- **MUST** use `Loader2` icon for spinners
- **MUST** disable buttons during loading
- **MUST NOT** leave users in uncertain state

### AI-Agent Safety Constraints
- **MUST** show loading state
- **MUST** use `Loader2` icon
- **MUST** disable buttons during loading
- **MUST NOT** leave users uncertain

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 32 for error handling philosophy

---

## Visual Density Rules (Operational)

### Low Density (Eye Aura Standard)
- **Generous whitespace:** Use generous spacing
- **Limited information per screen:** Progressive disclosure
- **Clear hierarchy:** Visual separation
- **Breathing room:** Don't crowd content

### Anti-Density (What to Avoid)
- **Dense tables:** Use simple tables or cards instead
- **Complex dashboards:** Use simple widgets instead
- **Information overload:** Progressive disclosure
- **Cluttered interfaces:** Generous whitespace

### Anti-Drift Constraints
- **MUST** maintain low visual density
- **MUST** use generous whitespace
- **MUST** limit information per screen
- **MUST NOT** create dense interfaces
- **MUST NOT** clutter screens

### AI-Agent Safety Constraints
- **MUST** maintain low visual density
- **MUST** use generous whitespace
- **MUST** limit information per screen
- **MUST NOT** create dense interfaces

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Color Usage Rules (Operational)

### Primary Color (Teal)
- **Use case:** Primary actions, links, emphasis
- **Tailwind:** `teal-600` (primary), `teal-700` (hover)
- **Meaning:** Calm, trustworthy, medical

### Accent Color (Gold)
- **Use case:** Highlights, premium features
- **Tailwind:** `amber-500` (primary), `amber-600` (hover)
- **Meaning:** Premium, warmth, attention

### Semantic Colors
- **Success:** `green-600`
- **Error:** `red-600`
- **Warning:** `amber-500`
- **Info:** `blue-600`

### Neutral Colors
- **Background:** `bg-cream` (custom), `bg-white`
- **Text:** `text-gray-900` (primary), `text-gray-600` (secondary)
- **Border:** `border-gray-200`

### Anti-Drift Constraints
- **MUST** use teal for primary actions
- **MUST** use gold for accents
- **MUST** use semantic colors correctly
- **MUST NOT** introduce new brand colors
- **MUST NOT** use arbitrary colors

### AI-Agent Safety Constraints
- **MUST** use teal for primary actions
- **MUST** use gold for accents
- **MUST** use semantic colors correctly
- **MUST NOT** introduce new brand colors
- **MUST NOT** use arbitrary colors

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 34 for product identity

---

## Animation Rules (Operational)

### CSS Transitions Only
- **Transitions:** Use CSS `transition` property
- **Duration:** `duration-200` (fast), `duration-300` (normal)
- **Easing:** `ease-in-out` (default)
- **No libraries:** Do not use Framer Motion, React Spring, GSAP

### Animation Use Cases
- **Hover effects:** Button hover, card hover
- **Modal open/close:** Smooth transitions
- **Toast enter/exit:** Smooth transitions
- **Page transitions:** Simple fade (if needed)

### Respect Reduced Motion
- **Media query:** `@media (prefers-reduced-motion)`
- **Disable animations:** When user prefers reduced motion
- **Fallback:** No animation when reduced motion preferred

### Anti-Drift Constraints
- **MUST** use CSS transitions only
- **MUST** respect `prefers-reduced-motion`
- **MUST** keep animations subtle
- **MUST NOT** use animation libraries
- **MUST NOT** use complex animations

### AI-Agent Safety Constraints
- **MUST** use CSS transitions only
- **MUST** respect `prefers-reduced-motion`
- **MUST** keep animations subtle
- **MUST NOT** use animation libraries

### Cross-Reference
- See Section 31 for UI pattern library
- See Section 41 for AI agent contribution guide

---

## UI Change Process (Operational)

### Proposing a UI Change
1. Check if existing pattern covers the use case
2. If yes, use existing pattern
3. If no, document why new pattern is needed
4. Get approval from design team
5. Implement the change
6. Update this document

### UI Change Approval
- **New component:** Design team approval
- **New pattern:** Design team approval
- **Pattern modification:** Design team review
- **Minor tweak:** Self-approve (if following existing patterns)

### UI Change Rollout
1. Update this document first
2. Implement the change
3. Test on mobile viewport
4. Test on desktop viewport
5. Test accessibility
6. Deploy to production

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

<!-- SECTION:44 -->
# 44. ERROR HANDLING PHILOSOPHY (OPERATIONAL)

This section provides operational governance for error handling. It builds on Section 32 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing error handling drift.

---

## Loading State Rules (Operational)

### When to Show Loading States
- **Async operations:** All async operations must show loading state
- **Data fetching:** Show loading state while fetching data
- **Form submission:** Show loading state during form submission
- **File operations:** Show loading state during file operations
- **Navigation:** Show loading state during navigation

### Loading State Types
- **Blocking:** Full-screen or component-level blocking spinner
- **Non-blocking:** Inline spinner (e.g., in button)
- **Skeleton:** Skeleton screens for content-heavy pages
- **Progress:** Progress bar for multi-step operations

### Anti-Drift Constraints
- **MUST** show loading state for all async operations
- **MUST** use `Loader2` icon for spinners
- **MUST** disable buttons during loading
- **MUST NOT** leave users in uncertain state
- **MUST NOT** skip loading states for "fast" operations

### AI-Agent Safety Constraints
- **MUST** show loading state
- **MUST** use `Loader2` icon
- **MUST** disable buttons during loading
- **MUST NOT** leave users uncertain

### Cross-Reference
- See Section 32 for error handling philosophy
- See Section 43 for loading state patterns

---

## Toast Usage (Operational)

### When to Use Toasts
- **Success feedback:** After successful action completion
- **Error feedback:** After action failure
- **Info feedback:** For informational messages
- **Warning feedback:** For warning messages

### Toast Configuration
- **Duration:** `toast()` with `duration: 3000` (3 seconds)
- **Position:** Top-right or top-center
- **Action:** Optional action button
- **Dismiss:** User can dismiss manually

### Toast Examples
```typescript
// Success
toast({ title: "Success", description: "Appointment booked successfully" });

// Error
toast({ title: "Error", description: "Failed to book appointment", variant: "destructive" });

// Info
toast({ title: "Info", description: "Your profile has been updated" });
```

### Anti-Drift Constraints
- **MUST** use `useToast` hook for all toasts
- **MUST** provide clear messages
- **MUST** use appropriate variants
- **MUST NOT** use native `alert()`
- **MUST NOT** show too many toasts

### AI-Agent Safety Constraints
- **MUST** use `useToast` hook
- **MUST** provide clear messages
- **MUST** use appropriate variants
- **MUST NOT** use native `alert()`

### Cross-Reference
- See Section 32 for error handling philosophy
- See Section 43 for UI pattern library

---

## Optimistic UI Rules (Operational)

### When to Use Optimistic UI
- **Safe operations:** Operations that rarely fail
- **Reversible operations:** Operations that can be rolled back
- **User expectation:** Operations that users expect to be instant
- **Low risk:** Operations with minimal impact if they fail

### When NOT to Use Optimistic UI
- **Critical operations:** Operations that must succeed
- **Irreversible operations:** Operations that cannot be rolled back
- **Complex operations:** Operations with side effects
- **High risk:** Operations with significant impact if they fail

### Optimistic UI Implementation
```typescript
// Optimistic update
const handleClick = async () => {
  // Update UI immediately
  setOptimisticState(newState);
  
  try {
    // Perform operation
    await service.update();
  } catch (error) {
    // Roll back on error
    setOptimisticState(originalState);
    toast({ title: "Error", description: "Failed to update", variant: "destructive" });
  }
};
```

### Anti-Drift Constraints
- **MUST** roll back on error
- **MUST** show error if operation fails
- **MUST** use optimistic UI only for safe operations
- **MUST NOT** use optimistic UI for critical operations
- **MUST NOT** leave UI in inconsistent state

### AI-Agent Safety Constraints
- **MUST** roll back on error
- **MUST** show error if operation fails
- **MUST** use optimistic UI only for safe operations
- **MUST NOT** use optimistic UI for critical operations

### Cross-Reference
- See Section 32 for error handling philosophy

---

## Firestore Write Handling (Operational)

### Firestore Write Errors
- **Permission denied:** User lacks permission, show error
- **Network error:** Network issue, show error with retry
- **Timeout:** Operation timed out, show error with retry
- **Invalid data:** Data validation failed, show error

### Firestore Write Error Handling
```typescript
try {
  await service.create(data);
  toast({ title: "Success", description: "Created successfully" });
} catch (error) {
  console.error("Firestore write error:", error);
  
  if (error.code === "permission-denied") {
    toast({ title: "Error", description: "You don't have permission", variant: "destructive" });
  } else if (error.code === "unavailable") {
    toast({ title: "Error", description: "Network error, please retry", variant: "destructive" });
  } else {
    toast({ title: "Error", description: "Failed to save", variant: "destructive" });
  }
}
```

### Anti-Drift Constraints
- **MUST** handle all Firestore errors
- **MUST** show user-friendly error messages
- **MUST** log errors for debugging
- **MUST NOT** expose internal error details
- **MUST NOT** ignore errors

### AI-Agent Safety Constraints
- **MUST** handle all Firestore errors
- **MUST** show user-friendly error messages
- **MUST** log errors for debugging
- **MUST NOT** expose internal error details

### Cross-Reference
- See Section 32 for error handling philosophy
- See Section 42 for common pitfalls

---

## Retry Philosophy (Operational)

### When to Retry
- **Network errors:** Retry with exponential backoff
- **Timeout errors:** Retry with exponential backoff
- **Temporary failures:** Retry with exponential backoff
- **Rate limiting:** Retry with delay

### When NOT to Retry
- **Permission errors:** Permission won't change, don't retry
- **Validation errors:** Data won't fix itself, don't retry
- **Critical errors:** Retrying won't help, don't retry
- **User errors:** User needs to fix something, don't retry

### Retry Implementation
```typescript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

### Anti-Drift Constraints
- **MUST** retry only for retryable errors
- **MUST** use exponential backoff
- **MUST** limit retry attempts
- **MUST NOT** retry indefinitely
- **MUST NOT** retry non-retryable errors

### AI-Agent Safety Constraints
- **MUST** retry only for retryable errors
- **MUST** use exponential backoff
- **MUST** limit retry attempts
- **MUST NOT** retry indefinitely

### Cross-Reference
- See Section 32 for error handling philosophy

---

## API Failure Handling (Operational)

### API Error Types
- **400 Bad Request:** Invalid request, show error
- **401 Unauthorized:** Not authenticated, redirect to login
- **403 Forbidden:** No permission, show error
- **404 Not Found:** Resource not found, show error
- **500 Server Error:** Server error, show error with retry
- **503 Service Unavailable:** Service unavailable, show error with retry

### API Error Handling
```typescript
try {
  const response = await fetch("/api/endpoint", { method: "POST", body: JSON.stringify(data) });
  
  if (!response.ok) {
    if (response.status === 401) {
      redirect("/login");
    } else if (response.status === 403) {
      toast({ title: "Error", description: "You don't have permission", variant: "destructive" });
    } else {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    }
    return;
  }
  
  const result = await response.json();
  toast({ title: "Success", description: "Operation successful" });
} catch (error) {
  toast({ title: "Error", description: "Network error", variant: "destructive" });
}
```

### Anti-Drift Constraints
- **MUST** handle all HTTP status codes
- **MUST** show user-friendly error messages
- **MUST** redirect on 401
- **MUST** log errors for debugging
- **MUST NOT** expose internal error details

### AI-Agent Safety Constraints
- **MUST** handle all HTTP status codes
- **MUST** show user-friendly error messages
- **MUST** redirect on 401
- **MUST** log errors for debugging
- **MUST NOT** expose internal error details

### Cross-Reference
- See Section 32 for error handling philosophy
- See Section 40 for API route trust boundaries

---

## Fallback UX (Operational)

### Fallback Patterns
- **Empty state:** Show empty state when no data
- **Error state:** Show error state when data load fails
- **Loading state:** Show loading state while data loads
- **Offline state:** Show offline state when network unavailable

### Fallback UI Components
- **Empty state:** Illustration + message + CTA
- **Error state:** Error message + retry button
- **Loading state:** Spinner + message
- **Offline state:** Offline message + retry button

### Anti-Drift Constraints
- **MUST** provide fallback for all data loading
- **MUST** show user-friendly messages
- **MUST** provide recovery actions
- **MUST NOT** leave users with blank screen
- **MUST NOT** show technical errors

### AI-Agent Safety Constraints
- **MUST** provide fallback for all data loading
- **MUST** show user-friendly messages
- **MUST** provide recovery actions
- **MUST NOT** leave users with blank screen
- **MUST NOT** show technical errors

### Cross-Reference
- See Section 32 for error handling philosophy
- See Section 43 for UI pattern library

---

## Error Logging (Operational)

### What to Log
- **Error message:** Error message or code
- **Error stack:** Stack trace (if available)
- **Context:** User ID, action, timestamp
- **Request details:** API endpoint, method, body (sanitized)
- **Response details:** Status code, response body (sanitized)

### How to Log
```typescript
console.error("Error:", error.message);
console.error("Stack:", error.stack);
console.error("Context:", { userId, action, timestamp });
```

### Log Levels
- **Error:** Critical errors that need attention
- **Warning:** Warnings that don't block functionality
- **Info:** Informational messages
- **Debug:** Debug messages (development only)

### Anti-Drift Constraints
- **MUST** log all errors
- **MUST** log context for debugging
- **MUST** sanitize sensitive data
- **MUST NOT** log passwords or secrets
- **MUST NOT** log PII without justification

### AI-Agent Safety Constraints
- **MUST** log all errors
- **MUST** log context for debugging
- **MUST** sanitize sensitive data
- **MUST NOT** log passwords or secrets
- **MUST NOT** log PII without justification

### Cross-Reference
- See Section 32 for error handling philosophy

---

## Healthcare Workflow Error Handling (Operational)

### Booking Flow Errors
- **Slot unavailable:** Show error, suggest alternative slots
- **Doctor unavailable:** Show error, suggest alternative doctors
- **Payment failed:** Show error, retry payment
- **Booking failed:** Show error, retry booking

### Prescription Flow Errors
- **Appointment not found:** Show error, redirect to appointments
- **Appointment not completed:** Show error, complete appointment first
- **PDF generation failed:** Show error, retry or contact support
- **Prescription save failed:** Show error, retry or contact support

### Support Flow Errors
- **Ticket creation failed:** Show error, retry
- **Ticket update failed:** Show error, retry
- **Attachment upload failed:** Show error, retry or remove attachment

### Anti-Drift Constraints
- **MUST** provide clear error messages
- **MUST** provide recovery actions
- **MUST** preserve user data on error
- **MUST NOT** lose user input on error
- **MUST NOT** show technical errors

### AI-Agent Safety Constraints
- **MUST** provide clear error messages
- **MUST** provide recovery actions
- **MUST** preserve user data on error
- **MUST NOT** lose user input on error
- **MUST NOT** show technical errors

### Cross-Reference
- See Section 32 for error handling philosophy
- See Section 37 for business rules

---

## Error Handling Checklist (Operational)

### Before Submitting Code
- [ ] All async operations have loading states
- [ ] All errors are caught and handled
- [ ] All errors show user-friendly messages
- [ ] All errors are logged for debugging
- [ ] All errors provide recovery actions
- [ ] Optimistic UI rolls back on error
- [ ] API errors handle all status codes
- [ ] Firestore errors handle all error codes
- [ ] Fallback UI is provided for data loading
- [ ] Sensitive data is sanitized in logs

### AI-Agent Safety Constraints
- **MUST** handle all errors
- **MUST** show user-friendly messages
- **MUST** log errors for debugging
- **MUST** provide recovery actions
- **MUST** sanitize sensitive data

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

<!-- SECTION:45 -->
# 45. ABSOLUTE ARCHITECTURAL DO-NOT RULES (OPERATIONAL)

This section provides operational governance for absolute anti-patterns. It builds on Section 33 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing architectural violations.

---

## State Management Anti-Patterns (Operational)

### DO NOT Introduce Redux
**Why forbidden:** Redux adds unnecessary complexity for Eye Aura's state management needs
**What breaks:** Bundle size, development complexity, over-engineering
**AI-Agent constraint:** **MUST NOT** introduce Redux
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Zustand
**Why forbidden:** Zustand is unnecessary complexity for Eye Aura's state management needs
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Zustand
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Recoil
**Why forbidden:** Recoil is unnecessary complexity for Eye Aura's state management needs
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Recoil
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Jotai
**Why forbidden:** Jotai is unnecessary complexity for Eye Aura's state management needs
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Jotai
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Data Fetching Anti-Patterns (Operational)

### DO NOT Introduce SWR
**Why forbidden:** SWR is unnecessary complexity for Eye Aura's data fetching needs
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce SWR
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce React Query
**Why forbidden:** React Query is unnecessary complexity for Eye Aura's data fetching needs
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce React Query
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Apollo Client
**Why forbidden:** Apollo Client is unnecessary complexity (no GraphQL)
**What breaks:** Bundle size, development complexity, GraphQL overhead
**AI-Agent constraint:** **MUST NOT** introduce Apollo Client
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Styling Anti-Patterns (Operational)

### DO NOT Introduce CSS-in-JS Libraries
**Why forbidden:** CSS-in-JS libraries add runtime overhead and complexity
**What breaks:** Performance, bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce CSS-in-JS libraries
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce styled-components
**Why forbidden:** styled-components adds runtime overhead and complexity
**What breaks:** Performance, bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce styled-components
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Emotion
**Why forbidden:** Emotion adds runtime overhead and complexity
**What breaks:** Performance, bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Emotion
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Sass
**Why forbidden:** Sass is unnecessary complexity (Tailwind is sufficient)
**What breaks:** Build complexity, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Sass
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Form Handling Anti-Patterns (Operational)

### DO NOT Introduce Formik
**Why forbidden:** Formik is unnecessary complexity for Eye Aura's form needs
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Formik
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Final Form
**Why forbidden:** Final Form is unnecessary complexity for Eye Aura's form needs
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Final Form
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Animation Anti-Patterns (Operational)

### DO NOT Introduce Framer Motion
**Why forbidden:** Framer Motion adds bundle size and complexity
**What breaks:** Bundle size, development complexity, performance
**AI-Agent constraint:** **MUST NOT** introduce Framer Motion
**Cross-reference:** Section 41 for AI agent contribution guide, Section 43 for animation rules

### DO NOT Introduce React Spring
**Why forbidden:** React Spring adds bundle size and complexity
**What breaks:** Bundle size, development complexity, performance
**AI-Agent constraint:** **MUST NOT** introduce React Spring
**Cross-reference:** Section 41 for AI agent contribution guide, Section 43 for animation rules

### DO NOT Introduce GSAP
**Why forbidden:** GSAP adds bundle size and complexity
**What breaks:** Bundle size, development complexity, performance
**AI-Agent constraint:** **MUST NOT** introduce GSAP
**Cross-reference:** Section 41 for AI agent contribution guide, Section 43 for animation rules

---

## Scheduling Anti-Patterns (Operational)

### DO NOT Reintroduce FullCalendar
**Why forbidden:** FullCalendar is too heavy and not mobile-friendly
**What breaks:** Bundle size, mobile UX, performance
**AI-Agent constraint:** **MUST NOT** reintroduce FullCalendar
**Cross-reference:** Section 25 for custom calendar rationale, Section 41 for AI agent contribution guide

### DO NOT Introduce React Big Calendar
**Why forbidden:** React Big Calendar is too heavy and not mobile-friendly
**What breaks:** Bundle size, mobile UX, performance
**AI-Agent constraint:** **MUST NOT** introduce React Big Calendar
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Calendar.js
**Why forbidden:** Calendar.js is unnecessary complexity (custom calendar is sufficient)
**What breaks:** Bundle size, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Calendar.js
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Database Anti-Patterns (Operational)

### DO NOT Introduce SQL Database
**Why forbidden:** SQL database is unnecessary complexity (Firestore is sufficient)
**What breaks:** Infrastructure complexity, cost, development complexity
**AI-Agent constraint:** **MUST NOT** introduce SQL database
**Cross-reference:** Section 27 for Firestore design philosophy, Section 41 for AI agent contribution guide

### DO NOT Introduce MongoDB
**Why forbidden:** MongoDB is unnecessary complexity (Firestore is sufficient)
**What breaks:** Infrastructure complexity, cost, development complexity
**AI-Agent constraint:** **MUST NOT** introduce MongoDB
**Cross-reference:** Section 27 for Firestore design philosophy, Section 41 for AI agent contribution guide

### DO NOT Introduce Prisma
**Why forbidden:** Prisma is unnecessary complexity (Firestore is sufficient)
**What breaks:** Development complexity, type complexity
**AI-Agent constraint:** **MUST NOT** introduce Prisma
**Cross-reference:** Section 41 for AI agent contribution guide

---

## File Storage Anti-Patterns (Operational)

### DO NOT Introduce Firebase Storage
**Why forbidden:** File storage is unnecessary (data-only storage philosophy)
**What breaks:** Infrastructure complexity, cost, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Firebase Storage
**Cross-reference:** Section 25 for no-file-uploads rationale, Section 41 for AI agent contribution guide

### DO NOT Introduce S3
**Why forbidden:** S3 is unnecessary complexity (data-only storage philosophy)
**What breaks:** Infrastructure complexity, cost, development complexity
**AI-Agent constraint:** **MUST NOT** introduce S3
**Cross-reference:** Section 25 for no-file-uploads rationale, Section 41 for AI agent contribution guide

### DO NOT Introduce Cloudinary
**Why forbidden:** Cloudinary is unnecessary complexity (data-only storage philosophy)
**What breaks:** Infrastructure complexity, cost, development complexity
**AI-Agent constraint:** **MUST NOT** introduce Cloudinary
**Cross-reference:** Section 25 for no-file-uploads rationale, Section 41 for AI agent contribution guide

---

## Server Infrastructure Anti-Patterns (Operational)

### DO NOT Introduce Custom Server
**Why forbidden:** Custom server is unnecessary complexity (Next.js API routes are sufficient)
**What breaks:** Deployment complexity, development complexity, cost
**AI-Agent constraint:** **MUST NOT** introduce custom server
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Docker
**Why forbidden:** Docker is unnecessary complexity (serverless is sufficient)
**What breaks:** Deployment complexity, development complexity, cost
**AI-Agent constraint:** **MUST NOT** introduce Docker
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Kubernetes
**Why forbidden:** Kubernetes is unnecessary complexity (serverless is sufficient)
**What breaks:** Deployment complexity, development complexity, cost
**AI-Agent constraint:** **MUST NOT** introduce Kubernetes
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Authentication Anti-Patterns (Operational)

### DO NOT Introduce Custom Auth
**Why forbidden:** Custom auth is unnecessary complexity (Firebase Auth is sufficient)
**What breaks:** Security risk, development complexity, maintenance burden
**AI-Agent constraint:** **MUST NOT** introduce custom auth
**Cross-reference:** Section 28 for security architecture, Section 41 for AI agent contribution guide

### DO NOT Introduce Auth0
**Why forbidden:** Auth0 is unnecessary complexity (Firebase Auth is sufficient)
**What breaks:** Cost, development complexity, vendor lock-in
**AI-Agent constraint:** **MUST NOT** introduce Auth0
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce NextAuth
**Why forbidden:** NextAuth is unnecessary complexity (Firebase Auth is sufficient)
**What breaks:** Development complexity, maintenance burden
**AI-Agent constraint:** **MUST NOT** introduce NextAuth
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Video Infrastructure Anti-Patterns (Operational)

### DO NOT Introduce Custom WebRTC
**Why forbidden:** Custom WebRTC is unnecessary complexity (external platforms are sufficient)
**What breaks:** Infrastructure complexity, cost, development complexity, maintenance burden
**AI-Agent constraint:** **MUST NOT** introduce custom WebRTC
**Cross-reference:** Section 25 for no-video-infrastructure rationale, Section 41 for AI agent contribution guide

### DO NOT Introduce Agora
**Why forbidden:** Agora is unnecessary complexity (external platforms are sufficient)
**What breaks:** Cost, development complexity, vendor lock-in
**AI-Agent constraint:** **MUST NOT** introduce Agora
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce Twilio Video
**Why forbidden:** Twilio Video is unnecessary complexity (external platforms are sufficient)
**What breaks:** Cost, development complexity, vendor lock-in
**AI-Agent constraint:** **MUST NOT** introduce Twilio Video
**Cross-reference:** Section 41 for AI agent contribution guide

---

## Payment Gateway Anti-Patterns (Operational)

### DO NOT Introduce Stripe
**Why forbidden:** Stripe is not suitable for Indian market (Razorpay is required)
**What breaks:** Business model violation, regulatory compliance
**AI-Agent constraint:** **MUST NOT** introduce Stripe
**Cross-reference:** Section 25 for Razorpay requirement, Section 37 for payment rules, Section 41 for AI agent contribution guide

### DO NOT Introduce PayPal
**Why forbidden:** PayPal is not suitable for Indian market (Razorpay is required)
**What breaks:** Business model violation, regulatory compliance
**AI-Agent constraint:** **MUST NOT** introduce PayPal
**Cross-reference:** Section 25 for Razorpay requirement, Section 37 for payment rules, Section 41 for AI agent contribution guide

---

## Email Service Anti-Patterns (Operational)

### DO NOT Introduce SendGrid
**Why forbidden:** SendGrid is unnecessary complexity (Resend is sufficient)
**What breaks:** Cost, development complexity, vendor lock-in
**AI-Agent constraint:** **MUST NOT** introduce SendGrid
**Cross-reference:** Section 25 for Resend rationale, Section 41 for AI agent contribution guide

### DO NOT Introduce Mailgun
**Why forbidden:** Mailgun is unnecessary complexity (Resend is sufficient)
**What breaks:** Cost, development complexity, vendor lock-in
**AI-Agent constraint:** **MUST NOT** introduce Mailgun
**Cross-reference:** Section 41 for AI agent contribution guide

### DO NOT Introduce AWS SES
**Why forbidden:** AWS SES is unnecessary complexity (Resend is sufficient)
**What breaks:** Development complexity, vendor lock-in
**AI-Agent constraint:** **MUST NOT** introduce AWS SES
**Cross-reference:** Section 41 for AI agent contribution guide

---

## UI Component Anti-Patterns (Operational)

### DO NOT Introduce Material-UI
**Why forbidden:** Material-UI conflicts with Eye Aura design system
**What breaks:** UX consistency, bundle size, design system violation
**AI-Agent constraint:** **MUST NOT** introduce Material-UI
**Cross-reference:** Section 31 for UI pattern library, Section 34 for product identity, Section 41 for AI agent contribution guide

### DO NOT Introduce Chakra UI
**Why forbidden:** Chakra UI conflicts with Eye Aura design system
**What breaks:** UX consistency, bundle size, design system violation
**AI-Agent constraint:** **MUST NOT** introduce Chakra UI
**Cross-reference:** Section 31 for UI pattern library, Section 34 for product identity, Section 41 for AI agent contribution guide

### DO NOT Introduce Ant Design
**Why forbidden:** Ant Design conflicts with Eye Aura design system (enterprise aesthetic)
**What breaks:** UX consistency, bundle size, design system violation, product identity violation
**AI-Agent constraint:** **MUST NOT** introduce Ant Design
**Cross-reference:** Section 31 for UI pattern library, Section 34 for product identity, Section 41 for AI agent contribution guide

---

## Firestore Anti-Patterns (Operational)

### DO NOT Deeply Nest Firestore Collections
**Why forbidden:** Deep nesting makes queries complex and slow
**What breaks:** Query complexity, performance, scalability
**AI-Agent constraint:** **MUST NOT** deeply nest Firestore collections
**Cross-reference:** Section 27 for Firestore design philosophy, Section 39 for flat collections philosophy

### DO NOT Use Server-Side Firestore Client SDK Writes
**Why forbidden:** Client SDK in API routes runs unauthenticated
**What breaks:** Security violation, data corruption
**AI-Agent constraint:** **MUST NOT** use Client SDK for privileged writes
**Cross-reference:** Section 28 for security architecture, Section 40 for trust boundaries, Section 42 for common pitfalls

### DO NOT Bypass Firestore Services
**Why forbidden:** Bypassing service layer violates business logic
**What breaks:** Business logic violation, data corruption
**AI-Agent constraint:** **MUST NOT** bypass Firestore services
**Cross-reference:** Section 37 for business rules, Section 42 for common pitfalls

---

## Security Anti-Patterns (Operational)

### DO NOT Expose Admin SDK Keys to Browser
**Why forbidden:** Admin SDK keys have full database access
**What breaks:** Security violation, data breach risk
**AI-Agent constraint:** **MUST NOT** expose Admin SDK keys to browser
**Cross-reference:** Section 28 for security architecture, Section 40 for trust boundaries, Section 42 for common pitfalls

### DO NOT Use Client SDK for Privileged Writes
**Why forbidden:** Client SDK cannot perform privileged operations
**What breaks:** Security violation, data corruption
**AI-Agent constraint:** **MUST NOT** use Client SDK for privileged writes
**Cross-reference:** Section 28 for security architecture, Section 40 for trust boundaries

### DO NOT Allow Self-Creation of Admin Role
**Why forbidden:** Admin role elevation is a security risk
**What breaks:** Security violation, unauthorized access
**AI-Agent constraint:** **MUST NOT** allow self-creation of admin role
**Cross-reference:** Section 28 for security architecture, Section 37 for admin rules

---

## Anti-Pattern Detection Process (Operational)

### Automated Detection (Future)
Implement linting rules that check for:
- Forbidden dependencies in package.json
- Forbidden imports in code
- Admin SDK usage in client components
- Client SDK usage in API routes for writes
- Direct Firestore writes bypassing service layer

### Manual Detection
During code review, check for:
- Forbidden dependencies
- Forbidden imports
- Bypass of service layer
- Security violations
- Design system violations

### Violation Response
- **Critical violations:** Block deployment immediately
- **High violations:** Block deployment, require fix
- **Medium violations:** Require fix before merge
- **Low violations:** Document and address later

---

## Anti-Pattern Prevention Checklist (Operational)

### Before Adding Dependency
- [ ] Checked if dependency is in forbidden list (Section 33)
- [ ] Checked if existing solution is sufficient
- [ ] Checked if dependency is necessary for feature
- [ ] Got approval for new dependency
- [ ] Updated this document if needed

### Before Implementing Pattern
- [ ] Checked if pattern is in forbidden list (Section 33)
- [ ] Checked if existing pattern is sufficient
- [ ] Checked if pattern is necessary for feature
- [ ] Got approval for new pattern
- [ ] Updated this document if needed

### AI-Agent Safety Constraints
- **MUST** check forbidden list before adding dependency
- **MUST** check forbidden list before implementing pattern
- **MUST** get approval for new dependencies
- **MUST** get approval for new patterns
- **MUST** update documentation if architecture changes

<!-- SECTION:46 -->
# 46. PROJECT PHILOSOPHY & PRODUCT IDENTITY (OPERATIONAL)

This section provides operational governance for preserving Eye Aura's product identity and philosophy. It builds on Section 34 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for preventing identity drift.

---

## What Eye Aura IS (Operational)

### Calm Wellness Platform
- **Philosophy:** Healthcare should be calm, not chaotic
- **UX:** Low visual density, generous whitespace
- **Tone:** Gentle, reassuring, professional
- **Aesthetic:** Calm colors (teal, cream, gold), not clinical or corporate

### Frictionless Booking
- **Philosophy:** Booking should be easy, not a chore
- **UX:** Public-read availability, no auth barrier for viewing
- **Flow:** Simple request → approval model
- **Accessibility:** Mobile-first, touch-friendly

### Doctor-Centric Scheduling
- **Philosophy:** Doctors control their availability
- **UX:** Flexible scheduling, block management
- **Control:** Doctors approve requests, not auto-booking
- **Flexibility:** Recurring availability, ad-hoc blocks

### Data-Only Storage
- **Philosophy:** Keep it simple, no file uploads
- **UX:** Text-based data only
- **Infrastructure:** No Firebase Storage, no S3, no Cloudinary
- **Simplicity:** Reduced complexity, reduced cost

### External Video Platforms
- **Philosophy:** Don't build video infrastructure
- **UX:** Link to external platforms (Zoom, Google Meet)
- **Infrastructure:** No WebRTC, no Agora, no Twilio Video
- **Simplicity:** Reduced complexity, reduced cost

### Anti-Drift Constraints
- **MUST** preserve calm wellness aesthetic
- **MUST** preserve frictionless booking flow
- **MUST** preserve doctor-centric scheduling
- **MUST** preserve data-only storage philosophy
- **MUST** preserve external video platform philosophy
- **MUST NOT** introduce enterprise aesthetics
- **MUST NOT** introduce file upload infrastructure
- **MUST NOT** introduce video infrastructure

### AI-Agent Safety Constraints
- **MUST** preserve calm wellness aesthetic
- **MUST** preserve frictionless booking flow
- **MUST** preserve doctor-centric scheduling
- **MUST** preserve data-only storage philosophy
- **MUST** preserve external video platform philosophy
- **MUST NOT** introduce enterprise aesthetics
- **MUST NOT** introduce file upload infrastructure
- **MUST NOT** introduce video infrastructure

### Cross-Reference
- See Section 34 for product identity
- See Section 43 for UI pattern library

---

## What Eye Aura IS NOT (Operational)

### NOT an ERP System
- **Why not:** ERP systems are complex, dense, and enterprise-focused
- **What to avoid:** Complex dashboards, dense tables, enterprise aesthetics
- **AI-Agent constraint:** **MUST NOT** introduce ERP-style dashboards
- **Cross-reference:** Section 33 for absolute do-not rules

### NOT a Clinical System
- **Why not:** Clinical systems are overly complex for telehealth
- **What to avoid:** Complex medical records, clinical workflows
- **AI-Agent constraint:** **MUST NOT** introduce clinical system complexity
- **Cross-reference:** Section 34 for product identity

### NOT a Hospital Management System
- **Why not:** Hospital systems are too complex for telehealth
- **What to avoid:** Hospital workflows, complex scheduling
- **AI-Agent constraint:** **MUST NOT** introduce hospital management complexity
- **Cross-reference:** Section 34 for product identity

### NOT a File Storage Platform
- **Why not:** File storage adds unnecessary complexity
- **What to avoid:** File uploads, file storage infrastructure
- **AI-Agent constraint:** **MUST NOT** introduce file storage
- **Cross-reference:** Section 25 for no-file-uploads rationale, Section 45 for anti-patterns

### NOT a Video Platform
- **Why not:** Video infrastructure adds unnecessary complexity
- **What to avoid:** WebRTC, video SDKs, video infrastructure
- **AI-Agent constraint:** **MUST NOT** introduce video infrastructure
- **Cross-reference:** Section 25 for no-video-infrastructure rationale, Section 45 for anti-patterns

### Anti-Drift Constraints
- **MUST NOT** introduce ERP-style dashboards
- **MUST NOT** introduce clinical system complexity
- **MUST NOT** introduce hospital management complexity
- **MUST NOT** introduce file storage
- **MUST NOT** introduce video infrastructure

### AI-Agent Safety Constraints
- **MUST NOT** introduce ERP-style dashboards
- **MUST NOT** introduce clinical system complexity
- **MUST NOT** introduce hospital management complexity
- **MUST NOT** introduce file storage
- **MUST NOT** introduce video infrastructure

### Cross-Reference
- See Section 34 for product identity
- See Section 45 for absolute do-not rules

---

## Brand Identity Preservation (Operational)

### Color Palette
- **Primary:** Teal (calm, trustworthy, medical)
- **Accent:** Gold (premium, warmth, attention)
- **Background:** Cream (warmth, comfort)
- **Semantic:** Green (success), Red (error), Amber (warning)
- **Anti-drift:** **MUST** use defined colors, **MUST NOT** introduce new brand colors
- **AI-Agent constraint:** **MUST** use defined colors, **MUST NOT** introduce new brand colors

### Typography
- **Display:** Luciole (friendly, approachable)
- **Body:** Atkinson Hyperlegible (readability, accessibility)
- **Anti-drift:** **MUST** use defined fonts, **MUST NOT** introduce new fonts
- **AI-Agent constraint:** **MUST** use defined fonts, **MUST NOT** introduce new fonts

### Visual Density
- **Standard:** Low density, generous whitespace
- **Anti-drift:** **MUST** maintain low visual density, **MUST NOT** create dense interfaces
- **AI-Agent constraint:** **MUST** maintain low visual density, **MUST NOT** create dense interfaces

### Tone of Voice
- **Standard:** Gentle, reassuring, professional
- **Anti-drift:** **MUST** use gentle tone, **MUST NOT** use clinical or corporate tone
- **AI-Agent constraint:** **MUST** use gentle tone, **MUST NOT** use clinical or corporate tone

### Cross-Reference
- See Section 34 for product identity
- See Section 43 for UI pattern library

---

## UX Philosophy Preservation (Operational)

### Mobile-First
- **Philosophy:** Design for mobile first, scale up to desktop
- **Anti-drift:** **MUST** design for mobile first, **MUST NOT** use desktop-only patterns
- **AI-Agent constraint:** **MUST** design for mobile first, **MUST NOT** use desktop-only patterns
- **Cross-reference:** Section 43 for mobile-first interaction rules

### Frictionless
- **Philosophy:** Reduce friction, remove unnecessary barriers
- **Anti-drift:** **MUST** reduce friction, **MUST NOT** add unnecessary barriers
- **AI-Agent constraint:** **MUST** reduce friction, **MUST NOT** add unnecessary barriers
- **Cross-reference:** Section 27 for public-read philosophy

### Progressive Disclosure
- **Philosophy:** Show information progressively, not all at once
- **Anti-drift:** **MUST** use progressive disclosure, **MUST NOT** show all information at once
- **AI-Agent constraint:** **MUST** use progressive disclosure, **MUST NOT** show all information at once
- **Cross-reference:** Section 43 for visual density rules

### Accessibility
- **Philosophy:** Ensure accessibility for all users
- **Anti-drift:** **MUST** ensure accessibility, **MUST NOT** ignore accessibility
- **AI-Agent constraint:** **MUST** ensure accessibility, **MUST NOT** ignore accessibility
- **Cross-reference:** Section 43 for mobile-first interaction rules

---

## Business Model Preservation (Operational)

### Request/Approval Model
- **Philosophy:** Patients request, doctors approve
- **Anti-drift:** **MUST** preserve request/approval model, **MUST NOT** introduce auto-booking
- **AI-Agent constraint:** **MUST** preserve request/approval model, **MUST NOT** introduce auto-booking
- **Cross-reference:** Section 37 for booking rules

### Indian Market Focus
- **Philosophy:** Focus on Indian market, use Razorpay
- **Anti-drift:** **MUST** use Razorpay, **MUST NOT** introduce Stripe or PayPal
- **AI-Agent constraint:** **MUST** use Razorpay, **MUST NOT** introduce Stripe or PayPal
- **Cross-reference:** Section 25 for Razorpay requirement, Section 45 for anti-patterns

### Doctor-Centric Control
- **Philosophy:** Doctors control their availability
- **Anti-drift:** **MUST** preserve doctor control, **MUST NOT** introduce system control
- **AI-Agent constraint:** **MUST** preserve doctor control, **MUST NOT** introduce system control
- **Cross-reference:** Section 37 for scheduling rules

---

## Philosophy Change Process (Operational)

### Proposing a Philosophy Change
1. Document current philosophy
2. Explain why change is needed
3. Assess impact on product identity
4. Identify potential risks
5. Get approval from product team
6. Implement the change
7. Update this document

### Philosophy Change Approval
- **Brand identity changes:** Product team approval
- **UX philosophy changes:** Product team approval
- **Business model changes:** Executive approval
- **Major philosophical shifts:** Executive approval

### Philosophy Change Rollout
1. Update this document first
2. Implement the change
3. Test with users
4. Deploy to production
5. Monitor for issues

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

---

## Identity Preservation Checklist (Operational)

### Before Submitting UI Changes
- [ ] Preserved calm wellness aesthetic
- [ ] Used defined color palette
- [ ] Used defined typography
- [ ] Maintained low visual density
- [ ] Used gentle tone of voice
- [ ] Designed for mobile first
- [ ] Reduced friction
- [ ] Ensured accessibility
- [ ] Preserved request/approval model
- [ ] Preserved doctor-centric control

### AI-Agent Safety Constraints
- **MUST** preserve calm wellness aesthetic
- **MUST** use defined color palette
- **MUST** use defined typography
- **MUST** maintain low visual density
- **MUST** use gentle tone of voice
- **MUST** design for mobile first
- **MUST** reduce friction
- **MUST** ensure accessibility
- **MUST** preserve request/approval model
- **MUST** preserve doctor-centric control

<!-- SECTION:47 -->
# 47. DOCUMENTATION MAINTENANCE GOVERNANCE (OPERATIONAL)

This section provides operational governance for maintaining this architecture document. It builds on Section 35 but adds enforcement mechanisms, validation requirements, and AI-agent safety constraints for ensuring documentation stays accurate and up-to-date.

---

## When to Update This Document (Operational)

### Mandatory Update Triggers
- **New collection added:** Update Section 27 (Firestore design) and Section 39 (Firestore design philosophy)
- **Collection modified:** Update Section 27 (Firestore design) and Section 39 (Firestore design philosophy)
- **New feature added:** Update Section 21 (feature → file responsibility map)
- **Business rule changed:** Update Section 23 (business rules) and Section 37 (business rules operational)
- **State transition added:** Update Section 24 (state transitions) and Section 38 (state transition matrices)
- **Security model changed:** Update Section 28 (security architecture) and Section 40 (trust boundaries)
- **New dependency added:** Update Section 33 (absolute do-not rules) and Section 45 (anti-patterns)
- **UI pattern changed:** Update Section 31 (UI pattern library) and Section 43 (UI pattern library operational)
- **Product identity changed:** Update Section 34 (product identity) and Section 46 (product identity operational)

### Optional Update Triggers
- **Bug fix:** Document bug fix if it affects architecture
- **Refactor:** Document refactor if it affects architecture
- **Performance improvement:** Document improvement if it affects architecture
- **Code review feedback:** Document if feedback reveals architectural issue

### Anti-Drift Constraints
- **MUST** update this document when architecture changes
- **MUST** update this document when business rules change
- **MUST** update this document when collections change
- **MUST** update this document when dependencies change
- **MUST NOT** skip documentation updates
- **MUST NOT** rely on memory instead of documentation

### AI-Agent Safety Constraints
- **MUST** update this document when architecture changes
- **MUST** update this document when business rules change
- **MUST** update this document when collections change
- **MUST** update this document when dependencies change
- **MUST NOT** skip documentation updates
- **MUST NOT** rely on memory instead of documentation

### Cross-Reference
- See Section 35 for documentation maintenance rules

---

## How to Update This Document (Operational)

### Update Process
1. Identify which section(s) need updating
2. Read the current content of those sections
3. Draft the update (preserve existing content, add new content)
4. Review the update for accuracy and completeness
5. Add cross-references to related sections
6. Update the table of contents if needed
7. Commit the update with descriptive message
8. Notify team if the change is significant

### Update Format
- **Preserve existing content:** Do not remove or rewrite existing sections
- **Add new content:** Append new content to relevant sections
- **Use consistent format:** Follow existing section format
- **Add cross-references:** Link to related sections
- **Be specific:** Avoid vague explanations
- **Include rationale:** Explain why decisions exist

### Update Quality Criteria
- **Accuracy:** Information must be correct
- **Completeness:** Information must be complete
- **Clarity:** Information must be clear
- **Consistency:** Information must be consistent with existing content
- **Actionability:** Information must be actionable

### Anti-Drift Constraints
- **MUST** preserve existing content
- **MUST** not remove or rewrite existing sections
- **MUST** follow existing section format
- **MUST** add cross-references to related sections
- **MUST** be specific and complete
- **MUST NOT** be vague or incomplete

### AI-Agent Safety Constraints
- **MUST** preserve existing content
- **MUST** not remove or rewrite existing sections
- **MUST** follow existing section format
- **MUST** add cross-references to related sections
- **MUST** be specific and complete
- **MUST NOT** be vague or incomplete

---

## Documentation Review Process (Operational)

### Review Triggers
- **Quarterly review:** Comprehensive review of entire document
- **Major feature release:** Review affected sections
- **Architecture change:** Review affected sections
- **Team feedback:** Review based on feedback

### Review Checklist
- [ ] All sections are accurate
- [ ] All sections are complete
- [ ] All sections are consistent
- [ ] All cross-references are correct
- [ ] All examples are correct
- [ ] All code snippets are correct
- [ ] All anti-drift constraints are current
- [ ] All AI-agent safety constraints are current
- [ ] Table of contents is up to date
- [ ] Changelog is up to date

### Review Approval
- **Minor updates:** Self-approve, commit directly
- **Medium updates:** Get one review, then commit
- **Major updates:** Get team review, consensus, then commit
- **Critical updates:** Executive approval required

### Anti-Drift Constraints
- **MUST** review document quarterly
- **MUST** review document after major changes
- **MUST** ensure accuracy and completeness
- **MUST** ensure consistency
- **MUST NOT** skip reviews

### AI-Agent Safety Constraints
- **MUST** review document quarterly
- **MUST** review document after major changes
- **MUST** ensure accuracy and completeness
- **MUST** ensure consistency
- **MUST NOT** skip reviews

---

## Documentation Change Approval (Operational)

### Change Approval Matrix
| Change Type | Approval Required | Review Required |
|---|---|---|
| Typo fix | Self-approve | No |
| Minor clarification | Self-approve | No |
| Section update (minor) | Self-approve | No |
| Section update (medium) | Team lead | Yes |
| Section update (major) | Team consensus | Yes |
| New section | Team consensus | Yes |
| Architectural change | Executive approval | Yes |
| Business rule change | Product team | Yes |

### Approval Process
1. Draft the change
2. Identify change type
3. Get required approval
4. Get required review (if needed)
5. Implement the change
6. Commit with descriptive message
7. Notify team if significant

### Anti-Drift Constraints
- **MUST** follow approval matrix
- **MUST** get required approval
- **MUST** get required review
- **MUST** commit with descriptive message
- **MUST NOT** bypass approval process

### AI-Agent Safety Constraints
- **MUST** follow approval matrix
- **MUST** get required approval
- **MUST** get required review
- **MUST** commit with descriptive message
- **MUST NOT** bypass approval process

---

## Documentation Violation Response (Operational)

### Violation Severity Levels
- **Critical:** Documentation is completely wrong or missing for critical architecture
- **High:** Documentation is significantly wrong or missing for important architecture
- **Medium:** Documentation is partially wrong or missing for moderate architecture
- **Low:** Documentation has minor errors or omissions

### Violation Response Actions
- **Critical violations:** Block deployment immediately, require fix before unblocking
- **High violations:** Block deployment, require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

### Violation Detection
- **Automated detection:** (Future) Linting rules for missing documentation
- **Manual detection:** Code review checks for missing documentation
- **User feedback:** Team reports missing or incorrect documentation

### Anti-Drift Constraints
- **MUST** fix critical violations immediately
- **MUST** fix high violations before merge
- **MUST** fix medium violations within sprint
- **MUST** address low violations
- **MUST NOT** ignore documentation violations

### AI-Agent Safety Constraints
- **MUST** fix critical violations immediately
- **MUST** fix high violations before merge
- **MUST** fix medium violations within sprint
- **MUST** address low violations
- **MUST NOT** ignore documentation violations

---

## Documentation Maintenance Checklist (Operational)

### Before Submitting Code
- [ ] Checked if architecture changed
- [ ] Checked if business rules changed
- [ ] Checked if collections changed
- [ ] Checked if dependencies changed
- [ ] Updated relevant sections if needed
- [ ] Added cross-references if needed
- [ ] Updated table of contents if needed
- [ ] Committed with descriptive message
- [ ] Notified team if significant change

### AI-Agent Safety Constraints
- **MUST** check if architecture changed
- **MUST** check if business rules changed
- **MUST** check if collections changed
- **MUST** check if dependencies changed
- **MUST** update relevant sections if needed
- **MUST** add cross-references if needed
- **MUST** update table of contents if needed
- **MUST** commit with descriptive message
- **MUST** notify team if significant change

---

## Document Structure Governance (Operational)

### Section Ordering
- Sections must be numbered sequentially
- Sections must be grouped logically
- Sections must be referenced in table of contents
- Sections must have cross-references to related sections

### Section Format
- Each section must have a clear title
- Each section must have a brief description
- Each section must have subsections if needed
- Each section must have cross-references
- Each section must have anti-drift constraints
- Each section must have AI-agent safety constraints

### Content Guidelines
- Content must be specific and detailed
- Content must include rationale
- Content must include rules
- Content must include boundaries
- Content must include future contributor instructions
- Content must not be vague
- Content must not be shallow bullet points

### Anti-Drift Constraints
- **MUST** maintain section ordering
- **MUST** maintain section format
- **MUST** follow content guidelines
- **MUST** not reorder sections without reason
- **MUST** not change section format without reason
- **MUST** not violate content guidelines

### AI-Agent Safety Constraints
- **MUST** maintain section ordering
- **MUST** maintain section format
- **MUST** follow content guidelines
- **MUST** not reorder sections without reason
- **MUST** not change section format without reason
- **MUST** not violate content guidelines

---

## AI-Agent Documentation Constraints (Operational)

### AI-Agent Documentation Requirements
- **MUST** read relevant sections before making changes
- **MUST** update documentation after making architectural changes
- **MUST** follow documentation maintenance process
- **MUST** not skip documentation updates
- **MUST** not rely on memory instead of documentation
- **MUST** preserve existing content
- **MUST** add cross-references to related sections

### AI-Agent Documentation Safety
- **MUST** not remove existing content
- **MUST** not rewrite existing sections
- **MUST** not introduce vague explanations
- **MUST** not introduce shallow bullet points
- **MUST** be specific and detailed
- **MUST** include rationale for decisions
- **MUST** include rules and boundaries

### AI-Agent Documentation Verification
- **MUST** verify documentation accuracy before submitting
- **MUST** verify documentation completeness before submitting
- **MUST** verify documentation consistency before submitting
- **MUST** verify cross-references are correct before submitting

---

## Final Documentation Checklist (Operational)

### Before Finalizing Documentation Update
- [ ] Identified all affected sections
- [ ] Read current content of affected sections
- [ ] Drafted update preserving existing content
- [ ] Added new content with rationale
- [ ] Added cross-references to related sections
- [ ] Updated table of contents if needed
- [ ] Reviewed for accuracy and completeness
- [ ] Reviewed for consistency
- [ ] Got required approval if needed
- [ ] Committed with descriptive message

### AI-Agent Safety Constraints
- **MUST** identify all affected sections
- **MUST** read current content before updating
- **MUST** preserve existing content
- **MUST** add new content with rationale
- **MUST** add cross-references to related sections
- **MUST** review for accuracy and completeness
- **MUST** review for consistency
- **MUST** get required approval if needed
- **MUST** commit with descriptive message

---

## End of Document

This concludes the Eye Aura Master Architecture Document. This document serves as the single source of truth for all architectural decisions, business rules, and engineering guidelines for the Eye Aura project. Any changes to the architecture must be reflected in this document to ensure consistency, prevent architectural drift, and enable safe long-term maintenance.

<!-- END_OF_DOCUMENT -->

<!-- APPEND_HERE -->

<!-- SECTION:48 -->
# 48. CROSS-REFERENCE ARCHITECTURE MAP

This section provides a navigational map linking related systems across the architecture document. It enables AI agents to instantly locate all relevant sections for any given domain, reducing retrieval latency and ensuring comprehensive context awareness.

---

## Authentication System Cross-References

### Authentication Architecture
- **Role system:** Section 4 (Role-Based Access Control)
- **Auth flow:** Section 5 (Authentication Flow)
- **Security architecture:** Section 28 (Security Architecture & Trust Boundaries)
- **Trust boundaries:** Section 40 (Security Architecture & Trust Boundaries - Operational)
- **Middleware:** Section 28 (Middleware Minimalism)

### Authentication Business Rules
- **Auth business rules:** Section 23 (Business Rules)
- **Auth business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)
- **Role enforcement:** Section 28 (Security Architecture)
- **Role enforcement (operational):** Section 40 (Trust Boundaries)

### Authentication Firestore Collections
- **Users collection:** Section 6 (Firestore Collections)
- **Users collection (operational):** Section 27 (Firestore Design Philosophy)
- **Firestore rules:** Section 28 (Firestore Rules for Auth)

### Authentication AI-Agent Constraints
- **Auth AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Auth AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Auth anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Auth anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Authentication Common Pitfalls
- **Auth pitfalls:** Section 30 (Common Pitfalls)
- **Auth pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Booking System Cross-References

### Booking Architecture
- **Booking flow:** Section 7 (Booking Flow)
- **Booking lifecycle:** Section 7 (Booking Flow)
- **Feature ownership:** Section 21 (Feature → File Responsibility Map)
- **Feature ownership (operational):** Section 36 (Feature → File Ownership Matrix - Operational)

### Booking Business Rules
- **Booking business rules:** Section 23 (Business Rules)
- **Booking business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)
- **Booking state transitions:** Section 24 (State Transitions)
- **Booking state transitions (operational):** Section 38 (State Transition Matrices - Operational)

### Booking Firestore Collections
- **Booking requests collection:** Section 6 (Firestore Collections)
- **Appointments collection:** Section 6 (Firestore Collections)
- **Services collection:** Section 6 (Firestore Collections)
- **Firestore design philosophy:** Section 27 (Firestore Design Philosophy)
- **Firestore design philosophy (operational):** Section 39 (Firestore Design Philosophy - Operational)

### Booking AI-Agent Constraints
- **Booking AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Booking AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Booking anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Booking anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Booking Common Pitfalls
- **Booking pitfalls:** Section 30 (Common Pitfalls)
- **Booking pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Scheduling System Cross-References

### Scheduling Architecture
- **Scheduling architecture:** Section 11 (Scheduling Architecture)
- **Custom calendar rationale:** Section 25 (Custom Calendar Rationale)
- **Feature ownership:** Section 21 (Feature → File Responsibility Map)
- **Feature ownership (operational):** Section 36 (Feature → File Ownership Matrix - Operational)

### Scheduling Business Rules
- **Scheduling business rules:** Section 23 (Business Rules)
- **Scheduling business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)
- **Scheduling constraints:** Section 11 (Scheduling Architecture)
- **Scheduling constraints (operational):** Section 37 (Business Rules - Operational)

### Scheduling Firestore Collections
- **Doctor availability collection:** Section 6 (Firestore Collections)
- **Doctor blocks collection:** Section 6 (Firestore Collections)
- **Doctor slots collection:** Section 6 (Firestore Collections)
- **Firestore design philosophy:** Section 27 (Firestore Design Philosophy)
- **Firestore design philosophy (operational):** Section 39 (Firestore Design Philosophy - Operational)

### Scheduling AI-Agent Constraints
- **Scheduling AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Scheduling AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Scheduling anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Scheduling anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Scheduling Common Pitfalls
- **Scheduling pitfalls:** Section 30 (Common Pitfalls)
- **Scheduling pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Prescription System Cross-References

### Prescription Architecture
- **Prescription flow:** Section 13 (Prescription Flow)
- **Prescription PDF generation:** Section 25 (PDF Generation)
- **Feature ownership:** Section 21 (Feature → File Responsibility Map)
- **Feature ownership (operational):** Section 36 (Feature → File Ownership Matrix - Operational)

### Prescription Business Rules
- **Prescription business rules:** Section 23 (Business Rules)
- **Prescription business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)
- **Prescription state transitions:** Section 24 (State Transitions)
- **Prescription state transitions (operational):** Section 38 (State Transition Matrices - Operational)

### Prescription Firestore Collections
- **Prescriptions collection:** Section 6 (Firestore Collections)
- **Firestore design philosophy:** Section 27 (Firestore Design Philosophy)
- **Firestore design philosophy (operational):** Section 39 (Firestore Design Philosophy - Operational)

### Prescription AI-Agent Constraints
- **Prescription AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Prescription AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Prescription anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Prescription anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Prescription Common Pitfalls
- **Prescription pitfalls:** Section 30 (Common Pitfalls)
- **Prescription pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Payment System Cross-References

### Payment Architecture
- **Payment flow:** Section 12 (Payment Flow)
- **Razorpay integration:** Section 25 (Razorpay Integration)
- **Feature ownership:** Section 21 (Feature → File Responsibility Map)
- **Feature ownership (operational):** Section 36 (Feature → File Ownership Matrix - Operational)

### Payment Business Rules
- **Payment business rules:** Section 23 (Business Rules)
- **Payment business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)
- **Payment state transitions:** Section 24 (State Transitions)
- **Payment state transitions (operational):** Section 38 (State Transition Matrices - Operational)

### Payment Firestore Collections
- **Payments collection:** Section 6 (Firestore Collections)
- **Firestore design philosophy:** Section 27 (Firestore Design Philosophy)
- **Firestore design philosophy (operational):** Section 39 (Firestore Design Philosophy - Operational)

### Payment AI-Agent Constraints
- **Payment AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Payment AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Payment anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Payment anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Payment Common Pitfalls
- **Payment pitfalls:** Section 30 (Common Pitfalls)
- **Payment pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Notification System Cross-References

### Notification Architecture
- **Notification flow:** Section 15 (Notification Flow)
- **Resend integration:** Section 25 (Resend Integration)
- **Feature ownership:** Section 21 (Feature → File Responsibility Map)
- **Feature ownership (operational):** Section 36 (Feature → File Ownership Matrix - Operational)

### Notification Business Rules
- **Notification business rules:** Section 23 (Business Rules)
- **Notification business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)

### Notification AI-Agent Constraints
- **Notification AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Notification AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Notification anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Notification anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

---

## Support System Cross-References

### Support Architecture
- **Support flow:** Section 16 (Support Flow)
- **Feature ownership:** Section 21 (Feature → File Responsibility Map)
- **Feature ownership (operational):** Section 36 (Feature → File Ownership Matrix - Operational)

### Support Business Rules
- **Support business rules:** Section 23 (Business Rules)
- **Support business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)
- **Support state transitions:** Section 24 (State Transitions)
- **Support state transitions (operational):** Section 38 (State Transition Matrices - Operational)

### Support Firestore Collections
- **Support tickets collection:** Section 6 (Firestore Collections)
- **Firestore design philosophy:** Section 27 (Firestore Design Philosophy)
- **Firestore design philosophy (operational):** Section 39 (Firestore Design Philosophy - Operational)

### Support AI-Agent Constraints
- **Support AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Support AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Support anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Support anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Support Common Pitfalls
- **Support pitfalls:** Section 30 (Common Pitfalls)
- **Support pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Onboarding System Cross-References

### Onboarding Architecture
- **Doctor invite flow:** Section 17 (Doctor Invite Flow)
- **Feature ownership:** Section 21 (Feature → File Responsibility Map)
- **Feature ownership (operational):** Section 36 (Feature → File Ownership Matrix - Operational)

### Onboarding Business Rules
- **Onboarding business rules:** Section 23 (Business Rules)
- **Onboarding business rules (operational):** Section 37 (Business Rules & Domain Constraints - Operational)
- **Onboarding state transitions:** Section 24 (State Transitions)
- **Onboarding state transitions (operational):** Section 38 (State Transition Matrices - Operational)

### Onboarding Firestore Collections
- **Doctor invites collection:** Section 6 (Firestore Collections)
- **Firestore design philosophy:** Section 27 (Firestore Design Philosophy)
- **Firestore design philosophy (operational):** Section 39 (Firestore Design Philosophy - Operational)

### Onboarding AI-Agent Constraints
- **Onboarding AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Onboarding AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Onboarding anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Onboarding anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Onboarding Common Pitfalls
- **Onboarding pitfalls:** Section 30 (Common Pitfalls)
- **Onboarding pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Firestore System Cross-References

### Firestore Architecture
- **Firestore collections:** Section 6 (Firestore Collections)
- **Firestore design philosophy:** Section 27 (Firestore Design Philosophy)
- **Firestore design philosophy (operational):** Section 39 (Firestore Design Philosophy - Operational)
- **Firestore rules:** Section 28 (Firestore Security Rules)
- **Firestore indexes:** Section 29 (Firestore Indexes)

### Firestore AI-Agent Constraints
- **Firestore AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Firestore AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **Firestore anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Firestore anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

### Firestore Common Pitfalls
- **Firestore pitfalls:** Section 30 (Common Pitfalls)
- **Firestore pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

---

## Deployment System Cross-References

### Deployment Architecture
- **Deployment architecture:** Section 18 (Deployment Architecture)
- **Environment variables:** Section 19 (Environment Variables)
- **Deployment AI-agent constraints:** Section 26 (AI Agent Contribution Guide)
- **Deployment AI-agent constraints (operational):** Section 41 (AI Agent Contribution Guide - Operational)

### Deployment Anti-Patterns
- **Deployment anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **Deployment anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

---

## Environment Variables Cross-References

### Environment Variables Architecture
- **Environment variables:** Section 19 (Environment Variables)
- **Server-only variables:** Section 40 (Security Architecture & Trust Boundaries - Operational)
- **Environment variable pitfalls:** Section 30 (Common Pitfalls)
- **Environment variable pitfalls (operational):** Section 42 (Common Pitfalls & Engineering Warnings - Operational)

### Environment Variables AI-Agent Constraints
- **Environment variables AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Environment variables AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)

---

## UI System Cross-References

### UI Architecture
- **UI pattern library:** Section 31 (UI Pattern Library)
- **UI pattern library (operational):** Section 43 (UI Pattern Library - Operational)
- **Product identity:** Section 34 (Product Identity)
- **Product identity (operational):** Section 46 (Project Philosophy & Product Identity - Operational)

### UI AI-Agent Constraints
- **UI AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **UI AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)
- **UI anti-patterns:** Section 33 (Absolute Architectural Do-Not Rules)
- **UI anti-patterns (operational):** Section 45 (Absolute Architectural Do-Not Rules - Operational)

---

## Error Handling Cross-References

### Error Handling Architecture
- **Error handling philosophy:** Section 32 (Error Handling Philosophy)
- **Error handling philosophy (operational):** Section 44 (Error Handling Philosophy - Operational)

### Error Handling AI-Agent Constraints
- **Error handling AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Error handling AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)

---

## Documentation Cross-References

### Documentation Architecture
- **Documentation maintenance:** Section 35 (Documentation Maintenance)
- **Documentation maintenance (operational):** Section 47 (Documentation Maintenance Governance - Operational)

### Documentation AI-Agent Constraints
- **Documentation AI-agent guide:** Section 26 (AI Agent Contribution Guide)
- **Documentation AI-agent guide (operational):** Section 41 (AI Agent Contribution Guide - Operational)

<!-- APPEND_HERE -->

<!-- SECTION:49 -->
# 49. CRITICAL FILES & OWNERSHIP INDEX

This section identifies the most critical files in the Eye Aura codebase, explains their importance, and documents the consequences of breaking them. This enables AI agents to understand blast radius before making changes and prioritize caution appropriately.

---

## Booking System

### Critical Files
- `/services/firestore/booking-requests.service.ts`
- `/services/firestore/appointments.service.ts`
- `/app/booking/page.tsx`
- `/app/api/booking/request/route.ts`

### Why Critical
These files control the booking lifecycle integrity. Booking requests and appointments are the core business logic of the platform. Any incorrect modification can create data corruption that affects patients, doctors, and payments.

### Failure Impact
Incorrect modifications can create:
- **Double bookings:** Multiple patients booking the same slot
- **Orphan appointments:** Appointments without corresponding booking requests
- **Scheduling inconsistencies:** Slots that don't match availability
- **Payment mismatches:** Payments without corresponding appointments
- **State corruption:** Invalid state transitions (e.g., pending → completed without approval)

### Modification Guidance
- **Read before modifying:** Sections 7, 23, 24, 37, 38
- **Test thoroughly:** All booking flow scenarios
- **Verify state transitions:** Ensure all transitions are valid
- **Check dependencies:** Payments, prescriptions, notifications depend on booking integrity

---

## Authentication System

### Critical Files
- `/contexts/auth-context.tsx`
- `/services/firebase/auth.service.ts`
- `/middleware.ts`
- `/app/api/auth/[...nextauth]/route.ts` (if exists)
- `/app/login/page.tsx`

### Why Critical
These files control authentication and authorization across the entire platform. Authentication is the gateway to all protected functionality. Any incorrect modification can create security vulnerabilities or lock users out of the platform.

### Failure Impact
Incorrect modifications can create:
- **Security breaches:** Unauthorized access to protected data
- **Authentication failures:** Users unable to sign in
- **Authorization bypass:** Users accessing roles they shouldn't have
- **Session corruption:** Invalid session states
- **Role elevation:** Unauthorized role changes

### Modification Guidance
- **Read before modifying:** Sections 4, 5, 28, 40
- **Test thoroughly:** All authentication flows
- **Verify role enforcement:** All roles are enforced correctly
- **Check security:** No credential exposure, no auth bypass

---

## Scheduling System

### Critical Files
- `/services/firestore/doctor-availability.service.ts`
- `/services/firestore/doctor-blocks.service.ts`
- `/services/booking/slot-management.ts`
- `/app/doctor/slots/page.tsx`
- `/app/api/slots/route.ts`

### Why Critical
These files control doctor availability and slot generation. Scheduling is the foundation of the booking system. Any incorrect modification can create scheduling inconsistencies that prevent patients from booking appointments.

### Failure Impact
Incorrect modifications can create:
- **Availability corruption:** Incorrect availability data
- **Slot generation errors:** Incorrect slot generation
- **Block subtraction failures:** Patients booking blocked time slots
- **Time zone errors:** Incorrect time calculations
- **Performance issues:** Slow slot generation

### Modification Guidance
- **Read before modifying:** Sections 11, 23, 37
- **Test thoroughly:** All scheduling scenarios
- **Verify slot generation:** Slots match availability
- **Check block subtraction:** Blocks are subtracted correctly

---

## Prescription System

### Critical Files
- `/services/firestore/prescriptions.service.ts`
- `/app/api/prescription/pdf/route.tsx`
- `/app/doctor/prescriptions/[id]/page.tsx`

### Why Critical
These files control prescription generation and PDF rendering. Prescriptions are critical for patient care. Any incorrect modification can create legal and medical risks.

### Failure Impact
Incorrect modifications can create:
- **Prescription corruption:** Incorrect prescription data
- **PDF generation failures:** Patients unable to access prescriptions
- **Medical errors:** Incorrect medication information
- **Legal risks:** Non-compliant prescription formats
- **Data loss:** Lost prescription data

### Modification Guidance
- **Read before modifying:** Sections 13, 23, 24, 25
- **Test thoroughly:** All prescription scenarios
- **Verify PDF generation:** PDFs render correctly
- **Check medical accuracy:** Medication information is correct

---

## Payment System

### Critical Files
- `/app/api/payment/create-order/route.ts`
- `/app/api/payment/verify/route.ts`
- `/services/firestore/payments.service.ts`
- `/app/patient/payment/[id]/page.tsx`

### Why Critical
These files control payment processing. Payments are critical for business operations. Any incorrect modification can create financial losses and legal risks.

### Failure Impact
Incorrect modifications can create:
- **Payment failures:** Patients unable to pay
- **Payment mismatches:** Payments without corresponding services
- **Financial losses:** Incorrect payment amounts
- **Security breaches:** Payment credential exposure
- **Legal risks:** Non-compliant payment processing

### Modification Guidance
- **Read before modifying:** Sections 12, 23, 24, 25
- **Test thoroughly:** All payment scenarios
- **Verify payment verification:** Razorpay signature verification is correct
- **Check security:** No credential exposure, no payment bypass

---

## Doctor Invite System

### Critical Files
- `/services/firestore/doctor-invites.service.ts`
- `/app/api/doctor-onboarding/complete/route.ts`
- `/app/invite/[token]/page.tsx`

### Why Critical
These files control doctor onboarding. Doctor invites are the gateway for new doctors to join the platform. Any incorrect modification can prevent doctors from joining or create security vulnerabilities.

### Failure Impact
Incorrect modifications can create:
- **Onboarding failures:** Doctors unable to join
- **Invite corruption:** Invalid invite states
- **Security breaches:** Unauthorized invite acceptance
- **Role elevation:** Unauthorized role assignment
- **Data corruption:** Incorrect user creation

### Modification Guidance
- **Read before modifying:** Sections 17, 23, 24, 28, 40
- **Test thoroughly:** All onboarding scenarios
- **Verify invite validation:** Invites are validated correctly
- **Check security:** Admin SDK is used for privileged operations

---

## Support System

### Critical Files
- `/services/firestore/support-tickets.service.ts`
- `/app/support/page.tsx`
- `/app/api/support/ticket/route.ts`

### Why Critical
These files control support ticket management. Support tickets are critical for user satisfaction. Any incorrect modification can prevent users from getting help.

### Failure Impact
Incorrect modifications can create:
- **Ticket creation failures:** Users unable to create tickets
- **Ticket corruption:** Invalid ticket states
- **Communication failures:** Users unable to receive support
- **Data loss:** Lost ticket data

### Modification Guidance
- **Read before modifying:** Sections 16, 23, 24
- **Test thoroughly:** All support scenarios
- **Verify state transitions:** All transitions are valid
- **Check communication:** Notifications are sent correctly

---

## Firestore Services

### Critical Files
- `/services/firestore/users.service.ts`
- `/services/firestore/booking-requests.service.ts`
- `/services/firestore/appointments.service.ts`
- `/services/firestore/prescriptions.service.ts`
- `/services/firestore/payments.service.ts`

### Why Critical
These files are the service layer for all Firestore operations. The service layer enforces business logic and ensures data integrity. Any incorrect modification can create data corruption across the entire platform.

### Failure Impact
Incorrect modifications can create:
- **Data corruption:** Invalid data in Firestore
- **Business logic violations:** Bypass of business rules
- **State corruption:** Invalid state transitions
- **Security breaches:** Unauthorized data access
- **Performance issues:** Slow queries

### Modification Guidance
- **Read before modifying:** Sections 6, 27, 39, 41, 42
- **Test thoroughly:** All service operations
- **Verify business logic:** All business rules are enforced
- **Check type safety:** All TypeScript interfaces are correct

---

## Middleware

### Critical Files
- `/middleware.ts`

### Why Critical
Middleware controls authentication and authorization for all protected routes. Middleware is the first line of defense for security. Any incorrect modification can create security vulnerabilities or lock users out of protected routes.

### Failure Impact
Incorrect modifications can create:
- **Security breaches:** Unauthorized access to protected routes
- **Authentication failures:** Users unable to access protected routes
- **Authorization bypass:** Users accessing roles they shouldn't have
- **Performance issues:** Slow middleware execution

### Modification Guidance
- **Read before modifying:** Sections 28, 40, 42
- **Test thoroughly:** All protected routes
- **Verify authentication:** All authentication flows work correctly
- **Check authorization:** All roles are enforced correctly

---

## API Routes

### Critical Files
- `/app/api/booking/request/route.ts`
- `/app/api/booking/accept/route.ts`
- `/app/api/payment/create-order/route.ts`
- `/app/api/payment/verify/route.ts`
- `/app/api/prescription/pdf/route.tsx`
- `/app/api/doctor-onboarding/complete/route.ts`

### Why Critical
API routes are the server-side entry points for all privileged operations. API routes use Admin SDK for privileged operations. Any incorrect modification can create security vulnerabilities or data corruption.

### Failure Impact
Incorrect modifications can create:
- **Security breaches:** Unauthorized privileged operations
- **Data corruption:** Incorrect data mutations
- **Authentication failures:** Users unable to perform operations
- **Performance issues:** Slow API responses
- **Error handling failures:** Unhandled errors

### Modification Guidance
- **Read before modifying:** Sections 28, 40, 42
- **Test thoroughly:** All API operations
- **Verify Admin SDK usage:** Admin SDK is used for privileged operations
- **Check error handling:** All errors are handled correctly

---

## Firestore Rules

### Critical Files
- `/firestore.rules`

### Why Critical
Firestore rules are the server-side security layer for Firestore. Firestore rules enforce access control and data validation. Any incorrect modification can create security vulnerabilities or data corruption.

### Failure Impact
Incorrect modifications can create:
- **Security breaches:** Unauthorized data access
- **Data corruption:** Invalid data mutations
- **Authentication failures:** Users unable to access data
- **Authorization bypass:** Users accessing data they shouldn't have

### Modification Guidance
- **Read before modifying:** Sections 28, 40
- **Test thoroughly:** All Firestore operations
- **Verify access control:** All roles have correct access
- **Check data validation:** All data is validated correctly

---

## Firestore Indexes

### Critical Files
- `/firestore.indexes.json`

### Why Critical
Firestore indexes enable complex queries. Firestore indexes are required for queries that use compound filters or ordering. Any incorrect modification can cause query failures.

### Failure Impact
Incorrect modifications can create:
- **Query failures:** Queries failing with "Index not found" errors
- **Performance issues:** Slow queries without indexes
- **Data access failures:** Users unable to access data

### Modification Guidance
- **Read before modifying:** Sections 29, 39
- **Test thoroughly:** All queries
- **Verify index deployment:** Indexes are deployed via Firebase CLI
- **Check query performance:** Queries are fast enough

---

## Environment Configuration

### Critical Files
- `/.env.example`
- `/services/firebase/admin.ts`

### Why Critical
Environment configuration controls Firebase initialization and environment variables. Incorrect configuration can prevent the application from running or create security vulnerabilities.

### Failure Impact
Incorrect modifications can create:
- **Application failures:** Application unable to start
- **Security breaches:** Credential exposure
- **Authentication failures:** Firebase unable to initialize
- **Database failures:** Firestore unable to connect

### Modification Guidance
- **Read before modifying:** Sections 19, 28, 40, 42
- **Test thoroughly:** All environment configurations
- **Verify security:** No credentials exposed to browser
- **Check initialization:** Firebase initializes correctly

<!-- APPEND_HERE -->

<!-- SECTION:50 -->
# 50. REFACTOR SAFETY MATRIX

This section provides a safety matrix for refactoring decisions. It classifies different areas of the codebase by refactor safety level, explains why certain areas are dangerous to modify, and provides guidance on what may safely evolve versus what requires migration planning.

---

## Refactor Safety Matrix

| Area | Refactor Safety | Reason | Required Caution |
|---|---|---|---|
| Card styling | Safe | UI-only change, no business logic impact | Maintain brand consistency |
| Button hierarchy | Safe | UI-only change, no business logic impact | Maintain button hierarchy rules |
| Spacing adjustments | Safe | UI-only change, no business logic impact | Follow Tailwind spacing scale |
| Typography scale | Moderate | UI change that affects readability | Follow defined font scale |
| Color palette | Dangerous | Brand identity change | Requires product team approval |
| Firestore collection names | Dangerous | Database schema change | Requires migration planning |
| Firestore field names | Dangerous | Database schema change | Requires migration planning |
| Booking lifecycle | Dangerous | Core business logic change | Requires comprehensive testing |
| State transitions | Dangerous | Core business logic change | Requires comprehensive testing |
| Slot generation logic | Dangerous | Core business logic change | Requires comprehensive testing |
| Prescription PDF layout | Moderate | Medical document change | Requires medical accuracy review |
| Payment verification logic | Dangerous | Financial logic change | Requires security review |
| Auth flow logic | Dangerous | Security-critical change | Requires security review |
| Role enforcement logic | Dangerous | Security-critical change | Requires security review |
| Middleware logic | Dangerous | Security-critical change | Requires security review |
| Firestore rules | Dangerous | Security-critical change | Requires security review |
| API route logic | Moderate | Server-side logic change | Requires error handling review |
| Service layer logic | Dangerous | Business logic enforcement | Requires business logic review |
| Component state management | Safe | Local UI state change | Follow React best practices |
| Context providers | Moderate | Global state change | Ensure no circular dependencies |
| Error handling patterns | Moderate | User experience change | Maintain error handling philosophy |
| Loading states | Safe | UX improvement | Follow loading state rules |
| Toast notifications | Safe | UX improvement | Follow toast usage rules |
| Form validation | Moderate | UX change that affects data integrity | Ensure validation is correct |
| Navigation structure | Moderate | UX change that affects user flow | Ensure no broken links |
| Route structure | Dangerous | Application structure change | Requires comprehensive testing |
| Environment variable names | Dangerous | Configuration change | Requires deployment coordination |
| Dependency versions | Moderate | Library upgrade | Requires compatibility testing |
| TypeScript interfaces | Moderate | Type safety change | Ensure no type errors |

---

## Safe Refactors (Low Risk)

### UI-Only Changes
These changes affect only visual presentation and have no impact on business logic or data integrity.

**Examples:**
- Adjusting card padding
- Changing button hover states
- Modifying font weights
- Adjusting spacing between elements
- Adding new UI components that don't affect business logic

**Guidance:**
- Follow Section 43 (UI Pattern Library - Operational)
- Maintain brand consistency (Section 46)
- Test on mobile and desktop viewports
- Ensure accessibility is preserved

**Approval Required:** Self-approve for minor changes, team lead review for major changes

---

## Moderate Refactors (Medium Risk)

### UX Changes with Data Impact
These changes affect user experience but have limited impact on data integrity or business logic.

**Examples:**
- Modifying form validation rules
- Changing error handling patterns
- Adjusting loading state behavior
- Modifying toast notification behavior
- Changing navigation structure

**Guidance:**
- Follow Section 44 (Error Handling Philosophy - Operational)
- Test all affected user flows
- Ensure no data corruption
- Verify error handling is correct

**Approval Required:** Team lead review required

---

## Dangerous Refactors (High Risk)

### Database Schema Changes
These changes affect Firestore collections, fields, or data structure. They require migration planning and comprehensive testing.

**Examples:**
- Renaming Firestore collections
- Adding required fields to collections
- Removing fields from collections
- Changing field types
- Modifying collection structure

**Guidance:**
- Follow Section 27 (Firestore Design Philosophy)
- Follow Section 39 (Firestore Design Philosophy - Operational)
- Plan data migration for existing data
- Update Firestore rules
- Update Firestore indexes
- Update TypeScript interfaces
- Comprehensive testing required

**Approval Required:** Executive approval required

---

## Dangerous Refactors (Critical Risk)

### Core Business Logic Changes
These changes affect the fundamental business logic of the platform. They require comprehensive testing and may require business approval.

**Examples:**
- Modifying booking lifecycle
- Changing state transitions
- Modifying slot generation logic
- Changing payment verification logic
- Modifying auth flow logic
- Changing role enforcement logic

**Guidance:**
- Read relevant sections in this document
- Test all affected business flows
- Ensure no business logic violations
- Verify state transitions are valid
- Ensure security is preserved
- Comprehensive testing required

**Approval Required:** Executive approval required

---

## Security-Critical Refactors (Highest Risk)

### Security Logic Changes
These changes affect authentication, authorization, or data security. They require security review and may require penetration testing.

**Examples:**
- Modifying middleware logic
- Changing Firestore rules
- Modifying Admin SDK usage
- Changing environment variable handling
- Modifying payment verification logic
- Changing auth flow logic

**Guidance:**
- Follow Section 28 (Security Architecture)
- Follow Section 40 (Security Architecture & Trust Boundaries - Operational)
- Security review required
- Penetration testing recommended
- Comprehensive testing required

**Approval Required:** Executive approval required

---

## Refactor Decision Process

### Before Refactoring
1. Identify refactor area and safety level
2. Read relevant sections in this document
3. Assess impact on business logic
4. Assess impact on data integrity
5. Assess impact on security
6. Identify required approval level
7. Plan testing approach
8. Plan rollback approach

### During Refactoring
1. Make incremental changes
2. Test each increment
3. Verify no regressions
4. Document changes
5. Update this document if architecture changes

### After Refactoring
1. Comprehensive testing
2. User acceptance testing (if applicable)
3. Security review (if applicable)
4. Performance testing (if applicable)
5. Deploy to production with monitoring
6. Monitor for issues

---

## Anti-Drift Constraints

### Refactor Safety
- **MUST** classify refactor safety level before starting
- **MUST** read relevant sections before refactoring
- **MUST** get required approval before refactoring
- **MUST** plan testing approach before refactoring
- **MUST** plan rollback approach before refactoring
- **MUST NOT** skip required approvals
- **MUST NOT** skip comprehensive testing for dangerous refactors

### AI-Agent Safety Constraints
- **MUST** classify refactor safety level before starting
- **MUST** read relevant sections before refactoring
- **MUST** get required approval before refactoring
- **MUST** plan testing approach before refactoring
- **MUST** plan rollback approach before refactoring
- **MUST NOT** skip required approvals
- **MUST NOT** skip comprehensive testing for dangerous refactors

<!-- APPEND_HERE -->

<!-- SECTION:51 -->
# 51. SYSTEM DEPENDENCY GRAPHS

This section documents system dependencies across the Eye Aura platform. It identifies upstream dependencies (what a system depends on) and downstream dependencies (what depends on a system), explains coupling levels, and documents breaking impact. This enables AI agents to understand blast radius before making changes.

---

## Booking System

### Depends On (Upstream)
- **users:** Patient and doctor user profiles
- **services:** Medical services offered by doctors
- **doctor_availability:** Doctor availability schedules
- **doctor_blocks:** Doctor time blocks
- **doctor_slots:** Generated time slots (legacy, being phased out)

### Used By (Downstream)
- **appointments:** Created from accepted booking requests
- **payments:** Created from accepted booking requests
- **prescriptions:** Created from completed appointments
- **notifications:** Sent on booking status changes

### Coupling Level
- **Tight coupling to scheduling:** Booking depends directly on availability and blocks
- **Tight coupling to users:** Booking requires valid patient and doctor users
- **Moderate coupling to payments:** Booking creates payment records but payment can fail independently
- **Loose coupling to notifications:** Notifications are side effects of booking changes

### Breaking Impact
Booking changes affect nearly every patient-facing workflow. Incorrect modifications can create:
- **Double bookings:** Multiple patients booking the same slot
- **Orphan appointments:** Appointments without corresponding booking requests
- **Payment mismatches:** Payments without corresponding bookings
- **Scheduling inconsistencies:** Slots that don't match availability
- **Notification failures:** Users not receiving booking updates

### Modification Guidance
- **Read before modifying:** Sections 7, 23, 24, 37, 38
- **Test thoroughly:** All booking flow scenarios
- **Verify dependencies:** All downstream systems still work correctly
- **Check data integrity:** No orphan records or inconsistent states

---

## Authentication System

### Depends On (Upstream)
- **Firebase Auth:** Authentication provider
- **Firestore:** User profile storage
- **Environment variables:** Firebase configuration

### Used By (Downstream)
- **All protected routes:** Require authentication
- **All role-based features:** Require role verification
- **All user-specific features:** Require user context
- **Middleware:** Enforces authentication
- **API routes:** Verify authentication for privileged operations

### Coupling Level
- **Tight coupling to Firebase Auth:** Authentication depends entirely on Firebase Auth
- **Tight coupling to Firestore:** User profiles stored in Firestore
- **Tight coupling to middleware:** Middleware enforces authentication for all protected routes
- **Loose coupling to business logic:** Authentication is independent of business logic

### Breaking Impact
Authentication changes affect the entire platform. Incorrect modifications can create:
- **Security breaches:** Unauthorized access to protected data
- **Authentication failures:** Users unable to sign in
- **Authorization bypass:** Users accessing roles they shouldn't have
- **Session corruption:** Invalid session states
- **Platform-wide outage:** Complete authentication failure

### Modification Guidance
- **Read before modifying:** Sections 4, 5, 28, 40
- **Test thoroughly:** All authentication flows
- **Verify security:** No credential exposure, no auth bypass
- **Check all protected routes:** All routes still enforce authentication correctly

---

## Scheduling System

### Depends On (Upstream)
- **users:** Doctor user profiles
- **doctor_availability:** Doctor availability schedules
- **doctor_blocks:** Doctor time blocks

### Used By (Downstream)
- **booking:** Uses availability and blocks for slot generation
- **doctor_slots:** Generated time slots (legacy, being phased out)

### Coupling Level
- **Tight coupling to doctor_availability:** Availability is the foundation of scheduling
- **Tight coupling to doctor_blocks:** Blocks modify availability
- **Moderate coupling to booking:** Booking depends on scheduling but booking logic is separate
- **Loose coupling to users:** Scheduling only needs doctor ID from users

### Breaking Impact
Scheduling changes affect booking and slot generation. Incorrect modifications can create:
- **Availability corruption:** Incorrect availability data
- **Slot generation errors:** Incorrect slot generation
- **Block subtraction failures:** Patients booking blocked time slots
- **Time zone errors:** Incorrect time calculations
- **Performance issues:** Slow slot generation

### Modification Guidance
- **Read before modifying:** Sections 11, 23, 37
- **Test thoroughly:** All scheduling scenarios
- **Verify slot generation:** Slots match availability
- **Check block subtraction:** Blocks are subtracted correctly

---

## Prescription System

### Depends On (Upstream)
- **appointments:** Prescriptions created from completed appointments
- **users:** Doctor and patient user profiles
- **services:** Medical services offered by doctors

### Used By (Downstream)
- **notifications:** Sent on prescription creation
- **PDF generation:** Generates prescription PDFs

### Coupling Level
- **Tight coupling to appointments:** Prescriptions require completed appointments
- **Moderate coupling to users:** Prescriptions reference doctor and patient
- **Moderate coupling to services:** Prescriptions reference medical services
- **Loose coupling to notifications:** Notifications are side effects of prescription creation

### Breaking Impact
Prescription changes affect patient care and medical records. Incorrect modifications can create:
- **Prescription corruption:** Incorrect prescription data
- **PDF generation failures:** Patients unable to access prescriptions
- **Medical errors:** Incorrect medication information
- **Legal risks:** Non-compliant prescription formats
- **Data loss:** Lost prescription data

### Modification Guidance
- **Read before modifying:** Sections 13, 23, 24, 25
- **Test thoroughly:** All prescription scenarios
- **Verify PDF generation:** PDFs render correctly
- **Check medical accuracy:** Medication information is correct

---

## Payment System

### Depends On (Upstream)
- **booking_requests:** Payments created from accepted booking requests
- **appointments:** Payments linked to appointments
- **users:** Patient user profiles
- **Razorpay:** Payment gateway

### Used By (Downstream)
- **booking:** Booking completion depends on payment success
- **notifications:** Sent on payment status changes

### Coupling Level
- **Tight coupling to booking_requests:** Payments created from accepted requests
- **Tight coupling to Razorpay:** Payments depend entirely on Razorpay
- **Moderate coupling to appointments:** Payments linked to appointments
- **Loose coupling to notifications:** Notifications are side effects of payment changes

### Breaking Impact
Payment changes affect business operations and booking completion. Incorrect modifications can create:
- **Payment failures:** Patients unable to pay
- **Payment mismatches:** Payments without corresponding bookings
- **Financial losses:** Incorrect payment amounts
- **Security breaches:** Payment credential exposure
- **Legal risks:** Non-compliant payment processing

### Modification Guidance
- **Read before modifying:** Sections 12, 23, 24, 25
- **Test thoroughly:** All payment scenarios
- **Verify payment verification:** Razorpay signature verification is correct
- **Check security:** No credential exposure, no payment bypass

---

## Doctor Invite System

### Depends On (Upstream)
- **users:** Created user profiles from invites
- **doctor_invites:** Invite tokens and status

### Used By (Downstream)
- **authentication:** New users can authenticate after onboarding
- **scheduling:** New doctors can set availability after onboarding

### Coupling Level
- **Tight coupling to doctor_invites:** Onboarding depends entirely on invites
- **Tight coupling to users:** Onboarding creates user profiles
- **Moderate coupling to authentication:** Onboarding enables authentication
- **Loose coupling to scheduling:** Scheduling is independent of onboarding

### Breaking Impact
Doctor invite changes affect new doctor onboarding. Incorrect modifications can create:
- **Onboarding failures:** Doctors unable to join
- **Invite corruption:** Invalid invite states
- **Security breaches:** Unauthorized invite acceptance
- **Role elevation:** Unauthorized role assignment
- **Data corruption:** Incorrect user creation

### Modification Guidance
- **Read before modifying:** Sections 17, 23, 24, 28, 40
- **Test thoroughly:** All onboarding scenarios
- **Verify invite validation:** Invites are validated correctly
- **Check security:** Admin SDK is used for privileged operations

---

## Support System

### Depends On (Upstream)
- **users:** User profiles for ticket creation
- **support_tickets:** Ticket storage

### Used By (Downstream)
- **notifications:** Sent on ticket status changes

### Coupling Level
- **Tight coupling to users:** Tickets require valid users
- **Tight coupling to support_tickets:** Tickets stored in Firestore
- **Loose coupling to notifications:** Notifications are side effects of ticket changes

### Breaking Impact
Support system changes affect user satisfaction. Incorrect modifications can create:
- **Ticket creation failures:** Users unable to create tickets
- **Ticket corruption:** Invalid ticket states
- **Communication failures:** Users unable to receive support
- **Data loss:** Lost ticket data

### Modification Guidance
- **Read before modifying:** Sections 16, 23, 24
- **Test thoroughly:** All support scenarios
- **Verify state transitions:** All transitions are valid
- **Check communication:** Notifications are sent correctly

---

## Firestore System

### Depends On (Upstream)
- **Firebase Admin SDK:** Server-side Firestore access
- **Firebase Client SDK:** Client-side Firestore access
- **Environment variables:** Firebase configuration

### Used By (Downstream)
- **All services:** All Firestore services depend on Firestore
- **All components:** All components that access data depend on Firestore
- **All API routes:** All API routes that access data depend on Firestore

### Coupling Level
- **Tight coupling to Firebase SDKs:** All Firestore operations depend on Firebase SDKs
- **Tight coupling to all services:** All services depend on Firestore
- **Tight coupling to all components:** All data access depends on Firestore

### Breaking Impact
Firestore changes affect the entire platform. Incorrect modifications can create:
- **Data corruption:** Invalid data in Firestore
- **Security breaches:** Unauthorized data access
- **Performance issues:** Slow queries
- **Query failures:** Queries failing with index errors
- **Platform-wide outage:** Complete Firestore failure

### Modification Guidance
- **Read before modifying:** Sections 6, 27, 28, 29, 39, 40
- **Test thoroughly:** All Firestore operations
- **Verify security:** All access rules are correct
- **Check performance:** All queries are fast enough

---

## Middleware System

### Depends On (Upstream)
- **Firebase Auth:** Authentication verification
- **Environment variables:** Firebase configuration

### Used By (Downstream)
- **All protected routes:** All routes require middleware for authentication
- **All role-based features:** All features require middleware for role verification

### Coupling Level
- **Tight coupling to Firebase Auth:** Middleware depends entirely on Firebase Auth
- **Tight coupling to all protected routes:** All protected routes depend on middleware

### Breaking Impact
Middleware changes affect all protected routes. Incorrect modifications can create:
- **Security breaches:** Unauthorized access to protected routes
- **Authentication failures:** Users unable to access protected routes
- **Authorization bypass:** Users accessing roles they shouldn't have
- **Platform-wide outage:** Complete middleware failure

### Modification Guidance
- **Read before modifying:** Sections 28, 40, 42
- **Test thoroughly:** All protected routes
- **Verify authentication:** All authentication flows work correctly
- **Check authorization:** All roles are enforced correctly

---

## Notification System

### Depends On (Upstream)
- **Resend:** Email service provider
- **users:** User profiles for email addresses
- **booking_requests:** Booking status changes trigger notifications
- **appointments:** Appointment status changes trigger notifications
- **support_tickets:** Ticket status changes trigger notifications

### Used By (Downstream)
- **booking:** Booking changes trigger notifications
- **appointments:** Appointment changes trigger notifications
- **support:** Ticket changes trigger notifications

### Coupling Level
- **Tight coupling to Resend:** Notifications depend entirely on Resend
- **Moderate coupling to business systems:** Notifications triggered by business events
- **Loose coupling to business logic:** Notifications are side effects of business changes

### Breaking Impact
Notification changes affect user communication. Incorrect modifications can create:
- **Notification failures:** Users not receiving important updates
- **Email delivery failures:** Emails not delivered
- **Communication gaps:** Users unaware of status changes
- **User dissatisfaction:** Poor communication experience

### Modification Guidance
- **Read before modifying:** Sections 15, 25
- **Test thoroughly:** All notification scenarios
- **Verify email delivery:** Emails are delivered correctly
- **Check content:** Email content is correct

<!-- APPEND_HERE -->

<!-- SECTION:52 -->
# 52. SOURCE OF TRUTH DEFINITIONS

This section defines the single canonical owner for all important platform states. It explains why duplicate state must be avoided and what should never become derived from UI state. This prevents state fragmentation and ensures data consistency across the platform.

---

## Source of Truth Matrix

| Concern | Source of Truth | Location | Why This Location |
|---|---|---|---|
| User authentication state | Firebase Auth | Firebase Auth server | Single source of auth truth, managed by Firebase |
| User role | users.role | Firestore users collection | Centralized role storage, enforced by Firestore rules |
| User profile data | users collection | Firestore users collection | Single source of user data |
| Appointment status | appointments.status | Firestore appointments collection | Centralized appointment state |
| Appointment time | appointments.scheduledAt | Firestore appointments collection | Canonical appointment time |
| Booking request status | booking_requests.status | Firestore booking_requests collection | Centralized booking request state |
| Doctor working hours | doctor_availability | Firestore doctor_availability collection | Centralized availability data |
| Doctor time blocks | doctor_blocks | Firestore doctor_blocks collection | Centralized block data |
| Service pricing | services.price | Firestore services collection | Centralized pricing data |
| Service duration | services.duration | Firestore services collection | Centralized duration data |
| Payment status | payments.status | Firestore payments collection | Centralized payment state |
| Payment amount | payments.amount | Firestore payments collection | Canonical payment amount |
| Invite validity | doctor_invites.expiresAt | Firestore doctor_invites collection | Centralized invite expiration |
| Invite status | doctor_invites.status | Firestore doctor_invites collection | Centralized invite state |
| Prescription data | prescriptions collection | Firestore prescriptions collection | Centralized prescription data |
| Support ticket status | support_tickets.status | Firestore support_tickets collection | Centralized ticket state |
| Notification status | Derived from business events | Business event handlers | Notifications are side effects, not source of truth |

---

## Why Duplicate State Must Be Avoided

### State Fragmentation Risk
Duplicate state creates multiple sources of truth for the same data. When state diverges, it's unclear which version is correct. This leads to:
- **Data inconsistency:** Different parts of the application show different data
- **Race conditions:** Concurrent updates create conflicting state
- **Debugging complexity:** Difficult to track which state is authoritative
- **User confusion:** Users see inconsistent data across the application

### Example: Appointment Status
**Incorrect Approach:**
- Store appointment status in component state
- Store appointment status in Redux (if used)
- Store appointment status in Firestore
- Sync between all three sources

**Correct Approach:**
- Store appointment status only in Firestore
- Component state reflects Firestore data (not duplicates it)
- No Redux or other state management for appointment status

### Example: Doctor Availability
**Incorrect Approach:**
- Cache availability in component state
- Cache availability in local storage
- Cache availability in memory
- Sync between all three sources

**Correct Approach:**
- Store availability only in Firestore
- Query Firestore for availability when needed
- No caching that could become stale

---

## What Should NEVER Become Derived from UI State

### UI State vs Business State
UI state is temporary, local to a component, and should not be persisted. Business state is permanent, stored in Firestore, and represents the canonical truth.

### Examples of UI State (Safe to Derive)
- **Form input values:** Temporary user input before submission
- **Modal open/close state:** Temporary UI state
- **Loading state:** Temporary UI state
- **Error state:** Temporary UI state
- **Selected tab:** Temporary UI state
- **Scroll position:** Temporary UI state

### Examples of Business State (NOT Safe to Derive from UI)
- **Appointment status:** MUST come from Firestore
- **Booking request status:** MUST come from Firestore
- **Doctor availability:** MUST come from Firestore
- **Payment status:** MUST come from Firestore
- **User role:** MUST come from Firestore
- **Prescription data:** MUST come from Firestore

### Anti-Drift Constraints
- **MUST** store business state only in Firestore
- **MUST NOT** derive business state from UI state
- **MUST NOT** cache business state in components
- **MUST NOT** cache business state in local storage
- **MUST** query Firestore for business state

### AI-Agent Safety Constraints
- **MUST** store business state only in Firestore
- **MUST NOT** derive business state from UI state
- **MUST NOT** cache business state in components
- **MUST NOT** cache business state in local storage
- **MUST** query Firestore for business state

---

## Single Source of Truth Rules

### Authentication State
**Source of Truth:** Firebase Auth
**Rules:**
- **MUST** use Firebase Auth for authentication state
- **MUST NOT** store authentication state in component state
- **MUST NOT** store authentication state in local storage
- **MUST** use Firebase Auth SDK for authentication operations

### User Role
**Source of Truth:** users.role in Firestore
**Rules:**
- **MUST** query Firestore for user role
- **MUST NOT** cache user role in component state
- **MUST NOT** derive user role from UI state
- **MUST** enforce role via Firestore rules

### Appointment Status
**Source of Truth:** appointments.status in Firestore
**Rules:**
- **MUST** query Firestore for appointment status
- **MUST NOT** cache appointment status in component state
- **MUST NOT** derive appointment status from UI state
- **MUST** update appointment status via service methods

### Doctor Availability
**Source of Truth:** doctor_availability in Firestore
**Rules:**
- **MUST** query Firestore for availability
- **MUST NOT** cache availability in component state
- **MUST NOT** derive availability from UI state
- **MUST** update availability via service methods

### Payment Status
**Source of Truth:** payments.status in Firestore
**Rules:**
- **MUST** query Firestore for payment status
- **MUST NOT** cache payment status in component state
- **MUST NOT** derive payment status from UI state
- **MUST** update payment status via service methods

---

## State Synchronization Rules

### Firestore as Source of Truth
Firestore is the single source of truth for all business state. All business state must be stored in Firestore and queried from Firestore.

### React State as Derived State
React state should only be used for:
- Temporary UI state (form inputs, modals, loading states)
- Derived state computed from Firestore data
- Never as a source of truth for business data

### State Flow
1. **Query Firestore:** Query Firestore for business state
2. **Store in React state:** Store Firestore data in React state for rendering
3. **Update via service:** Update Firestore via service methods
4. **Re-query Firestore:** React state updates when Firestore data changes

### Anti-Pattern: Stale State
**Incorrect:**
```typescript
// Component caches availability in state
const [availability, setAvailability] = useState([]);

// Never updates after initial load
useEffect(() => {
  fetchAvailability().then(data => setAvailability(data));
}, []);

// State becomes stale
```

**Correct:**
```typescript
// Component queries Firestore in real-time
const [availability, setAvailability] = useState([]);

// Re-queries on changes
useEffect(() => {
  const unsubscribe = doctorAvailabilityService.subscribe(doctorId, (data) => {
    setAvailability(data);
  });
  return () => unsubscribe();
}, [doctorId]);

// State always reflects Firestore
```

---

## State Consistency Validation

### Validation Rules
- **Single source of truth:** Each piece of data has exactly one source
- **No duplication:** Data is not duplicated across multiple sources
- **No derivation from UI:** Business state is never derived from UI state
- **Firestore first:** Business state is stored in Firestore
- **Real-time sync:** Components subscribe to Firestore changes

### Validation Checklist
Before submitting code:
- [ ] Identified source of truth for all data
- [ ] No duplicate state across multiple sources
- [ ] No business state derived from UI state
- [ ] All business state stored in Firestore
- [ ] Components subscribe to Firestore changes
- [ ] No stale state in components

### AI-Agent Safety Constraints
- **MUST** identify source of truth for all data
- **MUST** avoid duplicate state
- **MUST** avoid deriving business state from UI state
- **MUST** store business state in Firestore
- **MUST** subscribe to Firestore changes
- **MUST** avoid stale state

<!-- APPEND_HERE -->

<!-- SECTION:53 -->
# 53. LOGIC CENTRALIZATION RULES

This section documents which logic must ONLY exist in one location. It explains why duplication is dangerous and how fragmentation causes inconsistent behavior. This ensures business logic is enforced consistently across the platform.

---

## Slot Generation Logic

### Must ONLY Exist In
- `/services/booking/slot-management.ts`

### Must NEVER Be Duplicated In
- Components (any slot generation logic in components)
- API routes (any slot generation logic in API routes)
- Firestore services (any slot generation logic in Firestore services)
- Utility functions (any slot generation logic in utility functions)

### Why Centralization Matters
Slot generation is complex business logic that must be consistent across the platform. Duplicating this logic creates:
- **Inconsistent slots:** Different parts of the application generate different slots
- **Maintenance burden:** Changes must be made in multiple locations
- **Bug proliferation:** Bugs in one location must be fixed in all locations
- **Business logic violations:** Inconsistent enforcement of scheduling rules

### Anti-Drift Constraints
- **MUST** use slot-management.ts for all slot generation
- **MUST NOT** duplicate slot generation logic in components
- **MUST NOT** duplicate slot generation logic in API routes
- **MUST NOT** duplicate slot generation logic in Firestore services
- **MUST NOT** duplicate slot generation logic in utility functions

### AI-Agent Safety Constraints
- **MUST** use slot-management.ts for all slot generation
- **MUST NOT** duplicate slot generation logic
- **MUST NOT** implement custom slot generation
- **MUST** call service methods for slot generation

---

## Booking Acceptance Logic

### Must ONLY Exist In
- `booking-requests.service.ts` (acceptRequest method)

### Must NEVER Be Duplicated In
- Components (any booking acceptance logic in components)
- API routes (any booking acceptance logic in API routes)
- Firestore services (any booking acceptance logic in Firestore services)

### Why Centralization Matters
Booking acceptance is critical business logic that must be consistent. Duplicating this logic creates:
- **Inconsistent acceptance:** Different parts of the application accept bookings differently
- **State corruption:** Invalid state transitions
- **Business logic violations:** Inconsistent enforcement of booking rules
- **Data corruption:** Orphan appointments or booking requests

### Anti-Drift Constraints
- **MUST** use booking-requests.service.ts for booking acceptance
- **MUST NOT** duplicate booking acceptance logic in components
- **MUST NOT** duplicate booking acceptance logic in API routes
- **MUST NOT** duplicate booking acceptance logic in Firestore services

### AI-Agent Safety Constraints
- **MUST** use booking-requests.service.ts for booking acceptance
- **MUST NOT** duplicate booking acceptance logic
- **MUST NOT** implement custom booking acceptance
- **MUST** call service methods for booking acceptance

---

## Payment Verification Logic

### Must ONLY Exist In
- `/app/api/payment/verify/route.ts`

### Must NEVER Be Duplicated In
- Components (any payment verification logic in components)
- Other API routes (any payment verification logic in other API routes)
- Firestore services (any payment verification logic in Firestore services)

### Why Centralization Matters
Payment verification is security-critical logic that must be consistent. Duplicating this logic creates:
- **Security vulnerabilities:** Inconsistent verification creates security holes
- **Payment fraud:** Incorrect verification allows payment fraud
- **Financial losses:** Incorrect verification causes financial losses
- **Legal risks:** Incorrect verification creates legal risks

### Anti-Drift Constraints
- **MUST** use payment/verify/route.ts for payment verification
- **MUST NOT** duplicate payment verification logic in components
- **MUST NOT** duplicate payment verification logic in other API routes
- **MUST NOT** duplicate payment verification logic in Firestore services

### AI-Agent Safety Constraints
- **MUST** use payment/verify/route.ts for payment verification
- **MUST NOT** duplicate payment verification logic
- **MUST NOT** implement custom payment verification
- **MUST** call API route for payment verification

---

## Role Enforcement Logic

### Must ONLY Exist In
- Firestore rules (server-side role enforcement)
- Layout components (client-side role-based redirects)

### Must NEVER Be Duplicated In
- Components (any role enforcement logic in components)
- API routes (any role enforcement logic in API routes that bypasses Firestore rules)
- Middleware (any role enforcement logic in middleware that bypasses Firestore rules)

### Why Centralization Matters
Role enforcement is security-critical logic that must be consistent. Duplicating this logic creates:
- **Security vulnerabilities:** Inconsistent enforcement creates security holes
- **Authorization bypass:** Incorrect enforcement allows unauthorized access
- **Role elevation:** Incorrect enforcement allows role elevation
- **Data breaches:** Incorrect enforcement causes data breaches

### Anti-Drift Constraints
- **MUST** use Firestore rules for server-side role enforcement
- **MUST** use layout components for client-side role-based redirects
- **MUST NOT** duplicate role enforcement logic in components
- **MUST NOT** duplicate role enforcement logic in API routes
- **MUST NOT** duplicate role enforcement logic in middleware

### AI-Agent Safety Constraints
- **MUST** use Firestore rules for server-side role enforcement
- **MUST** use layout components for client-side role-based redirects
- **MUST NOT** duplicate role enforcement logic
- **MUST NOT** implement custom role enforcement

---

## State Transition Logic

### Must ONLY Exist In
- Service methods (state transition methods in service files)

### Must NEVER Be Duplicated In
- Components (any state transition logic in components)
- API routes (any state transition logic in API routes that bypasses service methods)

### Why Centralization Matters
State transitions are critical business logic that must be consistent. Duplicating this logic creates:
- **Inconsistent transitions:** Different parts of the application transition states differently
- **State corruption:** Invalid state transitions
- **Business logic violations:** Inconsistent enforcement of state transition rules
- **Data corruption:** Invalid states in Firestore

### Anti-Drift Constraints
- **MUST** use service methods for all state transitions
- **MUST NOT** duplicate state transition logic in components
- **MUST NOT** duplicate state transition logic in API routes
- **MUST NOT** implement custom state transitions

### AI-Agent Safety Constraints
- **MUST** use service methods for all state transitions
- **MUST NOT** duplicate state transition logic
- **MUST NOT** implement custom state transitions
- **MUST** call service methods for state transitions

---

## Business Logic Enforcement

### Must ONLY Exist In
- Service methods (business logic enforcement in service files)
- Firestore rules (server-side business logic enforcement)

### Must NEVER Be Duplicated In
- Components (any business logic enforcement in components)
- API routes (any business logic enforcement in API routes that bypasses service methods)

### Why Centralization Matters
Business logic enforcement is critical for data integrity. Duplicating this logic creates:
- **Business logic violations:** Inconsistent enforcement of business rules
- **Data corruption:** Invalid data in Firestore
- **State corruption:** Invalid states
- **Financial losses:** Incorrect business logic causes financial losses

### Anti-Drift Constraints
- **MUST** use service methods for all business logic enforcement
- **MUST** use Firestore rules for server-side business logic enforcement
- **MUST NOT** duplicate business logic enforcement in components
- **MUST NOT** duplicate business logic enforcement in API routes
- **MUST NOT** implement custom business logic enforcement

### AI-Agent Safety Constraints
- **MUST** use service methods for all business logic enforcement
- **MUST** use Firestore rules for server-side business logic enforcement
- **MUST NOT** duplicate business logic enforcement
- **MUST NOT** implement custom business logic enforcement
- **MUST** call service methods for business logic enforcement

---

## Data Validation Logic

### Must ONLY Exist In
- Firestore rules (server-side data validation)
- Service methods (client-side data validation before Firestore writes)
- TypeScript interfaces (type-level validation)

### Must NEVER Be Duplicated In
- Components (any data validation logic in components that bypasses service methods)
- API routes (any data validation logic in API routes that bypasses service methods)

### Why Centralization Matters
Data validation is critical for data integrity. Duplicating this logic creates:
- **Data corruption:** Invalid data in Firestore
- **Business logic violations:** Inconsistent data validation
- **Type errors:** Invalid types in Firestore
- **Security vulnerabilities:** Invalid data creates security holes

### Anti-Drift Constraints
- **MUST** use Firestore rules for server-side data validation
- **MUST** use service methods for client-side data validation
- **MUST** use TypeScript interfaces for type-level validation
- **MUST NOT** duplicate data validation logic in components
- **MUST NOT** duplicate data validation logic in API routes

### AI-Agent Safety Constraints
- **MUST** use Firestore rules for server-side data validation
- **MUST** use service methods for client-side data validation
- **MUST** use TypeScript interfaces for type-level validation
- **MUST NOT** duplicate data validation logic
- **MUST NOT** implement custom data validation

---

## Logic Centralization Matrix

| Logic Type | Must Exist In | Must NOT Exist In | Why Centralized |
|---|---|---|---|
| Slot generation | slot-management.ts | Components, API routes, Firestore services | Consistent slot generation |
| Booking acceptance | booking-requests.service.ts | Components, API routes, Firestore services | Consistent booking acceptance |
| Payment verification | payment/verify/route.ts | Components, other API routes, Firestore services | Security-critical verification |
| Role enforcement | Firestore rules, layout components | Components, API routes, middleware | Security-critical enforcement |
| State transitions | Service methods | Components, API routes | Consistent state transitions |
| Business logic enforcement | Service methods, Firestore rules | Components, API routes | Data integrity |
| Data validation | Firestore rules, service methods, TypeScript interfaces | Components, API routes | Data integrity |

---

## Logic Duplication Detection

### Automated Detection (Future)
Implement linting rules that check for:
- Duplicate slot generation logic
- Duplicate booking acceptance logic
- Duplicate payment verification logic
- Duplicate role enforcement logic
- Duplicate state transition logic
- Duplicate business logic enforcement
- Duplicate data validation logic

### Manual Detection
During code review, check for:
- Logic that should be in service methods but is in components
- Logic that should be in service methods but is in API routes
- Logic that should be in Firestore rules but is in components
- Logic that should be in Firestore rules but is in API routes

### Violation Response
- **Critical violations:** Block deployment, require fix
- **High violations:** Require fix before merge
- **Medium violations:** Require fix within sprint
- **Low violations:** Document and address later

---

## Logic Centralization Checklist

### Before Submitting Code
- [ ] Identified where logic should exist
- [ ] Verified logic is in correct location
- [ ] Checked for logic duplication
- [ ] Verified no logic in components that should be in services
- [ ] Verified no logic in API routes that should be in services
- [ ] Verified no logic bypassing Firestore rules

### AI-Agent Safety Constraints
- **MUST** identify where logic should exist
- **MUST** verify logic is in correct location
- **MUST** check for logic duplication
- **MUST** not place logic in components that should be in services
- **MUST** not place logic in API routes that should be in services
- **MUST** not bypass Firestore rules

<!-- APPEND_HERE -->

<!-- SECTION:54 -->
# 54. LEGACY SYSTEMS & MIGRATION GUIDANCE

This section documents deprecated collections, legacy services, phased-out dependencies, and historical architecture. It explains replacement systems, migration status, and what future contributors must avoid using. This prevents reintroduction of deprecated patterns and ensures migration progress is maintained.

---

## Deprecated Collections

### doctor_slots (Legacy)

**Status:** Deprecated, being phased out

**Why Deprecated:**
- doctor_slots was a pre-generated collection of time slots
- Pre-generation created maintenance burden and performance issues
- doctor_slots required periodic regeneration
- doctor_slots could become stale if availability changed

**Replacement System:**
- doctor_availability + doctor_blocks + real-time slot generation
- Slots are now generated on-demand from availability and blocks
- No pre-generation required
- Slots always reflect current availability

**Migration Status:**
- New booking flow uses real-time slot generation
- Legacy doctor_slots collection still exists for backward compatibility
- No new code should write to doctor_slots
- Existing code should be refactored to use real-time slot generation

**Future Contributor Guidance:**
- **MUST NOT** write to doctor_slots collection
- **MUST** use real-time slot generation from availability and blocks
- **MUST** use slot-management.ts for slot generation
- **MUST** refactor any code that depends on doctor_slots
- **MUST** remove doctor_slots references when safe

---

## Phased-Out Dependencies

### FullCalendar (Phased Out)

**Status:** Phased out, no longer used

**Why Phased Out:**
- FullCalendar was too complex for Eye Aura's scheduling needs
- FullCalendar created unnecessary dependency overhead
- FullCalendar didn't align with custom calendar philosophy (Section 25)
- FullCalendar's API didn't match Eye Aura's scheduling model

**Replacement System:**
- Custom calendar components built with React
- Custom calendar logic in slot-management.ts
- Tailwind CSS for styling
- No external calendar library

**Migration Status:**
- FullCalendar has been removed from dependencies
- All calendar functionality now uses custom components
- No FullCalendar references should exist in codebase

**Future Contributor Guidance:**
- **MUST NOT** add FullCalendar back to dependencies
- **MUST** use custom calendar components
- **MUST** use slot-management.ts for calendar logic
- **MUST NOT** introduce external calendar libraries

---

### Framer Motion (Phased Out)

**Status:** Being phased out

**Why Phasing Out:**
- Framer Motion was used for animations but created unnecessary complexity
- Animations should be simple and CSS-based
- Framer Motion's API didn't align with Eye Aura's animation philosophy
- Framer Motion added bundle size without significant value

**Replacement System:**
- CSS transitions and animations
- Tailwind CSS animation utilities
- Simple React state-based animations
- No external animation library

**Migration Status:**
- Framer Motion is still in dependencies but not used in new code
- Existing Framer Motion usage should be refactored to CSS
- No new code should use Framer Motion

**Future Contributor Guidance:**
- **MUST NOT** use Framer Motion in new code
- **MUST** use CSS transitions and animations
- **MUST** use Tailwind CSS animation utilities
- **MUST** refactor existing Framer Motion usage to CSS

---

## Historical Architecture Decisions

### Initial Firestore Schema (Historical)

**Original Design:**
- doctor_slots collection for pre-generated slots
- No doctor_blocks collection
- No doctor_availability collection
- Flat scheduling model without recurring availability

**Why Changed:**
- Pre-generated slots created maintenance burden
- No support for recurring availability
- No support for ad-hoc blocks
- Inflexible scheduling model

**Current Design:**
- doctor_availability collection for recurring availability
- doctor_blocks collection for ad-hoc blocks
- Real-time slot generation
- Flexible scheduling model

**Migration Status:**
- Complete migration to current design
- Legacy doctor_slots still exists but is deprecated
- No new code should use legacy schema

**Future Contributor Guidance:**
- **MUST** use current Firestore schema
- **MUST NOT** use legacy doctor_slots schema
- **MUST** use doctor_availability for recurring availability
- **MUST** use doctor_blocks for ad-hoc blocks
- **MUST** use real-time slot generation

---

### Initial Auth Model (Historical)

**Original Design:**
- Custom auth implementation
- No Firebase Auth
- Manual session management
- Manual role enforcement

**Why Changed:**
- Custom auth created security vulnerabilities
- Manual session management was error-prone
- Manual role enforcement was inconsistent
- Firebase Auth provides better security and features

**Current Design:**
- Firebase Auth for authentication
- Firestore for user profiles
- Firestore rules for role enforcement
- Middleware for route protection

**Migration Status:**
- Complete migration to Firebase Auth
- No custom auth implementation remains
- All auth uses Firebase Auth

**Future Contributor Guidance:**
- **MUST** use Firebase Auth for authentication
- **MUST NOT** implement custom auth
- **MUST** use Firestore rules for role enforcement
- **MUST** use middleware for route protection

---

## Migration Checklist

### Before Using Legacy Systems
- [ ] Verified system is not deprecated
- [ ] Verified system is not phased out
- [ ] Verified replacement system is not available
- [ ] Verified legacy system is still maintained
- [ ] Verified legacy system is secure

### Before Adding Dependencies
- [ ] Verified dependency is not in forbidden list (Section 33, 45)
- [ ] Verified dependency is not phased out
- [ ] Verified dependency is necessary
- [ ] Verified dependency is secure
- [ ] Verified dependency is maintained

### Before Using Deprecated Collections
- [ ] Verified collection is not deprecated
- [ ] Verified replacement system is not available
- [ ] Verified migration is not possible
- [ ] Verified collection is secure
- [ ] Verified collection is maintained

---

## Anti-Drift Constraints

### Legacy System Avoidance
- **MUST NOT** use deprecated collections
- **MUST NOT** use phased-out dependencies
- **MUST NOT** reintroduce historical architecture
- **MUST** use current systems and patterns
- **MUST** follow current architecture

### Dependency Avoidance
- **MUST NOT** add forbidden dependencies (Section 33, 45)
- **MUST NOT** add phased-out dependencies
- **MUST NOT** reintroduce FullCalendar
- **MUST NOT** reintroduce Framer Motion in new code
- **MUST** use current approved dependencies

### Collection Avoidance
- **MUST NOT** use doctor_slots collection
- **MUST** use current Firestore schema
- **MUST** use doctor_availability for recurring availability
- **MUST** use doctor_blocks for ad-hoc blocks
- **MUST** use real-time slot generation

### AI-Agent Safety Constraints
- **MUST NOT** use deprecated collections
- **MUST NOT** use phased-out dependencies
- **MUST NOT** reintroduce historical architecture
- **MUST** use current systems and patterns
- **MUST** follow current architecture
- **MUST NOT** add forbidden dependencies
- **MUST NOT** use doctor_slots collection

---

## Migration Status Summary

| System | Status | Replacement | Migration Complete |
|---|---|---|---|
| doctor_slots | Deprecated | doctor_availability + doctor_blocks | Partial |
| FullCalendar | Phased out | Custom calendar components | Yes |
| Framer Motion | Phasing out | CSS animations | Partial |
| Custom auth | Historical | Firebase Auth | Yes |
| Legacy Firestore schema | Historical | Current schema | Yes |

<!-- APPEND_HERE -->

<!-- SECTION:55 -->
# 55. OPERATIONAL CRITICALITY MATRIX

This section classifies systems by operational criticality, documents failure impact, and explains which systems require extreme caution versus which tolerate experimentation. This enables AI agents to understand risk levels before making changes.

---

## Operational Criticality Matrix

| System | Criticality | Failure Impact | Modification Caution |
|---|---|---|---|
| Authentication | Critical | Platform-wide outage, security breach | Extreme caution required |
| Booking | Critical | Business operations failure, revenue loss | Extreme caution required |
| Scheduling | Critical | Booking failure, revenue loss | Extreme caution required |
| Payments | Critical | Financial loss, legal risk | Extreme caution required |
| Prescriptions | High | Patient care impact, legal risk | High caution required |
| Firestore | Critical | Platform-wide outage, data corruption | Extreme caution required |
| Middleware | Critical | Security breach, platform-wide outage | Extreme caution required |
| Firestore Rules | Critical | Security breach, data corruption | Extreme caution required |
| Doctor Onboarding | High | New doctor failure, business impact | High caution required |
| Support | Medium | User dissatisfaction, communication gaps | Moderate caution required |
| Notifications | Medium | Communication gaps, user dissatisfaction | Moderate caution required |
| UI Components | Low | UX degradation, no business impact | Low caution required |
| Styling | Low | UX degradation, no business impact | Low caution required |
| Error Handling | Medium | UX degradation, user confusion | Moderate caution required |

---

## Critical Systems (Extreme Caution Required)

### Authentication
**Criticality:** Critical
**Failure Impact:** Platform-wide outage, security breach
**Modification Caution:** Extreme caution required
**Why Critical:** Authentication is the gateway to all protected functionality. Any incorrect modification can create security vulnerabilities or lock users out of the platform.

### Booking
**Criticality:** Critical
**Failure Impact:** Business operations failure, revenue loss
**Modification Caution:** Extreme caution required
**Why Critical:** Booking is the core business logic of the platform. Any incorrect modification can create data corruption that affects patients, doctors, and payments.

### Scheduling
**Criticality:** Critical
**Failure Impact:** Booking failure, revenue loss
**Modification Caution:** Extreme caution required
**Why Critical:** Scheduling is the foundation of the booking system. Any incorrect modification can create scheduling inconsistencies that prevent patients from booking appointments.

### Payments
**Criticality:** Critical
**Failure Impact:** Financial loss, legal risk
**Modification Caution:** Extreme caution required
**Why Critical:** Payments are critical for business operations. Any incorrect modification can create financial losses and legal risks.

### Firestore
**Criticality:** Critical
**Failure Impact:** Platform-wide outage, data corruption
**Modification Caution:** Extreme caution required
**Why Critical:** Firestore is the backend for all data. Any incorrect modification can create data corruption across the entire platform.

### Middleware
**Criticality:** Critical
**Failure Impact:** Security breach, platform-wide outage
**Modification Caution:** Extreme caution required
**Why Critical:** Middleware controls authentication and authorization for all protected routes. Any incorrect modification can create security vulnerabilities.

### Firestore Rules
**Criticality:** Critical
**Failure Impact:** Security breach, data corruption
**Modification Caution:** Extreme caution required
**Why Critical:** Firestore rules are the server-side security layer for Firestore. Any incorrect modification can create security vulnerabilities.

---

## High-Criticality Systems (High Caution Required)

### Prescriptions
**Criticality:** High
**Failure Impact:** Patient care impact, legal risk
**Modification Caution:** High caution required
**Why Critical:** Prescriptions are critical for patient care. Any incorrect modification can create legal and medical risks.

### Doctor Onboarding
**Criticality:** High
**Failure Impact:** New doctor failure, business impact
**Modification Caution:** High caution required
**Why Critical:** Doctor onboarding is the gateway for new doctors to join the platform. Any incorrect modification can prevent doctors from joining.

---

## Medium-Criticality Systems (Moderate Caution Required)

### Support
**Criticality:** Medium
**Failure Impact:** User dissatisfaction, communication gaps
**Modification Caution:** Moderate caution required
**Why Medium:** Support tickets are critical for user satisfaction but not business-critical. Incorrect modifications affect user experience but not business operations.

### Notifications
**Criticality:** Medium
**Failure Impact:** Communication gaps, user dissatisfaction
**Modification Caution:** Moderate caution required
**Why Medium:** Notifications are important for user communication but not business-critical. Incorrect modifications affect user experience but not business operations.

### Error Handling
**Criticality:** Medium
**Failure Impact:** UX degradation, user confusion
**Modification Caution:** Moderate caution required
**Why Medium:** Error handling is important for user experience but not business-critical. Incorrect modifications affect user experience but not business operations.

---

## Low-Criticality Systems (Low Caution Required)

### UI Components
**Criticality:** Low
**Failure Impact:** UX degradation, no business impact
**Modification Caution:** Low caution required
**Why Low:** UI components affect visual presentation only. Incorrect modifications affect user experience but not business logic or data integrity.

### Styling
**Criticality:** Low
**Failure Impact:** UX degradation, no business impact
**Modification Caution:** Low caution required
**Why Low:** Styling affects visual presentation only. Incorrect modifications affect user experience but not business logic or data integrity.

---

## Modification Guidelines by Criticality

### Critical Systems
- **Read before modifying:** All relevant sections in this document
- **Test thoroughly:** All scenarios and edge cases
- **Security review:** Required for all changes
- **Approval required:** Executive approval required
- **Rollback plan:** Must have rollback plan before starting
- **Monitoring:** Must monitor after deployment

### High-Criticality Systems
- **Read before modifying:** All relevant sections in this document
- **Test thoroughly:** All scenarios and edge cases
- **Security review:** Required for security-sensitive changes
- **Approval required:** Team lead approval required
- **Rollback plan:** Recommended to have rollback plan
- **Monitoring:** Recommended to monitor after deployment

### Medium-Criticality Systems
- **Read before modifying:** Relevant sections in this document
- **Test thoroughly:** Most scenarios
- **Approval required:** Team lead review recommended
- **Rollback plan:** Optional
- **Monitoring:** Optional

### Low-Criticality Systems
- **Read before modifying:** Relevant sections in this document
- **Test thoroughly:** Basic scenarios
- **Approval required:** Self-approve for minor changes
- **Rollback plan:** Optional
- **Monitoring:** Optional

---

## Anti-Drift Constraints

### Critical System Modifications
- **MUST** read all relevant sections before modifying
- **MUST** test thoroughly all scenarios
- **MUST** get executive approval before modifying
- **MUST** have rollback plan before starting
- **MUST** monitor after deployment
- **MUST NOT** skip security review

### High-Criticality System Modifications
- **MUST** read all relevant sections before modifying
- **MUST** test thoroughly all scenarios
- **MUST** get team lead approval before modifying
- **MUST** have rollback plan recommended
- **MUST** monitor after deployment recommended

### AI-Agent Safety Constraints
- **MUST** identify system criticality before modifying
- **MUST** read relevant sections before modifying
- **MUST** test thoroughly based on criticality
- **MUST** get required approval based on criticality
- **MUST** have rollback plan for critical systems
- **MUST** monitor after deployment for critical systems

<!-- APPEND_HERE -->

<!-- SECTION:56 -->
# 56. FAILURE IMPACT ANALYSIS

This section documents the blast radius of failures for major systems. It explains what users experience, what data becomes inconsistent, what workflows fail, and what downstream systems are affected. This enables AI agents to understand impact radius before making changes.

---

## Authentication Failure

### What Users Experience
- **Unable to sign in:** Users cannot access the platform
- **Unable to sign up:** New users cannot create accounts
- **Session loss:** Existing users are logged out
- **Access denied:** Users cannot access protected routes
- **Platform outage:** Complete platform unavailability

### What Data Becomes Inconsistent
- **Session data:** Invalid session states
- **Auth tokens:** Invalid or expired tokens
- **User context:** Missing or incorrect user context

### What Workflows Fail
- **All protected workflows:** All workflows requiring authentication
- **Patient workflows:** Booking, appointments, prescriptions
- **Doctor workflows:** Scheduling, appointments, prescriptions
- **Admin workflows:** User management, system administration

### What Downstream Systems Are Affected
- **All systems:** All systems depend on authentication
- **Middleware:** All protected routes fail
- **API routes:** All API routes requiring authentication fail
- **Firestore access:** All Firestore access requiring authentication fails

### Blast Radius
- **Platform-wide:** Complete platform outage
- **All users:** All users affected
- **All workflows:** All workflows fail

---

## Booking Lifecycle Failure

### What Users Experience
- **Unable to book:** Patients cannot book appointments
- **Booking errors:** Booking requests fail with errors
- **Double bookings:** Multiple patients book the same slot
- **Orphan appointments:** Appointments without corresponding booking requests
- **Scheduling inconsistencies:** Slots don't match availability

### What Data Becomes Inconsistent
- **Booking requests:** Invalid booking request states
- **Appointments:** Orphan appointments
- **Payments:** Payments without corresponding bookings
- **Prescriptions:** Prescriptions without corresponding appointments
- **Notifications:** Inconsistent notification states

### What Workflows Fail
- **Patient booking:** Patients cannot book appointments
- **Doctor approval:** Doctors cannot approve booking requests
- **Payment processing:** Payments fail or mismatch
- **Prescription creation:** Prescriptions cannot be created
- **Notification delivery:** Notifications fail

### What Downstream Systems Are Affected
- **Appointments:** Created from accepted booking requests
- **Payments:** Created from accepted booking requests
- **Prescriptions:** Created from completed appointments
- **Notifications:** Sent on booking status changes
- **Scheduling:** Availability may become inconsistent

### Blast Radius
- **Patient-facing:** All patient-facing workflows fail
- **Doctor-facing:** Doctor approval workflows fail
- **Business operations:** Revenue loss from failed bookings

---

## Scheduling Failure

### What Users Experience
- **No availability:** Patients cannot see doctor availability
- **Incorrect slots:** Patients see incorrect time slots
- **Booking blocked:** Patients cannot book available slots
- **Block subtraction failures:** Patients book blocked time slots
- **Performance issues:** Slow slot generation

### What Data Becomes Inconsistent
- **Doctor availability:** Incorrect availability data
- **Doctor blocks:** Incorrect block data
- **Time slots:** Incorrect slot generation
- **Booking requests:** Booking requests for invalid slots

### What Workflows Fail
- **Patient booking:** Patients cannot book appointments
- **Doctor scheduling:** Doctors cannot set availability
- **Block management:** Doctors cannot create blocks
- **Slot generation:** Slots are incorrect or missing

### What Downstream Systems Are Affected
- **Booking:** Depends on availability and blocks
- **Doctor slots:** Legacy slot generation fails
- **Appointments:** Created from booking requests that may be invalid

### Blast Radius
- **Patient-facing:** Patient booking workflows fail
- **Doctor-facing:** Doctor scheduling workflows fail
- **Business operations:** Revenue loss from failed bookings

---

## Payment Failure

### What Users Experience
- **Unable to pay:** Patients cannot complete payment
- **Payment errors:** Payment processing fails with errors
- **Payment mismatches:** Payments without corresponding bookings
- **Financial loss:** Patients lose money without receiving service
- **Booking incomplete:** Bookings remain incomplete without payment

### What Data Becomes Inconsistent
- **Payments:** Invalid payment states
- **Booking requests:** Booking requests without corresponding payments
- **Appointments:** Appointments without corresponding payments
- **Revenue data:** Inaccurate revenue tracking

### What Workflows Fail
- **Patient payment:** Patients cannot complete payment
- **Booking completion:** Bookings remain incomplete
- **Appointment confirmation:** Appointments not confirmed
- **Prescription creation:** Prescriptions cannot be created
- **Notification delivery:** Payment notifications fail

### What Downstream Systems Are Affected
- **Booking:** Booking completion depends on payment success
- **Appointments:** Appointments not confirmed without payment
- **Prescriptions:** Prescriptions not created without payment
- **Notifications:** Payment notifications fail
- **Revenue tracking:** Inaccurate revenue data

### Blast Radius
- **Patient-facing:** Patient payment workflows fail
- **Business operations:** Revenue loss from failed payments
- **Financial risk:** Financial loss and legal risk

---

## Prescription Failure

### What Users Experience
- **Unable to access prescriptions:** Patients cannot access prescriptions
- **PDF generation failures:** Patients cannot download prescription PDFs
- **Medical errors:** Incorrect medication information
- **Legal risks:** Non-compliant prescription formats
- **Data loss:** Lost prescription data

### What Data Becomes Inconsistent
- **Prescriptions:** Invalid prescription data
- **Appointments:** Appointments without corresponding prescriptions
- **Medical records:** Incomplete medical records

### What Workflows Fail
- **Patient care:** Patients cannot access prescriptions
- **Doctor prescriptions:** Doctors cannot create prescriptions
- **PDF generation:** PDFs fail to generate
- **Notification delivery:** Prescription notifications fail

### What Downstream Systems Are Affected
- **Appointments:** Completed appointments without prescriptions
- **Notifications:** Prescription notifications fail
- **Medical records:** Incomplete medical records

### Blast Radius
- **Patient-facing:** Patient care workflows fail
- **Doctor-facing:** Doctor prescription workflows fail
- **Legal risk:** Legal risk from medical errors

---

## Firestore Failure

### What Users Experience
- **Platform outage:** Complete platform unavailability
- **Data access failures:** Users cannot access data
- **Data corruption:** Invalid data displayed
- **Performance issues:** Slow data access
- **Query failures:** Queries fail with errors

### What Data Becomes Inconsistent
- **All data:** All Firestore data may be inconsistent
- **User data:** Invalid user data
- **Booking data:** Invalid booking data
- **Scheduling data:** Invalid scheduling data
- **Payment data:** Invalid payment data

### What Workflows Fail
- **All workflows:** All workflows depend on Firestore
- **Authentication:** Authentication fails without Firestore
- **Booking:** Booking fails without Firestore
- **Scheduling:** Scheduling fails without Firestore
- **Payments:** Payments fail without Firestore

### What Downstream Systems Are Affected
- **All systems:** All systems depend on Firestore
- **All services:** All services depend on Firestore
- **All components:** All components depend on Firestore
- **All API routes:** All API routes depend on Firestore

### Blast Radius
- **Platform-wide:** Complete platform outage
- **All users:** All users affected
- **All workflows:** All workflows fail

---

## Middleware Failure

### What Users Experience
- **Access denied:** Users cannot access protected routes
- **Authentication failures:** Users cannot authenticate
- **Authorization bypass:** Users access roles they shouldn't have
- **Platform outage:** Complete platform outage
- **Security breach:** Unauthorized access to protected data

### What Data Becomes Inconsistent
- **Session data:** Invalid session states
- **Auth tokens:** Invalid or expired tokens
- **User context:** Missing or incorrect user context
- **Access control:** Inconsistent access control

### What Workflows Fail
- **All protected workflows:** All workflows requiring authentication
- **Patient workflows:** All patient workflows fail
- **Doctor workflows:** All doctor workflows fail
- **Admin workflows:** All admin workflows fail

### What Downstream Systems Are Affected
- **All protected routes:** All protected routes fail
- **All role-based features:** All role-based features fail
- **All user-specific features:** All user-specific features fail

### Blast Radius
- **Platform-wide:** Complete platform outage
- **All users:** All users affected
- **All workflows:** All workflows fail

---

## Anti-Drift Constraints

### Failure Impact Understanding
- **MUST** understand failure impact before modifying
- **MUST** understand blast radius before modifying
- **MUST** understand downstream dependencies before modifying
- **MUST** test for failure scenarios before deploying
- **MUST** have rollback plan for critical systems

### AI-Agent Safety Constraints
- **MUST** understand failure impact before modifying
- **MUST** understand blast radius before modifying
- **MUST** understand downstream dependencies before modifying
- **MUST** test for failure scenarios before deploying
- **MUST** have rollback plan for critical systems

<!-- APPEND_HERE -->

<!-- SECTION:57 -->
# 57. ARCHITECTURAL STABILITY GUARANTEES

This section documents architectural assumptions that should remain stable long-term. It explains why these assumptions exist, why future contributors should preserve them, and what risks come from violating them. This ensures architectural stability and prevents unnecessary rewrites.

---

## Firestore-First Backend

### Assumption
Firestore is the primary and only backend database for the platform. No SQL database, no file storage, no additional data stores.

### Why This Assumption Exists
- **Simplicity:** Single database reduces complexity
- **Scalability:** Firestore scales automatically
- **Real-time:** Firestore provides real-time updates
- **Security:** Firestore rules provide server-side security
- **Cost:** Firestore is cost-effective for the current scale
- **Maintenance:** Single database reduces maintenance burden

### Why Future Contributors Should Preserve This
- **Architectural consistency:** Adding another database creates architectural inconsistency
- **Data integrity:** Multiple data stores create data synchronization issues
- **Security:** Multiple data stores create security vulnerabilities
- **Cost:** Additional databases increase cost
- **Maintenance:** Multiple databases increase maintenance burden

### Risks of Violation
- **Data inconsistency:** Data may be inconsistent across multiple stores
- **Security vulnerabilities:** Multiple data stores create security holes
- **Increased complexity:** Multiple databases increase complexity
- **Increased cost:** Additional databases increase cost
- **Maintenance burden:** Multiple databases increase maintenance

### Anti-Drift Constraints
- **MUST** use Firestore as the only backend database
- **MUST NOT** add SQL databases
- **MUST NOT** add file storage databases
- **MUST NOT** add additional data stores

### AI-Agent Safety Constraints
- **MUST** use Firestore as the only backend database
- **MUST NOT** add SQL databases
- **MUST NOT** add file storage databases
- **MUST NOT** add additional data stores

---

## No Upload Infrastructure

### Assumption
Eye Aura does not have file upload infrastructure. No Firebase Storage, no S3, no Cloudinary. Data is text-only.

### Why This Assumption Exists
- **Simplicity:** No file uploads reduces complexity
- **Security:** No file uploads reduces security vulnerabilities
- **Cost:** No file storage reduces cost
- **Compliance:** No file uploads reduces compliance burden
- **Performance:** No file uploads improves performance
- **Scalability:** No file uploads improves scalability

### Why Future Contributors Should Preserve This
- **Architectural consistency:** Adding file uploads creates architectural inconsistency
- **Security:** File uploads create security vulnerabilities
- **Cost:** File storage increases cost
- **Compliance:** File storage increases compliance burden
- **Maintenance:** File uploads increase maintenance burden

### Risks of Violation
- **Security vulnerabilities:** File uploads create security holes
- **Increased complexity:** File uploads increase complexity
- **Increased cost:** File storage increases cost
- **Compliance burden:** File storage increases compliance burden
- **Maintenance burden:** File uploads increase maintenance

### Anti-Drift Constraints
- **MUST** not add file upload infrastructure
- **MUST NOT** use Firebase Storage
- **MUST NOT** use S3
- **MUST NOT** use Cloudinary
- **MUST** keep data text-only

### AI-Agent Safety Constraints
- **MUST** not add file upload infrastructure
- **MUST NOT** use Firebase Storage
- **MUST NOT** use S3
- **MUST NOT** use Cloudinary
- **MUST** keep data text-only

---

## Request-Based Booking

### Assumption
Patients request appointments, doctors approve appointments. No auto-booking, no instant booking.

### Why This Assumption Exists
- **Doctor control:** Doctors control their schedule
- **Quality control:** Doctors can screen requests
- **Flexibility:** Doctors can manage their availability
- **Patient experience:** Patients can request without immediate commitment
- **Business model:** Request/approval model aligns with business model

### Why Future Contributors Should Preserve This
- **Product identity:** Request/approval model is core to product identity (Section 46)
- **Doctor satisfaction:** Doctors prefer approval model
- **Patient experience:** Patients prefer request model
- **Business model:** Request/approval model aligns with business model

### Risks of Violation
- **Doctor dissatisfaction:** Doctors may be unhappy with auto-booking
- **Patient dissatisfaction:** Patients may be unhappy with auto-booking
- **Quality degradation:** Auto-booking may reduce quality
- **Business model misalignment:** Auto-booking may not align with business model

### Anti-Drift Constraints
- **MUST** preserve request/approval model
- **MUST NOT** introduce auto-booking
- **MUST NOT** introduce instant booking
- **MUST** keep doctor control over approvals

### AI-Agent Safety Constraints
- **MUST** preserve request/approval model
- **MUST NOT** introduce auto-booking
- **MUST NOT** introduce instant booking
- **MUST** keep doctor control over approvals

---

## Invite-Only Doctors

### Assumption
Doctors can only join via invite. No self-registration for doctors. Patients can self-register.

### Why This Assumption Exists
- **Quality control:** Invites ensure quality of doctors
- **Trust:** Invites build trust in doctors
- **Verification:** Invites allow verification of credentials
- **Business model:** Invite-only model aligns with business model
- **Scalability:** Invite-only model allows controlled growth

### Why Future Contributors Should Preserve This
- **Quality control:** Invites ensure quality of doctors
- **Trust:** Invites build trust in doctors
- **Verification:** Invites allow verification of credentials
- **Business model:** Invite-only model aligns with business model

### Risks of Violation
- **Quality degradation:** Self-registration may reduce quality
- **Trust degradation:** Self-registration may reduce trust
- **Verification issues:** Self-registration may skip verification
- **Business model misalignment:** Self-registration may not align with business model

### Anti-Drift Constraints
- **MUST** preserve invite-only model for doctors
- **MUST NOT** introduce self-registration for doctors
- **MUST** allow patient self-registration
- **MUST** verify doctor credentials before onboarding

### AI-Agent Safety Constraints
- **MUST** preserve invite-only model for doctors
- **MUST NOT** introduce self-registration for doctors
- **MUST** allow patient self-registration
- **MUST** verify doctor credentials before onboarding

---

## Calm Wellness UX

### Assumption
Eye Aura has a calm wellness UX aesthetic. Low visual density, generous whitespace, gentle tone. Not clinical, not corporate.

### Why This Assumption Exists
- **Product identity:** Calm wellness is core to product identity (Section 46)
- **User experience:** Calm wellness reduces user anxiety
- **Differentiation:** Calm wellness differentiates from competitors
- **Brand consistency:** Calm wellness maintains brand consistency

### Why Future Contributors Should Preserve This
- **Product identity:** Calm wellness is core to product identity (Section 46)
- **User experience:** Calm wellness reduces user anxiety
- **Differentiation:** Calm wellness differentiates from competitors
- **Brand consistency:** Calm wellness maintains brand consistency

### Risks of Violation
- **Product identity degradation:** Violation degrades product identity
- **User experience degradation:** Violation degrades user experience
- **Differentiation loss:** Violation reduces differentiation
- **Brand inconsistency:** Violation creates brand inconsistency

### Anti-Drift Constraints
- **MUST** preserve calm wellness aesthetic
- **MUST** maintain low visual density
- **MUST** use gentle tone
- **MUST NOT** introduce clinical aesthetics
- **MUST NOT** introduce corporate aesthetics

### AI-Agent Safety Constraints
- **MUST** preserve calm wellness aesthetic
- **MUST** maintain low visual density
- **MUST** use gentle tone
- **MUST NOT** introduce clinical aesthetics
- **MUST NOT** introduce corporate aesthetics

---

## Mobile-First Architecture

### Assumption
Eye Aura is mobile-first. Design for mobile first, scale up to desktop. Touch-friendly interfaces.

### Why This Assumption Exists
- **User behavior:** Most users access on mobile
- **Accessibility:** Mobile-first improves accessibility
- **Performance:** Mobile-first improves performance
- **User experience:** Mobile-first improves user experience

### Why Future Contributors Should Preserve This
- **User behavior:** Most users access on mobile
- **Accessibility:** Mobile-first improves accessibility
- **Performance:** Mobile-first improves performance
- **User experience:** Mobile-first improves user experience

### Risks of Violation
- **User experience degradation:** Desktop-first degrades mobile experience
- **Accessibility degradation:** Desktop-first reduces accessibility
- **Performance degradation:** Desktop-first reduces performance
- **User satisfaction:** Desktop-first reduces user satisfaction

### Anti-Drift Constraints
- **MUST** design for mobile first
- **MUST** scale up to desktop
- **MUST** use touch-friendly interfaces
- **MUST NOT** design for desktop first

### AI-Agent Safety Constraints
- **MUST** design for mobile first
- **MUST** scale up to desktop
- **MUST** use touch-friendly interfaces
- **MUST NOT** design for desktop first

---

## Modular Service Layer

### Assumption
Eye Aura has a modular service layer. Business logic is centralized in services. Services are reusable across components and API routes.

### Why This Assumption Exists
- **Code reuse:** Services enable code reuse
- **Business logic centralization:** Services centralize business logic
- **Testing:** Services are easier to test
- **Maintenance:** Services are easier to maintain
- **Consistency:** Services ensure consistent behavior

### Why Future Contributors Should Preserve This
- **Code reuse:** Services enable code reuse
- **Business logic centralization:** Services centralize business logic
- **Testing:** Services are easier to test
- **Maintenance:** Services are easier to maintain
- **Consistency:** Services ensure consistent behavior

### Risks of Violation
- **Code duplication:** Violation creates code duplication
- **Business logic fragmentation:** Violation fragments business logic
- **Testing difficulty:** Violation makes testing difficult
- **Maintenance burden:** Violation increases maintenance burden
- **Inconsistent behavior:** Violation creates inconsistent behavior

### Anti-Drift Constraints
- **MUST** use service layer for business logic
- **MUST NOT** duplicate business logic in components
- **MUST NOT** duplicate business logic in API routes
- **MUST** centralize business logic in services

### AI-Agent Safety Constraints
- **MUST** use service layer for business logic
- **MUST NOT** duplicate business logic in components
- **MUST NOT** duplicate business logic in API routes
- **MUST** centralize business logic in services

---

## Anti-Drift Constraints

### Architectural Stability
- **MUST** preserve Firestore-first backend
- **MUST** preserve no upload infrastructure
- **MUST** preserve request-based booking
- **MUST** preserve invite-only doctors
- **MUST** preserve calm wellness UX
- **MUST** preserve mobile-first architecture
- **MUST** preserve modular service layer
- **MUST NOT** violate architectural assumptions without executive approval

### AI-Agent Safety Constraints
- **MUST** preserve architectural assumptions
- **MUST** read this section before violating assumptions
- **MUST** get executive approval before violating assumptions
- **MUST** document reasons for violating assumptions
- **MUST** update this document if assumptions change

<!-- APPEND_HERE -->

<!-- SECTION:58 -->
# 58. AI AGENT FAST NAVIGATION GUIDE

This section provides fast navigation guidance for AI agents working on the Eye Aura platform. It identifies critical sections for each domain, recommended reading order, and warning areas requiring extra caution. This dramatically improves future AI-agent efficiency.

---

## Booking Domain

### Recommended Reading Order
1. Section 7 (Booking Flow)
2. Section 23 (Business Rules)
3. Section 24 (State Transitions)
4. Section 37 (Business Rules & Domain Constraints - Operational)
5. Section 38 (State Transition Matrices - Operational)
6. Section 49 (Critical Files & Ownership Index - Booking System)
7. Section 51 (System Dependency Graphs - Booking System)
8. Section 52 (Source of Truth Definitions - Booking State)
9. Section 53 (Logic Centralization Rules - Booking Acceptance)

### Critical Sections
- **Section 7:** Booking flow architecture
- **Section 23:** Booking business rules
- **Section 24:** Booking state transitions
- **Section 37:** Booking business rules operational
- **Section 38:** Booking state transition matrices operational
- **Section 49:** Booking critical files
- **Section 51:** Booking system dependencies
- **Section 53:** Booking acceptance logic centralization

### Warning Areas
- **Booking lifecycle:** Critical system, extreme caution required (Section 55)
- **State transitions:** Core business logic, must be centralized (Section 53)
- **Payment integration:** Security-critical, must use Razorpay (Section 45)

---

## Authentication Domain

### Recommended Reading Order
1. Section 4 (Role-Based Access Control)
2. Section 5 (Authentication Flow)
3. Section 28 (Security Architecture & Trust Boundaries)
4. Section 40 (Security Architecture & Trust Boundaries - Operational)
5. Section 49 (Critical Files & Ownership Index - Authentication System)
6. Section 51 (System Dependency Graphs - Authentication System)
7. Section 52 (Source of Truth Definitions - Authentication State)

### Critical Sections
- **Section 4:** Role system
- **Section 5:** Authentication flow
- **Section 28:** Security architecture
- **Section 40:** Trust boundaries operational
- **Section 49:** Authentication critical files
- **Section 51:** Authentication system dependencies

### Warning Areas
- **Authentication:** Critical system, extreme caution required (Section 55)
- **Role enforcement:** Security-critical, must use Firestore rules (Section 53)
- **Middleware:** Security-critical, must enforce authentication (Section 49)

---

## Scheduling Domain

### Recommended Reading Order
1. Section 11 (Scheduling Architecture)
2. Section 23 (Business Rules)
3. Section 25 (Custom Calendar Rationale)
4. Section 37 (Business Rules & Domain Constraints - Operational)
5. Section 49 (Critical Files & Ownership Index - Scheduling System)
6. Section 51 (System Dependency Graphs - Scheduling System)
7. Section 52 (Source of Truth Definitions - Doctor Availability)
8. Section 53 (Logic Centralization Rules - Slot Generation)

### Critical Sections
- **Section 11:** Scheduling architecture
- **Section 23:** Scheduling business rules
- **Section 25:** Custom calendar rationale
- **Section 37:** Scheduling business rules operational
- **Section 49:** Scheduling critical files
- **Section 51:** Scheduling system dependencies
- **Section 53:** Slot generation logic centralization

### Warning Areas
- **Scheduling:** Critical system, extreme caution required (Section 55)
- **Slot generation:** Core business logic, must be centralized (Section 53)
- **Block subtraction:** Core business logic, must be correct (Section 42)

---

## Prescription Domain

### Recommended Reading Order
1. Section 13 (Prescription Flow)
2. Section 23 (Business Rules)
3. Section 24 (State Transitions)
4. Section 25 (PDF Generation)
5. Section 37 (Business Rules & Domain Constraints - Operational)
6. Section 38 (State Transition Matrices - Operational)
7. Section 49 (Critical Files & Ownership Index - Prescription System)
8. Section 51 (System Dependency Graphs - Prescription System)

### Critical Sections
- **Section 13:** Prescription flow
- **Section 23:** Prescription business rules
- **Section 24:** Prescription state transitions
- **Section 25:** PDF generation
- **Section 37:** Prescription business rules operational
- **Section 38:** Prescription state transition matrices operational
- **Section 49:** Prescription critical files
- **Section 51:** Prescription system dependencies

### Warning Areas
- **Prescriptions:** High-criticality system, high caution required (Section 55)
- **PDF generation:** Medical-critical, must be accurate (Section 49)
- **Medical data:** Legal risk, must be accurate (Section 49)

---

## Payment Domain

### Recommended Reading Order
1. Section 12 (Payment Flow)
2. Section 23 (Business Rules)
3. Section 24 (State Transitions)
4. Section 25 (Razorpay Integration)
5. Section 37 (Business Rules & Domain Constraints - Operational)
6. Section 38 (State Transition Matrices - Operational)
7. Section 49 (Critical Files & Ownership Index - Payment System)
8. Section 51 (System Dependency Graphs - Payment System)
9. Section 53 (Logic Centralization Rules - Payment Verification)

### Critical Sections
- **Section 12:** Payment flow
- **Section 23:** Payment business rules
- **Section 24:** Payment state transitions
- **Section 25:** Razorpay integration
- **Section 37:** Payment business rules operational
- **Section 38:** Payment state transition matrices operational
- **Section 49:** Payment critical files
- **Section 51:** Payment system dependencies
- **Section 53:** Payment verification logic centralization

### Warning Areas
- **Payments:** Critical system, extreme caution required (Section 55)
- **Payment verification:** Security-critical, must be centralized (Section 53)
- **Razorpay integration:** Security-critical, must use Razorpay (Section 45)

---

## Doctor Onboarding Domain

### Recommended Reading Order
1. Section 17 (Doctor Invite Flow)
2. Section 23 (Business Rules)
3. Section 24 (State Transitions)
4. Section 28 (Security Architecture & Trust Boundaries)
5. Section 40 (Security Architecture & Trust Boundaries - Operational)
6. Section 49 (Critical Files & Ownership Index - Doctor Invite System)
7. Section 51 (System Dependency Graphs - Doctor Invite System)

### Critical Sections
- **Section 17:** Doctor invite flow
- **Section 23:** Onboarding business rules
- **Section 24:** Onboarding state transitions
- **Section 28:** Security architecture
- **Section 40:** Trust boundaries operational
- **Section 49:** Doctor invite critical files
- **Section 51:** Doctor invite system dependencies

### Warning Areas
- **Doctor onboarding:** High-criticality system, high caution required (Section 55)
- **Invite validation:** Security-critical, must be correct (Section 49)
- **Admin SDK usage:** Security-critical, must use Admin SDK (Section 40)

---

## Support Domain

### Recommended Reading Order
1. Section 16 (Support Flow)
2. Section 23 (Business Rules)
3. Section 24 (State Transitions)
4. Section 37 (Business Rules & Domain Constraints - Operational)
5. Section 38 (State Transition Matrices - Operational)
6. Section 49 (Critical Files & Ownership Index - Support System)
7. Section 51 (System Dependency Graphs - Support System)

### Critical Sections
- **Section 16:** Support flow
- **Section 23:** Support business rules
- **Section 24:** Support state transitions
- **Section 37:** Support business rules operational
- **Section 38:** Support state transition matrices operational
- **Section 49:** Support critical files
- **Section 51:** Support system dependencies

### Warning Areas
- **Support:** Medium-criticality system, moderate caution required (Section 55)
- **State transitions:** Core business logic, must be valid (Section 38)

---

## Firestore Domain

### Recommended Reading Order
1. Section 6 (Firestore Collections)
2. Section 27 (Firestore Design Philosophy)
3. Section 28 (Firestore Security Rules)
4. Section 29 (Firestore Indexes)
5. Section 39 (Firestore Design Philosophy - Operational)
6. Section 40 (Security Architecture & Trust Boundaries - Operational)
7. Section 49 (Critical Files & Ownership Index - Firestore System)
8. Section 51 (System Dependency Graphs - Firestore System)
9. Section 52 (Source of Truth Definitions - Firestore State)

### Critical Sections
- **Section 6:** Firestore collections
- **Section 27:** Firestore design philosophy
- **Section 28:** Firestore security rules
- **Section 29:** Firestore indexes
- **Section 39:** Firestore design philosophy operational
- **Section 40:** Trust boundaries operational
- **Section 49:** Firestore critical files
- **Section 51:** Firestore system dependencies
- **Section 52:** Source of truth definitions

### Warning Areas
- **Firestore:** Critical system, extreme caution required (Section 55)
- **Firestore rules:** Security-critical, must be correct (Section 49)
- **Firestore indexes:** Performance-critical, must be correct (Section 49)

---

## UI Domain

### Recommended Reading Order
1. Section 31 (UI Pattern Library)
2. Section 34 (Product Identity)
3. Section 43 (UI Pattern Library - Operational)
4. Section 46 (Project Philosophy & Product Identity - Operational)
5. Section 50 (Refactor Safety Matrix - UI Refactors)

### Critical Sections
- **Section 31:** UI pattern library
- **Section 34:** Product identity
- **Section 43:** UI pattern library operational
- **Section 46:** Product identity operational
- **Section 50:** Refactor safety matrix for UI

### Warning Areas
- **UI components:** Low-criticality system, low caution required (Section 55)
- **Product identity:** Critical for brand consistency (Section 46)
- **Color palette:** Dangerous to modify, requires approval (Section 50)

---

## Cross-Domain Navigation

### Finding Critical Files
- **Section 49:** Critical Files & Ownership Index - All systems

### Understanding Dependencies
- **Section 51:** System Dependency Graphs - All systems

### Understanding Source of Truth
- **Section 52:** Source of Truth Definitions - All concerns

### Understanding Logic Centralization
- **Section 53:** Logic Centralization Rules - All logic types

### Understanding Refactor Safety
- **Section 50:** Refactor Safety Matrix - All areas

### Understanding Criticality
- **Section 55:** Operational Criticality Matrix - All systems

### Understanding Failure Impact
- **Section 56:** Failure Impact Analysis - All systems

### Understanding Architectural Stability
- **Section 57:** Architectural Stability Guarantees - All assumptions

### Understanding Legacy Systems
- **Section 54:** Legacy Systems & Migration Guidance - All legacy systems

---

## Navigation Checklist

### Before Modifying Any System
- [ ] Read recommended sections for domain
- [ ] Identify system criticality (Section 55)
- [ ] Identify critical files (Section 49)
- [ ] Understand system dependencies (Section 51)
- [ ] Understand source of truth (Section 52)
- [ ] Understand logic centralization rules (Section 53)
- [ ] Understand refactor safety (Section 50)
- [ ] Understand failure impact (Section 56)
- [ ] Check for legacy systems (Section 54)
- [ ] Verify architectural stability (Section 57)

### AI-Agent Safety Constraints
- **MUST** read recommended sections before modifying
- **MUST** identify system criticality before modifying
- **MUST** identify critical files before modifying
- **MUST** understand system dependencies before modifying
- **MUST** understand source of truth before modifying
- **MUST** understand logic centralization rules before modifying
- **MUST** understand refactor safety before modifying
- **MUST** understand failure impact before modifying

<!-- APPEND_HERE -->

<!-- SECTION:59 -->
# 59. DOCUMENTATION EVOLUTION POLICY

This section defines when this architecture document MUST be updated. It provides mandatory update triggers, update checklists, and governance for ensuring documentation stays accurate and up-to-date. This prevents documentation drift and ensures long-term maintainability.

---

## Mandatory Update Triggers

### Firestore Schema Changes
**Trigger:** Adding, modifying, or removing Firestore collections or fields
**Required Updates:**
- Update Section 6 (Firestore Collections)
- Update Section 27 (Firestore Design Philosophy)
- Update Section 39 (Firestore Design Philosophy - Operational)
- Update Section 49 (Critical Files & Ownership Index) if affected
- Update Section 51 (System Dependency Graphs) if dependencies change
- Update Section 52 (Source of Truth Definitions) if source of truth changes

### Route Changes
**Trigger:** Adding, modifying, or removing application routes
**Required Updates:**
- Update Section 8 (Route Map)
- Update Section 21 (Feature → File Responsibility Map)
- Update Section 36 (Feature → File Ownership Matrix - Operational)
- Update Section 49 (Critical Files & Ownership Index) if critical files change

### Business Rule Changes
**Trigger:** Adding, modifying, or removing business rules
**Required Updates:**
- Update Section 23 (Business Rules)
- Update Section 37 (Business Rules & Domain Constraints - Operational)
- Update Section 24 (State Transitions) if state transitions change
- Update Section 38 (State Transition Matrices - Operational) if state transitions change

### State Transition Changes
**Trigger:** Adding, modifying, or removing state transitions
**Required Updates:**
- Update Section 24 (State Transitions)
- Update Section 38 (State Transition Matrices - Operational)
- Update Section 23 (Business Rules) if business rules change
- Update Section 37 (Business Rules & Domain Constraints - Operational) if business rules change

### Dependency Changes
**Trigger:** Adding or removing dependencies
**Required Updates:**
- Update Section 33 (Absolute Architectural Do-Not Rules) if forbidden dependencies change
- Update Section 45 (Absolute Architectural Do-Not Rules - Operational) if forbidden dependencies change
- Update Section 54 (Legacy Systems & Migration Guidance) if dependencies are phased out

### Architectural Changes
**Trigger:** Changing architectural assumptions or patterns
**Required Updates:**
- Update relevant sections based on change type
- Update Section 57 (Architectural Stability Guarantees) if assumptions change
- Update Section 35 (Documentation Maintenance)
- Update Section 47 (Documentation Maintenance Governance - Operational)

### Role Logic Changes
**Trigger:** Adding, modifying, or removing role logic
**Required Updates:**
- Update Section 4 (Role-Based Access Control)
- Update Section 28 (Security Architecture & Trust Boundaries)
- Update Section 40 (Security Architecture & Trust Boundaries - Operational)

### Scheduling Logic Changes
**Trigger:** Adding, modifying, or removing scheduling logic
**Required Updates:**
- Update Section 11 (Scheduling Architecture)
- Update Section 23 (Business Rules)
- Update Section 37 (Business Rules & Domain Constraints - Operational)
- Update Section 53 (Logic Centralization Rules) if logic centralization changes

### UI Pattern Changes
**Trigger:** Adding, modifying, or removing UI patterns
**Required Updates:**
- Update Section 31 (UI Pattern Library)
- Update Section 43 (UI Pattern Library - Operational)
- Update Section 46 (Project Philosophy & Product Identity - Operational) if product identity changes

### Product Identity Changes
**Trigger:** Changing product identity or philosophy
**Required Updates:**
- Update Section 34 (Product Identity)
- Update Section 46 (Project Philosophy & Product Identity - Operational)
- Update Section 57 (Architectural Stability Guarantees) if assumptions change

---

## Mandatory Update Checklist

### Before Submitting Architecture Changes
- [ ] Identified all affected sections
- [ ] Read current content of affected sections
- [ ] Drafted update preserving existing content
- [ ] Added new content with rationale
- [ ] Added cross-references to related sections
- [ ] Updated Firestore collection schemas if applicable
- [ ] Updated affected routes if applicable
- [ ] Updated business rules if applicable
- [ ] Updated state transitions if applicable
- [ ] Updated dependency maps if applicable
- [ ] Updated AI-agent guidance if applicable
- [ ] Updated criticality analysis if applicable
- [ ] Updated cross-reference map if applicable
- [ ] Verified no existing content is removed or rewritten
- [ ] Verified cross-references are correct
- [ ] Verified AI-agent safety constraints are included
- [ ] Got required approval if needed

### After Updating Documentation
- [ ] Committed with descriptive message
- [ ] Notified team if change is significant
- [ ] Updated table of contents if needed
- [ ] Verified document is consistent

---

## Update Approval Matrix

| Change Type | Approval Required | Review Required |
|---|---|---|
| Typo fix | Self-approve | No |
| Minor clarification | Self-approve | No |
| Section update (minor) | Self-approve | No |
| Section update (medium) | Team lead | Yes |
| Section update (major) | Team consensus | Yes |
| New section | Team consensus | Yes |
| Architectural change | Executive approval | Yes |
| Business rule change | Product team | Yes |
| Product identity change | Executive approval | Yes |

---

## Update Process

### Step 1: Identify Change Type
- Determine what type of change is being made
- Identify which sections are affected
- Refer to Mandatory Update Triggers

### Step 2: Read Current Content
- Read current content of affected sections
- Understand existing context
- Preserve existing content

### Step 3: Draft Update
- Draft update preserving existing content
- Add new content with rationale
- Add cross-references to related sections
- Include AI-agent safety constraints

### Step 4: Review Update
- Review for accuracy and completeness
- Review for consistency with existing content
- Verify cross-references are correct
- Verify AI-agent safety constraints are included

### Step 5: Get Approval
- Get required approval based on change type
- Get required review based on change type
- Refer to Update Approval Matrix

### Step 6: Implement Update
- Apply update to document
- Commit with descriptive message
- Notify team if change is significant

### Step 7: Verify Update
- Verify document is consistent
- Verify cross-references are correct
- Verify table of contents is updated if needed

---

## Anti-Drift Constraints

### Documentation Updates
- **MUST** update documentation when architecture changes
- **MUST** update documentation when business rules change
- **MUST** update documentation when collections change
- **MUST** update documentation when dependencies change
- **MUST** preserve existing content
- **MUST** not remove or rewrite existing sections
- **MUST** add cross-references to related sections
- **MUST** include AI-agent safety constraints

### Update Process
- **MUST** follow Mandatory Update Checklist
- **MUST** get required approval
- **MUST** commit with descriptive message
- **MUST** verify document consistency

### AI-Agent Safety Constraints
- **MUST** update documentation when architecture changes
- **MUST** update documentation when business rules change
- **MUST** update documentation when collections change
- **MUST** update documentation when dependencies change
- **MUST** preserve existing content
- **MUST** not remove or rewrite existing sections
- **MUST** add cross-references to related sections
- **MUST** include AI-agent safety constraints
- **MUST** follow Mandatory Update Checklist
- **MUST** get required approval

---

## End of Operational Intelligence Layer

This concludes the operational intelligence layer of the Eye Aura Master Architecture Document. Sections 48-59 provide:

- **Section 48:** Cross-Reference Architecture Map - Navigational map linking related systems
- **Section 49:** Critical Files & Ownership Index - Critical files and blast radius
- **Section 50:** Refactor Safety Matrix - Safety levels for different refactors
- **Section 51:** System Dependency Graphs - Upstream and downstream dependencies
- **Section 52:** Source of Truth Definitions - Single canonical owners for all state
- **Section 53:** Logic Centralization Rules - Logic that must exist in one location
- **Section 54:** Legacy Systems & Migration Guidance - Deprecated systems and migration status
- **Section 55:** Operational Criticality Matrix - Criticality levels for all systems
- **Section 56:** Failure Impact Analysis - Blast radius of failures
- **Section 57:** Architectural Stability Guarantees - Long-term architectural assumptions
- **Section 58:** AI Agent Fast Navigation Guide - Fast navigation for AI agents
- **Section 59:** Documentation Evolution Policy - When documentation must be updated

These sections transform this document from excellent architecture documentation into elite long-term engineering memory and AI-agent operating system. Future AI agents and engineers can:

- Instantly navigate the architecture
- Safely modify systems
- Understand impact radius
- Avoid architectural drift
- Preserve business integrity
- Preserve UX consistency
- Maintain long-term scalability

WITHOUT needing the original creator.

<!-- END_OF_OPERATIONAL_INTELLIGENCE_LAYER -->


































