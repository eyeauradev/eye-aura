"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { BlinkCard } from "./BlinkCard";
import { useBlinkReminder } from "./useBlinkReminder";
import { getRandomFact, type BlinkFact } from "./blinkFacts";
import { savePosition, getPosition, type WidgetPosition } from "./blinkStorage";

const WIDGET_SIZE = 48; // px
const EDGE_MARGIN = 24; // px from screen edges
const SNAP_THRESHOLD = 0.5; // fraction of screen width

/**
 * Blink Companion Widget
 * A minimal floating eye that encourages healthy blinking habits.
 * Draggable, edge-snapping, with natural blink animations.
 */
export function BlinkCompanion() {
  const { isCardOpen, openCard, dismissCard } = useBlinkReminder();
  const [fact, setFact] = useState<BlinkFact>(() => getRandomFact());
  const [position, setPosition] = useState<WidgetPosition>({
    x: 0,
    y: 0,
    edge: "right",
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Mouse tracking for subtle eye follow
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Initialize position from localStorage or default
  useEffect(() => {
    const saved = getPosition();
    if (saved) {
      setPosition(saved);
    } else {
      // Default: bottom-right
      setPosition({
        x: window.innerWidth - WIDGET_SIZE - EDGE_MARGIN,
        y: window.innerHeight - WIDGET_SIZE - EDGE_MARGIN - 80, // above toast area
        edge: "right",
      });
    }
    setIsInitialized(true);
  }, []);

  // Reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Tab visibility (pause animations)
  useEffect(() => {
    const handler = () =>
      setIsTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Subtle mouse tracking (desktop only, max 2-3px movement)
  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId: number;
    const handleMove = (e: MouseEvent) => {
      rafId = requestAnimationFrame(() => {
        if (!widgetRef.current || isDragging) return;
        const rect = widgetRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / window.innerWidth;
        const dy = (e.clientY - cy) / window.innerHeight;
        // Max 2.5px movement
        setMouseOffset({ x: dx * 2.5, y: dy * 2.5 });
      });
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion, isDragging]);

  // Snap to nearest edge
  const snapToEdge = useCallback(
    (x: number, y: number): WidgetPosition => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const centerX = x + WIDGET_SIZE / 2;
      const edge: "left" | "right" =
        centerX < vw * SNAP_THRESHOLD ? "left" : "right";
      const snappedX =
        edge === "left" ? EDGE_MARGIN : vw - WIDGET_SIZE - EDGE_MARGIN;
      // Clamp Y
      const snappedY = Math.max(
        EDGE_MARGIN,
        Math.min(y, vh - WIDGET_SIZE - EDGE_MARGIN)
      );
      return { x: snappedX, y: snappedY, edge };
    },
    []
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      setHasDragged(false);
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position]
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setHasDragged(true);
      }
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
        edge: position.edge,
      });
    },
    [isDragging, position.edge]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const snapped = snapToEdge(position.x, position.y);
    setPosition(snapped);
    savePosition(snapped);
  }, [isDragging, position.x, position.y, snapToEdge]);

  // Mouse drag events
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onUp = () => handleDragEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch drag events
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      handleDragMove(t.clientX, t.clientY);
    };
    const onEnd = () => handleDragEnd();
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle click (only if not dragged)
  const handleClick = useCallback(() => {
    if (hasDragged) return;
    setFact(getRandomFact());
    openCard();
  }, [hasDragged, openCard]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFact(getRandomFact());
        openCard();
      }
    },
    [openCard]
  );

  // Keep position in bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => snapToEdge(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [snapToEdge]);

  // Animation state string
  const animationState = useMemo(() => {
    if (prefersReducedMotion || !isTabVisible) return "paused";
    return "running";
  }, [prefersReducedMotion, isTabVisible]);

  if (!isInitialized) return null;

  return (
    <div
      className="fixed z-[9990] select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? "none" : "left 0.3s ease-out, top 0.3s ease-out",
      }}
    >
      {/* Educational Card */}
      {isCardOpen && (
        <BlinkCard
          fact={fact}
          onDismiss={dismissCard}
          anchorEdge={position.edge}
        />
      )}

      {/* Eye Widget Button */}
      <button
        ref={widgetRef}
        type="button"
        aria-label="Blink reminder — click for eye health tips"
        aria-haspopup="dialog"
        aria-expanded={isCardOpen}
        className={`relative flex items-center justify-center
          rounded-full cursor-grab active:cursor-grabbing
          bg-[rgba(255,252,247,0.88)] border border-white/60
          shadow-[0_8px_32px_rgba(15,79,75,0.12)]
          backdrop-blur-[12px]
          transition-shadow duration-200
          hover:shadow-[0_12px_40px_rgba(15,79,75,0.18)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(181,150,77,0.42)] focus-visible:ring-offset-2
          ${isDragging ? "scale-105" : ""}
        `}
        style={{
          width: `${WIDGET_SIZE}px`,
          height: `${WIDGET_SIZE}px`,
          minWidth: "44px",
          minHeight: "44px",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          handleDragStart(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          handleDragStart(t.clientX, t.clientY);
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* SVG Eye Icon with blink animation */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="overflow-visible"
          style={{
            transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
            transition: "transform 0.15s ease-out",
          }}
        >
          {/* Eye outer shape */}
          <path
            d="M14 6C8 6 3.5 14 3.5 14C3.5 14 8 22 14 22C20 22 24.5 14 24.5 14C24.5 14 20 6 14 6Z"
            stroke="#0f4f4b"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Iris */}
          <circle cx="14" cy="14" r="4.5" fill="#0f4f4b" opacity="0.15" />
          <circle cx="14" cy="14" r="4.5" stroke="#0f4f4b" strokeWidth="1.2" fill="none" />
          {/* Pupil */}
          <circle cx="14" cy="14" r="2" fill="#0f4f4b" />
          {/* Light reflection */}
          <circle cx="15.5" cy="12.5" r="1" fill="white" opacity="0.8" />
          {/* Blink eyelid (animated) */}
          <path
            d="M14 6C8 6 3.5 14 3.5 14C3.5 14 8 22 14 22C20 22 24.5 14 24.5 14C24.5 14 20 6 14 6Z"
            fill="#f7f3ee"
            className="blink-eyelid"
            style={{
              animationPlayState: animationState,
            }}
          />
        </svg>

        {/* Floating animation wrapper */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            animation:
              animationState === "running"
                ? "blinkFloat 10s ease-in-out infinite"
                : "none",
          }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
