# Eye Aura Deployment Guide

This guide provides comprehensive instructions for deploying the Eye Aura platform to production using GitHub and Vercel.

## Prerequisites

### Required Software

- **Node.js**: >=18.18.0 (required by Next.js 15)
- **npm**: >=9.0.0
- **Git**: >=2.0.0
- **GitHub Account**: syedahad2205@gmail.com
- **Vercel Account**: New dedicated account for this repository

### Required Services

- **Firebase Project**: Authentication and Firestore database
- **Resend Account**: Email service for doctor invites
- **GitHub Repository**: For version control and deployment

---

## Part 1 - GitHub Setup

### 1.1 Create GitHub Repository

1. Log in to GitHub (syedahad2205@gmail.com)
2. Create a new private repository named `eyeaura`
3. Initialize with a README (will be replaced)
4. Do NOT initialize with .gitignore (use the project's .gitignore)

### 1.2 Push Code to GitHub

```bash
cd /Users/syed/NextJs/eyeaura
git init
git add .
git commit -m "Initial commit: Eye Aura platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/eyeaura.git
git push -u origin main
```

### 1.3 Verify Repository Structure

Ensure the following files are present:
- `.gitignore` (includes .vercel, .env.local, node_modules, .next)
- `.env.example` (includes all required environment variables)
- `package.json` (includes engines field with Node.js requirement)
- `firestore.rules` (Firestore security rules)
- `firestore.indexes.json` (Firestore indexes)

---

## Part 2 - Firebase Configuration

### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named `eyeaura`
3. Enable Google Analytics (optional but recommended)

### 2.2 Enable Authentication

1. Navigate to **Authentication** > **Sign-in method**
2. Enable **Email/Password** sign-in
3. Enable **Google** sign-in
4. Configure Google OAuth consent screen:
   - Email: syedahad2205@gmail.com
   - Product name: Eye Aura
   - Homepage URL: `https://your-domain.com` (update after deployment)
   - Authorized redirect URIs: Add your Vercel domain after deployment

### 2.3 Create Firestore Database

1. Navigate to **Firestore Database** > **Create database**
2. Choose location (select closest to your users)
3. Start in **Production mode** (not test mode)
4. Publish the security rules from `firestore.rules` file

### 2.4 Deploy Firestore Security Rules

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Deploy rules
firebase deploy --only firestore:rules
```

### 2.5 Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

### 2.6 Get Firebase Configuration

1. Navigate to **Project Settings** > **General**
2. Scroll to **Your apps** section
3. Click **Web** icon (</>)
4. Register app: `eyeaura-web`
5. Copy the Firebase SDK configuration

### 2.7 Get Service Account Key (for Admin SDK)

1. Navigate to **Project Settings** > **Service accounts**
2. Click **Generate new private key**
3. Select JSON format
4. Save securely (never commit to Git)
5. Extract values from JSON for environment variables

---

## Part 3 - Resend Configuration

### 3.1 Create Resend Account

1. Go to [Resend](https://resend.com/)
2. Sign up for an account
3. Verify email domain (use your own domain for production)

### 3.2 Get API Key

1. Navigate to **API Keys** section
2. Create a new API key
3. Save securely (never commit to Git)

### 3.3 Configure Email Sender

1. Navigate to **Domains** section
2. Add and verify your domain
3. Note the verified sender email (e.g., onboarding@yourdomain.com)

---

## Part 4 - Environment Variables

### 4.1 Local Development

Create `.env.local` in the project root:

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

### 4.2 Vercel Environment Variables

1. Go to Vercel project settings
2. Navigate to **Environment Variables**
3. Add all variables from `.env.example`
4. Select appropriate environments (Production, Preview, Development)

**Important**: For Firebase Admin private key, replace `\n` with actual newlines in the Vercel UI.

---

## Part 5 - Vercel Deployment

### 5.1 Create Vercel Account

1. Go to [Vercel](https://vercel.com/)
2. Sign up with GitHub account (syedahad2205@gmail.com)
3. Create a new account (dedicated for this repository)

### 5.2 Import Project to Vercel

1. Click **Add New** > **Project**
2. Import from GitHub: `eyeaura`
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 5.3 Configure Environment Variables

Add all environment variables from Part 4.2 to Vercel.

### 5.4 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Verify deployment succeeds

### 5.5 Configure Domain (Optional)

1. Navigate to **Domains** in Vercel project
2. Add custom domain (e.g., `eyeaura.com`)
3. Update DNS records as instructed
4. Update Firebase OAuth redirect URIs to include new domain

---

## Part 6 - Post-Deployment Configuration

### 6.1 Update Firebase OAuth Redirect URIs

1. Go to Firebase Console > **Authentication** > **Sign-in method** > **Google**
2. Add your Vercel domain to authorized redirect URIs:
   - `https://your-domain.com`
   - `https://your-domain.com/auth/callback`

### 6.2 Update Resend Domain

1. Go to Resend > **Domains**
2. Add and verify your custom domain
3. Update email sender in code if needed

### 6.3 Test Critical Flows

Test the following flows in production:

1. **Email Signup**: Create a new patient account
2. **Google Sign-in**: Sign in with Google
3. **Firestore User Creation**: Verify `users/{uid}` documents are created
4. **Doctor Invite**: Invite a new doctor via email
5. **Appointment Booking**: Book an appointment as patient
6. **Admin Dashboard**: Access admin panel as admin user

---

## Part 7 - Common Deployment Issues

### Issue 1: Build Fails - Node.js Version

**Error**: `For Next.js, Node.js version "^18.18.0 || ^19.8.0 || >= 20.0.0" is required`

**Solution**:
- Ensure your local Node.js version is >=18.18.0
- Vercel automatically uses Node.js 18.x by default
- If using custom build, specify Node.js version in `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### Issue 2: Firebase Auth Not Working

**Symptoms**: Authentication fails silently

**Solutions**:
1. Verify all Firebase environment variables are set in Vercel
2. Check Firebase Console for authentication errors
3. Verify OAuth redirect URIs match your Vercel domain
4. Check browser console for Firebase errors

### Issue 3: Firestore Rules Blocking Writes

**Symptoms**: User documents not created, data not saving

**Solutions**:
1. Verify Firestore rules are deployed: `firebase deploy --only firestore:rules`
2. Check Firebase Console for rule violations
3. Test rules in Firebase Console simulator
4. Ensure user is authenticated before writing

### Issue 4: Resend Emails Not Sending

**Symptoms**: Doctor invite emails not received

**Solutions**:
1. Verify RESEND_API_KEY is set in Vercel
2. Check Resend dashboard for email logs
3. Verify sender domain is verified
4. Check spam folder

### Issue 5: Environment Variables Not Loading

**Symptoms**: `Firebase environment variables are not configured` error

**Solutions**:
1. Verify variable names match exactly (including NEXT_PUBLIC_ prefix)
2. Restart Vercel deployment after adding variables
3. Check Vercel logs for environment variable access
4. Ensure variables are set for correct environment (Production/Preview)

---

## Part 8 - Build Troubleshooting

### Run Build Locally

```bash
npm run build
```

### Run TypeScript Check

```bash
npm run typecheck
```

### Run Linter

```bash
npm run lint
```

### Fix Common Build Errors

1. **Type Errors**: Run `npm run typecheck` and fix all errors
2. **Import Errors**: Verify all imports use correct paths
3. **Missing Dependencies**: Run `npm install`
4. **Environment Variable Errors**: Verify all required variables are set

---

## Part 9 - Production Checklist

Before going live, verify:

- [ ] All environment variables are set in Vercel
- [ ] Firebase Authentication is configured and working
- [ ] Firestore database is created and rules are deployed
- [ ] Firestore indexes are deployed
- [ ] Resend API key is configured and domain is verified
- [ ] Custom domain is configured (if applicable)
- [ ] OAuth redirect URIs are updated in Firebase
- [ ] Email sender is verified in Resend
- [ ] Build succeeds without errors
- [ ] All critical user flows are tested
- [ ] Admin dashboard is accessible
- [ ] Doctor invite flow is working
- [ ] Patient signup creates Firestore documents
- [ ] Google sign-in creates Firestore documents
- [ ] Middleware is working correctly
- [ ] No console errors in browser
- [ ] No 404 errors on navigation
- [ ] Responsive layouts work on mobile
- [ ] Security audit is complete
- [ ] Firestore rules are production-safe

---

## Part 10 - Maintenance

### Regular Tasks

1. **Monitor Firebase Console**: Check authentication errors and Firestore usage
2. **Monitor Resend Dashboard**: Check email deliverability
3. **Update Dependencies**: Run `npm update` regularly
4. **Review Security Rules**: Ensure Firestore rules remain secure
5. **Backup Data**: Regularly export Firestore data

### Scaling Considerations

1. **Firestore**: Monitor read/write operations and storage usage
2. **Authentication**: Monitor active users and sign-up rate
3. **Email**: Monitor Resend usage and upgrade plan if needed
4. **Vercel**: Monitor build times and upgrade plan if needed

---

## Support

For issues related to:
- **Firebase**: [Firebase Support](https://firebase.google.com/support/)
- **Vercel**: [Vercel Support](https://vercel.com/support)
- **Resend**: [Resend Support](https://resend.com/support)
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)

---

## Summary

The Eye Aura platform is now fully configured for production deployment on Vercel with Firebase and Resend integration. Follow this guide step-by-step to ensure a smooth deployment process.
