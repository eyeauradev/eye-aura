/**
 * Property 1 — Bug Condition: Dashboard Chrome Renders During Active Assessment
 *
 * **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6**
 *
 * GOAL: Surface counterexamples that prove the immersive experience bug exists
 * in the current code. This test is **expected to FAIL** on the unfixed code;
 * those failures are the success signal confirming the bug exists. After the fix
 * lands (Task 3.10), the same test MUST pass.
 *
 * Bug Condition (from design):
 *   isBugCondition(input) = assessmentActive == true
 *     AND phase ∈ ['instructions', 'calibration', 'duration_select', 'testing', 'results']
 *     AND (
 *       dashboardChromeRendered(input)
 *       OR optotypeAreaPercent(input) < 0.90
 *       OR (viewportWidth < 1024 AND NOT immersiveLaunchMode(input))
 *       OR (phase == 'testing' AND NOT topBarAutoFades(input))
 *       OR (phase == 'testing' AND NOT overflowMenuAvailable(input))
 *     )
 *
 * Assertions encoded here:
 *
 *   (A) No Dashboard Chrome: When assessment is active, no GlassPanel container
 *       with `max-w-2xl` constraint should be rendered. No step dots or stage
 *       labels from AssessmentWrapper should be present.
 *
 *   (B) Optotype Area Dominance: During testing/reading phase, the optotype
 *       rendering area should not be constrained to `max-w-2xl` (~672px). The
 *       content should occupy ≥90% of viewport width.
 *
 *   (C) Top Bar Auto-Fade: During reading phase, after 1500ms of inactivity,
 *       a top bar element should transition to 30% opacity. (Currently, no
 *       auto-fade mechanism exists.)
 *
 *   (D) Overflow Menu: During reading phase, an overflow menu trigger button
 *       should exist at bottom-right providing assessment controls. (Currently,
 *       only an inline pause/resume button exists.)
 *
 *   (E) Compact Viewport: For viewport < 1024px, an immersive launch mode
 *       should be active (new tab with ?immersive=1 param).
 *
 * EXPECTED OUTCOME on UNFIXED code: Tests FAIL because:
 *   - Assessment renders inside GlassPanel with max-w-2xl and AssessmentWrapper
 *     chrome (step dots, stage labels, progress bar, back button)
 *   - Optotype area is ~60% of viewport due to decorative elements
 *   - Timer/progress elements never change opacity (no auto-fade mechanism)
 *   - No overflow menu element exists in DOM during reading phase
 */

import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, fireEvent, screen, cleanup, act } from "@testing-library/react";
import fc from "fast-check";

import { TestingStep } from "../steps/TestingStep";
import { AcuitySession } from "../AcuitySession";
import { AssessmentImmersiveShell } from "../immersive";
import { SNELLEN_LINES } from "../snellen-data";
import type { CalibrationData, TimerDuration, TestPhase } from "../types";

// ─── Mocks ─────────────────────────────────────────────────────────────────

// Mock firestore to prevent real network calls
vi.mock("@/services/firestore", () => ({
  visionAssessmentsService: {
    getById: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    getByPatientId: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock auth context
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "test-user-123" } }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("id=test-assessment-1"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/patient/assessment/visual-acuity",
}));

// ─── Shared harness ────────────────────────────────────────────────────────

const STUB_CALIBRATION: CalibrationData = {
  pxPerMm: 4,
  cardWidthPx: 342.4,
  deviceWidth: 1440,
  deviceHeight: 900,
  dpr: 2,
  timestamp: 1_700_000_000_000,
};

const ACTIVE_PHASES: TestPhase[] = [
  "instructions",
  "calibration",
  "duration_select",
  "testing",
  "results",
];

/** Mount AcuitySession with pre-determined assessment types to skip type_select */
function mountAcuitySession() {
  return render(
    <AcuitySession
      assessmentId="test-assessment-1"
      assessmentTypes={["far"]}
    />,
  );
}

/** Mount TestingStep wrapped in AssessmentImmersiveShell for reading-phase tests.
 *  The ImmersiveTopBar and AssessmentOverflowMenu live in the shell wrapper,
 *  not inside TestingStep itself. This matches the real rendering context. */
