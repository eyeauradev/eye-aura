/**
 * Property 1: Bug Condition — Session Cookie Never Set After Sign-In
 *
 * This test encodes the EXPECTED (correct) behavior. It is designed to FAIL
 * on unfixed code, confirming the bug exists. After the fix is applied, this
 * same test should PASS.
 *
 * Bug Condition from design:
 *   isBugCondition(input) where input.firebaseUser != null AND NOT cookies.has("__session")
 *
 * Expected Behavior:
 *   After sign-in, cookies.has("__session") == true AND cookies.get("__session").value == validFirebaseIdToken
 *   Patient profile page renders a sign-out button
 *   Doctor profile page renders a sign-out button
 *   NavBar does NOT show "Sign In" for authenticated users
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { render, screen } from "@testing-library/react";
import React from "react";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── Mock Firebase Auth ─────────────────────────────────────────────────────

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: {
      uid: "test-user-uid",
      email: "test@example.com",
      displayName: "Test User",
      emailVerified: true,
      photoURL: null,
      phoneNumber: null,
      getIdToken: () => Promise.resolve("mock-firebase-id-token-abc123"),
    },
  }),
  signInWithPopup: vi.fn().mockResolvedValue({
    user: {
      uid: "test-user-uid",
      email: "test@example.com",
      displayName: "Test User",
      emailVerified: true,
      photoURL: null,
      phoneNumber: null,
      getIdToken: () => Promise.resolve("mock-firebase-id-token-abc123"),
    },
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn((_auth: any, _callback: any) => () => {}),
  getAuth: vi.fn(() => ({
    currentUser: {
      uid: "test-user-uid",
      email: "test@example.com",
      displayName: "Test User",
      emailVerified: true,
      getIdToken: () => Promise.resolve("mock-firebase-id-token-abc123"),
    },
  })),
  GoogleAuthProvider: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  sendEmailVerification: vi.fn(),
  reload: vi.fn(),
  signInWithRedirect: vi.fn(),
}));

vi.mock("@/services/firebase/client", () => ({
  getFirebaseAuth: vi.fn(() => ({
    currentUser: {
      uid: "test-user-uid",
      email: "test@example.com",
      displayName: "Test User",
      emailVerified: true,
      photoURL: null,
      phoneNumber: null,
      getIdToken: () => Promise.resolve("mock-firebase-id-token-abc123"),
    },
  })),
  getFirebaseDb: vi.fn(() => ({})),
  googleAuthProvider: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: any, _collection: string, _id: string) => ({
    _path: `${_collection}/${_id}`,
  })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      role: "patient",
      displayName: "Test User",
      isActive: true,
      isSuspended: false,
      onboarding: { patientCompleted: true, doctorCompleted: false },
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    }),
  }),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(),
}));

// Mock next modules
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/patient/profile"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) =>
    React.createElement("img", { src, alt, ...props }),
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => ({ children, ...props }: any) =>
      React.createElement(prop as string, props, children),
  }),
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe("Property 1: Bug Condition — Session Cookie Never Set After Sign-In", () => {
  let fetchCalls: Array<{ url: string; method: string; body?: any }> = [];
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: any, options?: any) => {
      fetchCalls.push({
        url: typeof url === "string" ? url : url.toString(),
        method: options?.method || "GET",
        body: options?.body ? JSON.parse(options.body) : undefined,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("property: after signInWithEmail succeeds, __session cookie should be set via session API call", async () => {
    const { authService } = await import("@/services/auth/auth.service");

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 30 }),
        }),
        async (credentials) => {
          fetchCalls = [];

          try {
            await authService.signInWithEmail(credentials);
          } catch {
            // Ignore errors from mocked Firestore reads — we care about cookie behavior
          }

          // Bug Condition Check: After sign-in, the service SHOULD call the session API
          // to set the __session cookie. On unfixed code, this call never happens.
          const sessionApiCall = fetchCalls.find(
            (call) =>
              call.url.includes("/api/auth/session") && call.method === "POST"
          );

          // Expected behavior: A POST to /api/auth/session should occur with idToken
          expect(sessionApiCall).toBeDefined();
          expect(sessionApiCall!.body).toHaveProperty("idToken");
        }
      ),
      { numRuns: 10 }
    );
  });

  test("property: after signInWithGoogle succeeds, __session cookie should be set via session API call", async () => {
    const { authService } = await import("@/services/auth/auth.service");

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          fetchCalls = [];

          try {
            await authService.signInWithGoogle();
          } catch {
            // Ignore errors from mocked Firestore reads
          }

          // Bug Condition Check: After Google sign-in, the service SHOULD call the session API
          const sessionApiCall = fetchCalls.find(
            (call) =>
              call.url.includes("/api/auth/session") && call.method === "POST"
          );

          // Expected behavior: A POST to /api/auth/session should occur with idToken
          expect(sessionApiCall).toBeDefined();
          expect(sessionApiCall!.body).toHaveProperty("idToken");
        }
      ),
      { numRuns: 10 }
    );
  });

  test("property: patient profile page source contains sign-out functionality", async () => {
    // Source code analysis approach: Read the patient profile page source
    // and assert it contains sign-out button rendering.
    // This avoids complex component rendering that causes OOM.
    const patientProfilePath = path.resolve(
      __dirname,
      "../../app/patient/profile/page.tsx"
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constant("patient"),
        async () => {
          const source = fs.readFileSync(patientProfilePath, "utf-8");

          // Bug Condition Check: Patient profile page SHOULD contain sign-out functionality
          // On unfixed code, the page has no sign-out button despite handleSignOut existing in layout
          const hasSignOutText =
            source.includes("Sign Out") || source.includes("sign-out") || source.includes("signOut");
          const hasLogOutIcon =
            source.includes("LogOut") || source.includes("log-out");
          const hasSignOutButton =
            hasSignOutText && (source.includes("<button") || source.includes("Button") || source.includes("PremiumButton"));

          // Expected behavior: Patient profile page source should render a sign-out action
          expect(hasSignOutButton || hasLogOutIcon).toBe(true);
        }
      ),
      { numRuns: 3 }
    );
  });

  test("property: doctor profile page source contains sign-out functionality", async () => {
    // Source code analysis: Read doctor profile page and check for sign-out rendering
    const doctorProfilePath = path.resolve(
      __dirname,
      "../../app/doctor/profile/page.tsx"
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constant("doctor"),
        async () => {
          const source = fs.readFileSync(doctorProfilePath, "utf-8");

          // Bug Condition Check: Doctor profile page SHOULD contain sign-out functionality
          // On unfixed code, sign-out is in the layout header, NOT in the profile page
          const hasSignOutText =
            source.includes("Sign Out") || source.includes("sign-out") || source.includes("signOut");
          const hasLogOutIcon =
            source.includes("LogOut") || source.includes("log-out");
          const hasSignOutButton =
            hasSignOutText && (source.includes("<button") || source.includes("Button") || source.includes("PremiumButton"));

          // Expected behavior: Doctor profile page source should render a sign-out action
          expect(hasSignOutButton || hasLogOutIcon).toBe(true);
        }
      ),
      { numRuns: 3 }
    );
  });

  test("property: NavBar handles loading state to prevent authenticated user flash", async () => {
    // The NavBar component currently only accepts `user` prop.
    // Bug Condition (Requirement 1.6): During initial load, auth context is loading (user is null),
    // so NavBar shows "Sign In" even for authenticated users. The fix should accept
    // a `loading` prop and show a skeleton/placeholder during loading.
    // On unfixed code, NavBar does NOT accept a `loading` prop at all.
    const { NavBar } = await import("@/modules/home/sections/NavBar");

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("patient", "doctor"),
        async (role) => {
          // Simulate loading state: user is null while auth resolves
          // With the fix, NavBar should accept loading prop and show skeleton
          const { container } = render(
            React.createElement(NavBar, { user: null, loading: true } as any)
          );

          // Bug Condition Check: When loading=true is passed, the NavBar should NOT
          // show "Sign In" (it should show a skeleton/loading state instead).
          // On unfixed code, NavBar ignores the loading prop and shows "Sign In"
          // because it only checks if user is null.
          const signInLinks = container.querySelectorAll('a[href="/auth/login"]');
          const hasSignInVisible = Array.from(signInLinks).some(
            (link) => link.textContent?.includes("Sign In")
          );

          // Expected behavior: No "Sign In" should appear during loading state
          expect(hasSignInVisible).toBe(false);
        }
      ),
      { numRuns: 5 }
    );
  });
});
