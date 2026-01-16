import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Git worktrees directory (generated files)
    ".worktrees/**",
  ]),
  // Enforce file length guidelines from AGENTS.md
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "max-lines": [
        "error",
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      // Change @typescript-eslint/no-unused-vars to error level
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
]);

export default eslintConfig;
