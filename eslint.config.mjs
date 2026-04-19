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
    // Claude Code configuration directory
    ".claude/**",
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
      // Parameters and variables prefixed with _ are intentionally unused.
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      // Prohibit importing Feature, FeatureCollection, or GeoJSON from the geojson
      // package directly. Use RegionFeature / RegionFeatureCollection from /types.ts
      // (repo root) instead.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "geojson",
              importNames: ["Feature"],
              message:
                "Use RegionFeature from /types.ts instead of the generic Feature. " +
                "If you need a buffer-result type, derive it from turf return types.",
            },
            {
              name: "geojson",
              importNames: ["FeatureCollection"],
              message:
                "Use RegionFeatureCollection from /types.ts instead of the generic FeatureCollection.",
            },
            {
              name: "geojson",
              importNames: ["GeoJSON"],
              message:
                "Use RegionFeature / RegionFeatureCollection from /types.ts instead of the generic GeoJSON type.",
            },
          ],
        },
      ],
    },
  },
  // types.ts (repo root), app/types/**, scripts/lib/geometry-utils.ts, and
  // scripts/lib/spatial-index.ts are the canonical homes for our GeoJSON type
  // wrappers, or define public APIs that require low-level geojson types.
  // They are allowed to import Feature/FeatureCollection/GeoJSON directly.
  {
    files: [
      "types.ts",
      "app/types/**/*.ts",
      "scripts/lib/geometry-utils.ts",
      "scripts/lib/spatial-index.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
