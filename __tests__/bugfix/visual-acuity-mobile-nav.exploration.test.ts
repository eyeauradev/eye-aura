/**
 * Bug Condition Exploration Test — Visual Acuity / Mobile / Nav / Docs Fix
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 *
 * GOAL: Surface counterexamples that demonstrate the bugs exist in the current
 * UNFIXED code. Each assertion encodes the EXPECTED (correct) behavior — they
 * will FAIL on unfixed code, proving the bugs are real.
 *
 * After the fix lands (Task 3.8), these same tests MUST PASS.
 *
 * Bug conditions tested:
 *   1. Navigation bug (Doctor): doctorNavItems lacks href "/"
 *   2. Navigation bug (Admin): adminNavItems lacks href "/"
 *   3. Calibration bug: useCalibrationSync hook does not exist
 *   4. Mobile layout bug: TestingShell uses fixed 3-column layout, no responsive breakpoint
 */

import { describe, expect, test } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── File paths (relative to project root) ─────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "../..");

const DOCTOR_LAYOUT_PATH = path.join(PROJECT_ROOT, "app/doctor/layout.tsx");
const ADMIN_LAYOUT_PATH = path.join(PROJECT_ROOT, "app/admin/layout.tsx");
const CALIBRATION_SYNC_PATH = path.join(
  PROJECT_ROOT,
  "modules/visual-acuity/engine/useCalibrationSync.ts"
);
const TESTING_SHELL_PATH = path.join(
  PROJECT_ROOT,
  "modules/visual-acuity/steps/TestingShell.tsx"
);

// ─── 1. Navigation bug — Doctor module ─────────────────────────────────────

describe("Navigation bug — Doctor module", () => {
  test('doctorNavItems contains an entry with href: "/" (Public Home link)', () => {
    const source = fs.readFileSync(DOCTOR_LAYOUT_PATH, "utf-8");

    // Extract the doctorNavItems array definition
    const navArrayMatch = source.match(
      /const\s+doctorNavItems\s*:\s*NavItem\[\]\s*=\s*\[([\s\S]*?)\];/
    );
    expect(navArrayMatch).not.toBeNull();

    const navArrayContent = navArrayMatch![1];

    // Assert that there is an entry with href: "/" in the doctorNavItems array
    // This checks for href: "/" pattern (with various quote styles)
    const hasHomeLink =
      navArrayContent.includes('href: "/"') ||
      navArrayContent.includes("href: '/'") ||
      navArrayContent.includes("href: `/`");

    // EXPECTED (correct): true — Public Home link should exist
    // ACTUAL on unfixed code: false — no href "/" entry exists (FAILS)
    expect(hasHomeLink).toBe(true);
  });
});

// ─── 2. Navigation bug — Admin module ──────────────────────────────────────

describe("Navigation bug — Admin module", () => {
  test('adminNavItems contains an entry with href: "/" (Public Home link)', () => {
    const source = fs.readFileSync(ADMIN_LAYOUT_PATH, "utf-8");

    // Extract the adminNavItems array definition
    const navArrayMatch = source.match(
      /const\s+adminNavItems\s*:\s*NavItem\[\]\s*=\s*\[([\s\S]*?)\];/
    );
    expect(navArrayMatch).not.toBeNull();

    const navArrayContent = navArrayMatch![1];

    // Assert that there is an entry with href: "/" in the adminNavItems array
    const hasHomeLink =
      navArrayContent.includes('href: "/"') ||
      navArrayContent.includes("href: '/'") ||
      navArrayContent.includes("href: `/`");

    // EXPECTED (correct): true — Public Home link should exist
    // ACTUAL on unfixed code: false — no href "/" entry exists (FAILS)
    expect(hasHomeLink).toBe(true);
  });
});

// ─── 3. Calibration bug — useCalibrationSync hook ──────────────────────────

