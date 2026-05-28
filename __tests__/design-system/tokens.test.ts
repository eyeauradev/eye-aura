import { describe, it, expect } from "vitest";
import {
  RADIUS,
  SPACING,
  SHADOWS,
  GLASS,
  TYPOGRAPHY,
  DEPTH_LAYERS,
} from "@/lib/design-tokens";

describe("Design Token Structure", () => {
  describe("RADIUS", () => {
    it("has exactly the expected keys", () => {
      expect(Object.keys(RADIUS).sort()).toEqual(
        ["container", "card", "interactive", "pill"].sort()
      );
    });

    it("has correct values for each key", () => {
      expect(RADIUS.container).toBe("rounded-[32px]");
      expect(RADIUS.card).toBe("rounded-3xl");
      expect(RADIUS.interactive).toBe("rounded-2xl");
      expect(RADIUS.pill).toBe("rounded-full");
    });
  });

  describe("SPACING", () => {
    it("has exactly the expected keys", () => {
      expect(Object.keys(SPACING).sort()).toEqual(
        ["sectionGap", "cardGap", "cardPadding", "layoutGap", "pageX", "pageY"].sort()
      );
    });
  });

  describe("SHADOWS", () => {
    it("has exactly the expected keys", () => {
      expect(Object.keys(SHADOWS).sort()).toEqual(
        ["card", "glass", "buttonHover", "sidebar", "elevated"].sort()
      );
    });

    it("all values reference theme token rgba(var(--primary-rgb))", () => {
      for (const [key, value] of Object.entries(SHADOWS)) {
        expect(value, `SHADOWS.${key} must use theme token`).toContain(
          "rgba(var(--primary-rgb)"
        );
      }
    });
  });

  describe("GLASS", () => {
    it("has exactly the expected keys", () => {
      expect(Object.keys(GLASS).sort()).toEqual(
        ["background", "cardBackground", "headerBackground", "border", "blur"].sort()
      );
    });
  });

  describe("TYPOGRAPHY", () => {
    it("has exactly the expected keys", () => {
      expect(Object.keys(TYPOGRAPHY).sort()).toEqual(
        ["heading", "subheading", "body", "label"].sort()
      );
    });

    it("all values use theme token colors (text-foreground or text-muted-foreground)", () => {
      for (const [key, value] of Object.entries(TYPOGRAPHY)) {
        const usesThemeColor =
          value.includes("text-foreground") ||
          value.includes("text-muted-foreground");
        expect(usesThemeColor, `TYPOGRAPHY.${key} must use theme token color`).toBe(
          true
        );
      }
    });
  });

  describe("DEPTH_LAYERS", () => {
    it("has exactly 3 entries", () => {
      expect(DEPTH_LAYERS).toHaveLength(3);
    });

    it("contains background, surface, and elevated layers", () => {
      const names = DEPTH_LAYERS.map((layer) => layer.name);
      expect(names).toEqual(["background", "surface", "elevated"]);
    });
  });
});