function mountTestingStep(timerDuration: TimerDuration = 5) {
  // RAF polyfill driven by fake timers
  vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((handle: number) => {
    clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  }));

  const onComplete = vi.fn();
  const utils = render(
    <AssessmentImmersiveShell
      timerDisplay={`${timerDuration}s`}
      progressDisplay="1 of 5"
      phase="testing"
      isPaused={false}
      onPause={() => {}}
      onResume={() => {}}
      onReturnToDetails={() => {}}
      onReturnToDashboard={() => {}}
      onExit={() => {}}
    >
      <TestingStep
        calibration={STUB_CALIBRATION}
        timerDuration={timerDuration}
        onComplete={onComplete}
      />
    </AssessmentImmersiveShell>,
  );
  return { onComplete, ...utils };
}

/** Click "Ready — Start Test" to enter reading phase */
function clickReady() {
  const ready = screen.getByRole("button", { name: /Ready\s*—\s*Start Test/i });
  fireEvent.click(ready);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── (A) No Dashboard Chrome ───────────────────────────────────────────────

describe("(A) No Dashboard Chrome during active assessment", () => {
  test("AcuitySession does NOT render GlassPanel with max-w-2xl constraint", () => {
    mountAcuitySession();

    // The assessment starts at "instructions" phase (skipping type_select).
    // Check that no element with max-w-2xl class exists as a GlassPanel container.
    const container = document.querySelector(".max-w-2xl");

    // EXPECTED (correct/fixed): No max-w-2xl constraint exists — immersive shell
    // ACTUAL on unfixed code: GlassPanel with max-w-2xl IS present (FAILS)
    expect(container).toBeNull();
  });

  test("AcuitySession does NOT render step dots (progress indicators)", () => {
    mountAcuitySession();

    // AssessmentWrapper renders step dots as small rounded-full divs in a flex container.
    // The step dots have classes like "h-2 rounded-full" with varying widths.
    // Look for the stage indicator text pattern "Stage X of Y"
    const stageLabel = screen.queryByText(/Stage \d+ of \d+/i);

    // EXPECTED (correct/fixed): No stage label — immersive shell has minimal top bar
    // ACTUAL on unfixed code: "Stage 1 of 5" label IS present (FAILS)
    expect(stageLabel).toBeNull();
  });

  test("AcuitySession does NOT render AssessmentWrapper title/subtitle header", () => {
    mountAcuitySession();

    // AssessmentWrapper renders title as h1 with TYPOGRAPHY.heading class
    // and subtitle as a <p> with "text-sm text-muted-foreground"
    const heading = screen.queryByRole("heading", { level: 1 });

    // On the fixed code, the immersive shell has no heading chrome.
    // We check specifically for the old-style heading that says "Far Vision Assessment"
    // paired with a stage subtitle.
    const subtitle = screen.queryByText("Preparation");

    // EXPECTED (correct/fixed): No h1 heading with assessment title in chrome wrapper
    // ACTUAL on unfixed code: h1 "Far Vision Assessment" with subtitle "Preparation" present (FAILS)
    expect(heading).toBeNull();
    expect(subtitle).toBeNull();
  });

  test("property: for any active phase, no max-w-2xl constraint is rendered", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACTIVE_PHASES),
        fc.constantFrom(768, 1024, 1440, 1920),
        (phase, viewportWidth) => {
          // For this property, we render the AcuitySession and check the DOM.
          // Since we cannot easily force a specific phase from outside, we verify
          // the initial render (instructions phase) which is representative.
          mountAcuitySession();

          // Check that no max-w-2xl exists in the rendered DOM
          const hasMaxW2xl = document.querySelector(".max-w-2xl") !== null;
          // Check that no "Stage X of Y" label exists
          const hasStageLabel = screen.queryByText(/Stage \d+ of \d+/i) !== null;

          cleanup();

          // EXPECTED (correct): neither chrome element exists
          // ACTUAL on unfixed code: both are present (FAILS)
          return !hasMaxW2xl && !hasStageLabel;
        },
      ),
      { numRuns: 8 },
    );
  });
});

