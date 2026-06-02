/**
 * Preservation Property Tests — Visual Acuity / Mobile / Nav / Docs Fix
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * GOAL: Capture the CURRENT baseline behavior that must be preserved after
 * the fix is implemented. These tests should PASS on the current UNFIXED code.
 *
 * After the fix lands (Task 3.9), these same tests MUST still PASS — confirming
 * no regressions were introduced.
 *
 * Preservation behaviors tested:
 *   1. Desktop 3-column layout structure in TestingShell (viewport >= 768px)
 *   2. Existing doctor nav items present in correct order
 *   3. Existing admin nav items present in correct order
 *   4. SVG rendering constants in SnellenRenderer (CAP_HEIGHT_RATIO, geometricPrecision, Sloan spacing)
 *   5. Calibration accuracy constants in CalibrationStep (ISO/IEC 7810 ID-1 card dimensions)
 */

import { describe, expect, test } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── File paths (relative to project root) ─────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "../..");

const TESTING_SHELL_PATH = path.join(
  PROJECT_ROOT,
  "modules/visual-acuity/steps/TestingShell.tsx"
);
const DOCTOR_LAYOUT_PATH = path.join(PROJECT_ROOT, "app/doctor/layout.tsx");
const ADMIN_LAYOUT_PATH = path.join(PROJECT_ROOT, "app/admin/layout.tsx");
const SNELLEN_RENDERER_PATH = path.join(
  PROJECT_ROOT,
  "modules/visual-acuity/SnellenRenderer.tsx"
);
const CALIBRATION_STEP_PATH = path.join(
  PROJECT_ROOT,
  "modules/visual-acuity/steps/CalibrationStep.tsx"
);

// ─── 1. Desktop layout preservation ────────────────────────────────────────

describe("Preservation — Immersive reading phase layout in TestingShell", () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * After the immersive experience refactor, TestingShell reading phase:
   * - Removed 3-column desktop layout (moved chrome to ImmersiveTopBar)
   * - SnellenRenderer is the hero element with flex-1 full-width layout
   * - Uses "flex flex-col items-center justify-center w-full h-full" as wrapper
   * - Preserves SnellenRenderer with same props (letters, exactHeightMm, calibration)
   */
  test("TestingShell source uses immersive hero layout with SnellenRenderer as primary content", () => {
    const source = fs.readFileSync(TESTING_SHELL_PATH, "utf-8");

    // Verify the flex container for the reading phase exists
    expect(source).toContain("flex flex-col items-center justify-center w-full h-full");

    // Verify SnellenRenderer is rendered with calibration props
    expect(source).toContain("SnellenRenderer");
    expect(source).toContain("effectiveCalibration");

    // Verify center uses flex-1 for hero element sizing
    expect(source).toContain("flex-1");

    // Verify the reading phase no longer constrains with max-w-2xl
    expect(source).not.toContain("max-w-2xl mx-auto space-y-4");
  });
});

// ─── 2. Existing doctor nav items preservation ─────────────────────────────

describe("Preservation — Doctor navigation items", () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * The doctorNavItems array must contain these items in this exact order:
   * [Dashboard, Appointments, Requests, Patients, Prescriptions, Slots, Profile]
   *
   * After adding Public Home, these must all still be present in the same
   * relative order.
   */
  test("doctorNavItems contains [Dashboard, Appointments, Requests, Patients, Prescriptions, Slots, Profile] in order", () => {
    const source = fs.readFileSync(DOCTOR_LAYOUT_PATH, "utf-8");

    // Extract the doctorNavItems array definition
    const navArrayMatch = source.match(
      /const\s+doctorNavItems\s*:\s*NavItem\[\]\s*=\s*\[([\s\S]*?)\];/
    );
    expect(navArrayMatch).not.toBeNull();

    const navArrayContent = navArrayMatch![1];

    // Expected items in order
    const expectedItems = [
      "Dashboard",
      "Appointments",
      "Requests",
      "Patients",
      "Prescriptions",
      "Slots",
      "Profile",
    ];

    // Verify each item exists
    for (const item of expectedItems) {
      expect(navArrayContent).toContain(`"${item}"`);
    }

    // Verify ordering: each item's position must be before the next
    const positions = expectedItems.map((item) =>
      navArrayContent.indexOf(`"${item}"`)
    );

    for (let i = 0; i < positions.length - 1; i++) {
      expect(positions[i]).toBeLessThan(positions[i + 1]);
    }
  });
});

// ─── 3. Existing admin nav items preservation ──────────────────────────────