describe("Calibration bug — useCalibrationSync hook", () => {
  test("useCalibrationSync.ts file exists and exports the hook", () => {
    // EXPECTED (correct): file exists at the specified path
    // ACTUAL on unfixed code: file does not exist (FAILS)
    const fileExists = fs.existsSync(CALIBRATION_SYNC_PATH);
    expect(fileExists).toBe(true);
  });

  test("useCalibrationSync recalculates pxPerMm when DPR changes", () => {
    // First, the file must exist to even test its contents
    const fileExists = fs.existsSync(CALIBRATION_SYNC_PATH);
    if (!fileExists) {
      // File doesn't exist — this itself proves the bug
      expect(fileExists).toBe(true);
      return;
    }

    const source = fs.readFileSync(CALIBRATION_SYNC_PATH, "utf-8");

    // The hook should export a function named useCalibrationSync
    const exportsHook =
      source.includes("export function useCalibrationSync") ||
      source.includes("export const useCalibrationSync") ||
      source.includes("export default function useCalibrationSync");

    expect(exportsHook).toBe(true);

    // The hook should listen for DPR changes (devicePixelRatio or matchMedia with resolution)
    const handlesDprChange =
      source.includes("devicePixelRatio") ||
      source.includes("resolution") ||
      source.includes("matchMedia");

    expect(handlesDprChange).toBe(true);
  });
});

// ─── 4. Mobile layout bug — TestingShell responsive layout ─────────────────

describe("Mobile layout bug — TestingShell responsive layout", () => {
  test("TestingShell uses responsive/immersive layout for mobile (no constrained multi-column reading phase)", () => {
    const source = fs.readFileSync(TESTING_SHELL_PATH, "utf-8");

    // After the immersive experience refactor, the reading phase no longer uses
    // a multi-column layout at all. Instead, it uses a simple full-width flex
    // container with SnellenRenderer as the hero element, which inherently
    // works at all viewport sizes without needing responsive breakpoints.
    //
    // Verify: the reading phase uses a mobile-friendly layout approach —
    // either responsive breakpoints (original fix) OR a single-column
    // hero layout that works everywhere (immersive refactor).
    const hasResponsiveLayout =
      source.includes("md:flex-row") ||
      source.includes("hidden md:") ||
      source.includes("md:flex-shrink-0");

    const hasImmersiveHeroLayout =
      source.includes("flex flex-col items-center justify-center w-full h-full") &&
      source.includes("flex-1 w-full");

    // At least one mobile-friendly pattern must be present
    const hasMobileFriendlyLayout = hasResponsiveLayout || hasImmersiveHeroLayout;

    // EXPECTED: true — layout works well on mobile
    expect(hasMobileFriendlyLayout).toBe(true);
  });

  test("TestingShell does NOT use unconditional fixed w-28 columns without responsive override", () => {
    const source = fs.readFileSync(TESTING_SHELL_PATH, "utf-8");

    // Find the reading phase layout section — the 3-column content row
    // Look for the pattern where w-28 flex-shrink-0 is used without any responsive prefix
    const readingPhaseMatch = source.match(
      /className="flex items-center gap-4 px-5 py-6 min-h-\[180px\]"[\s\S]*?<\/div>\s*<\/div>\s*{\/\*.*Pause/
    );

    if (readingPhaseMatch) {
      const readingPhaseSection = readingPhaseMatch[0];

      // Check if w-28 flex-shrink-0 is used WITHOUT a responsive prefix
      // (i.e., it's unconditionally applied at all viewport sizes)
      const hasUnconditionalFixedWidth =
        readingPhaseSection.includes("w-28 flex-shrink-0") &&
        !readingPhaseSection.includes("md:w-28") &&
        !readingPhaseSection.includes("hidden md:");

      // EXPECTED (correct): false — should NOT have unconditional fixed widths
      // ACTUAL on unfixed code: true — uses "w-28 flex-shrink-0" unconditionally (FAILS)
      expect(hasUnconditionalFixedWidth).toBe(false);
    } else {
      // If we can't find the section, check the simpler pattern
      // The file should not have unconditional w-28 flex-shrink-0 in the reading layout
      const hasFixedColumns = source.includes('"w-28 flex-shrink-0');
      const hasResponsiveOverride =
        source.includes("md:w-28") || source.includes("md:flex-shrink-0");

      // If fixed columns exist without responsive override, the bug is present
      // EXPECTED: either no fixed columns, or fixed columns with responsive override
      expect(hasFixedColumns && !hasResponsiveOverride).toBe(false);
    }
  });
});
