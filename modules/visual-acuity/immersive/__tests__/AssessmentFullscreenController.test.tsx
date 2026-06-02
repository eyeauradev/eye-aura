import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AssessmentFullscreenController } from "../AssessmentFullscreenController";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let mockRequestFullscreen: ReturnType<typeof vi.fn>;
let mockExitFullscreen: ReturnType<typeof vi.fn>;
let mockFullscreenElement: Element | null;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

function setupFullscreenAPI(options?: {
  requestRejects?: boolean;
  requestError?: Error;
  exitRejects?: boolean;
  supported?: boolean;
}) {
  const {
    requestRejects = false,
    requestError,
    exitRejects = false,
    supported = true,
  } = options ?? {};

  mockRequestFullscreen = vi.fn().mockImplementation(() => {
    if (requestRejects) {
      return Promise.reject(
        requestError ?? new Error("Fullscreen request denied"),
      );
    }
    mockFullscreenElement = document.documentElement;
    return Promise.resolve();
  });

  mockExitFullscreen = vi.fn().mockImplementation(() => {
    if (exitRejects) {
      return Promise.reject(new Error("Exit fullscreen failed"));
    }
    mockFullscreenElement = null;
    return Promise.resolve();
  });

  if (supported) {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      writable: true,
      configurable: true,
      value: mockRequestFullscreen,
    });
  } else {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      writable: true,
      configurable: true,
      value: undefined,
    });
  }

  Object.defineProperty(document, "exitFullscreen", {
    writable: true,
    configurable: true,
    value: mockExitFullscreen,
  });

  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => mockFullscreenElement,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssessmentFullscreenController", () => {
  beforeEach(() => {
    mockFullscreenElement = null;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders children unchanged", () => {
    setViewportWidth(1200);
    setupFullscreenAPI();

    render(
      <AssessmentFullscreenController>
        <div data-testid="child-content">Assessment Content</div>
      </AssessmentFullscreenController>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Assessment Content")).toBeInTheDocument();
  });

  it("requests fullscreen on compact viewport (< 1024px)", async () => {
    setViewportWidth(768);
    setupFullscreenAPI();

    render(
      <AssessmentFullscreenController>
        <div>Content</div>
      </AssessmentFullscreenController>,
    );

    // Wait for the async requestFullscreen to be called.
    await vi.waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  it("does NOT request fullscreen on large viewport (>= 1024px)", async () => {
    setViewportWidth(1440);
    setupFullscreenAPI();

    render(
      <AssessmentFullscreenController>
        <div>Content</div>
      </AssessmentFullscreenController>,
    );

    // Give time for any async calls to fire.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });

  it("does NOT request fullscreen at exactly 1024px (threshold boundary)", async () => {
    setViewportWidth(1024);
    setupFullscreenAPI();

    render(
      <AssessmentFullscreenController>
        <div>Content</div>
      </AssessmentFullscreenController>,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockRequestFullscreen).not.toHaveBeenCalled();
  });

  it("logs warning and continues when fullscreen request is denied", async () => {
    setViewportWidth(768);
    setupFullscreenAPI({ requestRejects: true });

    render(
      <AssessmentFullscreenController>
        <div data-testid="child-content">Content</div>
      </AssessmentFullscreenController>,
    );

    await vi.waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        "[AssessmentFullscreenController] Fullscreen request failed:",
        expect.any(Error),
      );
    });

    // Children still render despite the failure.
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("logs warning when Fullscreen API is not supported", async () => {
    setViewportWidth(768);
    setupFullscreenAPI({ supported: false });

    render(
      <AssessmentFullscreenController>
        <div data-testid="child-content">Content</div>
      </AssessmentFullscreenController>,
    );

    await vi.waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        "[AssessmentFullscreenController] Fullscreen API not supported by this browser.",
      );
    });

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("exits fullscreen on unmount when currently fullscreen", async () => {
    setViewportWidth(768);
    setupFullscreenAPI();

    const { unmount } = render(
      <AssessmentFullscreenController>
        <div>Content</div>
      </AssessmentFullscreenController>,
    );

    // Wait for fullscreen to be entered.
    await vi.waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    // Now unmount — should exit fullscreen.
    unmount();

    expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("does NOT call exitFullscreen on unmount when not in fullscreen", async () => {
    setViewportWidth(1440);
    setupFullscreenAPI();

    const { unmount } = render(
      <AssessmentFullscreenController>
        <div>Content</div>
      </AssessmentFullscreenController>,
    );

    // Large viewport — no fullscreen was requested.
    await new Promise((resolve) => setTimeout(resolve, 50));

    unmount();

    expect(mockExitFullscreen).not.toHaveBeenCalled();
  });

  it("handles exitFullscreen rejection gracefully on unmount", async () => {
    setViewportWidth(768);
    setupFullscreenAPI({ exitRejects: true });

    // Manually set fullscreenElement to simulate being in fullscreen.
    mockFullscreenElement = document.documentElement;

    const { unmount } = render(
      <AssessmentFullscreenController>
        <div>Content</div>
      </AssessmentFullscreenController>,
    );

    await vi.waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    // Unmount should not throw even if exitFullscreen rejects.
    expect(() => unmount()).not.toThrow();
  });
});