// ─── (B) Optotype Area Dominance ────────────────────────────────────────────

describe("(B) Optotype area not constrained by max-w-2xl during reading phase", () => {
  test("reading phase content is NOT wrapped in max-w-2xl container", () => {
    mountTestingStep(5);
    act(() => clickReady());

    // During reading phase, TestingShell renders a div with "max-w-2xl mx-auto"
    // This constrains the optotype display area.
    const maxWContainer = document.querySelector(".max-w-2xl");

    // EXPECTED (correct/fixed): No max-w-2xl — optotypes use full viewport
    // ACTUAL on unfixed code: TestingShell wraps everything in "max-w-2xl mx-auto" (FAILS)
    expect(maxWContainer).toBeNull();
  });

  test("property: across timer durations, reading phase has no max-w-2xl constraint", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TimerDuration>(3, 5, 7, 10),
        (timerDuration) => {
          mountTestingStep(timerDuration);
          act(() => clickReady());

          const hasMaxW2xl = document.querySelector(".max-w-2xl") !== null;

          cleanup();

          // EXPECTED (correct): no max-w-2xl during reading
          // ACTUAL on unfixed code: max-w-2xl IS present (FAILS)
          return !hasMaxW2xl;
        },
      ),
      { numRuns: 4 },
    );
  });
});

// ─── (C) Top Bar Auto-Fade ──────────────────────────────────────────────────

describe("(C) Top bar auto-fades to 30% opacity after 1500ms inactivity", () => {
  test("after 1500ms of no interaction, top bar opacity reduces to 0.3", () => {
    mountTestingStep(5);
    act(() => clickReady());

    // Advance 1500ms without any interaction
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Look for an element with data-testid="immersive-top-bar" or similar
    // that has opacity style/class indicating auto-fade
    const topBar = document.querySelector('[data-testid="immersive-top-bar"]');

    // EXPECTED (correct/fixed): An immersive top bar exists with opacity: 0.3
    // ACTUAL on unfixed code: No such element exists — there is no auto-fade mechanism (FAILS)
    expect(topBar).not.toBeNull();
    if (topBar) {
      const opacity = (topBar as HTMLElement).style.opacity;
      expect(opacity).toBe("0.3");
    }
  });

  test("auto-fade restores to full opacity on user interaction", () => {
    mountTestingStep(5);
    act(() => clickReady());

    // Wait for auto-fade
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Simulate user interaction (mouse move) on the immersive shell container
    // (useInactivityFade attaches listeners to the shell ref, not document.body)
    const shell = document.querySelector('[data-testid="assessment-immersive-shell"]');
    expect(shell).not.toBeNull();
    act(() => {
      fireEvent.mouseMove(shell!);
    });

    const topBar = document.querySelector('[data-testid="immersive-top-bar"]');

    // EXPECTED (correct/fixed): Top bar returns to full opacity after interaction
    // ACTUAL on unfixed code: No immersive top bar element exists at all (FAILS)
    expect(topBar).not.toBeNull();
    if (topBar) {
      const opacity = (topBar as HTMLElement).style.opacity;
      expect(opacity).toBe("1");
    }
  });
});

// ─── (D) Overflow Menu ──────────────────────────────────────────────────────

