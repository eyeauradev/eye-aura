import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInactivityFade } from "../useInactivityFade";
import { createRef } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createContainerRef() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const ref = createRef<HTMLElement>() as { current: HTMLElement | null };
  (ref as { current: HTMLElement | null }).current = el;
  return { ref, el, cleanup: () => document.body.removeChild(el) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useInactivityFade", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default: no reduced motion preference.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts with isIdle = false", () => {
    const { ref, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref));

    expect(result.current.isIdle).toBe(false);
    cleanup();
  });

  it("sets isIdle = true after default timeout (1500ms)", () => {
    const { ref, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.isIdle).toBe(true);
    cleanup();
  });

  it("sets isIdle = true after custom timeout", () => {
    const { ref, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref, 3000));

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isIdle).toBe(true);
    cleanup();
  });

  it("resets timer on mousemove interaction", () => {
    const { ref, el, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref));

    // Advance to just before timeout.
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(result.current.isIdle).toBe(false);

    // Simulate mousemove — resets timer.
    act(() => {
      el.dispatchEvent(new Event("mousemove"));
    });

    // Advance another 1400ms — should NOT be idle yet since timer reset.
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(result.current.isIdle).toBe(false);

    // Advance remaining 100ms — now idle.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isIdle).toBe(true);
    cleanup();
  });

  it("resets timer on touchstart interaction", () => {
    const { ref, el, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref));

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    act(() => {
      el.dispatchEvent(new Event("touchstart"));
    });

    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isIdle).toBe(true);
    cleanup();
  });

  it("resets timer on keydown interaction", () => {
    const { ref, el, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref));

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    act(() => {
      el.dispatchEvent(new Event("keydown"));
    });

    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isIdle).toBe(true);
    cleanup();
  });

  it("restores isIdle = false on interaction after going idle", () => {
    const { ref, el, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref));

    // Go idle.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isIdle).toBe(true);

    // Interact — should restore.
    act(() => {
      el.dispatchEvent(new Event("mousemove"));
    });
    expect(result.current.isIdle).toBe(false);
    cleanup();
  });

  it("never sets isIdle when prefers-reduced-motion is active", () => {
    // Override matchMedia to indicate reduced motion preference.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { ref, cleanup } = createContainerRef();
    const { result } = renderHook(() => useInactivityFade(ref));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isIdle).toBe(false);
    cleanup();
  });

  it("returns isIdle = false when containerRef.current is null", () => {
    const ref = createRef<HTMLElement>() as { current: HTMLElement | null };
    (ref as { current: HTMLElement | null }).current = null;

    const { result } = renderHook(() => useInactivityFade(ref));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.isIdle).toBe(false);
  });
});
