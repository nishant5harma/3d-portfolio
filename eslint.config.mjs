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
  ]),
  // React Three Fiber relies on imperative mutation inside `useFrame` and
  // on seeded `Math.random` in `useMemo` for procedurally generated buffer
  // attributes. Both patterns are idiomatic for R3F and recommended in the
  // official docs, but the new React 19 purity/immutability rules flag
  // them. We disable those two rules for our WebGL scene files only.
  {
    files: [
      "src/components/three/**",
      "src/components/sections/Showcase*.tsx",
      "src/components/IndustriesWeServe.tsx",
      "src/components/TechWeUse.tsx",
    ],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
