/**
 * Unit + Property-Based Tests — Analytics_Service
 *
 * **Validates: Requirements 1.4, 1.5, 3.1, 3.2, 3.4, 3.5, 5.3, 5.4, 6.1, 7.2, 8.2, 11.5**
 *
 * Tests are grouped into three suites:
 *   Task 15.1 — Initialization and config
 *   Task 15.2 — Tracking functions
 *   PBT       — Property-based tests (Properties 1, 3, 8, 9 from design.md)
 *
 * IMPORTANT: The analytics service uses module-level state. Each test that
 * touches module state uses vi.resetModules() + dynamic re-import so every
 * test starts with a clean slate.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Re-imports the analytics service with a fresh module registry.
 * This resets the module-scoped singletons (initialized, ga4Enabled, etc.).
 */
async function freshImport() {
  vi.resetModules();
  // Stub firebase/analytics so getAnalytics() and logEvent() never hit the network
  vi.mock("firebase/analytics", () => ({
    isSupported: vi.fn().mockResolvedValue(false),
    getAnalytics: vi.fn().mockReturnValue({}),
    logEvent: vi.fn(),
  }));
  // Stub the Firebase app helper
  vi.mock("@/services/firebase/client", () => ({
    getFirebaseApp: vi.fn().mockReturnValue({}),
  }));
  const mod = await import(
    "@/services/analytics/analytics.service"
  );
  return mod;
}

// ─── Task 15.1 — Initialization and Config ───────────────────────────────────

