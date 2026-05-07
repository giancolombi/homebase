import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // Type safety — surface (but don't yet block) every use of `any`.
      // Existing usages are still in the tree; once cleaned up we can
      // promote this to "error" + add --max-warnings 0 to the lint script.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      // no-non-null-assertion isn't worth the signal/noise here — most !'s
      // are legitimate (req.user! after requireAuth, document.getElementById!
      // for the React root, familyId! inside enabled-guarded query fns).
      "@typescript-eslint/no-non-null-assertion": "off",

      // Common-bug guardrails — already clean, enforce going forward.
      "prefer-const": "error",
      "no-var": "error",
      "no-debugger": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  // Backend / scripts use Node globals, not browser
  {
    files: ["api/**/*.ts", "scripts/**/*.ts", "serve.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  // shadcn/ui primitives co-export constants alongside components by design;
  // turning the react-refresh rule off there is the documented escape hatch.
  {
    files: ["app/components/ui/**/*.{ts,tsx}", "app/contexts/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // Tests get to be loose
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "e2e/**/*.ts",
      "scripts/seed-local.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
