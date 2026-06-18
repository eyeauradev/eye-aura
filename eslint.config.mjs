import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".npm-cache/**",
      "out/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Prevent direct analytics calls outside the centralized analytics service
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["services/analytics/analytics.service.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.object.name='window'][callee.property.name='gtag']",
          message:
            "Use analyticsService.track*() instead of window.gtag() directly",
        },
      ],
    },
  },
];

export default eslintConfig;
