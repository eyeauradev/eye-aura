import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AssessmentImmersiveShell } from "../AssessmentImmersiveShell";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createProps(
  overrides: Partial<Parameters<typeof AssessmentImmersiveShell>[0]> = {},
) {
  return {
    timerDisplay: "4s",
    progressDisplay: "3 of 9",
    phase: "testing",
    isPaused: false,
    onPause: vi.fn(),
    onResume: vi.fn(),
    onReturnToDetails: vi.fn(),
    onReturnToDashboard: vi.fn(),
    onExit: vi.fn(),
    children: <div data-testid="child-content">Assessment Step</div>,
    ...overrides,
  };
}

function mockMatchMedia(prefersReducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === "(prefers-reduced-motion: reduce)"
          ? prefersReducedMotion
          : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssessmentImmersiveShell", () => {
  beforeEach(() => {
    mockMatchMedia();
    mockViewport(1440); // Large viewport by default
    // Ensure no ?immersive param in URL
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: {
        ...window.location,
        href: "http://localhost:3000/patient/assessment/visual-acuity",
        search: "",
      },
    });
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ── Shell rendering ─────────────────────────────────────────────────────

  it("renders with data-testid='assessment-immersive-shell'", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    expect(screen.getByTestId("assessment-immersive-shell")).toBeInTheDocument();
  });

  it("uses fixed inset-0 z-50 positioning", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    const shell = screen.getByTestId("assessment-immersive-shell");
    expect(shell.className).toContain("fixed");
    expect(shell.className).toContain("inset-0");
    expect(shell.className).toContain("z-50");
  });

  it("uses flexbox column layout", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    const shell = screen.getByTestId("assessment-immersive-shell");
    expect(shell.className).toContain("flex");
    expect(shell.className).toContain("flex-col");
  });

  it("has a clean medical-grade background (off-white/cool-gray)", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    const shell = screen.getByTestId("assessment-immersive-shell");
    // The background color should be a subtle off-white/cool-gray
    expect(shell.className).toContain("bg-[#f8f9fa]");
  });

  // ── ImmersiveTopBar ───────────────────────────────────────────────────────

  it("renders ImmersiveTopBar with data-testid='immersive-top-bar'", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    expect(screen.getByTestId("immersive-top-bar")).toBeInTheDocument();
  });

  it("displays timer on the left side of top bar", () => {
    render(
      <AssessmentImmersiveShell {...createProps({ timerDisplay: "7s" })} />,
    );
    const timerEl = screen.getByLabelText(/timer: 7s/i);
    expect(timerEl).toBeInTheDocument();
    expect(timerEl.textContent).toBe("7s");
  });

  it("displays progress on the right side of top bar", () => {
    render(
      <AssessmentImmersiveShell
        {...createProps({ progressDisplay: "5 of 12" })}
      />,
    );
    const progressEl = screen.getByLabelText(/progress: 5 of 12/i);
    expect(progressEl).toBeInTheDocument();
    expect(progressEl.textContent).toBe("5 of 12");
  });

  it("top bar starts at full opacity (isIdle = false initially)", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    const topBar = screen.getByTestId("immersive-top-bar");
    expect(topBar.style.opacity).toBe("1");
  });

  it("top bar has opacity transition style", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    const topBar = screen.getByTestId("immersive-top-bar");
    expect(topBar.style.transition).toBe("opacity 300ms ease");
  });

  // ── Children pass-through ─────────────────────────────────────────────────

  it("renders children without modification", () => {
    render(<AssessmentImmersiveShell {...createProps()} />);
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByTestId("child-content").textContent).toBe(
      "Assessment Step",
    );
  });

  it("does not wrap children in extra elements that modify their props", () => {
    const CustomChild = ({ value }: { value: string }) => (
      <span data-testid="custom-child">{value}</span>
    );
    render(
      <AssessmentImmersiveShell {...createProps()}>
        <CustomChild value="unchanged" />
      </AssessmentImmersiveShell>,
    );
    expect(screen.getByTestId("custom-child").textContent).toBe("unchanged");
  });

  // ── Overflow menu integration ─────────────────────────────────────────────

  it("shows overflow menu during 'testing' phase", () => {
    render(
      <AssessmentImmersiveShell {...createProps({ phase: "testing" })} />,
    );
    expect(screen.getByTestId("assessment-overflow-menu")).toBeInTheDocument();
  });

  it("hides overflow menu during 'calibration' phase", () => {
    render(
      <AssessmentImmersiveShell {...createProps({ phase: "calibration" })} />,
    );
    expect(
      screen.queryByTestId("assessment-overflow-menu"),
    ).not.toBeInTheDocument();
  });

  it("hides overflow menu during 'instructions' phase", () => {
    render(
      <AssessmentImmersiveShell {...createProps({ phase: "instructions" })} />,
    );
    expect(
      screen.queryByTestId("assessment-overflow-menu"),
    ).not.toBeInTheDocument();
  });

  it("hides overflow menu during 'results' phase", () => {
    render(
      <AssessmentImmersiveShell {...createProps({ phase: "results" })} />,
    );
    expect(
      screen.queryByTestId("assessment-overflow-menu"),
    ).not.toBeInTheDocument();
  });

  // ── Viewport-aware behavior ───────────────────────────────────────────────

  it("renders in-place on large viewport (≥ 1024px)", () => {
    mockViewport(1440);
    render(<AssessmentImmersiveShell {...createProps()} />);
    expect(screen.getByTestId("assessment-immersive-shell")).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("triggers new-tab launch on compact viewport (< 1024px) without immersive param", () => {
    mockViewport(768);
    render(<AssessmentImmersiveShell {...createProps()} />);
    expect(window.open).toHaveBeenCalled();
  });

  it("does NOT trigger new-tab launch when ?immersive param is present", () => {
    mockViewport(768);
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: {
        ...window.location,
        href: "http://localhost:3000/patient/assessment/visual-acuity?immersive=1",
        search: "?immersive=1",
      },
    });
    render(<AssessmentImmersiveShell {...createProps()} />);
    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByTestId("assessment-immersive-shell")).toBeInTheDocument();
  });

  it("returns null in original tab when compact viewport launches new tab", () => {
    mockViewport(768);
    const { container } = render(
      <AssessmentImmersiveShell {...createProps()} />,
    );
    // When new tab is opened, shell doesn't render in original tab
    expect(
      container.querySelector('[data-testid="assessment-immersive-shell"]'),
    ).toBeNull();
  });
});
