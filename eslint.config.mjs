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
    // OpenCode configuration directory
    ".opencode/**",
  ]),
  // Enforce file length guidelines from AGENTS.md
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "max-lines": [
        "error",
        {
          max: 350,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      // Change @typescript-eslint/no-unused-vars to error level
      "@typescript-eslint/no-unused-vars": "error",
      // Prohibit importing FeatureCollection from the geojson package directly.
      // Use RegionFeatureCollection (and related types) from app/types/game.ts instead.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "geojson",
              importNames: ["FeatureCollection"],
              message:
                "Use RegionFeatureCollection from app/types/game.ts instead of the generic FeatureCollection.",
            },
          ],
        },
      ],
    },
  },
  // app/types/** is the canonical home for our GeoJSON type wrappers,
  // so it is allowed to import FeatureCollection directly.
  {
    files: ["app/types/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
