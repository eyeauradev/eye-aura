import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const DOCTOR_DIR = path.join(ROOT, "app/doctor");
const ADMIN_DIR = path.join(ROOT, "app/admin");

/**
 * Recursively collect all .ts/.tsx files from a directory,
 * excluding test files and node_modules.
 */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      results.push(...collectFiles(fullPath));
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".spec.")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check if a line is a comment or part of a comment block.
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*/")
  );
}

const moduleFiles = [...collectFiles(DOCTOR_DIR), ...collectFiles(ADMIN_DIR)];

describe("Static Analysis: Design Constraints", () => {
  describe("No hardcoded hex colors in Doctor/Admin modules", () => {
    it("should not contain hardcoded hex color values", () => {
      const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
      const violations: { file: string; line: number; content: string }[] = [];

      for (const filePath of moduleFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isCommentLine(line)) continue;

          const matches = line.match(hexPattern);
          if (matches) {
            // Allow hex in CSS variable references like rgba(var(--primary-rgb),0.06)
            // and Tailwind arbitrary values that reference CSS vars
            const filteredMatches = matches.filter((match) => {
              // Skip if it's inside a var() reference context
              const idx = line.indexOf(match);
              const before = line.substring(Math.max(0, idx - 30), idx);
              if (before.includes("var(--")) return false;
              return true;
            });

            if (filteredMatches.length > 0) {
              violations.push({
                file: path.relative(ROOT, filePath),
                line: i + 1,
                content: line.trim(),
              });
            }
          }
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}:${v.line} → ${v.content}`)
          .join("\n");
        expect.fail(
          `Found ${violations.length} hardcoded hex color(s):\n${report}`
        );
      }
    });
  });

  describe("No arbitrary Tailwind color classes in Doctor/Admin modules", () => {
    it("should not use arbitrary Tailwind color utilities", () => {
      // Match patterns like bg-blue-500, text-gray-200, border-red-300, etc.
      // These are non-token colors that bypass the design system.
      const arbitraryColorPattern =
        /\b(bg|text|border|ring|outline|shadow|fill|stroke|accent|decoration)-(red|blue|green|yellow|orange|purple|pink|indigo|violet|cyan|teal|emerald|lime|amber|fuchsia|rose|sky|slate|gray|zinc|neutral|stone|warmGray|trueGray|coolGray|blueGray)-\d+/g;

      const violations: { file: string; line: number; content: string }[] = [];

      for (const filePath of moduleFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isCommentLine(line)) continue;

          if (arbitraryColorPattern.test(line)) {
            violations.push({
              file: path.relative(ROOT, filePath),
              line: i + 1,
              content: line.trim(),
            });
          }
          // Reset regex lastIndex since we use the `g` flag
          arbitraryColorPattern.lastIndex = 0;
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}:${v.line} → ${v.content}`)
          .join("\n");
        expect.fail(
          `Found ${violations.length} arbitrary Tailwind color class(es):\n${report}`
        );
      }
    });
  });

  describe("No local token overrides in Doctor/Admin modules", () => {
    it("should not redefine RADIUS, SPACING, SHADOWS, GLASS, or TYPOGRAPHY constants", () => {
      const tokenOverridePattern =
        /\b(export\s+)?(const|let|var)\s+(RADIUS|SPACING|SHADOWS|GLASS|TYPOGRAPHY)\b/;

      const violations: { file: string; line: number; content: string }[] = [];

      for (const filePath of moduleFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isCommentLine(line)) continue;

          if (tokenOverridePattern.test(line)) {
            violations.push({
              file: path.relative(ROOT, filePath),
              line: i + 1,
              content: line.trim(),
            });
          }
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}:${v.line} → ${v.content}`)
          .join("\n");
        expect.fail(
          `Found ${violations.length} local token override(s):\n${report}`
        );
      }
    });
  });

  describe("No alternative animation libraries in Doctor/Admin modules", () => {
    it("should not import react-spring, gsap, or use CSS @keyframes", () => {
      const importPattern =
        /\b(from\s+['"]react-spring|from\s+['"]gsap|import\s+.*['"]react-spring|import\s+.*['"]gsap|require\s*\(\s*['"]react-spring|require\s*\(\s*['"]gsap)/;
      const keyframesPattern = /@keyframes\s+/;

      const violations: {
        file: string;
        line: number;
        content: string;
        type: string;
      }[] = [];

      for (const filePath of moduleFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isCommentLine(line)) continue;

          if (importPattern.test(line)) {
            violations.push({
              file: path.relative(ROOT, filePath),
              line: i + 1,
              content: line.trim(),
              type: "alternative animation library import",
            });
          }

          if (keyframesPattern.test(line)) {
            violations.push({
              file: path.relative(ROOT, filePath),
              line: i + 1,
              content: line.trim(),
              type: "CSS @keyframes definition",
            });
          }
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map(
            (v) => `  [${v.type}] ${v.file}:${v.line} → ${v.content}`
          )
          .join("\n");
        expect.fail(
          `Found ${violations.length} alternative animation usage(s):\n${report}`
        );
      }
    });
  });

  describe("No Button imports from @/components/ui/button in Doctor/Admin modules", () => {
    it("should not import from @/components/ui/button", () => {
      const buttonImportPattern =
        /from\s+['"]@\/components\/ui\/button['"]/;

      const violations: { file: string; line: number; content: string }[] = [];

      for (const filePath of moduleFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (isCommentLine(line)) continue;

          if (buttonImportPattern.test(line)) {
            violations.push({
              file: path.relative(ROOT, filePath),
              line: i + 1,
              content: line.trim(),
            });
          }
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map((v) => `  ${v.file}:${v.line} → ${v.content}`)
          .join("\n");
        expect.fail(
          `Found ${violations.length} @/components/ui/button import(s) — use PremiumButton instead:\n${report}`
        );
      }
    });
  });
});
