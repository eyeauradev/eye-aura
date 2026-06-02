import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AssessmentOrientationGate } from "../AssessmentOrientationGate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MediaQueryChangeHandler = (event: MediaQueryListEvent) => void;

let orientationListeners: MediaQueryChangeHandler[] = [];
let currentOrientation: "portrait" | "landscape" = "portrait";

function mockMatchMedia() {
  orientationListeners = [];

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const isOrientationQuery = query === "(orientation: portrait)";

      return {
        matches: isOrientationQuery
          ? currentOrientation === "portrait"
          : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn((_event: string, handler: MediaQueryChangeHandler) => {
          if (_event === "change" && isOrientationQuery) {
            orientationListeners.push(handler);
          }
        }),
        removeEventListener: vi.fn((_event: string, handler: MediaQueryChangeHandler) => {
          if (_event === "change" && isOrientationQuery) {
            orientationListeners = orientationListeners.filter((h) => h !== handler);
          }
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

function simulateOrientationChange(orientation: "portrait" | "landscape") {
  currentOrientation = orientation;
  const event = { matches: orientation === "portrait" } as MediaQueryListEvent;
  orientationListeners.forEach((handler) => handler(event));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssessmentOrientationGate", () => {
  beforeEach(() => {
    currentOrientation = "portrait";
    mockMatchMedia();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    orientationListeners = [];
  });

  it("renders the gate UI when in portrait orientation", () => {
    const { container } = render(
      <AssessmentOrientationGate>
        <div data-testid="child-content">Assessment Content</div>
      </AssessmentOrientationGate>,
    );

    const gate = container.querySelector('[role="alertdialog"]');
    expect(gate).toBeInTheDocument();
    expect(screen.getByText("Rotate Your Device")).toBeInTheDocument();
    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
  });

  it("renders children when in landscape orientation", () => {
    currentOrientation = "landscape";
    mockMatchMedia();

    render(
      <AssessmentOrientationGate>
        <div data-testid="child-content">Assessment Content</div>
      </AssessmentOrientationGate>,
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("auto-dismisses gate when orientation changes to landscape", async () => {
    render(
      <AssessmentOrientationGate>
        <div data-testid="child-content">Assessment Content</div>
      </AssessmentOrientationGate>,
    );

    // Gate is visible initially.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // Simulate orientation change to landscape.
    simulateOrientationChange("landscape");

    // Children should appear after dismiss.
    await waitFor(() => {
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });
  });

  it("dismisses gate on Escape key press", async () => {
    render(
      <AssessmentOrientationGate>
        <div data-testid="child-content">Assessment Content</div>
      </AssessmentOrientationGate>,
    );

    const gate = screen.getByRole("alertdialog");
    fireEvent.keyDown(gate, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });
  });

  it("has correct ARIA attributes for accessibility", () => {
    render(
      <AssessmentOrientationGate>
        <div>Content</div>
      </AssessmentOrientationGate>,
    );

    const gate = screen.getByRole("alertdialog");
    expect(gate).toHaveAttribute("aria-modal", "true");
    expect(gate).toHaveAttribute("aria-labelledby", "orientation-gate-title");
    expect(gate).toHaveAttribute(
      "aria-describedby",
      "orientation-gate-description",
    );
  });

  it("includes an accessible live region for screen readers", () => {
    const { container } = render(
      <AssessmentOrientationGate>
        <div>Content</div>
      </AssessmentOrientationGate>,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(liveRegion?.textContent).toContain(
      "Please rotate your device to landscape orientation",
    );
  });

  it("has data-testid on the wrapper element", () => {
    render(
      <AssessmentOrientationGate>
        <div>Content</div>
      </AssessmentOrientationGate>,
    );

    expect(
      screen.getByTestId("assessment-orientation-gate"),
    ).toBeInTheDocument();
  });

  it("gate is focusable for keyboard accessibility", () => {
    render(
      <AssessmentOrientationGate>
        <div>Content</div>
      </AssessmentOrientationGate>,
    );

    const gate = screen.getByRole("alertdialog");
    expect(gate).toHaveAttribute("tabindex", "0");
  });
});