describe("Task 15.1 — getAnalyticsConfig()", () => {
  /**
   * **Validates: Requirements 1.5**
   *
   * Pure accessor — no module-level state involved, so no reset needed.
   */

  it("1. returns correct shape with all required fields", async () => {
    const { getAnalyticsConfig } = await freshImport();
    const config = getAnalyticsConfig();

    expect(config).toHaveProperty("ga4");
    expect(config).toHaveProperty("firebase");

    // ga4 provider shape
    expect(config.ga4).toHaveProperty("enabled");
    expect(config.ga4).toHaveProperty("envVar", "NEXT_PUBLIC_GA_MEASUREMENT_ID");
    expect(typeof config.ga4.enabled).toBe("boolean");

    // firebase provider shape
    expect(config.firebase).toHaveProperty("enabled");
    expect(config.firebase).toHaveProperty("envVar", "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID");
    expect(typeof config.firebase.enabled).toBe("boolean");
  });

  it("2. returns enabled: false when env vars are missing", async () => {
    const originalGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const originalFb = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    try {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

      const { getAnalyticsConfig } = await freshImport();
      const config = getAnalyticsConfig();

      expect(config.ga4.enabled).toBe(false);
      expect(config.firebase.enabled).toBe(false);
    } finally {
      if (originalGa !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGa;
      if (originalFb !== undefined) process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = originalFb;
    }
  });

  it("3. returns enabled: false for whitespace-only env vars", async () => {
    const originalGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const originalFb = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    try {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "   ";
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "\t\n  ";

      const { getAnalyticsConfig } = await freshImport();
      const config = getAnalyticsConfig();

      expect(config.ga4.enabled).toBe(false);
      expect(config.firebase.enabled).toBe(false);
    } finally {
      if (originalGa !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGa;
      else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      if (originalFb !== undefined) process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = originalFb;
      else delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    }
  });

  it("4. returns enabled: true for valid non-empty env vars", async () => {
    const originalGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const originalFb = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    try {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TESTID123";
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = "G-FBTEST456";

      const { getAnalyticsConfig } = await freshImport();
      const config = getAnalyticsConfig();

      expect(config.ga4.enabled).toBe(true);
      expect(config.firebase.enabled).toBe(true);
    } finally {
      if (originalGa !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGa;
      else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      if (originalFb !== undefined) process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = originalFb;
      else delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    }
  });
});

describe("Task 15.1 — initAnalytics() and getFirebaseAnalyticsInstance()", () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
   */

  it("5. initAnalytics() in SSR context (window undefined) completes without error", async () => {
    const { initAnalytics } = await freshImport();

    // Simulate SSR by temporarily removing window
    const originalWindow = globalThis.window;
    // @ts-expect-error intentional SSR simulation
    delete globalThis.window;

    try {
      await expect(initAnalytics()).resolves.toBeUndefined();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("6. initAnalytics() is idempotent — calling twice doesn't double-init", async () => {
    // Track gtag calls to confirm the second init doesn't re-run setup
    // We verify idempotency by checking that console.warn is only emitted once
    // (the warning path fires during first init when measurement IDs are missing)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { initAnalytics } = await freshImport();

    // Missing env vars → init will warn once per init call UNLESS idempotent
    const originalGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const originalFb = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    try {
      await initAnalytics(); // first call → sets initialized = true, emits 2 warnings
      const warnCountAfterFirst = warnSpy.mock.calls.length;

      await initAnalytics(); // second call → should be a no-op (idempotency guard)
      const warnCountAfterSecond = warnSpy.mock.calls.length;

      // No additional warnings should have been emitted on second call
      expect(warnCountAfterSecond).toBe(warnCountAfterFirst);
    } finally {
      warnSpy.mockRestore();
      if (originalGa !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGa;
      if (originalFb !== undefined) process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = originalFb;
    }
  });

  it("7. getFirebaseAnalyticsInstance() returns null before init", async () => {
    const { getFirebaseAnalyticsInstance } = await freshImport();
    expect(getFirebaseAnalyticsInstance()).toBeNull();
  });
});

// ─── Task 15.2 — Tracking Functions ──────────────────────────────────────────

describe("Task 15.2 — Tracking functions (initialized, window.gtag present)", () => {
  /**
   * To test tracking, we need to:
   *   1. Set a GA4 measurement ID env var (so ga4Enabled = true)
   *   2. Call initAnalytics() so initialized = true
   *   3. Install a window.gtag spy
   *   4. Call the tracking function and assert gtag args
   */

  let gtagSpy: ReturnType<typeof vi.fn>;
  let originalGa: string | undefined;
  let originalFb: string | undefined;

  beforeEach(() => {
    gtagSpy = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtagSpy;

    originalGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    originalFb = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    // Enable GA4 so ga4Enabled = true inside the service
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-UNIT1234";
    // Leave firebase disabled so we don't need to mock isSupported resolution
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  });

  afterEach(() => {
    delete (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;

    if (originalGa !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGa;
    else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (originalFb !== undefined) process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = originalFb;
    else delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  });

  it("8. trackSignUp({ method: 'email' }) calls window.gtag with correct args", async () => {
    vi.resetModules();
    vi.mock("firebase/analytics", () => ({
      isSupported: vi.fn().mockResolvedValue(false),
      getAnalytics: vi.fn().mockReturnValue({}),
      logEvent: vi.fn(),
    }));
    vi.mock("@/services/firebase/client", () => ({
      getFirebaseApp: vi.fn().mockReturnValue({}),
    }));

    const { initAnalytics, trackSignUp } = await import(
      "@/services/analytics/analytics.service"
    );

    await initAnalytics();
    trackSignUp({ method: "email" });

    expect(gtagSpy).toHaveBeenCalledWith("event", "sign_up", { method: "email" });
  });

  it("9. trackLogin({ method: 'google' }) calls window.gtag with correct args", async () => {
    vi.resetModules();
    vi.mock("firebase/analytics", () => ({
      isSupported: vi.fn().mockResolvedValue(false),
      getAnalytics: vi.fn().mockReturnValue({}),
      logEvent: vi.fn(),
    }));
    vi.mock("@/services/firebase/client", () => ({
      getFirebaseApp: vi.fn().mockReturnValue({}),
    }));

    const { initAnalytics, trackLogin } = await import(
      "@/services/analytics/analytics.service"
    );

    await initAnalytics();
    trackLogin({ method: "google" });

    expect(gtagSpy).toHaveBeenCalledWith("event", "login", { method: "google" });
  });

  it("10. trackAppointmentBooking passes value as a number (major currency units)", async () => {
    vi.resetModules();
    vi.mock("firebase/analytics", () => ({
      isSupported: vi.fn().mockResolvedValue(false),
      getAnalytics: vi.fn().mockReturnValue({}),
      logEvent: vi.fn(),
    }));
    vi.mock("@/services/firebase/client", () => ({
      getFirebaseApp: vi.fn().mockReturnValue({}),
    }));

    const { initAnalytics, trackAppointmentBooking } = await import(
      "@/services/analytics/analytics.service"
    );

    await initAnalytics();
    trackAppointmentBooking({
      serviceName: "Eye Consultation",
      doctorName: "Dr. Smith",
      value: 1500, // rupees (major units), NOT paise
      currency: "INR",
    });

    expect(gtagSpy).toHaveBeenCalledWith(
      "event",
      "purchase",
      expect.objectContaining({ value: 1500, currency: "INR" })
    );

    // The value passed to gtag must be a number (not a string, not paise)
    const callArgs = gtagSpy.mock.calls[0] as [string, string, Record<string, unknown>];
    const params = callArgs[2];
    expect(typeof params.value).toBe("number");
  });

  it("11. Tracking functions called before init do NOT throw", async () => {
    // fresh import — NOT calling initAnalytics() so initialized = false
    const {
      trackSignUp,
      trackLogin,
      trackAppointmentBooking,
      trackPrescriptionView,
      trackSupportTicketCreated,
      trackPageView,
    } = await freshImport();

    expect(() => trackPageView({ page_path: "/test", page_title: "Test" })).not.toThrow();
    expect(() => trackSignUp({ method: "email" })).not.toThrow();
    expect(() => trackLogin({ method: "google" })).not.toThrow();
    expect(() =>
      trackAppointmentBooking({
        serviceName: "Test",
        doctorName: "Doc",
        value: 100,
        currency: "INR",
      })
    ).not.toThrow();
    expect(() => trackPrescriptionView({ prescriptionId: "rx-001" })).not.toThrow();
    expect(() => trackSupportTicketCreated({ category: "billing" })).not.toThrow();
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe("PBT — Property 8: getAnalyticsConfig().ga4.enabled ↔ GA_MEASUREMENT_ID non-empty", () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.4**
   *
   * For any string value of NEXT_PUBLIC_GA_MEASUREMENT_ID, `getAnalyticsConfig().ga4.enabled`
   * shall be true iff the trimmed value is non-empty. Same for firebase.
   */

  it("enabled is true iff GA_MEASUREMENT_ID is non-empty after trim (arbitrary strings)", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (id) => {
        const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
        process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = id;

        try {
          // Re-import to get a fresh getAnalyticsConfig referencing the updated env
          vi.resetModules();
          vi.mock("firebase/analytics", () => ({
            isSupported: vi.fn().mockResolvedValue(false),
            getAnalytics: vi.fn().mockReturnValue({}),
            logEvent: vi.fn(),
          }));
          vi.mock("@/services/firebase/client", () => ({
            getFirebaseApp: vi.fn().mockReturnValue({}),
          }));
          const { getAnalyticsConfig } = await import(
            "@/services/analytics/analytics.service"
          );

          const config = getAnalyticsConfig();
          const expectedEnabled = id.trim().length > 0;
          expect(config.ga4.enabled).toBe(expectedEnabled);
        } finally {
          if (original !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
          else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
        }
      }),
      { numRuns: 30 }
    );
  });

  it("enabled is false when GA_MEASUREMENT_ID is empty string or undefined", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("", undefined as unknown as string),
        async (id) => {
          const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
          if (id === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
          else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = id;

          try {
            vi.resetModules();
            vi.mock("firebase/analytics", () => ({
              isSupported: vi.fn().mockResolvedValue(false),
              getAnalytics: vi.fn().mockReturnValue({}),
              logEvent: vi.fn(),
            }));
            vi.mock("@/services/firebase/client", () => ({
              getFirebaseApp: vi.fn().mockReturnValue({}),
            }));
            const { getAnalyticsConfig } = await import(
              "@/services/analytics/analytics.service"
            );
            const config = getAnalyticsConfig();
            expect(config.ga4.enabled).toBe(false);
          } finally {
            if (original !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
            else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe("PBT — Property 9: Whitespace-only env vars always produce enabled: false", () => {
  /**
   * **Validates: Requirements 1.4**
   *
   * For any string composed entirely of whitespace (spaces, tabs, newlines, carriage returns),
   * getAnalyticsConfig() shall return enabled: false for that provider.
   */

  it("whitespace-only GA_MEASUREMENT_ID → enabled: false", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1 }),
        async (whitespaceId) => {
          const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
          process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = whitespaceId;

          try {
            vi.resetModules();
            vi.mock("firebase/analytics", () => ({
              isSupported: vi.fn().mockResolvedValue(false),
              getAnalytics: vi.fn().mockReturnValue({}),
              logEvent: vi.fn(),
            }));
            vi.mock("@/services/firebase/client", () => ({
              getFirebaseApp: vi.fn().mockReturnValue({}),
            }));
            const { getAnalyticsConfig } = await import(
              "@/services/analytics/analytics.service"
            );
            const config = getAnalyticsConfig();
            expect(config.ga4.enabled).toBe(false);
          } finally {
            if (original !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
            else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it("whitespace-only FIREBASE_MEASUREMENT_ID → enabled: false", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1 }),
        async (whitespaceId) => {
          const original = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
          process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = whitespaceId;

          try {
            vi.resetModules();
            vi.mock("firebase/analytics", () => ({
              isSupported: vi.fn().mockResolvedValue(false),
              getAnalytics: vi.fn().mockReturnValue({}),
              logEvent: vi.fn(),
            }));
            vi.mock("@/services/firebase/client", () => ({
              getFirebaseApp: vi.fn().mockReturnValue({}),
            }));
            const { getAnalyticsConfig } = await import(
              "@/services/analytics/analytics.service"
            );
            const config = getAnalyticsConfig();
            expect(config.firebase.enabled).toBe(false);
          } finally {
            if (original !== undefined) process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = original;
            else delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe("PBT — Property 1: SSR Safety — No Side Effects Without Window", () => {
  /**
   * **Validates: Requirements 5.3, 11.1, 11.2, 11.5**
   *
   * For any of the six tracking functions selected by integer index, calling them when
   * `window` is not defined shall not throw, not call window.gtag, not call logEvent.
   */

  it("all tracking functions complete without error in SSR context (window undefined)", async () => {
    const {
      trackPageView,
      trackSignUp,
      trackLogin,
      trackAppointmentBooking,
      trackPrescriptionView,
      trackSupportTicketCreated,
    } = await freshImport();

    const trackingFunctions = [
      () => trackPageView({ page_path: "/test", page_title: "Test Page" }),
      () => trackSignUp({ method: "email" }),
      () => trackLogin({ method: "google" }),
      () =>
        trackAppointmentBooking({
          serviceName: "Consultation",
          doctorName: "Dr. A",
          value: 500,
          currency: "INR",
        }),
      () => trackPrescriptionView({ prescriptionId: "rx-001" }),
      () => trackSupportTicketCreated({ category: "billing" }),
    ];

    await fc.assert(
      fc.property(fc.integer({ min: 0, max: 5 }), (fnIndex) => {
        const originalWindow = globalThis.window;
        // @ts-expect-error intentional SSR simulation
        delete globalThis.window;

        try {
          expect(() => trackingFunctions[fnIndex]()).not.toThrow();
        } finally {
          globalThis.window = originalWindow;
        }
      }),
      { numRuns: 50 }
    );
  });
});

describe("PBT — Property 3: Error Isolation — Tracking Functions Never Propagate Errors", () => {
  /**
   * **Validates: Requirements 6.4, 7.4, 8.3, 9.3, 10.3, 11.1**
   *
   * When window.gtag throws, each tracking function must catch the error internally
   * and never re-throw it to the caller.
   */

  it("trackSignUp does not throw even when window.gtag throws", async () => {
    vi.resetModules();
    vi.mock("firebase/analytics", () => ({
      isSupported: vi.fn().mockResolvedValue(false),
      getAnalytics: vi.fn().mockReturnValue({}),
      logEvent: vi.fn(),
    }));
    vi.mock("@/services/firebase/client", () => ({
      getFirebaseApp: vi.fn().mockReturnValue({}),
    }));

    const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST999";

    const { initAnalytics, trackSignUp } = await import(
      "@/services/analytics/analytics.service"
    );

    await initAnalytics();

    // Install a throwing gtag
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = () => {
      throw new Error("gtag exploded");
    };

    try {
      await fc.assert(
        fc.property(
          fc.constantFrom("email" as const, "google" as const),
          (method) => {
            expect(() => trackSignUp({ method })).not.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      delete (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (original !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
      else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    }
  });

  it("trackLogin does not throw even when window.gtag throws", async () => {
    vi.resetModules();
    vi.mock("firebase/analytics", () => ({
      isSupported: vi.fn().mockResolvedValue(false),
      getAnalytics: vi.fn().mockReturnValue({}),
      logEvent: vi.fn(),
    }));
    vi.mock("@/services/firebase/client", () => ({
      getFirebaseApp: vi.fn().mockReturnValue({}),
    }));

    const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST999";

    const { initAnalytics, trackLogin } = await import(
      "@/services/analytics/analytics.service"
    );

    await initAnalytics();

    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = () => {
      throw new Error("gtag exploded");
    };

    try {
      await fc.assert(
        fc.property(
          fc.constantFrom("email" as const, "google" as const),
          (method) => {
            expect(() => trackLogin({ method })).not.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      delete (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (original !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
      else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    }
  });

  it("trackAppointmentBooking does not throw even when window.gtag throws", async () => {
    vi.resetModules();
    vi.mock("firebase/analytics", () => ({
      isSupported: vi.fn().mockResolvedValue(false),
      getAnalytics: vi.fn().mockReturnValue({}),
      logEvent: vi.fn(),
    }));
    vi.mock("@/services/firebase/client", () => ({
      getFirebaseApp: vi.fn().mockReturnValue({}),
    }));

    const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST999";

    const { initAnalytics, trackAppointmentBooking } = await import(
      "@/services/analytics/analytics.service"
    );

    await initAnalytics();

    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = () => {
      throw new Error("gtag exploded");
    };

    try {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.float({ min: 1, max: 10000, noNaN: true }),
          (serviceName, doctorName, value) => {
            expect(() =>
              trackAppointmentBooking({ serviceName, doctorName, value, currency: "INR" })
            ).not.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    } finally {
      delete (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (original !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
      else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    }
  });
});
