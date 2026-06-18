/**
 * Integration-style static checks for the analytics implementation.
 *
 * These tests read source files directly and assert structural/code-content
 * requirements without running the application.
 *
 * Validates: Requirements 2.1, 2.2, 12.1
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const root = path.resolve(__dirname, "../..");
const layoutPath = path.join(root, "app", "layout.tsx");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readSource(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

// ─── app/layout.tsx structural checks ────────────────────────────────────────

describe("app/layout.tsx", () => {
  let layout: string;

  // Read once for the whole describe block
  layout = readSource(layoutPath);

  it("imports GoogleAnalytics from @next/third-parties/google (Req 2.1)", () => {
    expect(layout).toContain('from "@next/third-parties/google"');
    expect(layout).toContain("GoogleAnalytics");
  });

  it("imports AnalyticsProvider (Req 4.4)", () => {
    expect(layout).toContain("AnalyticsProvider");
  });

  it("conditionally renders GoogleAnalytics with gaId prop (Req 2.1, 2.2)", () => {
    // The conditional render pattern: {gaId && <GoogleAnalytics gaId={gaId} />}
    expect(layout).toContain("{gaId && <GoogleAnalytics gaId={gaId} />}");
  });

  it("renders AnalyticsProvider wrapped in Suspense (Req 4.4)", () => {
    expect(layout).toContain("<AnalyticsProvider />");
    expect(layout).toContain("Suspense");
    // Verify AnalyticsProvider is inside the Suspense block by checking order
    const suspenseIdx = layout.indexOf("<Suspense");
    const providerIdx = layout.indexOf("<AnalyticsProvider");
    const suspenseCloseIdx = layout.indexOf("</Suspense>");
    expect(suspenseIdx).toBeGreaterThanOrEqual(0);
    expect(providerIdx).toBeGreaterThan(suspenseIdx);
    expect(suspenseCloseIdx).toBeGreaterThan(providerIdx);
  });
});

// ─── No direct window.gtag( calls outside analytics.service.ts ───────────────

describe("Codebase hygiene (Req 12.1)", () => {
  it("has no direct window.gtag( calls outside analytics.service.ts", () => {
    // Find all .ts/.tsx files, excluding analytics.service.ts, node_modules, .next
    const tsFiles: string[] = [];

    function walk(dir: string): void {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".next" ||
            entry.name === ".git" ||
            entry.name === ".agents"
          ) {
            continue;
          }
          walk(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
        ) {
          // Exclude the analytics service itself
          if (fullPath.includes("analytics.service.ts")) {
            continue;
          }
          if (fullPath.includes("analytics.integration.test.ts")) {
            continue;
          }
          tsFiles.push(fullPath);
        }
      }
    }

    walk(root);

    const violations: string[] = [];
    for (const file of tsFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("window.gtag(")) {
        violations.push(path.relative(root, file));
      }
    }

    expect(violations).toEqual([]);
  });

  it('has no direct logEvent( imports from "firebase/analytics" outside analytics.service.ts', () => {
    // Collect non-service .ts/.tsx files
    const tsFiles: string[] = [];

    function walk(dir: string): void {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".next" ||
            entry.name === ".git" ||
            entry.name === ".agents"
          ) {
            continue;
          }
          walk(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
        ) {
          if (fullPath.includes("analytics.service.ts")) {
            continue;
          }
          if (fullPath.includes("analytics.integration.test.ts")) {
            continue;
          }
          tsFiles.push(fullPath);
        }
      }
    }

    walk(root);

    const violations: string[] = [];
    for (const file of tsFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes('from "firebase/analytics"')) {
        violations.push(path.relative(root, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
