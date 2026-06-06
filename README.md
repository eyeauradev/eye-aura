# Eye Aura

Eye Aura is a premium digital eye wellness platform built with Next.js 15, TypeScript, Tailwind CSS, Shadcn-style UI primitives, Framer Motion, Firebase, React Hook Form, Zod, and Lucide Icons.

The platform provides comprehensive eye care services including appointment booking, doctor consultations, prescription management, and patient support through a modern, accessible web interface.

## Tech Stack

- **Framework**: Next.js 15 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn-style reusable UI primitives
- **Animations**: Framer Motion
- **Backend**: Firebase Auth, Firestore
- **Email Service**: Resend
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide Icons

## Project Status

**Completed Phases:**
- Phase 1: Foundation & Setup
- Phase 2: Public Website
- Phase 3: Authentication System
- Phase 4: Patient Module
- Phase 5: Doctor Module
- Phase 6: Booking Module
- Phase 7: Admin Module

The platform is feature-complete and ready for production deployment.

## Prerequisites

- **Node.js**: >=18.18.0 (required by Next.js 15)
- **npm**: >=9.0.0
- **Git**: >=2.0.0

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/eyeaura.git
cd eyeaura
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Add your Firebase and Resend credentials to `.env.local`:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin Configuration
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email@your_project_id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx
```

### 4. Run Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named `eyeaura`
3. Enable Google Analytics (optional)

### 2. Enable Authentication

1. Navigate to **Authentication** > **Sign-in method**
2. Enable **Email/Password** sign-in
3. Enable **Google** sign-in
4. Configure Google OAuth consent screen

### 3. Create Firestore Database

1. Navigate to **Firestore Database** > **Create database**
2. Choose location (select closest to your users)
3. Start in **Production mode**
4. Deploy the security rules from `firestore.rules`

### 4. Deploy Firestore Rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 5. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

### 6. Get Firebase Configuration

1. Navigate to **Project Settings** > **General**
2. Scroll to **Your apps** section
3. Click **Web** icon (</>)
4. Register app: `eyeaura-web`
5. Copy the Firebase SDK configuration

### 7. Get Service Account Key

1. Navigate to **Project Settings** > **Service accounts**
2. Click **Generate new private key**
3. Select JSON format
4. Save securely (never commit to Git)

## Resend Setup

### 1. Create Resend Account

1. Go to [Resend](https://resend.com/)
2. Sign up for an account
3. Verify your email domain

### 2. Get API Key

1. Navigate to **API Keys** section
2. Create a new API key
3. Save securely (never commit to Git)

### 3. Configure Email Sender

1. Navigate to **Domains** section
2. Add and verify your domain
3. Note the verified sender email

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Architecture Overview

### User Roles

- **Patient**: Can book appointments, view prescriptions, submit support tickets
- **Doctor**: Can manage appointments, create prescriptions, manage availability
- **Admin**: Can manage users, services, doctors, view analytics

### Key Collections

- `users/{userId}` - User profiles with roles and onboarding status
- `services/{serviceId}` - Available eye care services
- `appointments/{appointmentId}` - Patient appointments
- `doctor_slots/{slotId}` - Doctor availability slots
- `prescriptions/{prescriptionId}` - Medical prescriptions
- `support_tickets/{ticketId}` - Patient support requests
- `doctor_invites/{inviteId}` - Doctor invitation tokens

### Authentication Flow

1. **Public Signup**: Always creates patient accounts via email or Google
2. **Doctor Onboarding**: Requires valid invite token from admin
3. **Role Assignment**: Patients cannot escalate role; only admins can assign roles
4. **Session Management**: After sign-in, a `__session` HTTP-only cookie is set via `/api/auth/session`. The middleware reads this cookie to protect routes server-side. The cookie is refreshed on each `onAuthStateChanged` event and cleared on sign-out.
5. **Sign-Out**: Available in each module's profile page (Patient: `/patient/profile`, Doctor: `/doctor/profile`). Clears the session cookie and Firebase auth state, then redirects to login.

## Folder Structure

```text
app/                  Next.js App Router routes
  admin/              Admin dashboard and management pages
  auth/               Authentication pages (login, signup)
  booking/            Appointment booking flow
  doctor/             Doctor dashboard and tools
  invite/             Doctor invite acceptance page
  patient/            Patient dashboard and tools
components/           Reusable shared UI components
  ui/                Shadcn-style primitives (Button, Card, Badge)
contexts/            React context providers (Auth)
hooks/                Custom React hooks
lib/                  Utilities and helpers
  timezone/           Timezone conversion utilities
modules/              Feature modules
  home/               Public website content
public/               Static assets (logo, fonts)
services/             External service clients
  auth/               Firebase Authentication service
  booking/            Booking logic service
  email/              Resend email service
  firebase/           Firebase client and admin initialization
  firestore/          Firestore database services
store/                State management
types/                TypeScript type definitions
docs/                 Documentation
  DEPLOYMENT_GUIDE.md  Comprehensive deployment instructions
```

## Deployment

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md).

### Quick Vercel Deployment

1. Push repository to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.example`
4. Deploy

### Vercel Environment Variables

Add all variables from `.env.example` to Vercel project settings.

## Security

### Firestore Security Rules

- Patients can only access their own data
- Doctors can access their patients' data
- Admins have full access
- Role escalation is prevented at the database level

### Authentication

- Public signup always creates patient accounts
- Doctor signup requires valid invite token
- Google sign-in automatically creates Firestore documents
- Email sign-in automatically creates Firestore documents
- Session cookie (`__session`) is set after sign-in via `/api/auth/session` API route
- Middleware validates the `__session` cookie for protected route access
- Sign-out is available in each module's profile/account page
- Sign-out clears the session cookie and Firebase auth state

### Environment Variables

- Never commit `.env.local` to Git
- Use `.env.example` as a template
- All secrets are loaded via `process.env`

## Development Notes

### Console Logging

The application includes debug logging for Firestore user document creation. These logs help diagnose authentication and database issues. In production, these logs can be safely removed or replaced with proper error tracking.

### Firebase Storage

Firebase Storage is not currently used in the application. The `storageBucket` configuration is kept for future use but no upload logic exists.

### Known Issues

- Node.js version must be >=18.18.0 for Next.js 15
- Build fails on older Node.js versions (documented in package.json engines field)
## Support

For deployment issues, see [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md).

For Firebase issues: [Firebase Console](https://console.firebase.google.com/)

For Vercel issues: [Vercel Dashboard](https://vercel.com/dashboard)
