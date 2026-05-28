import { describe, it, expect } from "vitest";

import * as sharedTokens from "@/lib/design-tokens";
import * as patientPortalTokens from "@/lib/patient-portal/design-tokens";

import * as sharedMotion from "@/lib/motion-variants";
import * as patientPortalMotion from "@/lib/patient-portal/motion-variants";

import * as premiumComponents from "@/components/premium";
import * as patientPortalComponents from "@/components/patient-portal";

describe("Re-export equivalence: design tokens", () => {
  it("RADIUS is the same reference", () => {
    expect(patientPortalTokens.RADIUS).toBe(sharedTokens.RADIUS);
  });

  it("SPACING is the same reference", () => {
    expect(patientPortalTokens.SPACING).toBe(sharedTokens.SPACING);
  });

  it("SHADOWS is the same reference", () => {
    expect(patientPortalTokens.SHADOWS).toBe(sharedTokens.SHADOWS);
  });

  it("GLASS is the same reference", () => {
    expect(patientPortalTokens.GLASS).toBe(sharedTokens.GLASS);
  });

  it("TYPOGRAPHY is the same reference", () => {
    expect(patientPortalTokens.TYPOGRAPHY).toBe(sharedTokens.TYPOGRAPHY);
  });

  it("RESPONSIVE_SPACING is the same reference", () => {
    expect(patientPortalTokens.RESPONSIVE_SPACING).toBe(sharedTokens.RESPONSIVE_SPACING);
  });

  it("DEPTH_LAYERS is the same reference", () => {
    expect(patientPortalTokens.DEPTH_LAYERS).toBe(sharedTokens.DEPTH_LAYERS);
  });
});

describe("Re-export equivalence: motion variants", () => {
  it("cardEntrance is the same reference", () => {
    expect(patientPortalMotion.cardEntrance).toBe(sharedMotion.cardEntrance);
  });

  it("cardHover is the same reference", () => {
    expect(patientPortalMotion.cardHover).toBe(sharedMotion.cardHover);
  });

  it("pageEntrance is the same reference", () => {
    expect(patientPortalMotion.pageEntrance).toBe(sharedMotion.pageEntrance);
  });

  it("buttonPress is the same reference", () => {
    expect(patientPortalMotion.buttonPress).toBe(sharedMotion.buttonPress);
  });

  it("fadeIn is the same reference", () => {
    expect(patientPortalMotion.fadeIn).toBe(sharedMotion.fadeIn);
  });

  it("staggerContainer is the same reference", () => {
    expect(patientPortalMotion.staggerContainer).toBe(sharedMotion.staggerContainer);
  });

  it("tableRowEntrance is the same reference", () => {
    expect(patientPortalMotion.tableRowEntrance).toBe(sharedMotion.tableRowEntrance);
  });

  it("modalEntrance is the same reference", () => {
    expect(patientPortalMotion.modalEntrance).toBe(sharedMotion.modalEntrance);
  });

  it("modalExit is the same reference", () => {
    expect(patientPortalMotion.modalExit).toBe(sharedMotion.modalExit);
  });

  it("tabIndicator is the same reference", () => {
    expect(patientPortalMotion.tabIndicator).toBe(sharedMotion.tabIndicator);
  });

  it("statusTransition is the same reference", () => {
    expect(patientPortalMotion.statusTransition).toBe(sharedMotion.statusTransition);
  });
});

describe("Re-export equivalence: premium components", () => {
  it("GlassPanel is the same reference", () => {
    expect(patientPortalComponents.GlassPanel).toBe(premiumComponents.GlassPanel);
  });

  it("PremiumButton is the same reference", () => {
    expect(patientPortalComponents.PremiumButton).toBe(premiumComponents.PremiumButton);
  });

  it("DashboardCard is the same reference", () => {
    expect(patientPortalComponents.DashboardCard).toBe(premiumComponents.DashboardCard);
  });

  it("StatusBadge is the same reference", () => {
    expect(patientPortalComponents.StatusBadge).toBe(premiumComponents.StatusBadge);
  });

  it("SectionHeader is the same reference", () => {
    expect(patientPortalComponents.SectionHeader).toBe(premiumComponents.SectionHeader);
  });

  it("FloatingSidebar is the same reference", () => {
    expect(patientPortalComponents.FloatingSidebar).toBe(premiumComponents.FloatingSidebar);
  });

  it("PageTransition is the same reference", () => {
    expect(patientPortalComponents.PageTransition).toBe(premiumComponents.PageTransition);
  });

  it("MotionWrapper is the same reference", () => {
    expect(patientPortalComponents.MotionWrapper).toBe(premiumComponents.MotionWrapper);
  });

  it("InfoRow is the same reference", () => {
    expect(patientPortalComponents.InfoRow).toBe(premiumComponents.InfoRow);
  });

  it("PremiumHeader is the same reference", () => {
    expect(patientPortalComponents.PremiumHeader).toBe(premiumComponents.PremiumHeader);
  });

  it("QuickActionsPanel is the same reference", () => {
    expect(patientPortalComponents.QuickActionsPanel).toBe(premiumComponents.QuickActionsPanel);
  });
});