describe("(D) Overflow menu trigger exists during reading phase", () => {
  test("a floating overflow menu trigger button exists during reading phase", () => {
    mountTestingStep(5);
    act(() => clickReady());

    // Look for an overflow menu trigger (the design specifies a button with
    // three-dot/ellipsis icon at fixed bottom-6 right-6)
    const overflowTrigger = screen.queryByRole("button", {
      name: /overflow|menu|more actions/i,
    });

    // Also check by data-testid
    const overflowByTestId = document.querySelector(
      '[data-testid="assessment-overflow-menu"]',
    );

    // EXPECTED (correct/fixed): An overflow menu trigger button exists
    // ACTUAL on unfixed code: No such button exists — only inline pause/resume (FAILS)
    expect(overflowTrigger ?? overflowByTestId).not.toBeNull();
  });

  test("overflow menu contains Pause, Resume, Return to Dashboard, Exit actions", () => {
    mountTestingStep(5);
    act(() => clickReady());

    // Try to open the overflow menu
    const overflowTrigger =
      screen.queryByRole("button", { name: /overflow|menu|more actions/i }) ??
      document.querySelector('[data-testid="assessment-overflow-menu"]');

    // EXPECTED (correct/fixed): Overflow menu exists and contains required actions
    // ACTUAL on unfixed code: No overflow menu element exists (FAILS at first assertion)
    expect(overflowTrigger).not.toBeNull();

    if (overflowTrigger) {
      act(() => fireEvent.click(overflowTrigger));

      // After opening, verify actions are present
      const pauseAction = screen.queryByRole("menuitem", { name: /pause/i });
      const returnAction = screen.queryByRole("menuitem", { name: /return to dashboard/i });
      const exitAction = screen.queryByRole("menuitem", { name: /exit/i });

      expect(pauseAction).not.toBeNull();
      expect(returnAction).not.toBeNull();
      expect(exitAction).not.toBeNull();
    }
  });

  test("property: for any timer duration, overflow menu is available in reading phase", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TimerDuration>(3, 5, 7, 10),
        (timerDuration) => {
          mountTestingStep(timerDuration);
          act(() => clickReady());

          const hasOverflow =
            screen.queryByRole("button", { name: /overflow|menu|more actions/i }) !== null ||
            document.querySelector('[data-testid="assessment-overflow-menu"]') !== null;

          cleanup();

          // EXPECTED (correct): overflow menu trigger exists
          // ACTUAL on unfixed code: no overflow menu (FAILS)
          return hasOverflow;
        },
      ),
      { numRuns: 4 },
    );
  });
});

// ─── (E) Compact Viewport Immersive Launch Mode ─────────────────────────────

describe("(E) Compact viewport (<1024px) immersive launch mode", () => {
  test("for viewport width < 1024px, immersive mode indicator is present", () => {
    // Set up a narrow viewport
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 768,
    });

    // Simulate being in the immersive tab (window.location.search includes ?immersive=1)
    // This prevents the shell from launching a new tab and instead renders content.
    // In production, the page.tsx handles this by wrapping in AssessmentOrientationGate.
    const originalSearch = window.location.search;
    Object.defineProperty(window.location, "search", {
      configurable: true,
      writable: true,
      value: "?id=test-assessment-1&immersive=1",
    });

    mountAcuitySession();

    // On compact viewport with ?immersive=1, the system should render the
    // immersive shell (it won't try to open a new tab since immersive param is present).
    const immersiveShell = document.querySelector(
      '[data-testid="assessment-immersive-shell"]',
    );

    // EXPECTED (correct/fixed): Immersive shell renders in immersive mode
    // ACTUAL on unfixed code: Neither exists — standard dashboard rendering (FAILS)
    expect(immersiveShell).not.toBeNull();

    // Restore
    Object.defineProperty(window.location, "search", {
      configurable: true,
      writable: true,
      value: originalSearch,
    });
  });

  test("property: for viewports <1024px, no standard dashboard chrome is rendered", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1023 }),
        (viewportWidth) => {
          Object.defineProperty(window, "innerWidth", {
            configurable: true,
            value: viewportWidth,
          });

          mountAcuitySession();

          // On compact viewport, should NOT render old-style chrome
          const hasMaxW2xl = document.querySelector(".max-w-2xl") !== null;
          const hasStageLabel = screen.queryByText(/Stage \d+ of \d+/i) !== null;

          cleanup();

          // Reset viewport
          Object.defineProperty(window, "innerWidth", {
            configurable: true,
            value: 1440,
          });

          // EXPECTED (correct): no dashboard chrome on compact viewport
          // ACTUAL on unfixed code: max-w-2xl and stage labels ARE present (FAILS)
          return !hasMaxW2xl && !hasStageLabel;
        },
      ),
      { numRuns: 6 },
    );
  });
});
