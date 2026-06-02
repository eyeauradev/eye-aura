import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AssessmentOverflowMenu } from "../AssessmentOverflowMenu";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createProps(overrides: Partial<Parameters<typeof AssessmentOverflowMenu>[0]> = {}) {
  return {
    onPause: vi.fn(),
    onResume: vi.fn(),
    onReturnToDetails: vi.fn(),
    onReturnToDashboard: vi.fn(),
    onExit: vi.fn(),
    isPaused: false,
    ...overrides,
  };
}

// Mock matchMedia for reduced motion
function mockMatchMedia(prefersReducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? prefersReducedMotion : false,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssessmentOverflowMenu", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the trigger button with data-testid", () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    expect(screen.getByTestId("assessment-overflow-menu")).toBeInTheDocument();
  });

  it("renders a 48×48px circular trigger button", () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    const trigger = screen.getByRole("button", { name: /assessment actions menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.className).toContain("h-12");
    expect(trigger.className).toContain("w-12");
    expect(trigger.className).toContain("rounded-full");
  });

  it("menu is closed by default", () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: /assessment actions menu/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the menu panel on trigger click", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    const trigger = screen.getByRole("button", { name: /assessment actions menu/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("shows Pause action when not paused", async () => {
    const props = createProps({ isPaused: false });
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /pause/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("menuitem", { name: /^resume$/i })).not.toBeInTheDocument();
  });

  it("shows Resume action when paused", async () => {
    const props = createProps({ isPaused: true });
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /resume/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("menuitem", { name: /^pause$/i })).not.toBeInTheDocument();
  });

  it("renders all 4 menu items (Pause/Resume + 3 navigation actions)", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      const items = screen.getAllByRole("menuitem");
      expect(items).toHaveLength(4);
    });

    expect(screen.getByRole("menuitem", { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /return to details/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /return to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /exit assessment/i })).toBeInTheDocument();
  });

  it("calls onPause when Pause item is clicked", async () => {
    const props = createProps({ isPaused: false });
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /pause/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /pause/i }));
    expect(props.onPause).toHaveBeenCalledOnce();
  });

  it("calls onResume when Resume item is clicked", async () => {
    const props = createProps({ isPaused: true });
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /resume/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /resume/i }));
    expect(props.onResume).toHaveBeenCalledOnce();
  });

  it("calls onReturnToDetails when Return to Details is clicked", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /return to details/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /return to details/i }));
    expect(props.onReturnToDetails).toHaveBeenCalledOnce();
  });

  it("calls onReturnToDashboard when Return to Dashboard is clicked", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /return to dashboard/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /return to dashboard/i }));
    expect(props.onReturnToDashboard).toHaveBeenCalledOnce();
  });

  it("calls onExit when Exit Assessment is clicked", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /exit assessment/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /exit assessment/i }));
    expect(props.onExit).toHaveBeenCalledOnce();
  });

  it("closes menu after an action is selected", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /exit assessment/i }));

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it("trigger has aria-haspopup='menu'", () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    const trigger = screen.getByRole("button", { name: /assessment actions menu/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("menu panel has role='menu' and aria-label", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      const menu = screen.getByRole("menu");
      expect(menu).toHaveAttribute("aria-label", "Assessment actions");
    });
  });

  it("menu items have role='menuitem'", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      const items = screen.getAllByRole("menuitem");
      items.forEach((item) => {
        expect(item).toHaveAttribute("role", "menuitem");
      });
    });
  });

  // ── Keyboard navigation ───────────────────────────────────────────────────

  it("closes on Escape key press", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("ArrowDown navigates to next menu item", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    // Wait for auto-focus on first item
    await waitFor(() => {
      const items = screen.getAllByRole("menuitem");
      expect(items[0]).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });

    const items = screen.getAllByRole("menuitem");
    expect(items[1]).toHaveFocus();
  });

  it("ArrowUp navigates to previous menu item (wraps to end)", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    // Wait for auto-focus on first item
    await waitFor(() => {
      const items = screen.getAllByRole("menuitem");
      expect(items[0]).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });

    const items = screen.getAllByRole("menuitem");
    expect(items[items.length - 1]).toHaveFocus();
  });

  it("Enter key activates a menu item", async () => {
    const props = createProps({ isPaused: false });
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      const items = screen.getAllByRole("menuitem");
      expect(items[0]).toHaveFocus();
    });

    const firstItem = screen.getAllByRole("menuitem")[0];
    fireEvent.keyDown(firstItem, { key: "Enter" });

    expect(props.onPause).toHaveBeenCalledOnce();
  });

  it("Space key activates a menu item", async () => {
    const props = createProps({ isPaused: false });
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      const items = screen.getAllByRole("menuitem");
      expect(items[0]).toHaveFocus();
    });

    const firstItem = screen.getAllByRole("menuitem")[0];
    fireEvent.keyDown(firstItem, { key: " " });

    expect(props.onPause).toHaveBeenCalledOnce();
  });

  it("auto-focuses first menu item when opened", async () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      const items = screen.getAllByRole("menuitem");
      expect(items[0]).toHaveFocus();
    });
  });

  // ── Click outside ─────────────────────────────────────────────────────────

  it("closes menu when clicking outside", async () => {
    const props = createProps();
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <AssessmentOverflowMenu {...props} />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /assessment actions menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId("outside-area"));

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  // ── Fixed positioning ─────────────────────────────────────────────────────

  it("wrapper has fixed bottom-6 right-6 positioning", () => {
    const props = createProps();
    render(<AssessmentOverflowMenu {...props} />);

    const wrapper = screen.getByTestId("assessment-overflow-menu");
    expect(wrapper.className).toContain("fixed");
    expect(wrapper.className).toContain("bottom-6");
    expect(wrapper.className).toContain("right-6");
  });
});