describe("Preservation — Admin navigation items", () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * The adminNavItems array must contain these items in this exact order:
   * [Dashboard, Doctors, Services, Assessments, Appointments, Users, Payments, Analytics, Settings]
   *
   * After adding Public Home, these must all still be present in the same
   * relative order.
   */
  test("adminNavItems contains [Dashboard, Doctors, Services, Assessments, Appointments, Users, Payments, Analytics, Settings] in order", () => {
    const source = fs.readFileSync(ADMIN_LAYOUT_PATH, "utf-8");

    // Extract the adminNavItems array definition
    const navArrayMatch = source.match(
      /const\s+adminNavItems\s*:\s*NavItem\[\]\s*=\s*\[([\s\S]*?)\];/
    );
    expect(navArrayMatch).not.toBeNull();

    const navArrayContent = navArrayMatch![1];

    // Expected items in order
    const expectedItems = [
      "Dashboard",
      "Doctors",
      "Services",
      "Assessments",
      "Appointments",
      "Users",
      "Payments",
      "Analytics",
      "Settings",
    ];

    // Verify each item exists
    for (const item of expectedItems) {
      expect(navArrayContent).toContain(`"${item}"`);
    }

    // Verify ordering: each item's position must be before the next
    const positions = expectedItems.map((item) =>
      navArrayContent.indexOf(`"${item}"`)
    );

    for (let i = 0; i < positions.length - 1; i++) {
      expect(positions[i]).toBeLessThan(positions[i + 1]);
    }
  });
});

// ─── 4. SVG rendering preservation ─────────────────────────────────────────

describe("Preservation — SnellenRenderer SVG rendering constants", () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * The SnellenRenderer must continue to use:
   * - CAP_HEIGHT_RATIO = 0.711 (Arial cap height compensation)
   * - textRendering="geometricPrecision" (sharp sub-pixel edges)
   * - Sloan chart spacing logic (LETTER_GAP_RATIO, PAD_H_RATIO, PAD_V_RATIO)
   *
   * These rendering constants must remain unchanged after the fix.
   */
  test("SnellenRenderer contains CAP_HEIGHT_RATIO = 0.711", () => {
    const source = fs.readFileSync(SNELLEN_RENDERER_PATH, "utf-8");
    expect(source).toContain("CAP_HEIGHT_RATIO = 0.711");
  });

  test('SnellenRenderer uses textRendering="geometricPrecision"', () => {
    const source = fs.readFileSync(SNELLEN_RENDERER_PATH, "utf-8");
    expect(source).toContain("geometricPrecision");
  });

  test("SnellenRenderer contains Sloan spacing logic constants", () => {
    const source = fs.readFileSync(SNELLEN_RENDERER_PATH, "utf-8");

    // LETTER_GAP_RATIO = 0.5 (½ cap height between letters)
    expect(source).toContain("LETTER_GAP_RATIO");
    expect(source).toContain("0.5");

    // PAD_H_RATIO = 0.75 (horizontal edge padding)
    expect(source).toContain("PAD_H_RATIO");
    expect(source).toContain("0.75");

    // PAD_V_RATIO = 0.4 (vertical padding)
    expect(source).toContain("PAD_V_RATIO");
    expect(source).toContain("0.4");

    // Sloan slot width = capPx (each letter occupies one square slot)
    expect(source).toContain("slotW");
  });
});

// ─── 5. Calibration accuracy preservation ──────────────────────────────────

describe("Preservation — CalibrationStep ISO/IEC 7810 ID-1 card dimensions", () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * The CalibrationStep must continue to use the ISO/IEC 7810 ID-1 standard
   * credit card dimensions for pxPerMm calculation:
   * - CARD_WIDTH_MM = 85.60 (long side in mm)
   * - CARD_HEIGHT_MM = 53.98 (short side in mm)
   *
   * These values are the foundation of calibration accuracy and must remain unchanged.
   */
  test("CalibrationStep contains CARD_WIDTH_MM = 85.60", () => {
    const source = fs.readFileSync(CALIBRATION_STEP_PATH, "utf-8");
    expect(source).toContain("CARD_WIDTH_MM");
    expect(source).toContain("85.60");
  });

  test("CalibrationStep contains CARD_HEIGHT_MM = 53.98", () => {
    const source = fs.readFileSync(CALIBRATION_STEP_PATH, "utf-8");
    expect(source).toContain("CARD_HEIGHT_MM");
    expect(source).toContain("53.98");
  });

  test("CalibrationStep uses card dimensions for pxPerMm calculation", () => {
    const source = fs.readFileSync(CALIBRATION_STEP_PATH, "utf-8");

    // The pxPerMm calculation: cardLongPx / CARD_WIDTH_MM
    expect(source).toContain("cardLongPx / CARD_WIDTH_MM");
  });
});
